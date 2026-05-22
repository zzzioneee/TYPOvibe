// Day 22 v2 — Glory and Joy
// Flowers + text with rotating circular regions (like vinyl records)
// Each "disc" clips a portion and rotates it independently

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = 1920, H = 1080;

// ── Source canvas (flowers + text, static) ──────────────
const srcCanvas = document.createElement('canvas');
srcCanvas.width = W; srcCanvas.height = H;
const srcCtx = srcCanvas.getContext('2d');

// ── Flower colors ───────────────────────────────────────
const FLOWER_COLORS = [
  ['#ff1493', '#ff8c00'],
  ['#00bfff', '#0044ff'],
  ['#7fff00', '#ffff00'],
  ['#ff4500', '#ff69b4'],
  ['#00ced1', '#00ff7f'],
  ['#ff1493', '#ff4500'],
  ['#4169e1', '#00bfff'],
  ['#ff6600', '#ffcc00'],
];

function drawFlower(c, cx, cy, size, petals, colorPair, rotation) {
  const [c1, c2] = colorPair;
  const grad = c.createLinearGradient(cx - size, cy - size, cx + size, cy + size);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  c.save();
  c.translate(cx, cy);
  c.rotate(rotation);
  c.fillStyle = grad;
  c.beginPath();
  for (let i = 0; i < petals; i++) {
    const angle = (i / petals) * Math.PI * 2;
    const px = Math.cos(angle) * size * 0.45;
    const py = Math.sin(angle) * size * 0.45;
    c.moveTo(0, 0);
    c.ellipse(px, py, size * 0.42, size * 0.2, angle, 0, Math.PI * 2);
  }
  c.fill();
  c.fillStyle = '#fff';
  c.beginPath();
  c.arc(0, 0, size * 0.1, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

// ── Generate flowers ────────────────────────────────────
const flowers = [];
for (let i = 0; i < 20; i++) {
  flowers.push({
    x: 80 + Math.random() * (W - 160),
    y: 60 + Math.random() * (H - 120),
    size: 100 + Math.random() * 300,
    petals: Math.floor(4 + Math.random() * 5),
    color: FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)],
    rotation: Math.random() * Math.PI * 2,
  });
}

// ── Draw static source (flowers + text) ─────────────────
function drawSource() {
  srcCtx.fillStyle = '#fff';
  srcCtx.fillRect(0, 0, W, H);
  for (const f of flowers) {
    drawFlower(srcCtx, f.x, f.y, f.size, f.petals, f.color, f.rotation);
  }
  // Text
  srcCtx.font = '900 200px "Inter", sans-serif';
  srcCtx.fillStyle = '#111';
  srcCtx.textBaseline = 'top';
  srcCtx.textAlign = 'left';
  srcCtx.fillText('Glory', 80, 180);
  srcCtx.textAlign = 'center';
  srcCtx.fillText('and', W * 0.55, 440);
  srcCtx.textAlign = 'right';
  srcCtx.fillText('Joy', W - 80, 700);
}

// ── Rotating discs — different sizes, speeds, positions ──
// Placed so text is partially inside / partially outside discs
const DISCS = [
  { cx: 350,  cy: 250,  r: 280, speed: 0.3,  strength: 1.0 },  // over "Glo" part
  { cx: 1500, cy: 200,  r: 220, speed: -0.4, strength: 0.7 },  // top-right
  { cx: 900,  cy: 550,  r: 320, speed: 0.2,  strength: 0.9 },  // center, over "and"
  { cx: 1550, cy: 750,  r: 260, speed: -0.25,strength: 0.8 },  // over "Joy" partial
  { cx: 200,  cy: 850,  r: 200, speed: 0.35, strength: 0.6 },  // bottom-left
  { cx: 1100, cy: 150,  r: 180, speed: -0.5, strength: 0.5 },  // small, top
];

// ── Animation ───────────────────────────────────────────
let startTime = 0;
let sourceReady = false;

function render(now) {
  requestAnimationFrame(render);
  if (!sourceReady) return;

  const elapsed = (now - startTime) * 0.001; // seconds

  ctx.clearRect(0, 0, W, H);

  // 1. Draw original source as background (unrotated)
  ctx.drawImage(srcCanvas, 0, 0);

  // 2. For each disc, clip a circle and draw rotated source
  for (const disc of DISCS) {
    const angle = elapsed * disc.speed * disc.strength;

    ctx.save();
    // Clip to circle
    ctx.beginPath();
    ctx.arc(disc.cx, disc.cy, disc.r, 0, Math.PI * 2);
    ctx.clip();

    // Rotate around disc center
    ctx.translate(disc.cx, disc.cy);
    ctx.rotate(angle);
    ctx.translate(-disc.cx, -disc.cy);

    // Draw the source image (rotated within the clip)
    ctx.drawImage(srcCanvas, 0, 0);

    ctx.restore();
  }
}

// ── Resize (fit to viewport) ────────────────────────────
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const scale = Math.min(vw / W, vh / H);
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = (W * scale) + 'px';
  canvas.style.height = (H * scale) + 'px';
  canvas.style.position = 'absolute';
  canvas.style.left = ((vw - W * scale) / 2) + 'px';
  canvas.style.top = ((vh - H * scale) / 2) + 'px';
}

// ── Start ───────────────────────────────────────────────
document.fonts.ready.then(() => {
  resize();
  window.addEventListener('resize', resize);
  drawSource();
  sourceReady = true;
  startTime = performance.now();
  requestAnimationFrame(render);
});
