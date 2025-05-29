import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '..', 'dist');
const publicDir = path.join(__dirname, '..', 'public');

// Create images directory in dist if it doesn't exist
const distImagesDir = path.join(distDir, 'images');
if (!fs.existsSync(distImagesDir)) {
  fs.mkdirSync(distImagesDir, { recursive: true });
}

// Copy all images from public/images to dist/images
const publicImagesDir = path.join(publicDir, 'images');
if (fs.existsSync(publicImagesDir)) {
  const files = fs.readdirSync(publicImagesDir);
  files.forEach(file => {
    fs.copyFileSync(
      path.join(publicImagesDir, file),
      path.join(distImagesDir, file)
    );
  });
  console.log('Copied images to dist folder');
}

// Create a _redirects file for Netlify
const redirectsContent = `/* /index.html 200`;
fs.writeFileSync(path.join(distDir, '_redirects'), redirectsContent);
console.log('Created _redirects file');

// Create a _headers file for Netlify
const headersContent = `/*
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  X-Content-Type-Options: nosniff
  Cache-Control: no-cache, no-store, must-revalidate

/*.js
  Content-Type: text/javascript
  Cache-Control: no-cache, no-store, must-revalidate

/*.css
  Content-Type: text/css
  Cache-Control: no-cache, no-store, must-revalidate

/*.html
  Content-Type: text/html
  Cache-Control: no-cache, no-store, must-revalidate

/images/*
  Content-Type: image/jpeg
  Cache-Control: no-cache, no-store, must-revalidate
`;
fs.writeFileSync(path.join(distDir, '_headers'), headersContent);
console.log('Created _headers file'); 