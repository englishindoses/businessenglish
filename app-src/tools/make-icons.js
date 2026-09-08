/**
 * Placeholder app icons.
 *
 * Draws a simple mark in the course colours (teal ground, white speech bubble,
 * coral dot) and writes PNGs with no external dependencies.
 *
 * These are stand-ins. When the real logo arrives, replace the three PNGs in
 * public/icons/ and this script can be deleted.
 *
 *   npm run icons
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, '..', 'public', 'icons');

const TEAL = [45, 106, 106];
const TEAL_LIGHT = [61, 138, 138];
const CORAL = [232, 122, 93];
const WHITE = [255, 255, 255];

// ---------- tiny PNG writer ----------

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Each scanline is prefixed with filter byte 0 (none).
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- drawing (supersampled, then averaged down) ----------

const SS = 4; // supersample factor

function makeCanvas(size) {
  return { size, px: new Float64Array(size * size * 4) };
}

function blend(canvas, x, y, colour, alpha) {
  if (alpha <= 0) return;
  const i = (y * canvas.size + x) * 4;
  const p = canvas.px;
  const a = Math.min(1, alpha);
  p[i] = p[i] * (1 - a) + colour[0] * a;
  p[i + 1] = p[i + 1] * (1 - a) + colour[1] * a;
  p[i + 2] = p[i + 2] * (1 - a) + colour[2] * a;
  p[i + 3] = p[i + 3] * (1 - a) + 255 * a;
}

function fillRoundedRect(canvas, x0, y0, w, h, radius, colourAt) {
  const x1 = x0 + w;
  const y1 = y0 + h;
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
      // distance from the rounded rectangle's inner box
      const dx = Math.max(x0 + radius - x, 0, x - (x1 - radius));
      const dy = Math.max(y0 + radius - y, 0, y - (y1 - radius));
      if (Math.hypot(dx, dy) > radius) continue;
      blend(canvas, x, y, colourAt(x, y), 1);
    }
  }
}

function fillCircle(canvas, cx, cy, r, colour) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (x < 0 || y < 0 || x >= canvas.size || y >= canvas.size) continue;
      if (Math.hypot(x - cx, y - cy) > r) continue;
      blend(canvas, x, y, colour, 1);
    }
  }
}

function fillTriangle(canvas, pts, colour) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const sign = (a, b, c) => (a[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (a[1] - c[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      if (x < 0 || y < 0 || x >= canvas.size || y >= canvas.size) continue;
      const p = [x, y];
      const d1 = sign(p, pts[0], pts[1]);
      const d2 = sign(p, pts[1], pts[2]);
      const d3 = sign(p, pts[2], pts[0]);
      const neg = d1 < 0 || d2 < 0 || d3 < 0;
      const pos = d1 > 0 || d2 > 0 || d3 > 0;
      if (neg && pos) continue;
      blend(canvas, x, y, colour, 1);
    }
  }
}

function downsample(canvas, size) {
  const out = Buffer.alloc(size * size * 4);
  const p = canvas.px;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * canvas.size + (x * SS + sx)) * 4;
          r += p[i];
          g += p[i + 1];
          b += p[i + 2];
          a += p[i + 3];
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = Math.round(a / n);
    }
  }
  return out;
}

/**
 * @param {number} size      output pixel size
 * @param {number} inset     0 = mark fills the icon, 0.1 = 10% padding all round
 * @param {boolean} squareBg true for maskable icons, which must not be rounded
 */
function drawIcon(size, inset, squareBg) {
  const S = size * SS;
  const canvas = makeCanvas(S);

  // Ground: vertical teal gradient, matching the lesson page headers.
  const bgRadius = squareBg ? 0 : S * 0.22;
  fillRoundedRect(canvas, 0, 0, S, S, bgRadius, (x, y) => {
    const t = (x / S) * 0.35 + (y / S) * 0.65;
    return [
      TEAL[0] + (TEAL_LIGHT[0] - TEAL[0]) * t,
      TEAL[1] + (TEAL_LIGHT[1] - TEAL[1]) * t,
      TEAL[2] + (TEAL_LIGHT[2] - TEAL[2]) * t,
    ];
  });

  // Speech bubble, centred within the safe area.
  const pad = S * inset;
  const inner = S - pad * 2;
  const bw = inner * 0.72;
  const bh = inner * 0.54;
  const bx = pad + (inner - bw) / 2;
  const by = pad + inner * 0.12;

  fillRoundedRect(canvas, bx, by, bw, bh, bh * 0.28, () => WHITE);
  fillTriangle(
    canvas,
    [
      [bx + bw * 0.24, by + bh - 1],
      [bx + bw * 0.46, by + bh - 1],
      [bx + bw * 0.27, by + bh + inner * 0.16],
    ],
    WHITE
  );

  // Three dots: two teal, one coral — "a dose at a time".
  const dotR = bh * 0.1;
  const dotY = by + bh * 0.5;
  const gap = bw * 0.22;
  const midX = bx + bw * 0.5;
  fillCircle(canvas, midX - gap, dotY, dotR, TEAL);
  fillCircle(canvas, midX, dotY, dotR, TEAL);
  fillCircle(canvas, midX + gap, dotY, dotR, CORAL);

  return encodePng(size, size, downsample(canvas, size));
}

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  ['icon-192.png', 192, 0.06, false],
  ['icon-512.png', 512, 0.06, false],
  // Maskable icons get cropped to a circle on some launchers, so the mark sits
  // inside the middle 80% and the background runs edge to edge.
  ['maskable-512.png', 512, 0.18, true],
];

for (const [name, size, inset, squareBg] of targets) {
  writeFileSync(resolve(OUT_DIR, name), drawIcon(size, inset, squareBg));
  console.log(`wrote icons/${name} (${size}x${size})`);
}
