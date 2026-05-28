// Day 26 — SWING Display
// Generative typography: chandelier-style swinging dots
// p5.js + matter.js

const { Engine, World, Bodies, Constraint, Mouse, MouseConstraint, Body } = Matter;

let engine, world;
let dotBodies = [];
let wires = [];
let W, H;
const DOT_RADIUS = 6;
const GRID_STEP = 14;
const WIRE_STIFFNESS = 0.02;
const TEXT_WORD = 'SWING';

// ── Rasterize text to dot grid positions ────────────────
function textToPositions(text, fontSize, offsetX, offsetY) {
  const pg = createGraphics(800, 200);
  pg.background(255);
  pg.fill(0);
  pg.noStroke();
  pg.textFont('Helvetica');
  pg.textStyle(BOLD);
  pg.textSize(fontSize);
  pg.textAlign(CENTER, CENTER);
  pg.text(text, 400, 100);
  pg.loadPixels();
  
  const positions = [];
  for (let y = 0; y < pg.height; y += GRID_STEP) {
    for (let x = 0; x < pg.width; x += GRID_STEP) {
      const idx = (y * pg.width + x) * 4;
      if (pg.pixels[idx] < 128) {
        positions.push({ x: x + offsetX - 400, y: y + offsetY - 100 });
      }
    }
  }
  pg.remove();
  return positions;
}

// ── Create physics bodies ───────────────────────────────
function createSwingDisplay() {
  const positions = textToPositions(TEXT_WORD, 160, W / 2, H / 2);
  
  for (const pos of positions) {
    // Dot body (circle)
    const body = Bodies.circle(pos.x, pos.y, DOT_RADIUS, {
      restitution: 0.3,
      friction: 0.1,
      density: 0.002,
      frictionAir: 0.02,
    });
    World.add(world, body);
    dotBodies.push(body);
    
    // Wire: constraint from anchor point above to body
    const anchorY = pos.y - 60 - Math.random() * 40;
    const wire = Constraint.create({
      pointA: { x: pos.x, y: anchorY },
      bodyB: body,
      pointB: { x: 0, y: 0 },
      length: pos.y - anchorY,
      stiffness: WIRE_STIFFNESS + Math.random() * 0.01,
      damping: 0.05,
    });
    World.add(world, wire);
    wires.push(wire);
  }
}

// ── p5.js setup ─────────────────────────────────────────
function setup() {
  W = windowWidth;
  H = windowHeight;
  createCanvas(W, H);
  
  engine = Engine.create();
  engine.gravity.y = 0.5;
  world = engine.world;
  
  createSwingDisplay();
}

// ── p5.js draw ──────────────────────────────────────────
function draw() {
  Engine.update(engine, 16.67);
  
  background(255);
  
  // Mouse interaction: push nearby bodies
  if (mouseX > 0 && mouseX < W && mouseY > 0 && mouseY < H) {
    const mouseRadius = 120;
    const mouseForce = 0.003;
    for (const body of dotBodies) {
      const dx = body.position.x - mouseX;
      const dy = body.position.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < mouseRadius && dist > 0) {
        const force = (1 - dist / mouseRadius) * mouseForce;
        Body.applyForce(body, body.position, {
          x: (dx / dist) * force,
          y: (dy / dist) * force * 0.5,
        });
      }
    }
  }
  
  // Draw wires
  stroke(0);
  strokeWeight(1);
  for (const wire of wires) {
    const ax = wire.pointA.x;
    const ay = wire.pointA.y;
    const bx = wire.bodyB.position.x;
    const by = wire.bodyB.position.y;
    line(ax, ay, bx, by);
  }
  
  // Draw dots
  fill(0);
  noStroke();
  for (const body of dotBodies) {
    const { x, y } = body.position;
    const angle = body.angle;
    push();
    translate(x, y);
    rotate(angle);
    ellipse(0, 0, DOT_RADIUS * 2, DOT_RADIUS * 2.4);
    pop();
  }
}

function windowResized() {
  W = windowWidth;
  H = windowHeight;
  resizeCanvas(W, H);
}

// Make p5 global mode work
window.setup = setup;
window.draw = draw;
window.windowResized = windowResized;
