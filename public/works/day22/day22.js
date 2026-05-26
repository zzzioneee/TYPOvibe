// Day 22 — Glory and Joy
// WebGL per-pixel spin blur with strong source contrast
// 4 large centers, 2-pass, uniform weight sampling

const W = 1920, H = 1080;
const srcCanvas = document.getElementById('source');
srcCanvas.width = W; srcCanvas.height = H;
const ctx = srcCanvas.getContext('2d');

// ── Flower draw functions ────────────────────────────────
function drawBlob(cx, cy, size, c1, c2, rot) {
  const grad = ctx.createLinearGradient(cx - size, cy - size, cx + size, cy + size);
  grad.addColorStop(0, c1); grad.addColorStop(1, c2);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.fillStyle = grad; ctx.beginPath();
  ctx.moveTo(size * 0.4, 0);
  ctx.bezierCurveTo(size * 0.5, -size * 0.6, -size * 0.3, -size * 0.7, -size * 0.4, -size * 0.2);
  ctx.bezierCurveTo(-size * 0.7, size * 0.2, -size * 0.2, size * 0.6, size * 0.2, size * 0.4);
  ctx.bezierCurveTo(size * 0.6, size * 0.3, size * 0.6, size * 0.2, size * 0.4, 0);
  ctx.fill(); ctx.restore();
}
function drawPetal(cx, cy, size, petals, c1, c2, rot) {
  const grad = ctx.createLinearGradient(cx - size, cy, cx + size, cy);
  grad.addColorStop(0, c1); grad.addColorStop(1, c2);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.fillStyle = grad;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const len = size * (0.5 + (i % 3) * 0.12);
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * len * 0.5, Math.sin(a) * len * 0.5, len * 0.5, size * 0.18, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function drawLeaf(cx, cy, size, c1, c2, rot) {
  const grad = ctx.createLinearGradient(cx, cy - size, cx, cy + size);
  grad.addColorStop(0, c1); grad.addColorStop(1, c2);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.fillStyle = grad; ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * 0.6, -size * 0.3, size * 0.5, size * 0.5, 0, size * 0.8);
  ctx.bezierCurveTo(-size * 0.5, size * 0.5, -size * 0.6, -size * 0.3, 0, -size);
  ctx.fill(); ctx.restore();
}
function drawStarFlower(cx, cy, size, petals, c1, c2, rot) {
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size);
  grad.addColorStop(0, c2); grad.addColorStop(1, c1);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.fillStyle = grad; ctx.beginPath();
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const tipX = Math.cos(a) * size, tipY = Math.sin(a) * size;
    const cw = size * 0.12;
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(Math.cos(a+0.3)*cw, Math.sin(a+0.3)*cw, tipX*0.7, tipY*0.7, tipX, tipY);
    ctx.bezierCurveTo(tipX*0.7, tipY*0.7, Math.cos(a-0.3)*cw, Math.sin(a-0.3)*cw, 0, 0);
  }
  ctx.fill(); ctx.restore();
}

const COLORS = [
  ['#ff0066','#ff3399'],['#ff0044','#ff6688'],['#cc00ff','#9966ff'],
  ['#9933ff','#cc99ff'],['#ccff00','#aaff33'],['#88ff00','#ccff66'],
  ['#00aa66','#00cc88'],['#ff0088','#ff44aa'],
];

// ── Source: dense flowers ───────────────────────────────
function drawSource() {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  const cols = 6, rows = 5;
  for (let i = 0; i < 40; i++) {
    const col = i % cols, row = Math.floor(i / cols) % rows;
    const x = (col + 0.5) * (W / cols) + (Math.random() - 0.5) * (W / cols) * 0.8;
    const y = (row + 0.5) * (H / rows) + (Math.random() - 0.5) * (H / rows) * 0.8;
    const size = 60 + Math.pow(Math.random(), 0.5) * 280;
    const [c1, c2] = COLORS[Math.floor(Math.random() * COLORS.length)];
    const rot = Math.random() * Math.PI * 2;
    const type = Math.floor(Math.random() * 4);
    if (type === 0) drawBlob(x, y, size, c1, c2, rot);
    else if (type === 1) drawPetal(x, y, size, 4 + Math.floor(Math.random() * 4), c1, c2, rot);
    else if (type === 2) drawLeaf(x, y, size, c1, c2, rot);
    else drawStarFlower(x, y, size, 5 + Math.floor(Math.random() * 3), c1, c2, rot);
  }
  ctx.font = '900 140px "Inter", sans-serif';
  ctx.fillStyle = '#111';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left'; ctx.fillText('Glory', 100, 180);
  ctx.textAlign = 'center'; ctx.fillText('and', W * 0.5, 460);
  ctx.textAlign = 'right'; ctx.fillText('Joy', W - 100, 740);
}

// ── WebGL ───────────────────────────────────────────────
const glCanvas = document.getElementById('gl');
const gl = glCanvas.getContext('webgl');
glCanvas.width = W; glCanvas.height = H;

const VS = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() { v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FS = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_time;
uniform float u_aspect;
uniform float u_mix;
uniform vec2 u_c0; uniform vec2 u_c1; uniform vec2 u_c2; uniform vec2 u_c3;
uniform float u_s0; uniform float u_s1; uniform float u_s2; uniform float u_s3;
uniform float u_sp0; uniform float u_sp1; uniform float u_sp2; uniform float u_sp3;

vec4 spinBlurAt(vec2 uv, vec2 center, float strength, float speed) {
  vec2 dir = uv - center;
  vec2 cA = vec2(center.x * u_aspect, center.y);
  vec2 uvA = vec2(uv.x * u_aspect, uv.y);
  float dist = length(uvA - cA);
  
  float blurAngle = dist * strength * 1.0 * u_mix;
  float baseAngle = u_time * speed;
  
  vec4 col = vec4(0.0);
  for (int s = 0; s < 24; s++) {
    float t = (float(s) / 23.0) - 0.5;
    float angle = baseAngle + t * blurAngle;
    float co = cos(angle);
    float sn = sin(angle);
    vec2 rotDir = vec2(dir.x * co - dir.y * sn, dir.x * sn + dir.y * co);
    col += texture2D(u_tex, clamp(center + rotDir, 0.0, 1.0));
  }
  return col / 24.0;
}

void main() {
  vec2 uv = v_uv;
  if (u_mix < 0.01) { gl_FragColor = texture2D(u_tex, uv); return; }
  
  vec2 uvA = vec2(uv.x * u_aspect, uv.y);
  
  // Compute each center's blur result weighted by proximity
  float d0 = length(uvA - vec2(u_c0.x * u_aspect, u_c0.y));
  float d1 = length(uvA - vec2(u_c1.x * u_aspect, u_c1.y));
  float d2 = length(uvA - vec2(u_c2.x * u_aspect, u_c2.y));
  float d3 = length(uvA - vec2(u_c3.x * u_aspect, u_c3.y));
  
  float w0 = 1.0 / (d0 * d0 + 0.04);
  float w1 = 1.0 / (d1 * d1 + 0.04);
  float w2 = 1.0 / (d2 * d2 + 0.04);
  float w3 = 1.0 / (d3 * d3 + 0.04);
  float wTotal = w0 + w1 + w2 + w3;
  
  vec4 r0 = spinBlurAt(uv, u_c0, u_s0, u_sp0);
  vec4 r1 = spinBlurAt(uv, u_c1, u_s1, u_sp1);
  vec4 r2 = spinBlurAt(uv, u_c2, u_s2, u_sp2);
  vec4 r3 = spinBlurAt(uv, u_c3, u_s3, u_sp3);
  
  gl_FragColor = (r0 * w0 + r1 * w1 + r2 * w2 + r3 * w3) / wTotal;
}`;

let program, tex, fb, fbTex;

function initGL() {
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
  
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  
  tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  
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
  
  // Set uniforms
  gl.uniform1f(gl.getUniformLocation(program, 'u_aspect'), W / H);
  // 4 centers spread across screen
  gl.uniform2f(gl.getUniformLocation(program, 'u_c0'), 0.25, 0.28);
  gl.uniform2f(gl.getUniformLocation(program, 'u_c1'), 0.72, 0.22);
  gl.uniform2f(gl.getUniformLocation(program, 'u_c2'), 0.40, 0.72);
  gl.uniform2f(gl.getUniformLocation(program, 'u_c3'), 0.78, 0.75);
  gl.uniform1f(gl.getUniformLocation(program, 'u_s0'), 1.1);
  gl.uniform1f(gl.getUniformLocation(program, 'u_s1'), 0.9);
  gl.uniform1f(gl.getUniformLocation(program, 'u_s2'), 1.0);
  gl.uniform1f(gl.getUniformLocation(program, 'u_s3'), 0.8);
  gl.uniform1f(gl.getUniformLocation(program, 'u_sp0'), 0.15);
  gl.uniform1f(gl.getUniformLocation(program, 'u_sp1'), -0.2);
  gl.uniform1f(gl.getUniformLocation(program, 'u_sp2'), 0.12);
  gl.uniform1f(gl.getUniformLocation(program, 'u_sp3'), -0.16);
  
  return true;
}

let t0 = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const t = (now - t0) * 0.001;
  const mix = Math.min(1, t / 3); // ramp over 3s
  
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);
  
  gl.viewport(0, 0, W, H);
  gl.uniform1f(gl.getUniformLocation(program, 'u_time'), t);
  gl.uniform1f(gl.getUniformLocation(program, 'u_mix'), mix);
  
  // Pass 1 → framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  
  // Pass 2 → screen
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, fbTex);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

document.fonts.ready.then(() => {
  drawSource();
  if (!initGL()) return;
  t0 = performance.now();
  requestAnimationFrame(frame);
});
