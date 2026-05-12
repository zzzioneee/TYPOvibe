/* =====================================================================
 * Costume Art — Met Gala 2026 · "Fashion Is Art"
 *
 * Five dress silhouettes with painting-inspired floral decoration:
 *   1. Monet · Water Lilies  → Mini Dress (미니드레스)
 *   2. Van Gogh · Starry Night → Bell Dress (벨 드레스)
 *   3. Klimt · The Kiss      → Off-shoulder Dress (오프숄더 드레스)
 *   4. Hokusai · Great Wave  → Mermaid Dress (머메이드 드레스)
 *   5. Mondrian · Composition → Unbalanced Dress (언발란스 드레스)
 * ===================================================================== */

const W = 500, H = 800;
const DPR = Math.min(2, window.devicePixelRatio || 1);
const TAU = Math.PI * 2;

function setupCanvas(id) {
  const c = document.getElementById(id);
  c.width = W * DPR; c.height = H * DPR;
  const ctx = c.getContext('2d');
  ctx.scale(DPR, DPR);
  return ctx;
}
const bgCtx = setupCanvas('bg');
const fgCtx = setupCanvas('fg');
const stage = document.getElementById('stage');
function fit() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H) * 0.96;
  stage.style.transform = `scale(${s})`;
}
window.addEventListener('resize', fit); fit();

const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOutBack = t => 1 + 2.5 * Math.pow(t - 1, 3) + 1.5 * Math.pow(t - 1, 2);
const easeOut = t => 1 - Math.pow(1 - t, 3);

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n>>16)&255, (n>>8)&255, n&255];
}
function rgba(h, a) {
  const [r,g,b] = hexToRgb(h);
  return `rgba(${r},${g},${b},${a})`;
}
function petalPath(ctx, length, width) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(length * 0.30, -width * 1.05, length * 0.78, -width * 0.85, length, 0);
  ctx.bezierCurveTo(length * 0.78, width * 0.85, length * 0.30, width * 1.05, 0, 0);
}

// ---------- Smooth anchored silhouette helper ----------
function pathSmoothAnchors(ctx, anchors) {
  const left  = anchors.map(a => ({ x: a.x - a.w, y: a.y }));
  const right = anchors.map(a => ({ x: a.x + a.w, y: a.y })).reverse();
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length - 1; i++) {
    const xc = (left[i].x + left[i+1].x) / 2;
    const yc = (left[i].y + left[i+1].y) / 2;
    ctx.quadraticCurveTo(left[i].x, left[i].y, xc, yc);
  }
  ctx.lineTo(left[left.length-1].x, left[left.length-1].y);
  ctx.lineTo(right[0].x, right[0].y);
  for (let i = 1; i < right.length - 1; i++) {
    const xc = (right[i].x + right[i+1].x) / 2;
    const yc = (right[i].y + right[i+1].y) / 2;
    ctx.quadraticCurveTo(right[i].x, right[i].y, xc, yc);
  }
  ctx.lineTo(right[right.length-1].x, right[right.length-1].y);
  ctx.closePath();
}

// ---------- Mask-based sampling ----------
function makeMask(scene) {
  if (scene._mask) return;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  scene.silhouettePath(ctx);
  ctx.fill();
  scene._mask = ctx.getImageData(0, 0, W, H).data;
}

function inSilhouette(scene, x, y) {
  if (!scene._mask || x < 0 || y < 0 || x >= W || y >= H) return false;
  return scene._mask[(((y|0) * W + (x|0)) << 2) + 3] > 0;
}
function sampleDressFor(scene) {
  makeMask(scene);
  if (!scene._mask) return { x: 250, y: 400, u: 0.5, yNorm: 0.5 };
  const bb = scene.bbox;
  for (let i = 0; i < 80; i++) {
    const x = bb.x + Math.random() * bb.w;
    const y = bb.y + Math.random() * bb.h;
    if (inSilhouette(scene, x, y)) {
      return { x, y, u: Math.abs((x - 250) / 200), yNorm: (y - bb.y) / bb.h };
    }
  }
  return { x: 250, y: 400, u: 0.5, yNorm: 0.5 };
}

// ---------- Petal particles ----------
class Petal {
  constructor(x, y, color, size, kind = 'oval') {
    this.x = x; this.y = y; this.color = color; this.size = size; this.kind = kind;
    this.vx = rand(-70, 70); this.vy = rand(-40, 30);
    this.rot = Math.random() * TAU; this.vrot = rand(-3.5, 3.5);
    this.life = 1; this.swayPhase = Math.random() * TAU;
    this.fadeRate = rand(0.28, 0.45);
  }
  update(dt) {
    this.x += this.vx * dt + Math.sin(this.swayPhase) * 6 * dt;
    this.y += this.vy * dt;
    this.vy += 95 * dt;
    this.vx *= Math.pow(0.55, dt);
    this.rot += this.vrot * dt;
    this.swayPhase += dt * 2;
    this.life -= dt * this.fadeRate;
  }
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = clamp(this.life, 0, 1);
    ctx.fillStyle = this.color;
    if (this.kind === 'oval') {
      ctx.beginPath(); ctx.ellipse(0, 0, this.size, this.size * 0.45, 0, 0, TAU); ctx.fill();
    } else if (this.kind === 'square') {
      ctx.fillRect(-this.size*0.5, -this.size*0.5, this.size, this.size);
    } else if (this.kind === 'foam') {
      ctx.beginPath(); ctx.arc(0, 0, this.size * 0.6, 0, TAU); ctx.fill();
      ctx.strokeStyle = this.color; ctx.lineWidth = 1; ctx.globalAlpha *= 0.6;
      ctx.beginPath(); ctx.arc(0, 0, this.size, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
  isDead() { return this.life <= 0 || this.y > H + 50; }
}

// ---------- Flower ----------
class Flower {
  constructor(scene, sceneInst) {
    this.scene = scene; this.sceneInst = sceneInst;
    const p = sampleDressFor(scene);
    this.x = p.x; this.y = p.y; this.u = p.u; this.yNorm = p.yNorm;
    this.targetScale = scene.scaleAt(p);
    this.scale = 0;
    this.rotation = rand(-Math.PI, Math.PI);
    this.seed = Math.random() * TAU;
    this.age = 0; this.life = 1;
    this.withering = false; this.witherT = 0;
    this.growthRate = rand(0.9, 1.6);
    this.swayPhase = Math.random() * TAU;
    this.colors = scene.palette[Math.floor(Math.random() * scene.palette.length)];
    this.variant = Math.floor(Math.random() * (scene.variants || 1));
    this.depth = this.y - Math.abs(p.u) * 8;
    this._sprite = null; this._spriteSize = 0;
  }
  _renderSprite() {
    const R = (this.scene.baseRadius || 30) * this.targetScale + 8;
    const size = Math.ceil(R * 2);
    const c = document.createElement('canvas');
    c.width = size * DPR; c.height = size * DPR;
    const ctx = c.getContext('2d');
    ctx.scale(DPR, DPR);
    ctx.translate(size / 2, size / 2);
    ctx.scale(this.targetScale, this.targetScale);
    this.scene.drawFlowerStatic(ctx, this);
    this._sprite = c; this._spriteSize = size;
  }
  update(dt) {
    if (!this.withering) {
      this.age = Math.min(1, this.age + dt * this.growthRate);
      this.scale = this.targetScale * easeOutBack(this.age);
      this.swayPhase += dt * 1.6;
    } else {
      this.witherT += dt;
      this.life = Math.max(0, 1 - this.witherT / 2.6);
      this.y += (4 + this.witherT * 6) * dt;
      this.swayPhase += dt * 1.0;
      this.x += Math.sin(this.swayPhase) * 3 * dt;
      this.scale *= Math.pow(0.85, dt);
    }
  }
  startWither() {
    if (this.withering) return;
    this.withering = true;
  }
  draw(ctx) {
    if (!this._sprite) this._renderSprite();
    if (this.scale < 0.02) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation + Math.sin(this.swayPhase) * 0.04);
    const k = this.scale / this.targetScale;
    ctx.scale(k, k);
    ctx.globalAlpha = clamp(this.life, 0, 1);
    const s = this._spriteSize;
    ctx.drawImage(this._sprite, -s / 2, -s / 2, s, s);
    ctx.restore();
  }
  isDead() { return this.life <= 0 || this.scale < 0.02; }
}

function prerenderFabric(scene) {
  const c = document.createElement('canvas');
  c.width = W * DPR; c.height = H * DPR;
  const ctx = c.getContext('2d');
  ctx.scale(DPR, DPR);
  return c;
}

/* =====================================================================
 *  SCENE 1 — MONET · WATER LILIES  ·  MINI DRESS (미니드레스)
 *  Short, flirty, ends above knee. Fitted bodice + flared mini skirt.
 * ===================================================================== */
const monet = {
  name: 'monet',
  baseRadius: 16,
  bbox: { x: 130, y: 180, w: 240, h: 300 },
  silhouettePath(ctx) {
    // Mini dress — matches mannequin torso (center x:245, width ±30-35)
    const A = [
      { x: 245, y: 200, w: 35 },   // shoulders
      { x: 245, y: 240, w: 33 },   // bust
      { x: 244, y: 290, w: 28 },   // waist
      { x: 243, y: 340, w: 32 },   // hip
      { x: 242, y: 400, w: 42 },   // flare
      { x: 241, y: 460, w: 52 },   // hem — mini!
    ];
    pathSmoothAnchors(ctx, A);
  },
  palette: [
    ['#6b9ec4', '#a8cce0', '#4a8bb0', '#f0c8d8'],  // blue water + pink accent
    ['#5a9a7a', '#8cc4a0', '#3d7a5c', '#e8f0c8'],  // green lily pad + yellow-green
    ['#7b9fd4', '#c4d8f0', '#4a6e9a', '#f7d0e0'],  // lavender water + soft pink
    ['#4a8a6a', '#7ab89a', '#2d6a4a', '#f0e8a0'],  // deep green + golden light
  ],
  variants: 1,
  maxFlowers: 1800,
  petalKind: 'oval',
  dissolveColors: ['#f7c8d8', '#e8d4f0', '#cce6d4', '#fff5e1', '#a8d5b5'],
  scaleAt(p) { return rand(0.7, 1.2); },
  drawAtmosphere(ctx, t) {
    ctx.save();
    for (let i = 0; i < 4; i++) {
      const x = 90 + i * 110 + Math.sin(t * 0.4 + i) * 12;
      const y = 520 + Math.cos(t * 0.5 + i * 1.7) * 8;
      ctx.fillStyle = 'rgba(168,213,181,0.22)';
      ctx.beginPath(); ctx.ellipse(x, y, 38, 12, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  },
  drawFlowerStatic(ctx, f) {
    // Water lily — blue/green base with pink petal accents
    const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
    halo.addColorStop(0, rgba(f.colors[1], 0.5));
    halo.addColorStop(1, rgba(f.colors[0], 0));
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill();
    // Outer petals
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + f.seed;
      ctx.save(); ctx.rotate(a);
      const g = ctx.createLinearGradient(0, 0, 18, 0);
      g.addColorStop(0, f.colors[0]); g.addColorStop(0.6, f.colors[1]); g.addColorStop(1, f.colors[3] || '#ffffff');
      ctx.fillStyle = g;
      petalPath(ctx, 18, 6); ctx.fill();
      ctx.restore();
    }
    // Inner petals (smaller, lighter)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + f.seed + 0.3;
      ctx.save(); ctx.rotate(a);
      ctx.fillStyle = f.colors[1];
      petalPath(ctx, 10, 4); ctx.fill();
      ctx.restore();
    }
    // Center
    ctx.fillStyle = f.colors[3] || '#fde26b';
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill();
  }
};

/* =====================================================================
 *  SCENE 2 — VAN GOGH · STARRY NIGHT  ·  BELL DRESS (벨 드레스)
 *  Fitted bodice, dramatically flared bell-shaped skirt from waist.
 * ===================================================================== */
const vangogh = {
  name: 'vangogh',
  baseRadius: 12,
  bbox: { x: 130, y: 180, w: 240, h: 550 },
  silhouettePath(ctx) {
    // Bell dress — matches mannequin torso then flares
    const A = [
      { x: 245, y: 200, w: 35 },
      { x: 245, y: 240, w: 33 },
      { x: 244, y: 290, w: 28 },
      { x: 243, y: 340, w: 35 },
      { x: 242, y: 400, w: 55 },
      { x: 241, y: 470, w: 78 },
      { x: 240, y: 550, w: 98 },
      { x: 240, y: 640, w: 112 },
      { x: 240, y: 720, w: 120 },
    ];
    pathSmoothAnchors(ctx, A);
  },
  palette: [
    ['#1a237e', '#3949ab', '#7986cb', '#ffd54f'],  // deep blue + gold star
    ['#0d47a1', '#1565c0', '#64b5f6', '#fff176'],  // night blue + yellow
    ['#311b92', '#5c6bc0', '#9fa8da', '#ffee58'],  // purple-blue + star
  ],
  variants: 1,
  maxFlowers: 2500,
  petalKind: 'oval',
  dissolveColors: ['#1a1f5c', '#3f5dd0', '#5b4dbf', '#ffd866', '#2a3a8a'],
  scaleAt(p) { return rand(0.8, 1.3); },
  drawAtmosphere(ctx, t) {
    ctx.save();
    for (let i = 0; i < 10; i++) {
      const x = (i * 89 + t * 18) % 500;
      const y = 180 + (i * 73) % 540;
      const tw = 0.6 + Math.sin(t * 2 + i) * 0.4;
      ctx.fillStyle = `rgba(255,216,107,${0.08 * tw})`;
      ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  },
  drawFlowerStatic(ctx, f) {
    // Starry Night swirl star
    const C = f.colors;
    // Glow halo
    const halo = ctx.createRadialGradient(0, 0, 1, 0, 0, 14);
    halo.addColorStop(0, rgba(C[3], 0.7));
    halo.addColorStop(0.5, rgba(C[2], 0.3));
    halo.addColorStop(1, rgba(C[0], 0));
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill();
    // Swirling petals (like brushstrokes)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + f.seed;
      ctx.save(); ctx.rotate(a);
      ctx.fillStyle = C[i % 3];
      ctx.beginPath();
      ctx.ellipse(6, 0, 7, 2.5, 0.3, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // Center star dot
    ctx.fillStyle = C[3];
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.arc(-0.5, -0.5, 1.2, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
};

/* =====================================================================
 *  SCENE 3 — KLIMT · THE KISS  ·  OFF-SHOULDER DRESS (오프숄더 드레스)
 *  Wide neckline exposing both shoulders, fitted through body, A-line skirt.
 * ===================================================================== */
const klimt = {
  name: 'klimt',
  baseRadius: 12,
  bbox: { x: 130, y: 180, w: 240, h: 550 },
  silhouettePath(ctx) {
    // Off-shoulder A-line — matches mannequin torso
    const A = [
      { x: 245, y: 200, w: 40 },
      { x: 245, y: 240, w: 33 },
      { x: 244, y: 290, w: 28 },
      { x: 243, y: 340, w: 34 },
      { x: 242, y: 400, w: 45 },
      { x: 241, y: 470, w: 58 },
      { x: 240, y: 550, w: 70 },
      { x: 240, y: 640, w: 82 },
      { x: 240, y: 720, w: 90 },
    ];
    pathSmoothAnchors(ctx, A);
  },
  palette: [
    ['#d4a437', '#ffd86b', '#8b6914', '#b32a2a'],  // gold + ruby
    ['#c8932a', '#ffe082', '#6b4e10', '#0a6b4d'],  // gold + emerald
    ['#e2b551', '#fff0a8', '#9a7020', '#1a3d6e'],  // gold + sapphire
  ],
  variants: 2,
  maxFlowers: 2200,
  petalKind: 'square',
  dissolveColors: ['#d4a437', '#ffd86b', '#7a5a14', '#b32a2a', '#1a3d6e'],
  scaleAt(p) { return rand(0.7, 1.2); },
  drawAtmosphere(ctx, t) {
    ctx.save();
    for (let i = 0; i < 25; i++) {
      const x = 50 + ((i * 73 + t * 18) % 400);
      const y = 100 + ((i * 131 + t * 9) % 700);
      ctx.fillStyle = `rgba(255,216,107,${0.06 + Math.sin(t*2 + i)*0.04})`;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.restore();
  },
  drawFlowerStatic(ctx, f) {
    const C = f.colors;
    if (f.variant === 0) {
      // Gold rosette
      const r = 11;
      const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, r);
      grad.addColorStop(0, C[1]); grad.addColorStop(0.6, C[0]); grad.addColorStop(1, C[2]);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.fillStyle = C[3];
      for (let i = 0; i < 8; i++) {
        const a = (i/8) * TAU;
        ctx.beginPath(); ctx.arc(Math.cos(a)*7, Math.sin(a)*7, 1.5, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = C[1];
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, TAU); ctx.fill();
    } else {
      // Diamond ornament
      const g = ctx.createLinearGradient(-10, -10, 10, 10);
      g.addColorStop(0, C[1]); g.addColorStop(0.5, C[0]); g.addColorStop(1, C[2]);
      ctx.fillStyle = g;
      ctx.save(); ctx.rotate(Math.PI/4);
      ctx.fillRect(-6, -6, 12, 12);
      ctx.restore();
      ctx.fillStyle = C[3];
      ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, TAU); ctx.fill();
    }
  }
};

/* =====================================================================
 *  SCENE 4 — HOKUSAI · GREAT WAVE  ·  MERMAID DRESS (머메이드 드레스)
 *  Body-hugging from bust to knee, then flares out dramatically at bottom.
 * ===================================================================== */
const hokusai = {
  name: 'hokusai',
  baseRadius: 10,
  bbox: { x: 130, y: 180, w: 240, h: 550 },
  silhouettePath(ctx) {
    // Mermaid — tight on mannequin body, flares at bottom
    const A = [
      { x: 245, y: 200, w: 35 },
      { x: 245, y: 240, w: 33 },
      { x: 244, y: 290, w: 28 },
      { x: 243, y: 340, w: 30 },
      { x: 242, y: 400, w: 28 },
      { x: 241, y: 470, w: 26 },
      { x: 240, y: 540, w: 30 },
      { x: 240, y: 610, w: 50 },
      { x: 240, y: 670, w: 72 },
      { x: 240, y: 720, w: 90 },
    ];
    pathSmoothAnchors(ctx, A);
  },
  palette: [
    ['#ffffff', '#e8f0f8', '#a5c8e0', '#1e4f78'],
    ['#ffe4ec', '#fff5f8', '#f7b8c8', '#cc4a6c'],
    ['#e8f0f8', '#ffffff', '#7ba4c8', '#2d5a8c'],
  ],
  variants: 2,
  maxFlowers: 2200,
  petalKind: 'foam',
  dissolveColors: ['#ffffff', '#a5c8e0', '#1e4f78', '#ffe4ec', '#7ba4c8'],
  scaleAt(p) { return rand(0.7, 1.2); },
  drawAtmosphere(ctx, t) {
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const x = (i * 90 + t * 12) % 500;
      const y = 280 + (i * 80) % 400;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath(); ctx.ellipse(x, y, 35, 12, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  },
  drawFlowerStatic(ctx, f) {
    const C = f.colors;
    if (f.variant === 0) {
      // Wave foam flower — white/blue circular bloom
      const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 12);
      halo.addColorStop(0, rgba(C[0], 0.8));
      halo.addColorStop(0.6, rgba(C[2], 0.4));
      halo.addColorStop(1, rgba(C[3], 0));
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.fill();
      // Foam petals
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + f.seed;
        ctx.save(); ctx.rotate(a);
        ctx.fillStyle = C[i % 2 === 0 ? 0 : 1];
        petalPath(ctx, 10, 4);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = C[2];
      ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, TAU); ctx.fill();
    } else {
      // Cherry blossom (sakura)
      for (let i = 0; i < 5; i++) {
        const a = (i/5) * TAU + f.seed;
        ctx.save(); ctx.rotate(a);
        const g = ctx.createRadialGradient(7, 0, 1, 7, 0, 8);
        g.addColorStop(0, C[1]); g.addColorStop(0.7, C[0]); g.addColorStop(1, C[2]);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(2, -5, 11, -4, 12, 0);
        ctx.bezierCurveTo(11, 4, 2, 5, 0, 0);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = C[3];
      ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff5b0';
      for (let i = 0; i < 6; i++) {
        const a = (i/6) * TAU;
        ctx.beginPath();
        ctx.arc(Math.cos(a)*2.4, Math.sin(a)*2.4, 0.5, 0, TAU);
        ctx.fill();
      }
    }
  }
};

/* =====================================================================
 *  SCENE 5 — MONDRIAN · COMPOSITION  ·  UNBALANCED DRESS (언발란스 드레스)
 *  Asymmetric hemline — one side short, other side long. One-shoulder strap.
 * ===================================================================== */
const mondrian = {
  name: 'mondrian',
  baseRadius: 8,
  bbox: { x: 130, y: 180, w: 240, h: 550 },
  silhouettePath(ctx) {
    // A-line dress — matches mannequin torso
    const A = [
      { x: 245, y: 200, w: 35 },
      { x: 245, y: 240, w: 33 },
      { x: 244, y: 290, w: 28 },
      { x: 243, y: 340, w: 34 },
      { x: 242, y: 400, w: 44 },
      { x: 241, y: 470, w: 54 },
      { x: 240, y: 550, w: 62 },
      { x: 240, y: 640, w: 70 },
      { x: 240, y: 720, w: 76 },
    ];
    pathSmoothAnchors(ctx, A);
  },
  palette: [
    ['#e02020', '#c01818', '#ffffff', '#000000'],
    ['#1850c0', '#0e3a98', '#ffffff', '#000000'],
    ['#f5d020', '#e0b818', '#ffffff', '#000000'],
  ],
  variants: 3,
  maxFlowers: 2000,
  petalKind: 'square',
  dissolveColors: ['#e02020', '#1850c0', '#f5d020', '#ffffff', '#000000'],
  scaleAt(p) { return rand(0.7, 1.1); },
  drawAtmosphere(ctx, t) {
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#000';
    for (let i = 0; i < 6; i++) {
      const x = 60 + i * 70;
      ctx.fillRect(x, 200, 1, 540);
    }
    ctx.restore();
  },
  drawFlowerStatic(ctx, f) {
    const C = f.colors;
    if (f.variant === 0) {
      // Tulip bud
      ctx.fillStyle = C[0];
      ctx.beginPath();
      ctx.moveTo(-6, 4);
      ctx.bezierCurveTo(-7, -6, -2, -9, 0, -8);
      ctx.bezierCurveTo(2, -9, 7, -6, 6, 4);
      ctx.bezierCurveTo(3, 6, -3, 6, -6, 4);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = C[1];
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.bezierCurveTo(-2, 0, -2, 4, 0, 4);
      ctx.bezierCurveTo(2, 4, 2, 0, 0, -6);
      ctx.fill();
      ctx.strokeStyle = C[3]; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, 14); ctx.stroke();
    } else if (f.variant === 1) {
      // Color square
      ctx.fillStyle = C[0];
      ctx.fillRect(-6, -6, 12, 12);
      ctx.strokeStyle = C[3]; ctx.lineWidth = 2;
      ctx.strokeRect(-6, -6, 12, 12);
    } else {
      // Mini composition — 4 cells
      ctx.fillStyle = C[0]; ctx.fillRect(-7, -7, 7, 7);
      ctx.fillStyle = C[2]; ctx.fillRect(0, -7, 7, 7);
      ctx.fillStyle = C[2]; ctx.fillRect(-7, 0, 7, 7);
      ctx.fillStyle = C[1]; ctx.fillRect(0, 0, 7, 7);
      ctx.strokeStyle = C[3]; ctx.lineWidth = 1.5;
      ctx.strokeRect(-7, -7, 14, 14);
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.stroke();
    }
  }
};

// ---------- Scheduling ----------
const SCENES = [monet, vangogh, klimt, hokusai, mondrian];

const BLOOM_DUR    = 2.4;
const HOLD_DUR     = 3.2;
const WITHER_DUR   = 2.6;
const SCENE_OFFSET = 6.4;
const BURST_DUR    = 1.2;

let active = [];
let globalTime = 0;
let currentDotIdx = 0;
let flowers = [];
let petals = [];

function sceneAlpha(inst) {
  const lt = globalTime - inst.startTime;
  if (lt < BLOOM_DUR) return easeOut(lt / BLOOM_DUR);
  if (lt > BLOOM_DUR + HOLD_DUR) return Math.max(0, 1 - (lt - BLOOM_DUR - HOLD_DUR) / WITHER_DUR);
  return 1;
}

function spawnFor(inst) {
  const scene = SCENES[inst.sceneIdx];
  let count = 0;
  for (const f of flowers) if (f.sceneInst === inst) count++;
  if (count >= scene.maxFlowers) return;
  flowers.push(new Flower(scene, inst));
}

function dissolveFabric(inst) {
  inst._dissolved = true;
}

function tick(dt) {
  globalTime += dt;

  if (active.length === 0) active.push({ sceneIdx: 0, startTime: globalTime });
  const last = active[active.length - 1];
  if (globalTime - last.startTime >= SCENE_OFFSET) {
    active.push({ sceneIdx: (last.sceneIdx + 1) % SCENES.length, startTime: globalTime });
  }

  for (const inst of active) {
    const localT = globalTime - inst.startTime;
    const scene = SCENES[inst.sceneIdx];
    if (localT < BLOOM_DUR) {
      const ramp = easeOut(clamp(localT / BURST_DUR, 0, 1));
      const target = Math.floor(scene.maxFlowers * ramp);
      let current = 0;
      for (const f of flowers) if (f.sceneInst === inst) current++;
      const needed = target - current;
      for (let i = 0; i < needed; i++) spawnFor(inst);
    }
    if (localT > BLOOM_DUR + HOLD_DUR) {
      dissolveFabric(inst);
      for (const f of flowers) {
        if (f.sceneInst === inst && !f.withering) f.startWither();
      }
    }
  }

  active = active.filter(inst => globalTime - inst.startTime < BLOOM_DUR + HOLD_DUR + WITHER_DUR + 1);

  for (const f of flowers) f.update(dt);
  for (const p of petals) p.update(dt);
  flowers = flowers.filter(f => !f.isDead());
  petals  = petals.filter(p => !p.isDead());

  let dominant = active[0];
  for (const inst of active) {
    const lt = globalTime - inst.startTime;
    if (lt < BLOOM_DUR + HOLD_DUR) dominant = inst;
  }
  if (dominant && dominant.sceneIdx !== currentDotIdx) {
    currentDotIdx = dominant.sceneIdx;
    updateDots();
  }
}

function render() {
  bgCtx.clearRect(0, 0, W, H);
  fgCtx.clearRect(0, 0, W, H);

  for (const inst of active) {
    const scene = SCENES[inst.sceneIdx];
    const a = sceneAlpha(inst);
    if (a <= 0) continue;
    bgCtx.save(); bgCtx.globalAlpha = a;
    scene.drawAtmosphere?.(bgCtx, globalTime);
    bgCtx.restore();
  }

  for (const inst of active) {
    const scene = SCENES[inst.sceneIdx];
    const a = sceneAlpha(inst);
    if (a <= 0) continue;
    if (!scene._fabric) scene._fabric = prerenderFabric(scene);
    fgCtx.save(); fgCtx.globalAlpha = a;
    fgCtx.drawImage(scene._fabric, 0, 0, W, H);
    fgCtx.restore();
  }

  const sorted = flowers.slice().sort((a, b) => a.depth - b.depth);
  for (const f of sorted) f.draw(fgCtx);
  for (const p of petals) p.draw(fgCtx);
}

// ---------- Indicators ----------
const indicators = document.getElementById('indicators');
SCENES.forEach((_, i) => {
  const d = document.createElement('div');
  d.className = 'dot' + (i === 0 ? ' active' : '');
  indicators.appendChild(d);
});
function updateDots() {
  const dots = indicators.children;
  for (let i = 0; i < dots.length; i++) {
    dots[i].classList.toggle('active', i === currentDotIdx);
  }
}

document.addEventListener('click', () => {
  if (active.length === 0) return;
  const last = active[active.length - 1];
  dissolveFabric(last);
  for (const f of flowers) {
    if (f.sceneInst === last) continue;
    if (!f.withering) f.startWither();
  }
  const nextIdx = (last.sceneIdx + 1) % SCENES.length;
  active.push({ sceneIdx: nextIdx, startTime: globalTime });
});

let prev = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - prev) / 1000);
  prev = now;
  tick(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
