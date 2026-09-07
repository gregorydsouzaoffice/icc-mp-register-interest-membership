const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');

const SRC = 'C:\\Users\\admin\\.cursor\\projects\\c-Users-admin-Documents-Imagine-new-MP\\assets';
const DEST = path.join(__dirname, '..', 'assets', 'council');

const PEOPLE = {
  'parthiv-neotia': 'parthiv-neotia.png',
  'keshav-bhajanka': 'keshav-bhajanka.png',
  'brij-bhushan-agarwal': 'brij-bhushan-agarwal.png',
  'ankit-mehta': 'ankit-mehta.png',
  'tapan-agrawal': 'tapan-agrawal.png',
  'ankur-khaitan': 'ankur-khaitan.png',
  'ankit-agrawal': 'ankit-agrawal.png',
  'minaal-sahlot': 'minaal-sahlot.png',
  'priyesh-nagar': 'priyesh-nagar.png',
  'rishabh-mehta': 'rishabh-mehta.png',
  'saksham-agrawal': 'saksham-agrawal.png',
  'sarthak-doshi': 'sarthak-doshi.png',
  'shanu-mehta': 'shanu-mehta.png',
  'siddharth-bhargav': 'siddharth-bhargav.png',
  'sumit-ghorawat': 'sumit-ghorawat.png',
  'udit-birla': 'udit-birla.png'
};

function lum(data, i) {
  return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
}

function detectBg(png) {
  const { width, height, data } = png;
  const samples = [];
  const box = Math.max(4, Math.min(12, Math.floor(Math.min(width, height) / 40)));
  const corners = [
    [0, 0],
    [width - box, 0],
    [0, height - box],
    [width - box, height - box]
  ];
  for (const [sx, sy] of corners) {
    for (let y = sy; y < sy + box; y++) {
      for (let x = sx; x < sx + box; x++) {
        samples.push(lum(data, (y * width + x) * 4));
      }
    }
  }
  samples.sort((a, b) => a - b);
  const mid = samples[Math.floor(samples.length / 2)];
  if (mid < 70) return 'dark';
  if (mid > 190) return 'light';
  return mid < 128 ? 'dark' : 'light';
}

function trimPng(buf) {
  const marker = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
  const idx = buf.indexOf(marker);
  if (idx >= 0) return buf.subarray(0, idx + marker.length);
  return buf;
}

function readImage(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf[0] === 0xFF && buf[1] === 0xD8) {
    const decoded = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true });
    const png = new PNG({ width: decoded.width, height: decoded.height });
    png.data = Buffer.from(decoded.data);
    return png;
  }
  try {
    return PNG.sync.read(trimPng(buf));
  } catch (err) {
    const decoded = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true });
    const png = new PNG({ width: decoded.width, height: decoded.height });
    png.data = Buffer.from(decoded.data);
    return png;
  }
}

function isBgPixel(data, i, mode) {
  const l = lum(data, i);
  if (mode === 'dark') return l < 42;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  return l > 236 && Math.abs(r - g) < 16 && Math.abs(g - b) < 16;
}

function knockOut(png, mode) {
  if (mode === 'none') return;
  const { width, height, data } = png;
  const visited = new Uint8Array(width * height);
  const qx = new Int32Array(width * height);
  const qy = new Int32Array(width * height);
  let qh = 0;
  let qt = 0;

  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (visited[p]) return;
    visited[p] = 1;
    if (!isBgPixel(data, p * 4, mode)) return;
    qx[qt] = x;
    qy[qt] = y;
    qt++;
  };

  for (let x = 0; x < width; x++) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (qh < qt) {
    const x = qx[qh];
    const y = qy[qh];
    qh++;
    data[(y * width + x) * 4 + 3] = 0;
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] === 0) continue;
      const neighbors = [
        ((y - 1) * width + x) * 4,
        ((y + 1) * width + x) * 4,
        (y * width + x - 1) * 4,
        (y * width + x + 1) * 4
      ];
      const nearHole = neighbors.some((n) => data[n + 3] === 0);
      if (!nearHole) continue;
      const l = lum(data, i);
      if (mode === 'dark' && l < 70) {
        data[i + 3] = Math.max(0, Math.round(((l - 42) / 28) * 255));
      }
      if (mode === 'light' && l > 210) {
        data[i + 3] = Math.max(0, Math.round(((236 - l) / 26) * 255));
      }
    }
  }
}

fs.mkdirSync(DEST, { recursive: true });

if (process.argv[2]) {
  const srcPath = process.argv[2];
  const destPath = process.argv[3];
  const png = readImage(srcPath);
  const mode = process.argv[4] || detectBg(png);
  knockOut(png, mode);
  fs.writeFileSync(destPath, PNG.sync.write(png));
  console.log(`${path.basename(destPath)}  (${mode} bg, ${png.width}x${png.height})`);
  process.exit(0);
}

const files = fs.readdirSync(SRC);

for (const [key, destName] of Object.entries(PEOPLE)) {
  const found = files.find((f) => f.includes(`_${key}-`) && f.endsWith('.png'));
  if (!found) {
    console.error('MISSING', key);
    continue;
  }
  const srcPath = path.join(SRC, found);
  const destPath = path.join(DEST, destName);
  let png;
  try {
    png = readImage(srcPath);
  } catch (err) {
    console.error('READ FAIL', key, err.message);
    fs.copyFileSync(srcPath, destPath);
    continue;
  }
  const mode = detectBg(png);
  knockOut(png, mode);
  fs.writeFileSync(destPath, PNG.sync.write(png));
  console.log(`${destName}  (${mode} bg, ${png.width}x${png.height})`);
}
