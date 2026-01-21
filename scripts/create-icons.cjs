/**
 * Simple script to create placeholder icons
 * Run with: node scripts/create-icons.js
 */

const fs = require('fs');
const path = require('path');

// Simple 1x1 purple pixel PNG (minimal valid PNG)
// This is a placeholder - replace with actual icons for production
const createMinimalPng = (size) => {
  // PNG file structure for a simple colored square
  // This creates a valid but minimal PNG file

  // For simplicity, we'll create a data URL and convert it
  // In production, use proper icon files

  const canvas = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad)"/>
      <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="${size * 0.5}"
            fill="white" text-anchor="middle" dominant-baseline="middle" font-weight="bold">M</text>
    </svg>
  `;

  return canvas.trim();
};

const iconsDir = path.join(__dirname, '..', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create SVG placeholders (can be converted to PNG with tools like sharp or imagemagick)
const sizes = [16, 32, 48, 128];

sizes.forEach(size => {
  const svg = createMinimalPng(size);
  const svgPath = path.join(iconsDir, `icon${size}.svg`);
  fs.writeFileSync(svgPath, svg);
  console.log(`Created ${svgPath}`);
});

console.log('\nNote: SVG files created. For production, convert to PNG using:');
console.log('  - ImageMagick: convert icon16.svg icon16.png');
console.log('  - Or use an online converter');
console.log('\nFor development, update manifest.json to use SVG or remove icon requirements.');
