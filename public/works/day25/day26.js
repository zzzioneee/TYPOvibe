// Day 26 — Swing Display (Generative Typography)
// SLEEPING / BEAUTY — hexagon modules, all nodes move, horizontal swing only

const BG = [255, 255, 255];
const GRID_SP = 20;
const HEX_W = 9;
const HEX_H = 9;
const DAMPING = 0.88;
const MOUSE_RADIUS = 60;
const MOUSE_FORCE = 0.8;
const CONSTRAINT_ITERS = 12;
const REST_FORCE_X = 0.06;
const REST_FORCE_Y = 0.2;

let letterData = [];
let W, H;
let ready = false;

function setup() {
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight);
  W = width; H = height;
  buildScene();
  ready = true;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  W = width; H = height;
  buildScene();
}

function rasterizeText(text, fontSize, cx, cy) {
  const pg = createGraphics(W, H);
  pg.pixelDensity(1);
  pg.background(255);
  pg.fill(0);
  pg.noStroke();
  pg.textSize(fontSize);
  pg.textStyle(BOLD);
  pg.textAlign(CENTER, CENTER);
  pg.textFont('Arial Black');
  // Add letter spacing by drawing each char individually
  const chars = text.split('');
  const baseWidth = fontSize * 0.65;
  const spacing = fontSize * 0.15;
  // Kerning adjustments for narrow characters
  const narrowChars = { 'I': -0.2, 'L': -0.1, 'T': -0.05, 'Y': -0.05 };
  const charWidths = chars.map(ch => baseWidth + (narrowChars[ch] || 0) * fontSize);
  const totalW = charWidths.reduce((sum, w) => sum + w + spacing, -spacing);
  let xPos = cx - totalW / 2;
  for (let i = 0; i < chars.length; i++) {
    pg.text(chars[i], xPos + charWidths[i] * 0.5, cy);
    xPos += charWidths[i] + spacing;
  }
  pg.loadPixels();

  const points = [];
  const rowH = GRID_SP * 0.866;

  for (let gy = 0; gy < H; gy += rowH) {
    const row = Math.round(gy / rowH);
    const offsetX = (row % 2) * (GRID_SP * 0.5);
    for (let gx = offsetX; gx < W; gx += GRID_SP) {
      const px = Math.floor(gx), py = Math.floor(gy);
      if (px < 0 || px >= W || py < 0 || py >= H) continue;
      const idx = (py * W + px) * 4;
      if (pg.pixels[idx] < 128) {
        let hw, hh;
        if (Math.random() < 0.5) { hw = 8; hh = 8; }
        else { hw = 7; hh = 14; }
        points.push({ x: gx, y: gy, col: Math.round((gx - offsetX) / GRID_SP), row, hw, hh });
      }
    }
  }

  pg.remove();
  return points;
}

function buildChains(points) {
  const colMap = {};
  for (const p of points) {
    const key = p.col + '_' + (p.row % 2);
    if (!colMap[key]) colMap[key] = [];
    colMap[key].push(p);
  }

  const chains = [];
  for (const key in colMap) {
    const pts = colMap[key].sort((a, b) => a.y - b.y);
    const nodes = pts.map((p, i) => ({
      x: p.x, y: p.y, px: p.x, py: p.y,
      restX: p.x, restY: p.y,
      pinned: false,
      depth: pts.length > 1 ? i / (pts.length - 1) : 0.5,
      hw: p.hw, hh: p.hh,
    }));

    const constraints = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const dx = nodes[i+1].restX - nodes[i].restX;
      const dy = nodes[i+1].restY - nodes[i].restY;
      constraints.push({ a: i, b: i+1, len: Math.sqrt(dx*dx + dy*dy) });
    }

    chains.push({ nodes, constraints, phase: Math.random() * Math.PI * 6, freq: 0.005 + Math.random() * 0.015, amp: 4 + Math.random() * 6 });
  }
  return chains;
}

function buildScene() {
  letterData = [];

  const fontSize = Math.min(W / 4, H / 3.5, 220);
  const lineGap = fontSize * 1.35;
  const topY = H * 0.38;

  const points1 = rasterizeText('SLEEPING', fontSize, W / 2, topY);
  const points2 = rasterizeText('BEAUTY', fontSize, W / 2, topY + lineGap);

  const chains1 = buildChains(points1);
  const chains2 = buildChains(points2);
  letterData = [...chains1, ...chains2];
}

function draw() {
  background(...BG);
  if (!ready) return;

  const mx = mouseX, my = mouseY;
  const mDx = mouseX - pmouseX;

  for (const chain of letterData) {
    const { nodes, constraints, phase, freq, amp } = chain;

    // Each chain swings independently like a bead curtain strand
    // Top is fixed, wave propagates downward with phase delay per node
    const baseSwing = frameCount * freq + phase;

    for (let n = 0; n < nodes.length; n++) {
      const node = nodes[n];

      const d = node.depth;
      // Each node has its own phase delay — creates wave propagation down the chain
      const nodePhase = baseSwing - d * 1.5;
      const swingOffset = Math.sin(nodePhase) * amp * d * d;
      const targetX = node.restX + swingOffset;

      let vx = (node.x - node.px) * DAMPING;
      let vy = (node.y - node.py) * 0.1;

      vx += (targetX - node.x) * REST_FORCE_X;
      vy += (node.restY - node.y) * REST_FORCE_Y;

      // Mouse: only affects lower nodes
      if (d > 0.3) {
        const dx = node.x - mx, dy = node.y - my;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < MOUSE_RADIUS && dist > 1) {
          const falloff = (1 - dist / MOUSE_RADIUS);
          const force = falloff * MOUSE_FORCE * d * d;
          vx += (dx / dist) * force * 0.2 + mDx * force * 0.3;
        }
      }

      node.px = node.x;
      node.py = node.y;
      node.x += vx;
      node.y += vy;
    }

    for (let iter = 0; iter < CONSTRAINT_ITERS; iter++) {
      for (const c of constraints) {
        const a = nodes[c.a], b = nodes[c.b];
        const cdx = b.x - a.x, cdy = b.y - a.y;
        const dist = Math.sqrt(cdx*cdx + cdy*cdy);
        if (dist < 0.001) continue;
        const diff = (dist - c.len) / dist;
        const ox = cdx * diff * 0.5, oy = cdy * diff * 0.5;
        if (!a.pinned) { a.x += ox; a.y += oy; }
        if (!b.pinned) { b.x -= ox; b.y -= oy; }
      }
    }
  }

  // Vertical stem wires
  stroke(180);
  strokeWeight(0.5);
  for (const chain of letterData) {
    if (chain.nodes.length < 2) continue;
    for (let i = 0; i < chain.nodes.length - 1; i++) {
      line(chain.nodes[i].x, chain.nodes[i].y, chain.nodes[i+1].x, chain.nodes[i+1].y);
    }
  }

  // Hexagons
  noStroke();
  fill(30);
  for (const chain of letterData) {
    for (const node of chain.nodes) {
      drawHex(node.x, node.y, node.hw, node.hh);
    }
  }
}

function drawHex(cx, cy, rw, rh) {
  beginShape();
  for (let i = 0; i < 6; i++) {
    const a = TWO_PI / 6 * i;
    vertex(cx + cos(a) * rw, cy + sin(a) * rh);
  }
  endShape(CLOSE);
}
