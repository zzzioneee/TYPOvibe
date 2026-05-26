// Day 22 — Glory and Joy
// Multi-layer spin smear: each vortex rendered independently, then composited

const W = 1920, H = 1080;
const canvas = document.getElementById('c');
canvas.width = W; canvas.height = H;
const ctx = canvas.getContext('2d');

// ── Source canvas ───────────────────────────────────────
const srcCanvas = document.createElement('canvas');
srcCanvas.width = W; srcCanvas.height = H;
const srcCtx = srcCanvas.getContext('2d');

// ── Colors ──────────────────────────────────────────────
const COLORS = [
  ['#ff0066', '#ff3399'],
  ['#ff0044', '#ff6688'],
  ['#cc00ff', '#9966ff'],
  ['#9933ff', '#cc99ff'],
  ['#ccff00', '#aaff33'],
  ['#88ff00', '#ccff66'],
  ['#00aa66', '#00cc88'],
  ['#ff0088', '#ff44aa'],
];

// ── Flower draw functions ───────────────────────────────
function drawBlob(c, cx, cy, size, c1, c2, rot) {
  const grad = c.createLinearGradient(cx - size, cy - size, cx + size, cy + size);
  grad.addColorStop(0, c1); grad.addColorStop(1, c2);
  c.save(); c.translate(cx, cy); c.rotate(rot);
  c.fillStyle = grad;
  c.beginPath();
  c.moveTo(size * 0.4, 0);
  c.bezierCurveTo(size * 0.5, -size * 0.6, -size * 0.3, -size * 0.7, -size * 0.4, -size * 0.2);
  c.bezierCurveTo(-size * 0.7, size * 0.2, -size * 0.2, size * 0.6, size * 0.2, size * 0.4);
  c.bezierCurveTo(size * 0.6, size * 0.3, size * 0.6, size * 0.2, size * 0.4, 0);
  c.fill(); c.restore();
}

function drawPetal(c, cx, cy, size, petals, c1, c2, rot) {
  const grad = c.createLinearGradient(cx - size, cy, cx + size, cy);
  grad.addColorStop(0, c1); grad.addColorStop(1, c2);
  c.save(); c.translate(cx, cy); c.rotate(rot);
  c.fillStyle = grad;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const len = size * (0.5 + (i % 3) * 0.12);
    c.beginPath();
    c.ellipse(Math.cos(a) * len * 0.5, Math.sin(a) * len * 0.5, len * 0.5, size * 0.18, a, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function drawLeaf(c, cx, cy, size, c1, c2, rot) {
  const grad = c.createLinearGradient(cx, cy - size, cx, cy + size);
  grad.addColorStop(0, c1); grad.addColorStop(1, c2);
  c.save(); c.translate(cx, cy); c.rotate(rot);
  c.fillStyle = grad;
  c.beginPath();
  c.moveTo(0, -size);
  c.bezierCurveTo(size * 0.6, -size * 0.3, size * 0.5, size * 0.5, 0, size * 0.8);
  c.bezierCurveTo(-size * 0.5, size * 0.5, -size * 0.6, -size * 0.3, 0, -size);
  c.fill(); c.restore();
}

// ── Generate flower data ────────────────────────────────
const flowers = [];
for (let i = 0; i < 35; i++) {
  const cols = 6, rows = 5;
  const col = i % cols, row = Math.floor(i / cols) % rows;
  flowers.push({
    x: (col + 0.5) * (W / cols) + (Math.random() - 0.5) * (W / cols) * 0.9,
    y: (row + 0.5) * (H / rows) + (Math.random() - 0.5) * (H / rows) * 0.9,
    size: 60 + Math.pow(Math.random(), 0.5) * 250,
    type: Math.floor(Math.random() * 3),
    petals: 4 + Math.floor(Math.random() * 4),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rot: Math.random() * Math.PI * 2,
    delay: i * 50,
  });
}

// ── Draw source (static, full) ──────────────────────────
function drawSourceFull() {
  srcCtx.fillStyle = '#fff';
  srcCtx.fillRect(0, 0, W, H);
  for (const f of flowers) {
    const [c1, c2] = f.color;
    if (f.type === 0) drawBlob(srcCtx, f.x, f.y, f.size, c1, c2, f.rot);
    else if (f.type === 1) drawPetal(srcCtx, f.x, f.y, f.size, f.petals, c1, c2, f.rot);
    else drawLeaf(srcCtx, f.x, f.y, f.size, c1, c2, f.rot);
  }
  srcCtx.font = '900 140px "Inter", sans-serif';
  srcCtx.fillStyle = '#111';
  srcCtx.textBaseline = 'top';
  srcCtx.textAlign = 'left';
  srcCtx.fillText('Glory', 100, 180);
  srcCtx.textAlign = 'center';
  srcCtx.fillText('and', W * 0.5, 460);
  srcCtx.textAlign = 'right';
  srcCtx.fillText('Joy', W - 100, 740);
}

// ── Vortex definitions ──────────────────────────────────
const VORTICES = [
  { cx: 450,  cy: 280,  r: 500, speed: 0.15, smearAngle: 0.8 },
  { cx: 1400, cy: 250,  r: 420, speed: -0.2, smearAngle: 0.7 },
  { cx: 900,  cy: 600,  r: 550, speed: 0.1,  smearAngle: 0.9 },
  { cx: 300,  cy: 800,  r: 400, speed: -0.18,smearAngle: 0.6 },
  { cx: 1500, cy: 750,  r: 450, speed: 0.13, smearAngle: 0.75 },
];

// ── Per-vortex temp canvas ──────────────────────────────
const vortexCanvases = VORTICES.map(() => {
  const vc = document.createElement('canvas');
  vc.width = W; vc.height = H;
  return vc;
});

// ── Render a single vortex layer ────────────────────────
const SMEAR_COPIES = 20; // number of rotated copies per vortex

function renderVortex(vIdx, time) {
  const v = VORTICES[vIdx];
  const vc = vortexCanvases[vIdx];
  const vCtx = vc.getContext('2d');
  
  vCtx.clearRect(0, 0, W, H);
  
  const baseAngle = time * v.speed;
  
  // Draw multiple rotated copies of the source — spread over smearAngle
  for (let i = 0; i < SMEAR_COPIES; i++) {
    const t = (i / (SMEAR_COPIES - 1)) - 0.5; // -0.5 to 0.5
    const angle = baseAngle + t * v.smearAngle;
    // Weight: center copies are more opaque, edges are faint
    const weight = Math.exp(-6 * t * t);
    
    vCtx.globalAlpha = weight / SMEAR_COPIES * 3.5;
    vCtx.save();
    vCtx.translate(v.cx, v.cy);
    vCtx.rotate(angle);
    vCtx.translate(-v.cx, -v.cy);
    vCtx.drawImage(srcCanvas, 0, 0);
    vCtx.restore();
  }
  vCtx.globalAlpha = 1;
}

// ── Composite all vortex layers onto main canvas ────────
function composite() {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  
  for (let i = 0; i < VORTICES.length; i++) {
    const v = VORTICES[i];
    const vc = vortexCanvases[i];
    
    // Draw vortex layer with soft circular mask (radial gradient alpha)
    ctx.save();
    
    // Create circular clip with soft edge
    const grad = ctx.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, v.r);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    
    // Use destination-in trick: draw vortex, then mask
    // Simpler: just clip to circle and draw
    ctx.beginPath();
    ctx.arc(v.cx, v.cy, v.r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(vc, 0, 0);
    ctx.restore();
  }
}

// ── Animation ───────────────────────────────────────────
let t0 = 0;
let sourceReady = false;

function frame(now) {
  requestAnimationFrame(frame);
  if (!sourceReady) return;
  
  const t = (now - t0) * 0.001;
  
  // Render each vortex independently
  for (let i = 0; i < VORTICES.length; i++) {
    renderVortex(i, t);
  }
  
  // Composite onto main canvas
  composite();
}

// ── Start ───────────────────────────────────────────────
document.fonts.ready.then(() => {
  drawSourceFull();
  sourceReady = true;
  t0 = performance.now();
  requestAnimationFrame(frame);
});
