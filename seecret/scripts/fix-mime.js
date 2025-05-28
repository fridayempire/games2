import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '..', 'dist');

// Create a simple _redirects file
const redirectsContent = `/* /index.html 200`;
fs.writeFileSync(path.join(distDir, '_redirects'), redirectsContent);
console.log('Created _redirects file');

// Create a simple _headers file
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
`;
fs.writeFileSync(path.join(distDir, '_headers'), headersContent);
console.log('Created _headers file'); 