// Day 22 v2 — Glory and Joy
// WebGL spin blur (radial motion blur) with multiple centers
// Like Photoshop's Radial Blur > Spin, applied as vinyl record discs

const W = 1920, H = 1080;

// ── 1. Draw source image (flowers + text) on offscreen canvas ────
const srcCanvas = document.getElementById('source');
srcCanvas.width = W; srcCanvas.height = H;
const ctx = srcCanvas.getContext('2d');

const FLOWER_COLORS = [
  ['#ff1493', '#ff8c00'], ['#00bfff', '#0044ff'], ['#7fff00', '#ffff00'],
  ['#ff4500', '#ff69b4'], ['#00ced1', '#00ff7f'], ['#ff1493', '#ff4500'],
  ['#4169e1', '#00bfff'], ['#ff6600', '#ffcc00'],
];

function drawFlower(cx, cy, size, petals, colorPair, rotation) {
  const [c1, c2] = colorPair;
  const grad = ctx.createLinearGradient(cx - size, cy - size, cx + size, cy + size);
  grad.addColorStop(0, c1); grad.addColorStop(1, c2);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.fillStyle = grad;
  ctx.beginPath();
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const px = Math.cos(a) * size * 0.45, py = Math.sin(a) * size * 0.45;
    ctx.moveTo(0, 0);
    ctx.ellipse(px, py, size * 0.42, size * 0.2, a, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSource() {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  // flowers
  for (let i = 0; i < 18; i++) {
    drawFlower(
      100 + Math.random() * (W - 200), 80 + Math.random() * (H - 160),
      120 + Math.random() * 280,
      Math.floor(4 + Math.random() * 5),
      FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)],
      Math.random() * Math.PI * 2
    );
  }
  // text
  ctx.font = '900 200px "Inter", sans-serif';
  ctx.fillStyle = '#111';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText('Glory', 80, 150);
  ctx.textAlign = 'center';
  ctx.fillText('and', W * 0.52, 440);
  ctx.textAlign = 'right';
  ctx.fillText('Joy', W - 80, 720);
}

// ── 2. WebGL spin blur shader ────────────────────────────
const glCanvas = document.getElementById('gl');
const gl = glCanvas.getContext('webgl');

const VS = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// Spin blur: for each of 5 disc centers, pixels within radius
// are sampled at slightly rotated positions around that center.
// Blur amount increases with distance from center (outer = faster).
// Time-based rotation makes it animate like a record.
const FS = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_time;
uniform vec2 u_centers[5];
uniform float u_radii[5];
uniform float u_strengths[5];
uniform float u_speeds[5];

void main() {
  vec2 uv = v_uv;
  
  // Find closest center
  float minD = 999.0;
  vec2 center = vec2(0.5);
  float radius = 0.3;
  float strength = 0.0;
  float speed = 0.0;
  
  for (int i = 0; i < 5; i++) {
    float d = length(uv - u_centers[i]);
    if (d < u_radii[i] && d < minD) {
      minD = d;
      center = u_centers[i];
      radius = u_radii[i];
      strength = u_strengths[i];
      speed = u_speeds[i];
    }
  }
  
  // If not inside any disc, show original
  if (minD >= 999.0 - 1.0) {
    gl_FragColor = texture2D(u_tex, uv);
    return;
  }
  
  vec2 dir = uv - center;
  float dist = length(dir);
  
  // Blur increases toward the edge of the disc (like a record — outer rim is faster)
  float edgeFactor = smoothstep(0.0, radius, dist);
  float blurAmount = edgeFactor * strength * 0.12;
  
  // Base rotation angle (continuous spinning)
  float baseAngle = u_time * speed;
  
  // Sample at multiple small rotations = spin blur
  vec4 color = vec4(0.0);
  for (int s = 0; s < 20; s++) {
    float t = (float(s) / 19.0) - 0.5; // -0.5 to 0.5
    float angle = baseAngle + t * blurAmount;
    float c = cos(angle);
    float sn = sin(angle);
    vec2 rotDir = vec2(dir.x * c - dir.y * sn, dir.x * sn + dir.y * c);
    color += texture2D(u_tex, clamp(center + rotDir, 0.0, 1.0));
  }
  
  gl_FragColor = color / 20.0;
}`;

let program, tex;
let uTime, uCenters, uRadii, uStrengths, uSpeeds;

// Disc definitions: position (0-1), radius (0-1), strength, speed
const DISCS = [
  { cx: 0.22, cy: 0.28, r: 0.28, strength: 1.0, speed: 0.3  },
  { cx: 0.75, cy: 0.20, r: 0.22, strength: 0.7, speed: -0.4 },
  { cx: 0.50, cy: 0.58, r: 0.30, strength: 0.9, speed: 0.2  },
  { cx: 0.80, cy: 0.78, r: 0.24, strength: 0.6, speed: -0.25},
  { cx: 0.15, cy: 0.82, r: 0.20, strength: 0.5, speed: 0.35 },
];

function initGL() {
  glCanvas.width = W; glCanvas.height = H;
  
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, VS); gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) { console.error('VS:', gl.getShaderInfoLog(vs)); return; }
  
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, FS); gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) { console.error('FS:', gl.getShaderInfoLog(fs)); return; }
  
  program = gl.createProgram();
  gl.attachShader(program, vs); gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { console.error('Link:', gl.getProgramInfoLog(program)); return; }
  gl.useProgram(program);
  
  // Full-screen quad
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  
  // Texture from source canvas
  tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);
  
  // Uniforms
  uTime = gl.getUniformLocation(program, 'u_time');
  uCenters = gl.getUniformLocation(program, 'u_centers');
  uRadii = gl.getUniformLocation(program, 'u_radii');
  uStrengths = gl.getUniformLocation(program, 'u_strengths');
  uSpeeds = gl.getUniformLocation(program, 'u_speeds');
  
  // Set static disc uniforms
  const centers = [], radii = [], strengths = [], speeds = [];
  for (const d of DISCS) {
    centers.push(d.cx, d.cy);
    radii.push(d.r);
    strengths.push(d.strength);
    speeds.push(d.speed);
  }
  gl.uniform2fv(uCenters, new Float32Array(centers));
  gl.uniform1fv(uRadii, new Float32Array(radii));
  gl.uniform1fv(uStrengths, new Float32Array(strengths));
  gl.uniform1fv(uSpeeds, new Float32Array(speeds));
}

// ── 3. Resize (scale to fit viewport) ────────────────────
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const scale = Math.min(vw / W, vh / H);
  glCanvas.style.width = (W * scale) + 'px';
  glCanvas.style.height = (H * scale) + 'px';
  glCanvas.style.position = 'absolute';
  glCanvas.style.left = ((vw - W * scale) / 2) + 'px';
  glCanvas.style.top = ((vh - H * scale) / 2) + 'px';
}

// ── 4. Animate ───────────────────────────────────────────
let t0 = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const t = (now - t0) * 0.001;
  gl.viewport(0, 0, W, H);
  gl.uniform1f(uTime, t);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// ── Start ────────────────────────────────────────────────
document.fonts.ready.then(() => {
  drawSource();
  initGL();
  resize();
  window.addEventListener('resize', resize);
  t0 = performance.now();
  requestAnimationFrame(frame);
});
