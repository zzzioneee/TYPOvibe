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
// Aspect ratio corrected so circles are round, not elliptical.
const FS = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_time;
uniform vec2 u_centers[5];
uniform float u_radii[5];
uniform float u_strengths[5];
uniform float u_speeds[5];
uniform float u_aspect;

void main() {
  vec2 uv = v_uv;
  vec2 uvA = vec2(uv.x * u_aspect, uv.y);
  
  // Blend all 5 centers weighted by inverse distance (no voronoi edges)
  vec4 totalColor = vec4(0.0);
  float totalWeight = 0.0;
  
  for (int i = 0; i < 5; i++) {
    vec2 cA = vec2(u_centers[i].x * u_aspect, u_centers[i].y);
    float dist = length(uvA - cA);
    
    // Weight: inverse distance (closer center = stronger influence)
    float w = 1.0 / (dist * dist + 0.02);
    
    // Direction from this center in UV space
    vec2 dir = uv - u_centers[i];
    
    // Blur angle proportional to distance (record physics)
    float blurAngle = dist * u_strengths[i] * 1.0;
    
    // Continuous rotation
    float baseAngle = u_time * u_speeds[i];
    
    // Spin blur samples
    vec4 cColor = vec4(0.0);
    for (int s = 0; s < 16; s++) {
      float t = (float(s) / 15.0) - 0.5;
      float angle = baseAngle + t * blurAngle;
      float co = cos(angle);
      float sn = sin(angle);
      vec2 rotDir = vec2(dir.x * co - dir.y * sn, dir.x * sn + dir.y * co);
      cColor += texture2D(u_tex, clamp(u_centers[i] + rotDir, 0.0, 1.0));
    }
    cColor /= 16.0;
    
    totalColor += cColor * w;
    totalWeight += w;
  }
  
  gl_FragColor = totalColor / totalWeight;
}`;

let program, tex;
let uTime, uCenters, uRadii, uStrengths, uSpeeds, uAspect;

// Disc definitions: position (0-1), radius (0-1 in aspect-corrected space), strength, speed
const DISCS = [
  { cx: 0.22, cy: 0.28, r: 0.35, strength: 1.2, speed: 0.25 },
  { cx: 0.78, cy: 0.18, r: 0.30, strength: 0.8, speed: -0.3 },
  { cx: 0.52, cy: 0.55, r: 0.38, strength: 1.0, speed: 0.15 },
  { cx: 0.82, cy: 0.75, r: 0.32, strength: 0.6, speed: -0.2 },
  { cx: 0.13, cy: 0.80, r: 0.28, strength: 0.5, speed: 0.35 },
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
  uAspect = gl.getUniformLocation(program, 'u_aspect');
  
  // Aspect ratio
  gl.uniform1f(uAspect, W / H);
  
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
