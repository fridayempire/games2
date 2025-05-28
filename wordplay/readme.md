# Daily Word Guessing Game

A fun, client-side word-guessing game that displays a different image each day and challenges users to guess the associated word.

## 🎮 Features

- Daily changing images with associated word challenges
- Streak tracking using localStorage
- Responsive design with Tailwind CSS
- Celebratory animations on correct guesses
- Debug mode for testing different dates
- No backend required - fully static deployment

## 📦 Setup

1. Clone this repository
2. Add your images to the `/images` directory using the format:
   ```
   [word]_YYYY-DDD.jpg
   ```
   Example: `apple_2024-135.jpg`
3. Add a `fallback.jpg` image in the root directory
4. Open `index.html` in a browser or deploy to GitHub Pages/Netlify

## 🖼️ Image Naming Convention

- `[word]`: The answer word (e.g., "apple")
- `YYYY`: 4-digit UTC year
- `DDD`: Day of year (1-366, no leading zeros)

## 🛠️ Development

### Testing Different Dates

Use the `?day=YYYY-DDD` query parameter to test different dates:
```
http://localhost:3000/?day=2024-140
```

### Local Development

Simply serve the files using any static file server. For example:
```bash
python -m http.server 3000
```

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🎨 Customization

- Modify `style.css` for custom animations and styles
- Adjust Tailwind classes in `index.html` for layout changes
- Update confetti settings in `script.js` for different celebration effects

## 📝 License

MIT License - feel free to use and modify for your own projects! 