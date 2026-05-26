// Day 22 v2 — Glory and Joy
// Flowers + text with radial motion blur discs (vinyl record effect)
// Each disc: multiple rotated copies blended = circular motion blur streak

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = 1920, H = 1080;

// ── Source canvas (flowers + text, static) ──────────────
const srcCanvas = document.createElement('canvas');
srcCanvas.width = W; srcCanvas.height = H;
const srcCtx = srcCanvas.getContext('2d');

// ── Mask canvas for soft disc edges ─────────────────────
const maskCanvas = document.createElement('canvas');
maskCanvas.width = W; maskCanvas.height = H;
const maskCtx = maskCanvas.getContext('2d');

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

// ── Draw static source ──────────────────────────────────
function drawSource() {
  srcCtx.fillStyle = '#fff';
  srcCtx.fillRect(0, 0, W, H);
  for (const f of flowers) {
    drawFlower(srcCtx, f.x, f.y, f.size, f.petals, f.color, f.rotation);
  }
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

// ── Discs: varying size, speed, strength ────────────────
const DISCS = [
  { cx: 400,  cy: 300,  r: 300, speed: 0.15, blurAngle: 0.25 },  // large, slow
  { cx: 1450, cy: 250,  r: 200, speed: -0.2, blurAngle: 0.18 },  // medium, reverse
  { cx: 950,  cy: 600,  r: 350, speed: 0.1,  blurAngle: 0.3  },  // large center
  { cx: 1500, cy: 800,  r: 250, speed: -0.12,blurAngle: 0.22 },  // medium
  { cx: 250,  cy: 850,  r: 220, speed: 0.18, blurAngle: 0.15 },  // small
];

// Number of motion blur samples per disc
const BLUR_SAMPLES = 12;

// ── Animation ───────────────────────────────────────────
let startTime = 0;
let sourceReady = false;

// Temp canvas for compositing each disc's blur
const discCanvas = document.createElement('canvas');
discCanvas.width = W; discCanvas.height = H;
const discCtx = discCanvas.getContext('2d');

function render(now) {
  requestAnimationFrame(render);
  if (!sourceReady) return;

  const elapsed = (now - startTime) * 0.001;

  // Start with original source
  ctx.drawImage(srcCanvas, 0, 0);

  // For each disc, composite motion-blurred rotation on top
  for (const disc of DISCS) {
    const baseAngle = elapsed * disc.speed;

    // Clear disc temp
    discCtx.clearRect(0, 0, W, H);

    // Draw multiple rotated copies with low opacity = motion blur
    const alpha = 1.0 / BLUR_SAMPLES;
    discCtx.globalAlpha = alpha;
    
    for (let s = 0; s < BLUR_SAMPLES; s++) {
      const t = (s / (BLUR_SAMPLES - 1)) - 0.5; // -0.5 to 0.5
      const angle = baseAngle + t * disc.blurAngle;

      discCtx.save();
      discCtx.translate(disc.cx, disc.cy);
      discCtx.rotate(angle);
      discCtx.translate(-disc.cx, -disc.cy);
      discCtx.drawImage(srcCanvas, 0, 0);
      discCtx.restore();
    }
    discCtx.globalAlpha = 1.0;

    // Now composite disc onto main canvas with soft circular mask
    ctx.save();
    
    // Create soft-edge circular clip using radial gradient as mask
    // Draw disc content clipped to a soft circle
    ctx.globalCompositeOperation = 'source-over';
    
    // We'll use a trick: draw discCanvas through a radial gradient alpha mask
    // by using destination-in on a temp approach... 
    // Simpler: just clip with a circle and add feather via shadow
    ctx.beginPath();
    ctx.arc(disc.cx, disc.cy, disc.r, 0, Math.PI * 2);
    ctx.clip();
    
    ctx.drawImage(discCanvas, 0, 0);
    ctx.restore();
  }
}

// ── Resize ──────────────────────────────────────────────
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
