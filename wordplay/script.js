// Game state
let currentAnswer = '';
let guessesLeft = 5;
let letterBoxes = [];
let currentInput = '';
let failedGuesses = 0;
let imageManifest = [];
let currentInputIndex = 0;
let awaitingKeyboard = false;
let lastWindowHeight = window.innerHeight;
let hasScrolledOnMobile = false;
let guessedLetters = new Set(); // Track guessed letters
let correctLetters = new Set(); // Track correct letters

// DOM Elements
const dailyImage = document.getElementById('dailyImage');
const imageError = document.getElementById('imageError');
const guessInput = document.getElementById('guessInput');
const guessButton = document.getElementById('guessButton');
const streakCount = document.getElementById('streakCount');
const dateDisplay = document.getElementById('dateDisplay');
const letterBoxesContainer = document.getElementById('letterBoxes');
const hiddenMobileInput = document.getElementById('hiddenMobileInput');
const mobileInput = document.getElementById('mobileInput');

// Initialize guess counter display
streakCount.textContent = guessesLeft;
streakCount.style.backgroundColor = '#2B2D42'; // Default navy

// Add event listener for date dropdown
const dateDropdown = document.getElementById('dateDropdown');
if (dateDropdown) {
    dateDropdown.addEventListener('change', () => {
        // Dynamically load the image and word for the selected date
        loadDailyImage();
    });
}

// Initialize the game with today's date

// Get day of year (1-366)
function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay) + 1;
}

// Format date as YYYY-DDD
function formatDate(date) {
    const year = date.getFullYear();
    const dayOfYear = getDayOfYear(date);
    return `${year}-${dayOfYear}`;
}

// Format date for display
function formatDateForDisplay(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Update getTargetDate to use dropdown if present (but dropdown reloads page, so this is just for robustness)
function getTargetDropdownValue() {
    if (dateDropdown && dateDropdown.value) {
        const [word, year, day] = dateDropdown.value.match(/^([a-zA-Z0-9_-]+)_(\d{4})-(\d{1,3})$/).slice(1);
        return { word, year: Number(year), day: Number(day) };
    }
    return null;
}

function getTargetDate() {
    const dropdownVal = getTargetDropdownValue();
    if (dropdownVal) {
        return new Date(dropdownVal.year, 0, dropdownVal.day);
    }
    // Fallback to URL param or today
    const urlParams = new URLSearchParams(window.location.search);
    const dayParam = urlParams.get('day');
    if (dayParam) {
        const [year, day] = dayParam.split('-').map(Number);
        return new Date(year, 0, day);
    }
    const now = new Date();
    const etOptions = { timeZone: 'America/New_York' };
    const etDate = new Date(now.toLocaleString('en-US', etOptions));
    return etDate;
}

// Create letter boxes based on word length
function createLetterBoxes(length) {
    letterBoxesContainer.innerHTML = '';
    letterBoxes = [];
    for (let i = 0; i < length; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.className = 'letter-box w-12 h-12 border-2 border-gray-300 rounded-lg flex items-center justify-center text-2xl font-bold uppercase text-center';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.inputMode = 'text';
        input.style.textTransform = 'uppercase';
        input.addEventListener('input', (e) => {
            let val = input.value.replace(/[^a-zA-Z]/g, '').toLowerCase();
            input.value = val;
            // Move to next box if letter entered
            if (val && i < length - 1) {
                letterBoxes[i + 1].focus();
            }
            updateCurrentInputFromBoxes();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                if (!input.value && i > 0) {
                    letterBoxes[i - 1].focus();
                }
            } else if (e.key === 'ArrowLeft' && i > 0) {
                letterBoxes[i - 1].focus();
            } else if (e.key === 'ArrowRight' && i < length - 1) {
                letterBoxes[i + 1].focus();
            } else if (e.key === 'Enter') {
                checkGuess();
            }
        });
        letterBoxesContainer.appendChild(input);
        letterBoxes.push(input);
    }
    // Focus first box after a short delay
    setTimeout(() => {
        if (letterBoxes.length > 0) {
            letterBoxes[0].focus();
        }
    }, 100);
    setTimeout(syncBoxWidths, 50);
}

function updateCurrentInputFromBoxes() {
    currentInput = letterBoxes.map(box => box.value).join('');
}

// Update letter boxes with current input (for feedback coloring)
function updateLetterBoxes(input) {
    const letters = input.split('');
    letterBoxes.forEach((box, index) => {
        box.value = letters[index] || '';
        // Style based on letter status
        if (letters[index]) {
            if (correctLetters.has(letters[index])) {
                box.style.backgroundColor = '#4CAF50'; // Green for correct letters
                box.style.color = 'white';
            } else if (guessedLetters.has(letters[index])) {
                box.style.backgroundColor = '#9E9E9E'; // Grey for incorrect guesses
                box.style.color = 'white';
            } else {
                box.style.backgroundColor = 'white';
                box.style.color = '#2B2D42';
            }
        } else {
            box.style.backgroundColor = 'white';
            box.style.color = '#2B2D42';
        }
    });
}

// Utility: Get all supported extensions
const extensions = ['.jpg', '.jpeg', '.png'];

// Fetch the manifest on page load
async function fetchImageManifest() {
    try {
        const response = await fetch('images/manifest.json');
        imageManifest = await response.json();
    } catch (e) {
        imageManifest = [];
    }
}

// Find today's image info from the manifest
function findImageForTodayFromManifest(dateStr) {
    return imageManifest.find(img => img.date === dateStr) || null;
}

// Load the daily image and set up the game
async function loadDailyImage() {
    await fetchImageManifest();
    correctLetters = [];
    const dropdownVal = getTargetDropdownValue();
    let imageInfo = null;
    let dateToShow = '';
    // Get today's date in ET timezone
    const now = new Date();
    const etOptions = { timeZone: 'America/New_York' };
    const etDate = new Date(now.toLocaleString('en-US', etOptions));
    const todayDateStr = formatDate(etDate);
    // If the dropdown is set to 'Template', always use fallback
    if (dateDropdown && dateDropdown.value === 'Template') {
        dailyImage.src = 'images/camera_template.jpg';
        currentAnswer = 'camera';
        createLetterBoxes(currentAnswer.length);
        dateToShow = `${formatDateForDisplay(etDate)} (${todayDateStr})`;
        dateDisplay.textContent = dateToShow;
        setTimeout(syncBoxWidths, 50);
        return;
    }
    if (dropdownVal) {
        // Use the exact word and date from dropdown
        const dateStr = `${dropdownVal.year}-${dropdownVal.day}`;
        imageInfo = imageManifest.find(img => img.word === dropdownVal.word && img.date === dateStr);
        // Set date to show from dropdown
        const dateObj = new Date(dropdownVal.year, 0, dropdownVal.day);
        dateToShow = `${formatDateForDisplay(dateObj)} (${formatDate(dateObj)})`;
    } else {
        // Always use today's date if no dropdown selection
        dateToShow = `${formatDateForDisplay(etDate)} (${todayDateStr})`;
        imageInfo = findImageForTodayFromManifest(todayDateStr);
    }
    if (imageInfo) {
        currentAnswer = imageInfo.word;
        createLetterBoxes(currentAnswer.length);
        dailyImage.src = `images/${imageInfo.filename}?t=${Date.now()}`;
        if (typeof imageError !== 'undefined' && imageError) imageError.classList.add('hidden');
    } else {
        // Use template image as fallback
        dailyImage.src = 'images/camera_template.jpg';
        currentAnswer = 'camera';
        createLetterBoxes(currentAnswer.length);
    }
    dateDisplay.textContent = dateToShow;
    setTimeout(syncBoxWidths, 50);
}

// Handle correct guess
function handleCorrectGuess() {
    // Fill in the letter boxes with the correct word, navy background, and white text
    letterBoxes.forEach((box, i) => {
        box.value = currentAnswer[i] ? currentAnswer[i].toUpperCase() : '';
        box.style.backgroundColor = '#2B2D42'; // Navy
        box.style.color = '#fff';
        box.style.borderColor = '#2B2D42';
    });
    // Show the success modal
    document.getElementById('successModal').style.display = 'block';
    if (successModalOverlay) successModalOverlay.style.display = 'block';
    // Show the word in the popup
    const successWord = document.getElementById('successWord');
    if (successWord) successWord.textContent = currentAnswer.toUpperCase();
    // Animate the play button
    const playBtn = document.getElementById('playAnimation');
    if (playBtn) {
        playBtn.classList.remove('play-animate');
        playBtn.style.display = 'block';
        // Force reflow for restart animation
        void playBtn.offsetWidth;
        playBtn.classList.add('play-animate');
    }
    // Trigger confetti
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });
    streakCount.textContent = guessesLeft;
    streakCount.style.backgroundColor = '#2B2D42';
}

// Handle incorrect guess
function handleIncorrectGuess() {
    // Remove focus from all letter boxes so no box is focused
    letterBoxes.forEach((box) => box.blur());
    // Force reflow and animate letter boxes: red border and jiggle
    letterBoxes.forEach((box) => {
        box.classList.remove('jiggle'); // Remove if present
        void box.offsetWidth; // Force reflow
        box.style.borderColor = '#FF5252'; // Red
        box.classList.add('jiggle');
    });
    // Reset after 500ms
    setTimeout(() => {
        letterBoxes.forEach((box) => {
            box.style.borderColor = '#2B2D42'; // Navy or default
            box.classList.remove('jiggle');
        });
    }, 500);
    // Increment failed guesses
    failedGuesses++;
    if (failedGuesses >= 5) {
        showRevealModal();
    }
    // Decrease guesses left
    guessesLeft = Math.max(guessesLeft - 1, 0);
    streakCount.textContent = guessesLeft;
    if (guessesLeft === 0) {
        streakCount.style.backgroundColor = '#FF5252'; // Red
    } else {
        streakCount.style.backgroundColor = '#2B2D42'; // Navy
    }
}

function showRevealModal() {
    const modal = document.getElementById('revealModal');
    if (modal) modal.style.display = 'block';
}

function hideRevealModal() {
    const modal = document.getElementById('revealModal');
    if (modal) modal.style.display = 'none';
}

function revealAnswer() {
    hideRevealModal();
    // Fill in the letter boxes with the correct word, navy background, and white text
    letterBoxes.forEach((box, i) => {
        box.value = currentAnswer[i] ? currentAnswer[i].toUpperCase() : '';
        box.style.backgroundColor = '#2B2D42'; // Navy
        box.style.color = '#fff';
        box.style.borderColor = '#2B2D42';
    });
    // Optionally, disable further input
    letterBoxes.forEach((box) => box.tabIndex = -1);
    guessButton.disabled = true;
    showRevealedModal();
}

function showRevealedModal() {
    const modal = document.getElementById('revealedModal');
    if (modal) modal.style.display = 'block';
}

function hideRevealedModal() {
    const modal = document.getElementById('revealedModal');
    if (modal) modal.style.display = 'none';
}

// Check the guess
function checkGuess() {
    if (currentInput.length !== currentAnswer.length) return;
    
    // Update guessed letters
    currentInput.split('').forEach(letter => {
        guessedLetters.add(letter);
        if (currentAnswer.includes(letter)) {
            correctLetters.add(letter);
        }
    });
    
    if (currentInput.toLowerCase() === currentAnswer.toLowerCase()) {
        handleCorrectGuess();
        // Do NOT clear input or update boxes after correct guess
        return;
    } else {
        handleIncorrectGuess();
    }
    currentInput = '';
    updateLetterBoxes('');
    setTimeout(() => {
        letterBoxes[0].focus();
    }, 500); // Wait for the jiggle animation to finish
    focusMobileInput();
}

// Event Listeners
guessButton.addEventListener('click', checkGuess);

// Initialize the game

function shareResult(defeated = false) {
    if (defeated) {
        const shareText = 'Got Word-Played today 😵‍💫🖼️ Can you get it?';
        const shareUrl = window.location.href;
        if (navigator.share) {
            navigator.share({
                title: 'WordPlay',
                text: shareText,
                url: shareUrl
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(shareText + '\n' + shareUrl).then(() => {
                alert('Result copied to clipboard!');
            }, () => {
                alert('Could not copy result.');
            });
        }
        return;
    }
    // Map numbers 1-10 to emoji
    const numberEmojis = ['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    // Calculate number of attempts (5 - guessesLeft)
    const attempts = 5 - guessesLeft+1;
    const attemptsEmoji = numberEmojis[attempts] || attempts.toString();
    const shareText = `Cracked today's WordPlay in ${attemptsEmoji} guesses. Your move. 🎯`;
    const shareUrl = window.location.href;
    if (navigator.share) {
        navigator.share({
            title: 'WordPlay',
            text: shareText,
            url: shareUrl
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(shareText + '\n' + shareUrl).then(() => {
            alert('Result copied to clipboard!');
        }, () => {
            alert('Could not copy result.');
        });
    }
}

// Update defeat modal button to call shareResult(true)
const defeatShareBtn = document.querySelector('#revealedModal .share-button');
if (defeatShareBtn) {
    defeatShareBtn.onclick = function() { shareResult(true); };
}

// Update populateDateDropdown to use the manifest
async function populateDateDropdown() {
    await fetchImageManifest();
    const dropdown = document.getElementById('dateDropdown');
    if (!dropdown) return;
    dropdown.innerHTML = '<option>Loading...</option>';
    try {
        // Use manifest to build options
        const options = imageManifest.map(img => ({
            word: img.word,
            date: img.date,
            value: `${img.word}_${img.date}`,
            filename: img.filename
        }));
        // Sort options by date
        const uniqueOptions = options.sort((a, b) => a.date.localeCompare(b.date));
        dropdown.innerHTML = uniqueOptions.map(opt =>
            `<option value="${opt.value}">${opt.date}</option>`
        ).join('');
        // Get today's date in ET timezone
        const now = new Date();
        const etOptions = { timeZone: 'America/New_York' };
        const etDate = new Date(now.toLocaleString('en-US', etOptions));
        const todayDateStr = formatDate(etDate);
        // Try to find a value that matches today's date
        const todayOption = uniqueOptions.find(opt => opt.date === todayDateStr);
        if (todayOption) {
            dropdown.value = todayOption.value;
            loadDailyImage();
        } else {
            dropdown.selectedIndex = 0;
            loadDailyImage();
        }
    } catch (e) {
        dropdown.innerHTML = '<option>Template</option>';
        loadDailyImage();
    }
}

// Call this on page load
populateDateDropdown();
loadDailyImage();

function syncBoxWidths() {
    // Get the image card and text card containers
    const imageCard = document.querySelector('.rounded-2xl.shadow-xl.border-4');
    const textCard = document.querySelector('.card.resizable-box');
    const dailyImage = document.getElementById('dailyImage');
    const letterBoxes = document.getElementById('letterBoxes');
    if (!imageCard || !textCard || !dailyImage || !letterBoxes) return;

    // Set image height: 240px on mobile, 300px on desktop
    const isMobile = window.innerWidth < 600;
    const fixedImageHeight = isMobile ? 200 : 300;
    dailyImage.style.height = fixedImageHeight + 'px';
    dailyImage.style.width = '';
    imageCard.style.height = fixedImageHeight + 'px';
    imageCard.style.width = '';

    // Wait for image to load natural size
    let aspect = dailyImage.naturalWidth && dailyImage.naturalHeight ? dailyImage.naturalWidth / dailyImage.naturalHeight : 1.6;
    let imageW = fixedImageHeight * aspect;
    imageCard.style.width = imageW + 'px';
    dailyImage.style.width = imageW + 'px';

    // Text container: expand horizontally for longer words, never scroll
    textCard.style.width = '';
    textCard.style.overflowX = 'visible';
    textCard.style.maxWidth = 'none';
    // Measure the width needed for the letter boxes
    const letterBoxesRect = letterBoxes.getBoundingClientRect();
    // Add more padding for 10+ letter words
    const letterCount = letterBoxes.children.length;
    let extraPad = letterCount >= 10 ? 80 : 48;
    let textW = letterBoxesRect.width + extraPad;
    // If textW is less than imageW, stretch to imageW
    if (textW < imageW) {
        textW = imageW;
    }
    textCard.style.width = textW + 'px';
}

// Listen for image load to sync widths
const dailyImageEl = document.getElementById('dailyImage');
if (dailyImageEl) {
    dailyImageEl.addEventListener('load', syncBoxWidths);
}

// Focus the hidden input on page load
// window.addEventListener('DOMContentLoaded', () => {
//     if (hiddenMobileInput) hiddenMobileInput.focus();
// });

// Focus the hidden input after each guess and after letter box creation
// function focusHiddenInput() {
//     if (hiddenMobileInput) hiddenMobileInput.focus();
// }

// When the hidden input changes, update the letter boxes
// if (hiddenMobileInput) {
//     hiddenMobileInput.addEventListener('input', (e) => {
//         let val = hiddenMobileInput.value.replace(/[^a-zA-Z]/g, '').toLowerCase();
//         val = val.slice(0, currentAnswer.length);
//         currentInput = val;
//         updateLetterBoxes(currentInput);
//     });
// }

function focusMobileInput() {
    if (mobileInput) mobileInput.focus();
}

// window.addEventListener('DOMContentLoaded', focusMobileInput);

// Add scroll on any tap on mobile
document.addEventListener('touchstart', function() {
    if (window.innerWidth < 600 && !hasScrolledOnMobile) {
        setTimeout(() => {
            const dailyImage = document.getElementById('dailyImage');
            const header = document.querySelector('header');
            if (dailyImage && header) {
                const headerRect = header.getBoundingClientRect();
                const scrollY = headerRect.bottom;
                smoothScrollTo(scrollY, 800); // 1200ms duration
            }
        }, 500); // 0.5s delay
        hasScrolledOnMobile = true;
    }
}, { passive: true });

function smoothScrollTo(targetY, duration) {
    const startY = window.scrollY;
    const change = targetY - startY;
    const startTime = performance.now();
    function animateScroll(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 0.5 - Math.cos(progress * Math.PI) / 2; // easeInOut
        window.scrollTo(0, startY + change * ease);
        if (progress < 1) {
            requestAnimationFrame(animateScroll);
        }
    }
    requestAnimationFrame(animateScroll);
}

letterBoxesContainer.addEventListener('click', focusMobileInput);

// 1. Make clicking outside the congratulations popup close it
const successModal = document.getElementById('successModal');
const successModalOverlay = document.getElementById('successModalOverlay');
if (successModalOverlay) {
  successModalOverlay.addEventListener('click', () => {
    successModal.style.display = 'none';
    successModalOverlay.style.display = 'none';
  });
}

// 3. On mobile, make the return key submit the guess
if (mobileInput) {
  mobileInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      checkGuess();
    }
  });
}

function sharePlayButton() {
    const shareText = "Tried today's WordPlay 🧠🖼️ Can you solve it?";
    const shareUrl = window.location.href;
    if (navigator.share) {
        navigator.share({
            title: 'WordPlay',
            text: shareText,
            url: shareUrl
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(shareText + '\n' + shareUrl).then(() => {
            alert('Link copied to clipboard!');
        }, () => {
            alert('Could not copy link.');
        });
    }
}

// Assign to play button in header
const playBtnHeader = document.getElementById('themeToggle');
if (playBtnHeader) {
    playBtnHeader.onclick = sharePlayButton;
}

function showHelpModal() {
  const modal = document.getElementById('helpModal');
  if (modal) modal.style.display = 'block';
}

function hideHelpModal() {
  const modal = document.getElementById('helpModal');
  if (modal) modal.style.display = 'none';
} 