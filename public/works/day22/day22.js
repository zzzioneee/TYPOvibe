// Day 22 — Glory and Joy
// Soft organic shapes + full-screen spin blur (2 large centers)
// 2-pass framebuffer for smooth continuous arcs

const W = 1920, H = 1080;
const srcCanvas = document.getElementById('source');
srcCanvas.width = W; srcCanvas.height = H;
const ctx = srcCanvas.getContext('2d');

// ── Color palette (warm florals) ────────────────────────
const COLORS = [
  ['#ff0066', '#ff3399'],
  ['#ff0044', '#ff6688'],
  ['#cc00ff', '#9966ff'],
  ['#9933ff', '#cc99ff'],
  ['#ccff00', '#aaff33'],
  ['#88ff00', '#ccff66'],
  ['#00aa66', '#00cc88'],
  ['#ff0088', '#ff44aa'],
];

// ── Flower drawing functions ────────────────────────────
function drawBlob(cx, cy, size, c1, c2, rot) {
  const grad = ctx.createLinearGradient(cx - size, cy - size, cx + size, cy + size);
  grad.addColorStop(0, c1); grad.addColorStop(1, c2);
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(size * 0.4, 0);
  ctx.bezierCurveTo(size * 0.5, -size * 0.6, -size * 0.3, -size * 0.7, -size * 0.4, -size * 0.2);
  ctx.bezierCurveTo(-size * 0.7, size * 0.2, -size * 0.2, size * 0.6, size * 0.2, size * 0.4);
  ctx.bezierCurveTo(size * 0.6, size * 0.3, size * 0.6, size * 0.2, size * 0.4, 0);
  ctx.fill();
  ctx.restore();
}

function drawPetal(cx, cy, size, petals, c1, c2, rot) {
  const grad = ctx.createLinearGradient(cx - size, cy, cx + size, cy);
  grad.addColorStop(0, c1); grad.addColorStop(1, c2);
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.fillStyle = grad;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const len = size * (0.5 + (i % 3) * 0.1);
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * len * 0.5, Math.sin(a) * len * 0.5, len * 0.5, size * 0.18, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLeaf(cx, cy, size, c1, c2, rot) {
  const grad = ctx.createLinearGradient(cx, cy - size, cx, cy + size);
  grad.addColorStop(0, c1); grad.addColorStop(1, c2);
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * 0.6, -size * 0.3, size * 0.5, size * 0.5, 0, size * 0.8);
  ctx.bezierCurveTo(-size * 0.5, size * 0.5, -size * 0.6, -size * 0.3, 0, -size);
  ctx.fill();
  ctx.restore();
}

// ── Pre-generate flowers ────────────────────────────────
const flowers = [];
for (let i = 0; i < 40; i++) {
  const cols = 6, rows = 5;
  const col = i % cols, row = Math.floor(i / cols) % rows;
  flowers.push({
    x: (col + 0.5) * (W / cols) + (Math.random() - 0.5) * (W / cols) * 0.8,
    y: (row + 0.5) * (H / rows) + (Math.random() - 0.5) * (H / rows) * 0.8,
    size: 60 + Math.pow(Math.random(), 0.5) * 280,
    type: Math.floor(Math.random() * 3),
    petals: 4 + Math.floor(Math.random() * 4),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rot: Math.random() * Math.PI * 2,
    delay: i * 55,
  });
}

// ── Draw source ─────────────────────────────────────────
function drawSource(elapsed) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  
  for (const f of flowers) {
    const age = Math.max(0, elapsed - f.delay);
    const alpha = Math.min(1, age / 400);
    if (alpha < 0.01) continue;
    ctx.globalAlpha = alpha;
    const [c1, c2] = f.color;
    if (f.type === 0) drawBlob(f.x, f.y, f.size, c1, c2, f.rot);
    else if (f.type === 1) drawPetal(f.x, f.y, f.size, f.petals, c1, c2, f.rot);
    else drawLeaf(f.x, f.y, f.size, c1, c2, f.rot);
    ctx.globalAlpha = 1;
  }
  
  if (elapsed > 1800) {
    const ta = Math.min(1, (elapsed - 1800) / 500);
    ctx.globalAlpha = ta;
    ctx.font = '900 140px "Inter", sans-serif';
    ctx.fillStyle = '#111';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText('Glory', 100, 180);
    ctx.textAlign = 'center';
    ctx.fillText('and', W * 0.5, 460);
    ctx.textAlign = 'right';
    ctx.fillText('Joy', W - 100, 740);
    ctx.globalAlpha = 1;
  }
}

// ── WebGL ───────────────────────────────────────────────
const glCanvas = document.getElementById('gl');
const gl = glCanvas.getContext('webgl');

const VS = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// 2 LARGE centers, distance-weighted, strong spin blur
const FS = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_time;
uniform float u_aspect;
uniform float u_blurMix;
uniform vec2 u_centers[2];
uniform float u_strengths[2];
uniform float u_speeds[2];

void main() {
  vec2 uv = v_uv;
  
  if (u_blurMix < 0.01) {
    gl_FragColor = texture2D(u_tex, uv);
    return;
  }
  
  vec2 uvA = vec2(uv.x * u_aspect, uv.y);
  
  // Weighted blend of 2 large spin centers
  vec4 totalColor = vec4(0.0);
  float totalWeight = 0.0;
  
  for (int i = 0; i < 2; i++) {
    vec2 center = u_centers[i];
    vec2 cA = vec2(center.x * u_aspect, center.y);
    float dist = length(uvA - cA);
    
    // Soft weight — closer center dominates but both always contribute
    float w = 1.0 / (dist + 0.15);
    
    vec2 dir = uv - center;
    
    // Long smear: blur angle grows with distance
    float blurAngle = dist * u_strengths[i] * 4.0 * u_blurMix;
    float baseAngle = u_time * u_speeds[i];
    
    vec4 cColor = vec4(0.0);
    float wSum = 0.0;
    for (int s = 0; s < 30; s++) {
      float t = (float(s) / 29.0) - 0.5;
      // Sharp falloff weight — center is strong, tails are faint
      float sw = exp(-8.0 * t * t);
      float angle = baseAngle + t * blurAngle;
      float co = cos(angle);
      float sn = sin(angle);
      vec2 rotDir = vec2(dir.x * co - dir.y * sn, dir.x * sn + dir.y * co);
      cColor += texture2D(u_tex, clamp(center + rotDir, 0.0, 1.0)) * sw;
      wSum += sw;
    }
    cColor /= wSum;
    
    totalColor += cColor * w;
    totalWeight += w;
  }
  
  gl_FragColor = totalColor / totalWeight;
}`;

let program, tex, fb, fbTex, uBlurMix;

function initGL() {
  glCanvas.width = W; glCanvas.height = H;
  
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, VS); gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) { console.error('VS:', gl.getShaderInfoLog(vs)); return false; }
  
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, FS); gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) { console.error('FS:', gl.getShaderInfoLog(fs)); return false; }
  
  program = gl.createProgram();
  gl.attachShader(program, vs); gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { console.error('Link:', gl.getProgramInfoLog(program)); return false; }
  gl.useProgram(program);
  
  // Quad
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  
  // Source texture
  tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  
  // Framebuffer for 2-pass
  fb = gl.createFramebuffer();
  fbTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, fbTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbTex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  
  // Uniforms
  gl.uniform1f(gl.getUniformLocation(program, 'u_aspect'), W / H);
  
  // 2 LARGE centers — one upper-right, one lower-left
  gl.uniform2fv(gl.getUniformLocation(program, 'u_centers'), new Float32Array([
    0.65, 0.35,   // upper-right area
    0.35, 0.70,   // lower-left area
  ]));
  gl.uniform1fv(gl.getUniformLocation(program, 'u_strengths'), new Float32Array([1.0, 0.8]));
  gl.uniform1fv(gl.getUniformLocation(program, 'u_speeds'), new Float32Array([0.15, -0.12]));
  
  uBlurMix = gl.getUniformLocation(program, 'u_blurMix');
  return true;
}

// ── Resize ──────────────────────────────────────────────
function resize() {
  glCanvas.style.width = '100%';
  glCanvas.style.height = '100%';
  glCanvas.style.position = 'fixed';
  glCanvas.style.top = '0';
  glCanvas.style.left = '0';
}

// ── Animation ───────────────────────────────────────────
let t0 = 0;
const BLUR_START = 2500;
const BLUR_RAMP = 2000;

function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = now - t0;
  const t = elapsed * 0.001;
  
  // Draw source
  drawSource(elapsed);
  
  // Upload source texture
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);
  
  // Blur mix
  let blurMix = 0;
  if (elapsed > BLUR_START) {
    blurMix = Math.min(1, (elapsed - BLUR_START) / BLUR_RAMP);
    blurMix = blurMix * blurMix;
  }
  
  gl.viewport(0, 0, W, H);
  gl.uniform1f(gl.getUniformLocation(program, 'u_time'), t);
  gl.uniform1f(uBlurMix, blurMix);
  
  // Pass 1: source → framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  
  // Pass 2: framebuffer → screen (double the blur effect)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, fbTex);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// ── Start ───────────────────────────────────────────────
document.fonts.ready.then(() => {
  if (!initGL()) return;
  resize();
  window.addEventListener('resize', resize);
  t0 = performance.now();
  requestAnimationFrame(frame);
});
