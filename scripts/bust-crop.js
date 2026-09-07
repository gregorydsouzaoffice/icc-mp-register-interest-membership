const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const DIR = path.join(__dirname, '..', 'assets', 'council');
const FILES = [
  'ankit-mehta.png',
  'ankit-agrawal.png',
  'priyesh-nagar.png',
  'saksham-agrawal.png',
  'ankur-khaitan.png'
];

function subjectBox(png) {
  const { width, height, data } = png;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = data[i + 3];
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (a > 24 && lum > 14) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, maxX, maxY, subW: maxX - minX + 1, subH: maxY - minY + 1 };
}

function crop(png, x, y, w, h) {
  x = Math.max(0, Math.round(x));
  y = Math.max(0, Math.round(y));
  w = Math.min(Math.round(w), png.width - x);
  h = Math.min(Math.round(h), png.height - y);
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(png, out, x, y, w, h, 0, 0);
  return out;
}

for (const file of FILES) {
  const filePath = path.join(DIR, file);
  const png = PNG.sync.read(fs.readFileSync(filePath));
  const box = subjectBox(png);
  let out;

  if (png.width > png.height) {
    const h = png.height;
    const w = Math.round(h * 0.9);
    const x = Math.max(0, Math.round((box.minX + box.maxX) / 2 - w / 2));
    out = crop(png, Math.min(x, png.width - w), 0, w, h);
  } else {
    const w = Math.min(png.width, Math.round(box.subW * 1.2));
    const h = Math.round(w * 1.15);
    const x = (box.minX + box.maxX) / 2 - w / 2;
    const y = box.minY - h * 0.05;
    out = crop(png, x, y, w, h);
  }

  fs.writeFileSync(filePath, PNG.sync.write(out));
  console.log(`${file}  ${png.width}x${png.height} -> ${out.width}x${out.height}  subject y=${box.minY} ${box.subW}x${box.subH}`);
}
