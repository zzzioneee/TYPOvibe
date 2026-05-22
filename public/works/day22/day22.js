// Day 22 v2 — Glory and Joy
// Scene 1: Flowers pop in on white bg
// Scene 2: "Glory and Joy" text appears, then radial blur spins like a record

const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
const W = 1920, H = 1080;

// ── Offscreen canvas for compositing flowers + text ─────
const offCanvas = document.createElement('canvas');
offCanvas.width = W; offCanvas.height = H;
const ctx = offCanvas.getContext('2d');

// ── Flower definitions ──────────────────────────────────
const FLOWER_COLORS = [
  ['#ff1493', '#ff8c00'], // hot pink → orange
  ['#00bfff', '#0044ff'], // sky blue → deep blue
  ['#7fff00', '#ffff00'], // chartreuse → yellow
  ['#ff4500', '#ff69b4'], // red-orange → pink
  ['#00ced1', '#00ff7f'], // teal → green
  ['#ff1493', '#ff4500'], // pink → red
  ['#4169e1', '#00bfff'], // royal blue → sky
  ['#ff6600', '#ffcc00'], // orange → gold
];

function drawFlower(cx, cy, size, petals, colorPair, rotation) {
  const [c1, c2] = colorPair;
  const grad = ctx.createLinearGradient(cx - size, cy - size, cx + size, cy + size);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.fillStyle = grad;
  ctx.beginPath();
  for (let i = 0; i < petals; i++) {
    const angle = (i / petals) * Math.PI * 2;
    const px = Math.cos(angle) * size * 0.5;
    const py = Math.sin(angle) * size * 0.5;
    ctx.moveTo(0, 0);
    ctx.ellipse(px, py, size * 0.45, size * 0.22, angle, 0, Math.PI * 2);
  }
  ctx.fill();
  // white center
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Generate random flower data
const flowers = [];
for (let i = 0; i < 22; i++) {
  flowers.push({
    x: Math.random() * W,
    y: Math.random() * H,
    size: 120 + Math.random() * 350,
    petals: Math.floor(4 + Math.random() * 5),
    color: FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)],
    rotation: Math.random() * Math.PI * 2,
    scale: 0,
    targetScale: 1,
    delay: i * 80,
  });
}

// ── Radial blur centers ─────────────────────────────────
// ── Radial blur centers — spread across screen, no overlap ──
const BLUR_CENTERS = [
  { x: 0.18, y: 0.22, radius: 0.38 },  // top-left
  { x: 0.78, y: 0.18, radius: 0.32 },  // top-right
  { x: 0.50, y: 0.55, radius: 0.35 },  // center
  { x: 0.15, y: 0.80, radius: 0.30 },  // bottom-left
  { x: 0.82, y: 0.78, radius: 0.33 },  // bottom-right
];

// ── WebGL setup for radial blur post-process ────────────
let program, posBuffer, texCoordBuffer, texture;
let uTexture, uTime, uBlurStrength, uCenters, uRadii, uResolution;

const vsSource = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}`;

const fsSource = `
precision highp float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_time;
uniform float u_blurStrength;
uniform vec2 u_centers[5];
uniform float u_radii[5];
uniform vec2 u_resolution;

void main() {
  vec2 uv = v_texCoord;
  
  if (u_blurStrength < 0.01) {
    gl_FragColor = texture2D(u_texture, uv);
    return;
  }
  
  // Find closest blur center to this pixel
  float minDist = 999.0;
  int closest = 0;
  for (int i = 0; i < 5; i++) {
    float d = length(uv - u_centers[i]);
    if (d < minDist) { minDist = d; closest = i; }
  }
  
  vec2 center = u_centers[closest];
  float radius = u_radii[closest];
  vec2 dir = uv - center;
  float dist = length(dir);
  
  // Influence falls off from center
  float influence = smoothstep(radius, radius * 0.1, dist) * u_blurStrength;
  
  if (influence < 0.01) {
    gl_FragColor = texture2D(u_texture, uv);
    return;
  }
  
  // Radial motion blur: sample at different rotation angles around this center
  const int SAMPLES = 24;
  vec4 color = vec4(0.0);
  float maxAngle = influence * 0.4; // max rotation spread
  
  for (int s = 0; s < SAMPLES; s++) {
    float t = (float(s) / float(SAMPLES - 1)) * 2.0 - 1.0; // -1 to 1
    float angle = maxAngle * t;
    float cosA = cos(angle);
    float sinA = sin(angle);
    vec2 rotDir = vec2(dir.x * cosA - dir.y * sinA, dir.x * sinA + dir.y * cosA);
    vec2 sampleUV = center + rotDir;
    color += texture2D(u_texture, clamp(sampleUV, 0.0, 1.0));
  }
  
  gl_FragColor = color / float(SAMPLES);
}`;

function initGL() {
  // Compile shaders
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vsSource); gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fsSource); gl.compileShader(fs);
  program = gl.createProgram();
  gl.attachShader(program, vs); gl.attachShader(program, fs);
  gl.linkProgram(program); gl.useProgram(program);

  // Full-screen quad
  const positions = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
  posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const texCoords = new Float32Array([0,1, 1,1, 0,0, 1,0]);
  texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
  const aTex = gl.getAttribLocation(program, 'a_texCoord');
  gl.enableVertexAttribArray(aTex);
  gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 0, 0);

  // Texture
  texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // Uniforms
  uTexture = gl.getUniformLocation(program, 'u_texture');
  uTime = gl.getUniformLocation(program, 'u_time');
  uBlurStrength = gl.getUniformLocation(program, 'u_blurStrength');
  uCenters = gl.getUniformLocation(program, 'u_centers');
  uRadii = gl.getUniformLocation(program, 'u_radii');
  uResolution = gl.getUniformLocation(program, 'u_resolution');
}

// ── Animation state ─────────────────────────────────────
let startTime = 0;
const SCENE1_DURATION = 2000; // flowers pop in
const SCENE2_START = 2200;   // text appears
const BLUR_START = 3000;     // blur begins
const BLUR_FULL = 5000;      // blur at full strength

function renderFrame(now) {
  const elapsed = now - startTime;
  
  // ── Draw to offscreen canvas ──────────────────────────
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  // Draw flowers with pop-in animation
  for (const f of flowers) {
    const t = Math.max(0, elapsed - f.delay) / 400;
    f.scale = Math.min(1, t < 1 ? t * t * (3 - 2 * t) : 1); // smoothstep
    if (f.scale > 0.01) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(f.scale, f.scale);
      ctx.translate(-f.x, -f.y);
      drawFlower(f.x, f.y, f.size, f.petals, f.color, f.rotation);
      ctx.restore();
    }
  }

  // Draw text after scene1
  if (elapsed > SCENE2_START) {
    const textAlpha = Math.min(1, (elapsed - SCENE2_START) / 800);
    ctx.globalAlpha = textAlpha;
    ctx.font = '900 180px "Inter", sans-serif';
    ctx.fillStyle = '#111';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Glory', 120, 280);
    ctx.textAlign = 'right';
    ctx.fillText('and', W - 200, 480);
    ctx.textAlign = 'right';
    ctx.fillText('Joy', W - 120, 680);
    ctx.globalAlpha = 1;
  }

  // ── Upload to WebGL and apply radial blur ─────────────
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offCanvas);

  gl.useProgram(program);
  gl.uniform1i(uTexture, 0);
  gl.uniform1f(uTime, elapsed * 0.001);
  gl.uniform2f(uResolution, canvas.width, canvas.height);

  // Blur strength ramps up
  let blurStr = 0;
  if (elapsed > BLUR_START) {
    blurStr = Math.min(1.0, (elapsed - BLUR_START) / (BLUR_FULL - BLUR_START));
    blurStr = blurStr * blurStr * 1.8; // stronger blur
  }
  gl.uniform1f(uBlurStrength, blurStr);

  // Fixed blur centers (no drift)
  const centers = [];
  const radii = [];
  for (const bc of BLUR_CENTERS) {
    centers.push(bc.x);
    centers.push(bc.y);
    radii.push(bc.radius);
  }
  gl.uniform2fv(uCenters, new Float32Array(centers));
  gl.uniform1fv(uRadii, new Float32Array(radii));

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  requestAnimationFrame(renderFrame);
}

// ── Resize ──────────────────────────────────────────────
function resize() {
  canvas.width = window.innerWidth * Math.min(devicePixelRatio, 2);
  canvas.height = window.innerHeight * Math.min(devicePixelRatio, 2);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
}

// ── Start ───────────────────────────────────────────────
document.fonts.ready.then(() => {
  resize();
  window.addEventListener('resize', resize);
  initGL();
  startTime = performance.now();
  requestAnimationFrame(renderFrame);
});
