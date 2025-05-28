import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import './styles.css'
import { getTodaysPuzzle } from './data/dailyPuzzles'
import { isValidWord, getSuggestions } from './utils/wordValidator'
import PuzzleDebug from './PuzzleDebug'
import Modal from './components/Modal'

const MAX_ATTEMPTS = 6
const BLUR_LEVELS = [30, 24, 18, 12, 6, 0] // 6 steps, unblurring equally per guess

// Add keyboard layout constants
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
];

const TipsButton = ({ isOpen, onToggle }) => {
  const tips = [
    "Look at the image carefully - small details matter!",
    "Try synonyms if your guess is close but not exact",
    "Use previous guesses to narrow down possibilities",
    "The clarity bar shows how close you are",
    "Some words might be compound or hyphenated"
  ];

  return (
    <div style={{ position: 'relative' }}>
      <button 
        className="tips-button"
        onClick={onToggle}
        aria-label="Tips and Tricks"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z" fill="currentColor"/>
          <path d="M11.2929 11.2929C11.6834 10.9024 12.3166 10.9024 12.7071 11.2929L13.7071 12.2929C14.0976 12.6834 14.0976 13.3166 13.7071 13.7071C13.3166 14.0976 12.6834 14.0976 12.2929 13.7071L11.2929 12.7071C10.9024 12.3166 10.9024 11.6834 11.2929 11.2929Z" fill="currentColor"/>
          <circle cx="12" cy="9" r="2" fill="currentColor"/>
        </svg>
      </button>
      
      {isOpen && (
        <div className="tips-dropdown">
          <h3>Tips & Tricks</h3>
          <ul className="tips-list">
            {tips.map((tip, index) => (
              <li key={index}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 3C4.36 3 1.258 5.28 0.187 8.5C1.258 11.72 4.36 14 8 14C11.64 14 14.742 11.72 15.813 8.5C14.742 5.28 11.64 3 8 3ZM8 12.5C5.514 12.5 3.5 10.486 3.5 8C3.5 5.514 5.514 3.5 8 3.5C10.486 3.5 12.5 5.514 12.5 8C12.5 10.486 10.486 12.5 8 12.5Z" fill="currentColor"/>
                  <circle cx="8" cy="8" r="2" fill="currentColor"/>
                </svg>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Fisher-Yates shuffle with seed
function seededShuffle(array, seed) {
  let arr = array.slice();
  let m = arr.length, t, i;
  let s = seed;
  function random() {
    // Simple LCG for deterministic pseudo-random
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  }
  while (m) {
    i = Math.floor(random() * m--);
    t = arr[m];
    arr[m] = arr[i];
    arr[i] = t;
  }
  return arr;
}

function App() {
  const [currentPuzzle, setCurrentPuzzle] = useState(null)
  const [attempts, setAttempts] = useState(0)
  const [isAttemptAnimating, setIsAttemptAnimating] = useState(false)
  const [guess, setGuess] = useState([])
  const [gameState, setGameState] = useState('playing') // 'playing', 'won', 'lost'
  const [streak, setStreak] = useState(0)
  const [lastPlayed, setLastPlayed] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [showDebug, setShowDebug] = useState(false)
  const [guessHistory, setGuessHistory] = useState([]) // [{id, guess}]
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [hasWon, setHasWon] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(true)
  const [highContrastMode, setHighContrastMode] = useState(false)
  const [showContrastDropdown, setShowContrastDropdown] = useState(false)
  const [bestCorrectCount, setBestCorrectCount] = useState(0)
  const [lastGuessIndex, setLastGuessIndex] = useState(-1)
  const [currentBlurLevel, setCurrentBlurLevel] = useState(BLUR_LEVELS[0])
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [showIntro, setShowIntro] = useState(true);
  const [customPuzzles, setCustomPuzzles] = useState([]);
  const [isHardMode, setIsHardMode] = useState(localStorage.getItem('seecretHardMode') === 'true');
  const inputRefs = useRef([]);
  const formRef = useRef(null);
  const [animatingSeequence, setAnimatingSeequence] = useState([]); // indices of animating guesses
  const [blurring, setBlurring] = useState(new Set()); // ids of guesses that should start blurred
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [correctLetters, setCorrectLetters] = useState(new Set());
  const [isJiggling, setIsJiggling] = useState(false);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [allPuzzlesCompleted, setAllPuzzlesCompleted] = useState(false);
  const [showEndOfPlaytest, setShowEndOfPlaytest] = useState(false);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdowns = document.querySelectorAll('.mode-dropdown, .tips-dropdown');
      const buttons = document.querySelectorAll('.eye-button, .mode-toggle, .tips-button');
      
      // Check if click is outside all dropdowns and buttons
      const isOutside = ![...dropdowns, ...buttons].some(el => el.contains(event.target));
      
      if (isOutside && activeDropdown) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  // Update blur level on every guess attempt
  useEffect(() => {
    if (gameState === 'won' || gameState === 'lost') {
      setCurrentBlurLevel(0);
    } else {
      setCurrentBlurLevel(BLUR_LEVELS[Math.min(attempts, BLUR_LEVELS.length - 1)]);
    }
  }, [attempts, gameState]);

  // Reset game state when component mounts
  useEffect(() => {
    console.log('DEBUG - Initial setup');
    setCurrentBlurLevel(BLUR_LEVELS[0]);
    setBestCorrectCount(0);
  }, []);

  // Load custom puzzles
  useEffect(() => {
    const loadCustomPuzzles = async () => {
      try {
        const response = await fetch('/custom-images/manifest.json')
        if (response.ok) {
          const manifest = await response.json()
          // Sort puzzles by word length (shortest to longest)
          const sortedPuzzles = manifest.puzzles.sort((a, b) => a.answer.length - b.answer.length)
          setCustomPuzzles(sortedPuzzles)
        }
      } catch (error) {
        console.log('No custom puzzles found')
      }
    }
    loadCustomPuzzles()
  }, [])

  // Load game state from localStorage and get today's puzzle
  useEffect(() => {
    const savedStreak = localStorage.getItem('seecretStreak')
    const savedLastPlayed = localStorage.getItem('seecretLastPlayed')
    const hasSeenTutorial = localStorage.getItem('seecretTutorialSeen')
    const savedHighContrast = localStorage.getItem('seecretHighContrast')
    const lastPuzzleDate = localStorage.getItem('seecretLastPuzzleDate')
    const savedBestCount = localStorage.getItem('seecretBestCount')
    const savedPuzzleIndex = localStorage.getItem('seecretPuzzleIndex')
    const savedPuzzleTime = localStorage.getItem('seecretPuzzleTime')
    
    // Get current time in EST
    const now = new Date()
    const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const today = estTime.toDateString()
    const currentHour = estTime.getHours()
    const currentTime = estTime.getTime()
    
    // Check if it's a new day (after 9 AM EST) or if we need to set initial puzzle
    const isNewDay = !lastPuzzleDate || 
                    lastPuzzleDate !== today || 
                    (lastPuzzleDate === today && currentHour >= 9 && (!savedPuzzleTime || currentTime - parseInt(savedPuzzleTime) >= 24 * 60 * 60 * 1000))
    
    if (savedStreak) setStreak(parseInt(savedStreak))
    if (savedLastPlayed) setLastPlayed(savedLastPlayed)
    if (savedHighContrast) setHighContrastMode(savedHighContrast === 'true')
    if (savedBestCount) setBestCorrectCount(parseInt(savedBestCount))
    
    if (hasSeenTutorial) {
      setShowHowToPlay(false)
    }
    
    if (isNewDay) {
      setAttempts(0)
      setGuessHistory([])
      setGameState('playing')
      setHasWon(false)
      setGuess([])
      setErrorMessage('')
      setBestCorrectCount(0)
      localStorage.setItem('seecretLastPuzzleDate', today)
      localStorage.setItem('seecretBestCount', '0')
      localStorage.setItem('seecretPuzzleTime', currentTime.toString())
      
      // Get a new puzzle index for the day
      const newPuzzleIndex = Math.floor(Math.random() * customPuzzles.length)
      localStorage.setItem('seecretPuzzleIndex', newPuzzleIndex.toString())
    }
    
    // Load the puzzle
    const loadPuzzle = async () => {
      if (customPuzzles.length > 0) {
        const puzzleIndex = parseInt(localStorage.getItem('seecretPuzzleIndex') || '0');
        
        const customPuzzle = customPuzzles[puzzleIndex]
        setCurrentPuzzle({
          image: `/custom-images/${customPuzzle.image}`,
          answer: customPuzzle.answer.toUpperCase(),
          category: customPuzzle.category || 'Custom'
        })
      } else {
        const puzzle = getTodaysPuzzle()
        setCurrentPuzzle(puzzle)
      }
    }
    
    loadPuzzle()

    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('debug') === 'true') {
      setShowDebug(true)
    }
  }, [customPuzzles])

  useEffect(() => {
    if (showIntro) {
      document.body.classList.add('intro-active');
    } else {
      document.body.classList.remove('intro-active');
    }
  }, [showIntro]);

  // Always initialize guess to correct length on puzzle load
  useEffect(() => {
    if (currentPuzzle && currentPuzzle.answer) {
      setGuess(Array(currentPuzzle.answer.length).fill(''));
    }
  }, [currentPuzzle]);

  // Focus the form and first input on mount, after each guess, and after attempts changes
  useEffect(() => {
    if (currentPuzzle && currentPuzzle.answer && !showIntro) {
      setTimeout(() => {
        if (formRef.current) formRef.current.focus();
        if (inputRefs.current[0]) inputRefs.current[0].focus();
      }, 100);
    }
  }, [currentPuzzle, attempts, showIntro]);

  // Prevent focus from leaving the letter boxes
  useEffect(() => {
    if (!currentPuzzle || !currentPuzzle.answer || showIntro) return;
    function handleDocumentBlur(e) {
      setTimeout(() => {
        // If nothing is focused or focus is outside the guess inputs, refocus
        const active = document.activeElement;
        const isInput = inputRefs.current.some(ref => ref === active);
        if (!isInput) {
          const firstEmpty = guess.findIndex(l => !l);
          if (firstEmpty !== -1 && inputRefs.current[firstEmpty]) {
            inputRefs.current[firstEmpty].focus();
          } else if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
          }
        }
      }, 10);
    }
    window.addEventListener('blur', handleDocumentBlur, true);
    return () => window.removeEventListener('blur', handleDocumentBlur, true);
  }, [currentPuzzle, guess, showIntro]);

  // Handler to focus the form on keydown
  const handleFormKeyDown = (e) => {
    if (gameState !== 'playing') return;
    
    // Only handle letter keys, backspace, and enter
    const key = e.key.toUpperCase();
    const isLetter = /^[A-Z]$/.test(key);
    
    if (isLetter) {
      e.preventDefault();
      if (currentLetterIndex < currentPuzzle.answer.length) {
        const newGuess = [...guess];
        newGuess[currentLetterIndex] = key;
        setGuess(newGuess);
        setCurrentLetterIndex(Math.min(currentLetterIndex + 1, currentPuzzle.answer.length - 1));
      }
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      if (currentLetterIndex > 0 || guess[currentLetterIndex]) {
        const newGuess = [...guess];
        if (guess[currentLetterIndex]) {
          // If there's a letter at current position, remove it
          newGuess[currentLetterIndex] = '';
        } else {
          // Otherwise, remove the previous letter and move back
          newGuess[currentLetterIndex - 1] = '';
          setCurrentLetterIndex(Math.max(0, currentLetterIndex - 1));
        }
        setGuess(newGuess);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleGuess(e);
    }
  };

  // Calculate correct letters in current guess
  const getCorrectLetterCount = (guessWord, answer) => {
    let count = 0;
    console.log('DEBUG - Comparing words:', { guessWord, answer });
    
    // Ensure both strings are uppercase for comparison
    const upperGuess = guessWord.toUpperCase();
    const upperAnswer = answer.toUpperCase();
    
    // Only count letters that are in the correct position
    for (let i = 0; i < upperGuess.length; i++) {
      if (upperGuess[i] === upperAnswer[i]) {
        count++;
        console.log(`DEBUG - Match at position ${i}: ${upperGuess[i]}`);
      }
    }
    console.log(`DEBUG - Total matches: ${count}`);
    return count;
  }

  // Check if a guess has any correct letters
  const hasCorrectLetters = (guess) => {
    const upperGuess = guess.toUpperCase();
    const upperAnswer = currentPuzzle.answer.toUpperCase();
    
    for (let i = 0; i < upperGuess.length; i++) {
      if (upperGuess[i] === upperAnswer[i]) {
        return true;
      }
    }
    return false;
  }

  // Helper to get the value for each box
  const getBoxValue = (index) => guess[index] || '';

  // Update the getCorrectLetters function to avoid double counting letters
  const getCorrectLetters = (guess) => {
    const upperGuess = guess.toUpperCase();
    const upperAnswer = currentPuzzle.answer.toUpperCase();
    const correctLetters = [];
    const usedLetters = new Set(); // Track used letters to avoid double counting
    for (let i = 0; i < upperGuess.length; i++) {
      if (upperAnswer.includes(upperGuess[i]) && !usedLetters.has(upperGuess[i])) {
        correctLetters.push(upperGuess[i]);
        usedLetters.add(upperGuess[i]);
      }
    }
    return correctLetters;
  };

  // Add this new function to handle error display
  const showError = (message) => {
    setErrorMessage(message);
    setIsJiggling(true);
    // Clear error message after animation
    setTimeout(() => {
      setErrorMessage('');
    }, 2000);
    // Remove jiggle class after animation
    setTimeout(() => {
      setIsJiggling(false);
    }, 500);
  };

  // Add this function to check if current puzzle is the chandelier
  const isChandelierPuzzle = () => {
    return currentPuzzle && currentPuzzle.answer === 'CHANDELIER';
  };

  // Modify handleGuess to show end of playtest modal
  const handleGuess = async (event) => {
    event.preventDefault();
    if (gameState !== 'playing') return;
    setErrorMessage('');
    const normalizedGuess = guess.join('').toUpperCase();
    console.log('DEBUG - Normalized guess:', normalizedGuess);
    
    // Check if the guess length matches the answer length
    if (normalizedGuess.length !== currentPuzzle.answer.length) {
      showError(`Your guess must be ${currentPuzzle.answer.length} letters long`);
      return;
    }
    
    // Check if the guess is a valid word
    const isValid = await isValidWord(normalizedGuess.toLowerCase());
    if (!isValid) {
      showError('Not in word list');
      return;
    }

    const answerCapitalized = currentPuzzle.answer.toUpperCase();
    console.log('DEBUG - Answer:', answerCapitalized);

    // Update correct letters set
    const newCorrectLetters = new Set(correctLetters);
    for (let i = 0; i < normalizedGuess.length; i++) {
      if (answerCapitalized.includes(normalizedGuess[i])) {
        newCorrectLetters.add(normalizedGuess[i]);
      }
    }
    setCorrectLetters(newCorrectLetters);

    // Calculate correct letters in current guess (only exact position matches)
    const correctCount = getCorrectLetterCount(normalizedGuess, answerCapitalized);
    console.log('DEBUG - Current state:', {
      guess: normalizedGuess,
      answer: answerCapitalized,
      correctCount,
      bestCorrectCount,
      currentBlurLevel
    });

    // Only update best correct count if we have more correct letters than before
    if (correctCount > bestCorrectCount) {
      console.log('DEBUG - Improving blur level:', {
        oldCount: bestCorrectCount,
        newCount: correctCount,
        oldBlur: currentBlurLevel,
        newBlur: BLUR_LEVELS[correctCount]
      });
      setBestCorrectCount(correctCount);
      localStorage.setItem('seecretBestCount', correctCount.toString());
    }

    // Add guess to history and update last guess index for animation
    const guessId = Date.now() + Math.random();
    setGuessHistory(prev => [...prev, { id: guessId, guess: normalizedGuess }]);
    setLastGuessIndex(attempts);

    if (normalizedGuess === answerCapitalized) {
      console.log('DEBUG - Word matched! Game won!');
      setGameState('won');
      setBestCorrectCount(answerCapitalized.length);
      const newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem('seecretStreak', newStreak.toString());
      localStorage.setItem('seecretLastPlayed', new Date().toDateString());
      setHasWon(true);
      setShowWelcomeModal(false);
      
      // Show end of playtest modal for chandelier puzzle
      if (isChandelierPuzzle()) {
        setShowEndOfPlaytest(true);
      } else {
        setShowShareModal(true);
      }
      
      localStorage.setItem('seecretTutorialSeen', 'true');
      
      // Trigger confetti effect
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } else {
      setAttempts(attempts + 1);
      if (attempts + 1 >= MAX_ATTEMPTS) {
        setGameState('lost');
      }
    }
    
    // Only reset guess if not won
    if (normalizedGuess !== answerCapitalized) {
      setGuess(Array(currentPuzzle.answer.length).fill(''));
      setCurrentLetterIndex(0); // Reset to first position for next guess
    }
  };

  const handlePlayAgain = () => {
    // Reset all game state
    setAttempts(0);
    setGuessHistory([]);
    setGameState('playing');
    setHasWon(false);
    // Only reset guess if not won
    if (gameState !== 'won') {
      setGuess(Array(currentPuzzle.answer.length).fill(''));
    }
    setErrorMessage('');
    setBestCorrectCount(0);
    setCurrentBlurLevel(BLUR_LEVELS[0]);
    setShowShareModal(false);
    setCurrentLetterIndex(0); // Reset to first position
    
    // Reset localStorage for the current puzzle
    localStorage.setItem('seecretBestCount', '0');
  };

  const handleIntroClick = () => {
    const eye = document.querySelector('.eye');
    if (eye) {
      eye.classList.add('blinking');
      // Wait for blink animation to complete before fading out
      setTimeout(() => {
        setShowIntro(false);
      }, 800); // Match this with the blink animation duration
    } else {
      setShowIntro(false);
    }
  };

  // Keep the eye movement handler
  const handleEyeMovement = (e) => {
    if (!showIntro) return;

    const eye = document.querySelector('.eye');
    const pupil = document.querySelector('.eye-pupil');
    
    if (!eye || !pupil) return;

    const eyeRect = eye.getBoundingClientRect();
    const eyeCenterX = eyeRect.left + eyeRect.width / 2;
    const eyeCenterY = eyeRect.top + eyeRect.height / 2;

    // Calculate angle between eye center and cursor
    const angle = Math.atan2(e.clientY - eyeCenterY, e.clientX - eyeCenterX);

    // Calculate distance from center (limited to 20px max movement)
    const distance = Math.min(
      20,
      Math.hypot(e.clientX - eyeCenterX, e.clientY - eyeCenterY) / 5
    );

    // Convert polar coordinates to x/y offset
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    pupil.style.transform = `translate(${x}px, ${y}px)`;
  };

  // Add mousemove event listener
  useEffect(() => {
    if (showIntro) {
      window.addEventListener('mousemove', handleEyeMovement);
      return () => window.removeEventListener('mousemove', handleEyeMovement);
    }
  }, [showIntro]);

  // Animate SEEQUENCE letters when a new guess is added
  useEffect(() => {
    if (guessHistory.length === 0) return;
    const newId = guessHistory[guessHistory.length - 1].id;
    setBlurring(prev => new Set(prev).add(newId));
    const timeout = setTimeout(() => {
      setBlurring(prev => {
        const updated = new Set(prev);
        updated.delete(newId);
        return updated;
      });
    }, 30); // allow one tick for blur to render, then unblur
    return () => clearTimeout(timeout);
  }, [guessHistory.length]);

  // Update the useEffect that handles game state changes
  useEffect(() => {
    if (gameState === 'lost') {
      setShowGameOverModal(true);
    }
  }, [gameState]);

  // Add effect to handle attempt animation
  useEffect(() => {
    if (attempts > 0) {
      setIsAttemptAnimating(true);
      const timer = setTimeout(() => {
        setIsAttemptAnimating(false);
      }, 500); // Match this with animation duration
      return () => clearTimeout(timer);
    }
  }, [attempts]);

  // Add keyboard click handler
  const handleKeyboardClick = (key) => {
    if (gameState !== 'playing') return;

    if (key === '⌫') {
      // Handle backspace
      if (currentLetterIndex > 0 || guess[currentLetterIndex]) {
        const newGuess = [...guess];
        if (guess[currentLetterIndex]) {
          // If there's a letter at current position, remove it
          newGuess[currentLetterIndex] = '';
        } else {
          // Otherwise, remove the previous letter and move back
          newGuess[currentLetterIndex - 1] = '';
          setCurrentLetterIndex(Math.max(0, currentLetterIndex - 1));
        }
        setGuess(newGuess);
      }
    } else if (key === 'ENTER') {
      // Handle enter
      handleGuess({ preventDefault: () => {} });
    } else {
      // Handle letter input
      if (currentLetterIndex < currentPuzzle.answer.length) {
        const newGuess = [...guess];
        newGuess[currentLetterIndex] = key;
        setGuess(newGuess);
        setCurrentLetterIndex(Math.min(currentLetterIndex + 1, currentPuzzle.answer.length - 1));
      }
    }
  };

  // Update input change handler to maintain currentLetterIndex
  const handleInputChange = (e, index) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
    const newGuess = [...guess];
    newGuess[index] = val;
    setGuess(newGuess);
    setErrorMessage('');
    if (val && index < currentPuzzle.answer.length - 1) {
      setCurrentLetterIndex(index + 1);
      const next = inputRefs.current[index + 1];
      if (next) next.focus();
    }
  };

  // Add this function to handle next puzzle
  const handleNextPuzzle = () => {
    const nextIndex = currentPuzzleIndex + 1;
    if (nextIndex < customPuzzles.length) {
      setCurrentPuzzleIndex(nextIndex);
      setCurrentPuzzle({
        image: `/custom-images/${customPuzzles[nextIndex].image}`,
        answer: customPuzzles[nextIndex].answer.toUpperCase(),
        category: customPuzzles[nextIndex].category || 'Custom'
      });
      setCorrectLetters(new Set()); // Reset correct letters
      setCurrentLetterIndex(0); // Reset to first position
      handlePlayAgain();
    } else {
      setAllPuzzlesCompleted(true);
    }
  };

  if (!currentPuzzle) return <div>Loading...</div>

  // Show debug view if enabled
  if (showDebug) {
    return <PuzzleDebug />
  }

  const tutorialContent = (
    <div className="tutorial-content">
      <h2>HOW TO PLAY SEECRET</h2>
      <p className="tutorial-tagline">Guess the word. Reveal the image. One letter at a time.</p>
      
      <div className="examples-section">
        <div className="example-item">
          <div className="example-image" style={{ filter: 'blur(20px)' }}>
            <img src="examples/lake.jpg" alt="Lake example" />
          </div>
          <div className="example-letter-boxes">
            <div className="example-letter-box">P</div>
            <div className="example-letter-box">O</div>
            <div className="example-letter-box">N</div>
            <div className="example-letter-box">D</div>
          </div>
        </div>

        <div className="example-item">
          <div className="example-image" style={{ filter: 'blur(4px)' }}>
            <img src="examples/lake.jpg" alt="Lake example" />
          </div>
          <div className="example-letter-boxes">
            <div className="example-letter-box correct">L</div>
            <div className="example-letter-box correct">A</div>
            <div className="example-letter-box">N</div>
            <div className="example-letter-box">D</div>
          </div>
        </div>

        <div className="example-item">
          <div className="example-image" style={{ filter: 'blur(0px)' }}>
            <img src="examples/lake.jpg" alt="Lake example" />
            <div className="example-label">Correct!</div>
          </div>
          <div className="example-letter-boxes">
            <div className="example-letter-box correct">L</div>
            <div className="example-letter-box correct">A</div>
            <div className="example-letter-box correct">K</div>
            <div className="example-letter-box correct">E</div>
          </div>
        </div>
      </div>

      <ul>
        <li>Guess the hidden word in <strong>6 tries</strong></li>
        <li>Each guess must be a <strong>real English word</strong> with the correct number of letters</li>
        <li>The image gets <strong>clearer with each guess</strong></li>
        <li>Only <strong>correct</strong> letters are highlighted on the <strong>keyboard</strong></li>
        <li>A new <em>Seecret</em> drops every day — come back to keep your <strong>streak</strong> alive!</li>
      </ul>
    </div>
  );

  return (
    <>
      {showIntro && (
        <div className="intro-overlay" onClick={handleIntroClick}>
          <h1 className="intro-title">SEECRET</h1>
          <div className="eye-container">
            <div className="eye">
              <div className="eye-pupil"></div>
            </div>
          </div>
          <p className="intro-subtitle">Can you See it?</p>
          <p className="intro-click">click to begin</p>
        </div>
      )}
      
      <header className="header-banner">
        <div className="header-content">
          <div className="header-left">
            <h1>Seecret</h1>
          </div>
          <div className="header-buttons">
            <button 
              className="help-button" 
              onClick={() => {
                setActiveDropdown(null);
                setShowHowToPlay(true);
              }}
              aria-label="Show how to play"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="game-container">
        <div className="game-main-content">
          <div className="center-content">
            <div className="image-section">
        <div className="image-container">
          <img 
            src={currentPuzzle.image}
            alt="Guess what this is"
            style={{ 
                    filter: `blur(${currentBlurLevel}px)`,
              transition: 'filter 0.5s ease-out'
            }}
          />
              </div>
        </div>

            {currentPuzzle && currentPuzzle.answer && (
              <form
                className="guess-form"
                ref={formRef}
                tabIndex={0}
                onSubmit={handleGuess}
                autoComplete="off"
                onKeyDown={handleFormKeyDown}
              >
                <div className={`previous-guesses-container ${isJiggling ? 'jiggle' : ''}`}>
                {errorMessage && <div className="error-message">{errorMessage}</div>}
                    <div className="previous-guesses-grid">
                    {Array(MAX_ATTEMPTS).fill(null).map((_, attemptIndex) => {
                      const guessAtIndex = guessHistory[attemptIndex];
                      // If this is the current attempt row
                      const isCurrentAttempt = attemptIndex === attempts;
                      
                      return (
                        <div key={attemptIndex} className="previous-guess-row">
                          {Array(currentPuzzle.answer.length).fill(null).map((_, letterIndex) => {
                            // For current attempt row, show the current guess
                            const letter = isCurrentAttempt ? guess[letterIndex] : (guessAtIndex ? guessAtIndex.guess[letterIndex] : '');
                            const isActive = isCurrentAttempt && letterIndex === currentLetterIndex;
                            
                            return (
                            <div 
                                key={`${attemptIndex}-${letterIndex}`}
                              className={`previous-guess-box ${
                                  guessAtIndex ? 'completed' :
                                  isCurrentAttempt ? 'current' : 'empty'
                                } ${isActive ? 'active' : ''}`}
                            >
                              {letter}
                            </div>
                            );
                          })}
                        </div>
                      );
                    })}
                    </div>
          </div>

                {/* Add onscreen keyboard */}
                {(gameState === 'won' || gameState === 'lost') ? (
                  <div className="keyboard">
                    <div className="keyboard-row">
                      <button
                        className="keyboard-key next-puzzle-button"
                        onClick={() => {
                          setShowShareModal(false);
                          handleNextPuzzle();
                        }}
                      >
                        Next Puzzle
                      </button>
                    </div>
                  </div>
                ) : gameState === 'playing' && (
                  <div className="keyboard">
                    {KEYBOARD_ROWS.map((row, rowIndex) => (
                      <div key={rowIndex} className="keyboard-row">
                        {row.map((key) => (
                          <button
                            key={key}
                            type="button"
                            className={`keyboard-key ${key === 'ENTER' ? 'enter-key' : ''} ${key === '⌫' ? 'backspace-key' : ''} ${correctLetters.has(key) ? 'correct-letter' : ''}`}
                            onClick={() => handleKeyboardClick(key)}
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>

      {showHowToPlay && (
        <Modal 
          isOpen={showHowToPlay}
          onClose={() => {
            setShowHowToPlay(false)
            localStorage.setItem('seecretTutorialSeen', 'true')
          }}
        >
          {tutorialContent}
        </Modal>
      )}

      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title=""
      >
        <div className="share-modal-content">
          <div className="win-image-container">
            <img 
              src={currentPuzzle.image}
              alt={currentPuzzle.answer}
              style={{ filter: 'blur(0px)' }}
            />
          </div>
          <h2 className="win-title">You Cracked It!</h2>
          <p className="win-description">
            The hidden image was <strong>{currentPuzzle.answer.toUpperCase()}</strong>—and you guessed it in {guessHistory.length}!
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {!allPuzzlesCompleted && (
              <button className="share-button" onClick={() => {
                setShowShareModal(false);
                handleNextPuzzle();
              }}>Next Puzzle</button>
            )}
          </div>
        </div>
      </Modal>

      {/* Game Over Modal */}
      <Modal
        isOpen={showGameOverModal}
        onClose={() => setShowGameOverModal(false)}
      >
        <div className="game-over-modal">
          <h2>Game Over</h2>
          <p>The answer was <strong>{currentPuzzle.answer}</strong></p>
          {!allPuzzlesCompleted ? (
            <button onClick={handleNextPuzzle}>Next Puzzle</button>
          ) : (
            <>
              <p>Congratulations! You've completed all puzzles!</p>
              <button onClick={() => {
                setAllPuzzlesCompleted(false);
                setCurrentPuzzleIndex(0);
                setCurrentPuzzle({
                  image: `/custom-images/${customPuzzles[0].image}`,
                  answer: customPuzzles[0].answer.toUpperCase(),
                  category: customPuzzles[0].category || 'Custom'
                });
                handlePlayAgain();
              }}>Play Again</button>
            </>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={showEndOfPlaytest}
        onClose={() => setShowEndOfPlaytest(false)}
      >
        <div className="share-modal-content">
          <div className="win-image-container">
            <img 
              src={currentPuzzle.image}
              alt={currentPuzzle.answer}
              style={{ filter: 'blur(0px)' }}
            />
          </div>
          <h2 className="win-title">Thank You for Playing</h2>
          <p className="win-description">
            You've completed the playtest version of SEECRET!
          </p>
          <p className="win-subtext">
            Your feedback and experience help us make the game better.
          </p>
          <p className="win-subtext">
            We hope you enjoyed playing!
          </p>
        </div>
      </Modal>
    </>
  )
}

export default App 