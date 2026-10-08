// Run with: node scripts/gen-icons.cjs
// Generates minimal SVG-based PNG icons for PWA manifest
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../public/icons');
fs.mkdirSync(outDir, { recursive: true });

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();

  // Checkmark / task symbol
  const pad = size * 0.22;
  const lineW = size * 0.07;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = lineW;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Three horizontal lines (task list icon)
  const lineX = pad;
  const lineEndX = size - pad;
  const gap = (size - pad * 2) / 3;
  for (let i = 0; i < 3; i++) {
    const y = pad + gap * i + gap / 2;
    ctx.beginPath();
    ctx.moveTo(lineX, y);
    ctx.lineTo(lineEndX, y);
    ctx.stroke();
  }

  return canvas.toBuffer('image/png');
}

for (const size of [192, 512]) {
  const buf = drawIcon(size);
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), buf);
  console.log(`Generated icon-${size}.png`);
}
