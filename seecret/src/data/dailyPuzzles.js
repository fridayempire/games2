export const dailyPuzzles = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&w=1200&q=80",
    answer: "Coral",
    hint: "Ocean builder"
  },
  {
    id: 2,
    image: "/images/scarab.jpg",
    answer: "Scarab",
    hint: "Ancient Egyptian symbol"
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
    answer: 'Beach',
    hint: 'Sandy shore'
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
    answer: 'Salad',
    hint: 'Healthy greens'
  },
  {
    id: 5,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
    answer: 'Lunch',
    hint: 'Midday meal'
  },
  {
    id: 6,
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470',
    answer: 'Mountain',
    hint: 'Tall peak'
  },
  {
    id: 7,
    image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a',
    answer: 'Bridge',
    hint: 'River crossing'
  },
  {
    id: 8,
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470',
    answer: 'Lake',
    hint: 'Still waters',
    alternativeAnswers: ['Pond', 'Lagoon', 'Water']
  },
  {
    id: 9,
    image: 'https://images.unsplash.com/photo-1549144511-f099e773c147',
    answer: 'Tower',
    hint: 'Tall structure'
  }
];

// Function to get today's puzzle based on the date
export function getTodaysPuzzle() {
  // Get current date in EST
  const now = new Date();
  const estOffset = -4; // EST offset from UTC (adjust for daylight savings if needed)
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const est = new Date(utc + (3600000 * estOffset));
  
  // If it's before 9 AM EST, use previous day's puzzle
  const puzzleDate = new Date(est);
  if (est.getHours() < 9) {
    puzzleDate.setDate(puzzleDate.getDate() - 1);
  }
  
  // Use year, month, and day to determine puzzle
  const yearMonth = puzzleDate.getFullYear() * 12 + puzzleDate.getMonth();
  const dayOfMonth = puzzleDate.getDate();
  
  // Combine year, month, and day for consistent puzzle selection
  const puzzleIndex = ((yearMonth + dayOfMonth) % dailyPuzzles.length);
  
  return dailyPuzzles[puzzleIndex];
} 