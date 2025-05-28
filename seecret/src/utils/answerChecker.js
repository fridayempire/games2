// Function to normalize strings for comparison
const normalizeString = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ''); // Remove all whitespace
};

// Function to calculate the percentage of matching letters
const calculateLetterMatch = (str1, str2) => {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);
  
  // If strings are identical after normalization
  if (normalized1 === normalized2) return 1;
  
  // Convert strings to arrays of characters
  const chars1 = normalized1.split('');
  const chars2 = normalized2.split('');
  
  // Count matching letters
  let matches = 0;
  const maxLength = Math.max(chars1.length, chars2.length);
  
  // Compare each character
  for (let i = 0; i < maxLength; i++) {
    if (chars1[i] === chars2[i]) {
      matches++;
    }
  }
  
  // Return percentage of matching letters
  return matches / maxLength;
};

// Function to check if the guess is correct
export const checkAnswer = (guess, correctAnswer, alternativeAnswers = []) => {
  const normalizedGuess = normalizeString(guess);
  const normalizedCorrect = normalizeString(correctAnswer);
  const normalizedAlternatives = alternativeAnswers.map(normalizeString);
  
  // Check for exact match
  if (normalizedGuess === normalizedCorrect) {
    return {
      isCorrect: true,
      similarity: 1,
      feedback: ""
    };
  }
  
  // Check alternative answers
  for (const alt of normalizedAlternatives) {
    if (normalizedGuess === alt) {
      return {
        isCorrect: true,
        similarity: 1,
        feedback: ""
      };
    }
  }
  
  // Calculate similarity with correct answer
  const similarity = calculateLetterMatch(guess, correctAnswer);
  
  // Check similarity with alternative answers
  const altSimilarities = alternativeAnswers.map(alt => 
    calculateLetterMatch(guess, alt)
  );
  const maxSimilarity = Math.max(similarity, ...altSimilarities);
  
  return {
    isCorrect: false,
    similarity: maxSimilarity,
    feedback: ""
  };
}; 