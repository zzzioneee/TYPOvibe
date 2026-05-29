// Day 26 — Swing Display (Generative Typography)
// Chain structure: each column is a chain of hexagons connected by wires
// Mouse proximity makes chains swing — each joint articulates independently

const HEX_SIZE = 7;
const GRID_SPACING = HEX_SIZE * 3.5;
const SEGMENT_LENGTH = GRID_SPACING * 0.866; // vertical distance between rows
const DAMPING = 0.94;
const GRAVITY = 0.15;
const MOUSE_RADIUS = 150;
const MOUSE_FORCE = 0.4;

let chains = []; // array of chains, each chain = array of nodes
let W, H, pg;

function setup() {
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight);
  W = width; H = height;
  buildChains();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  W = width; H = height;
  chains = [];
  buildChains();
}

function buildChains() {
  const text_str = "SWING";
  const fontSize = Math.min(W * 0.2, H * 0.6);
  pg = createGraphics(W, H);
  pg.pixelDensity(1);
  pg.background(255);
  pg.fill(0);
  pg.noStroke();
  pg.textFont('Arial');
  pg.textStyle(BOLD);
  pg.textSize(fontSize);
  pg.textAlign(CENTER, CENTER);
  pg.text(text_str, W / 2, H / 2);
  pg.loadPixels();

  // For each column in hexgrid, find which rows have text → build a chain
  const cols = Math.ceil(W / GRID_SPACING);
  const rows = Math.ceil(H / (GRID_SPACING * 0.866));

  for (let col = 0; col < cols; col++) {
    const chain = [];
    for (let row = 0; row < rows; row++) {
      const x = col * GRID_SPACING + (row % 2) * (GRID_SPACING / 2);
      const y = row * GRID_SPACING * 0.866;
      const px = Math.floor(x), py = Math.floor(y);
      if (px < 0 || px >= W || py < 0 || py >= H) continue;
      const idx = (py * W + px) * 4;
      if (pg.pixels[idx] < 128) {
        chain.push({
          x: x, y: y,
          oldX: x, oldY: y,
          restX: x, restY: y,
          sizeW: HEX_SIZE + random(-1, 2),
          sizeH: HEX_SIZE + random(0, 8),
        });
      }
    }
    if (chain.length > 0) chains.push(chain);
  }
}

function draw() {
  background(255);
  const mx = mouseX, my = mouseY;

  // Physics: Verlet integration for each chain
  for (const chain of chains) {
    for (let i = 0; i < chain.length; i++) {
      const node = chain[i];
      if (i === 0) {
        // First node: anchored at rest position (ceiling attachment)
        node.x = node.restX;
        node.y = node.restY;
        continue;
      }

      // Verlet
      let vx = (node.x - node.oldX) * DAMPING;
      let vy = (node.y - node.oldY) * DAMPING;
      node.oldX = node.x;
      node.oldY = node.y;

      // Gravity
      vy += GRAVITY;

      // Mouse force (horizontal push)
      const dx = node.x - mx, dy = node.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_RADIUS && dist > 0) {
        const f = (1 - dist / MOUSE_RADIUS) * MOUSE_FORCE;
        vx += (dx / dist) * f;
      }

      node.x += vx;
      node.y += vy;
    }

    // Constraint solving: maintain distance between consecutive nodes
    for (let iter = 0; iter < 5; iter++) {
      for (let i = 1; i < chain.length; i++) {
        const a = chain[i - 1], b = chain[i];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const diff = (dist - SEGMENT_LENGTH) / dist * 0.5;
        const ox = dx * diff, oy = dy * diff;
        if (i === 1) {
          // First node is pinned — only move b
          b.x -= ox * 2; b.y -= oy * 2;
        } else {
          a.x += ox; a.y += oy;
          b.x -= ox; b.y -= oy;
        }
      }
    }
  }

  // Draw wires (between each pair of nodes in chain)
  stroke(160);
  strokeWeight(1.2);
  for (const chain of chains) {
    // Wire from ceiling to first node
    line(chain[0].restX, chain[0].restY - 30, chain[0].x, chain[0].y);
    for (let i = 1; i < chain.length; i++) {
      line(chain[i-1].x, chain[i-1].y, chain[i].x, chain[i].y);
    }
  }

  // Draw hexagons
  noStroke();
  fill(30);
  for (const chain of chains) {
    for (const node of chain) {
      drawHexagon(node.x, node.y, node.sizeW, node.sizeH);
    }
  }
}

function drawHexagon(cx, cy, rw, rh) {
  beginShape();
  for (let i = 0; i < 6; i++) {
    const angle = TWO_PI / 6 * i - PI / 6;
    vertex(cx + cos(angle) * rw, cy + sin(angle) * rh);
  }
  endShape(CLOSE);
}
