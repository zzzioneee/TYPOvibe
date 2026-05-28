// Day 26 — Swing Display (Generative Typography)
// Hexagon grid letters suspended on wires, pendulum swing on mouse proximity

const HEX_SIZE = 12; // radius of each hexagon
const GRID_SPACING = HEX_SIZE * 2.1;
const WIRE_LENGTH_BASE = 60;
const DAMPING = 0.96;
const GRAVITY_RESTORE = 0.003;
const MOUSE_RADIUS = 200;
const MOUSE_FORCE = 0.08;

let hexagons = [];
let W, H;
let pg; // offscreen graphics for text rasterization

function setup() {
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight);
  W = width; H = height;
  generateLetters();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  W = width; H = height;
  hexagons = [];
  generateLetters();
}

function generateLetters() {
  // Render "SWING" to offscreen buffer at large size
  const text_str = "SWING";
  const fontSize = Math.min(W * 0.15, 180);
  pg = createGraphics(W, H);
  pg.background(255);
  pg.fill(0);
  pg.noStroke();
  pg.textFont('Arial');
  pg.textStyle(BOLD);
  pg.textSize(fontSize);
  pg.textAlign(CENTER, CENTER);
  pg.text(text_str, W / 2, H / 2);
  pg.loadPixels();

  // Sample hexagonal grid positions
  const cols = Math.ceil(W / GRID_SPACING);
  const rows = Math.ceil(H / (GRID_SPACING * 0.866));

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * GRID_SPACING + (row % 2) * (GRID_SPACING / 2);
      const y = row * GRID_SPACING * 0.866;

      // Check if this position is on the text
      const px = Math.floor(x);
      const py = Math.floor(y);
      if (px < 0 || px >= W || py < 0 || py >= H) continue;
      const idx = (py * W + px) * 4;
      const r = pg.pixels[idx];
      // Black text on white bg → r < 128 means on text
      if (r < 128) {
        // Wire length varies slightly for organic feel
        const wireLen = WIRE_LENGTH_BASE + random(-15, 15);
        hexagons.push({
          // Anchor point (fixed, where wire attaches to "ceiling")
          anchorX: x,
          anchorY: y - wireLen,
          // Current position (starts at rest = directly below anchor)
          x: x,
          y: y,
          // Velocity (only horizontal for pendulum)
          vx: 0,
          // Wire length
          wireLen: wireLen,
          // Hex size variation
          size: HEX_SIZE + random(-2, 2),
        });
      }
    }
  }
}

function draw() {
  background(255);

  const mx = mouseX, my = mouseY;

  // Update physics
  for (const h of hexagons) {
    // Mouse force (horizontal only)
    const dx = h.x - mx;
    const dy = h.y - my;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < MOUSE_RADIUS && dist > 0) {
      const force = (1 - dist / MOUSE_RADIUS) * MOUSE_FORCE;
      h.vx += (dx / dist) * force;
    }

    // Pendulum restore: pull back toward anchor X
    const offsetX = h.x - h.anchorX;
    h.vx -= offsetX * GRAVITY_RESTORE;

    // Damping
    h.vx *= DAMPING;

    // Update position (horizontal swing only)
    h.x += h.vx;

    // Constrain to wire length (arc)
    const maxSwing = h.wireLen * 0.7;
    const clampedOffset = constrain(h.x - h.anchorX, -maxSwing, maxSwing);
    h.x = h.anchorX + clampedOffset;
    // Y adjusts along arc: y = anchor + sqrt(wireLen² - offsetX²)
    h.y = h.anchorY + Math.sqrt(Math.max(0, h.wireLen * h.wireLen - clampedOffset * clampedOffset));
  }

  // Draw wires
  stroke(0);
  strokeWeight(1);
  for (const h of hexagons) {
    line(h.anchorX, h.anchorY, h.x, h.y);
  }

  // Draw hexagons
  noStroke();
  fill(0);
  for (const h of hexagons) {
    drawHexagon(h.x, h.y, h.size);
  }
}

function drawHexagon(cx, cy, r) {
  beginShape();
  for (let i = 0; i < 6; i++) {
    const angle = TWO_PI / 6 * i - PI / 6;
    vertex(cx + cos(angle) * r, cy + sin(angle) * r);
  }
  endShape(CLOSE);
}
