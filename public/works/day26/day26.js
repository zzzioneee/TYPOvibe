// Day 26 — Swing Display (Generative Typography)
// Hexagon grid letters suspended on wires, pendulum swing on mouse proximity

const HEX_SIZE = 8;
const GRID_SPACING = HEX_SIZE * 3.0; // clear separation between hexagons
const WIRE_LENGTH_BASE = 60;
const DAMPING = 0.88;
const GRAVITY_RESTORE = 0.012;
const MOUSE_RADIUS = 200;
const MOUSE_FORCE = 0.15;

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
  const fontSize = Math.min(W * 0.28, 360);
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
          anchorX: x,
          anchorY: y - wireLen,
          x: x,
          y: y,
          vx: 0,
          wireLen: wireLen,
          col: col,
          // Hex size: width and height vary independently
          sizeW: HEX_SIZE + random(-2, 3),
          sizeH: HEX_SIZE + random(-2, 12), // height varies a lot → elongated "hanging" feel
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

  // Draw wires (gray)
  stroke(180);
  strokeWeight(1);
  for (const h of hexagons) {
    line(h.anchorX, h.anchorY, h.x, h.y);
  }

  // Draw hexagons (varied height)
  noStroke();
  fill(0);
  for (const h of hexagons) {
    drawHexagon(h.x, h.y, h.sizeW, h.sizeH);
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
