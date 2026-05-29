// Day 26 — Swing Display (Generative Typography)
// Each letter is a separate mobile unit scattered across screen
// Dots connected by wires within each letter, mouse makes them swing

const HEX_SIZE = 5;
const GRID_SPACING = HEX_SIZE * 2.6;
const SEGMENT_LENGTH = GRID_SPACING * 0.85;
const DAMPING = 0.94;
const GRAVITY = 0.12;
const MOUSE_RADIUS = 120;
const MOUSE_FORCE = 0.35;

let letterUnits = []; // each unit = {chains, cx, cy}
let W, H;

function setup() {
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight);
  W = width; H = height;
  buildLetters();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  W = width; H = height;
  letterUnits = [];
  buildLetters();
}

function rasterizeLetter(char, size) {
  const pg = createGraphics(size * 1.2, size * 1.4);
  pg.pixelDensity(1);
  pg.background(255);
  pg.fill(0);
  pg.noStroke();
  pg.textFont('Arial');
  pg.textStyle(BOLD);
  pg.textSize(size);
  pg.textAlign(CENTER, CENTER);
  pg.text(char, pg.width / 2, pg.height / 2);
  pg.loadPixels();
  
  const chains = [];
  const cols = Math.ceil(pg.width / GRID_SPACING);
  const rows = Math.ceil(pg.height / (GRID_SPACING * 0.866));
  
  for (let col = 0; col < cols; col++) {
    const chain = [];
    for (let row = 0; row < rows; row++) {
      const x = col * GRID_SPACING + (row % 2) * (GRID_SPACING / 2);
      const y = row * GRID_SPACING * 0.866;
      const px = Math.floor(x), py = Math.floor(y);
      if (px < 0 || px >= pg.width || py < 0 || py >= pg.height) continue;
      const idx = (py * pg.width + px) * 4;
      if (pg.pixels[idx] < 128) {
        chain.push({
          x: x, y: y, oldX: x, oldY: y, restX: x, restY: y,
          sizeW: HEX_SIZE + random(-1, 2),
          sizeH: HEX_SIZE + random(0, 6),
        });
      }
    }
    if (chain.length > 0) chains.push(chain);
  }
  pg.remove();
  return chains;
}

function buildLetters() {
  const text = "SLEEPING BEAUTY";
  const chars = text.split('');
  
  // Layout: scatter letters across screen in loose grid (max 4 per row)
  const maxPerRow = 4;
  const rows = Math.ceil(chars.length / maxPerRow);
  const cellW = W / maxPerRow;
  const cellH = H / rows;
  const letterSize = Math.min(cellW * 0.7, cellH * 0.6, 120);
  
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === ' ') continue; // skip spaces
    
    const row = Math.floor(i / maxPerRow);
    const col = i % maxPerRow;
    
    // Scatter position with randomness
    const cx = col * cellW + cellW * 0.5 + random(-cellW * 0.15, cellW * 0.15);
    const cy = row * cellH + cellH * 0.5 + random(-cellH * 0.1, cellH * 0.1);
    
    const chains = rasterizeLetter(ch, letterSize);
    
    // Offset chains to world position
    for (const chain of chains) {
      for (const node of chain) {
        node.x += cx - letterSize * 0.6;
        node.y += cy - letterSize * 0.7;
        node.oldX = node.x;
        node.oldY = node.y;
        node.restX = node.x;
        node.restY = node.y;
      }
    }
    
    letterUnits.push({ chains, cx, cy });
  }
}

function draw() {
  background(255);
  const mx = mouseX, my = mouseY;

  for (const unit of letterUnits) {
    for (const chain of unit.chains) {
      // Physics
      for (let i = 0; i < chain.length; i++) {
        const node = chain[i];
        if (i === 0) { node.x = node.restX; node.y = node.restY; continue; }
        
        let vx = (node.x - node.oldX) * DAMPING;
        let vy = (node.y - node.oldY) * DAMPING;
        node.oldX = node.x; node.oldY = node.y;
        vy += GRAVITY;
        
        const dx = node.x - mx, dy = node.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          const f = (1 - dist / MOUSE_RADIUS) * MOUSE_FORCE;
          vx += (dx / dist) * f;
        }
        node.x += vx; node.y += vy;
      }
      
      // Constraints
      for (let iter = 0; iter < 4; iter++) {
        for (let i = 1; i < chain.length; i++) {
          const a = chain[i-1], b = chain[i];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx*dx + dy*dy) || 0.001;
          const diff = (dist - SEGMENT_LENGTH) / dist * 0.5;
          if (i === 1) { b.x -= dx*diff*2; b.y -= dy*diff*2; }
          else { a.x += dx*diff; a.y += dy*diff; b.x -= dx*diff; b.y -= dy*diff; }
        }
      }
    }
  }

  // Draw wires
  stroke(160);
  strokeWeight(1);
  for (const unit of letterUnits) {
    for (const chain of unit.chains) {
      for (let i = 1; i < chain.length; i++) {
        line(chain[i-1].x, chain[i-1].y, chain[i].x, chain[i].y);
      }
      // Wire to ceiling from first node
      if (chain.length > 0) {
        line(chain[0].x, chain[0].y - 20, chain[0].x, chain[0].y);
      }
    }
  }

  // Draw hexagons
  noStroke();
  fill(30);
  for (const unit of letterUnits) {
    for (const chain of unit.chains) {
      for (const node of chain) {
        drawHex(node.x, node.y, node.sizeW, node.sizeH);
      }
    }
  }
}

function drawHex(cx, cy, rw, rh) {
  beginShape();
  for (let i = 0; i < 6; i++) {
    const a = TWO_PI / 6 * i - PI / 6;
    vertex(cx + cos(a) * rw, cy + sin(a) * rh);
  }
  endShape(CLOSE);
}
