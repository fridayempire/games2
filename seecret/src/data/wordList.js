// Comprehensive word list for the game
export const wordList = {
  colors: [
    'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Black', 'White', 'Brown', 'Pink',
    'Gray', 'Grey', 'Silver', 'Gold', 'Maroon', 'Navy', 'Teal', 'Olive', 'Lime', 'Aqua',
    'Violet', 'Indigo', 'Coral', 'Beige', 'Bronze', 'Copper'
  ],

  animals: [
    'Cat', 'Dog', 'Bird', 'Fish', 'Lion', 'Tiger', 'Bear', 'Wolf', 'Horse', 'Sheep',
    'Goat', 'Cow', 'Pig', 'Duck', 'Swan', 'Goose', 'Eagle', 'Hawk', 'Owl', 'Frog',
    'Snake', 'Whale', 'Shark', 'Mouse', 'Rabbit', 'Deer', 'Moose', 'Camel', 'Zebra',
    'Panda', 'Koala', 'Monkey', 'Turtle', 'Crab', 'Spider', 'Beetle', 'Penguin', 'Seal'
  ],

  food: [
    'Pizza', 'Salad', 'Bread', 'Pasta', 'Soup', 'Steak', 'Cake', 'Candy', 'Apple',
    'Grape', 'Peach', 'Lemon', 'Berry', 'Lunch', 'Snack', 'Fruit', 'Bacon', 'Eggs',
    'Toast', 'Chips', 'Cheese', 'Burger', 'Fries', 'Rice', 'Beans', 'Corn', 'Pear',
    'Plum', 'Melon', 'Mango', 'Sushi', 'Cookie', 'Donut', 'Bagel', 'Waffle', 'Taco'
  ],

  nature: [
    'Tree', 'Flower', 'Grass', 'Sky', 'Cloud', 'Rain', 'Snow', 'Sun', 'Moon', 'Star',
    'Lake', 'River', 'Ocean', 'Beach', 'Wave', 'Storm', 'Wind', 'Leaf', 'Rock', 'Stone',
    'Mountain', 'Hill', 'Valley', 'Field', 'Forest', 'Woods', 'Desert', 'Island', 'Cave',
    'Stream', 'Creek', 'Garden', 'Plant', 'Bush', 'Vine', 'Weed', 'Moss', 'Sand'
  ],

  buildings: [
    'House', 'Tower', 'Bridge', 'Store', 'Hotel', 'School', 'Church', 'Temple', 'Castle',
    'Palace', 'Cabin', 'Shed', 'Barn', 'Shop', 'Mall', 'Bank', 'Cafe', 'Park', 'Gym',
    'Pool', 'Dock', 'Port', 'Gate', 'Wall', 'Fence', 'Door', 'Room', 'Hall', 'Stairs',
    'Roof', 'Floor', 'Home', 'Porch', 'Deck', 'Yard', 'Path', 'Road', 'Street'
  ],

  objects: [
    'Book', 'Desk', 'Chair', 'Table', 'Phone', 'Clock', 'Watch', 'Ring', 'Keys', 'Lamp',
    'Ball', 'Toy', 'Game', 'Card', 'Pen', 'Cup', 'Bowl', 'Plate', 'Fork', 'Spoon',
    'Knife', 'Glass', 'Box', 'Bag', 'Hat', 'Coat', 'Shoe', 'Boot', 'Sock', 'Belt',
    'Lock', 'Tool', 'Wire', 'Rope', 'Chain', 'Tape', 'Brush', 'Soap', 'Fan'
  ],

  weather: [
    'Rain', 'Snow', 'Wind', 'Storm', 'Fog', 'Mist', 'Hail', 'Ice', 'Heat', 'Cold',
    'Warm', 'Cool', 'Sunny', 'Cloud', 'Dark', 'Dawn', 'Dusk', 'Day', 'Night', 'Frost'
  ],

  vehicles: [
    'Car', 'Bike', 'Boat', 'Ship', 'Plane', 'Train', 'Bus', 'Taxi', 'Truck', 'Van',
    'Cart', 'Sled', 'Jet', 'Tank', 'Raft', 'Yacht', 'Wagon', 'Cycle'
  ],

  clothes: [
    'Shirt', 'Pants', 'Dress', 'Skirt', 'Coat', 'Hat', 'Shoe', 'Boot', 'Sock', 'Belt',
    'Scarf', 'Glove', 'Cape', 'Vest', 'Suit', 'Gown', 'Robe', 'Mask', 'Cap', 'Hood'
  ],

  common: [
    'Time', 'Day', 'Year', 'Week', 'Month', 'Life', 'Work', 'Play', 'Rest', 'Sleep',
    'Walk', 'Run', 'Jump', 'Swim', 'Fly', 'Fall', 'Sit', 'Stand', 'Move', 'Stop',
    'Start', 'End', 'Turn', 'Spin', 'Roll', 'Drop', 'Push', 'Pull', 'Open', 'Close',
    'Good', 'Bad', 'Big', 'Small', 'Fast', 'Slow', 'Hot', 'Cold', 'New', 'Old',
    'Young', 'Long', 'Short', 'High', 'Low', 'Hard', 'Soft', 'Light', 'Dark', 'Loud',
    'Quiet', 'Clean', 'Dirty', 'Full', 'Empty', 'Rich', 'Poor', 'Safe', 'Wild'
  ]
};

// Create a single Set of all words for quick lookup
export const allWords = new Set(
  Object.values(wordList).flat()
); 