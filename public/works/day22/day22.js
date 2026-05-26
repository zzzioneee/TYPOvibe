// Day 22 — Glory and Joy
// Soft blobs + text on white → WebGL multi-center spin blur

const W = 1920, H = 1080;
const srcCanvas = document.getElementById('source');
srcCanvas.width = W; srcCanvas.height = H;
const ctx = srcCanvas.getContext('2d');

// ── Draw soft blob (radial gradient circle with feathered edge) ──
function drawBlob(cx, cy, r, color, alpha) {
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  const c = color;
  grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${alpha})`);
  grad.addColorStop(0.5, `rgba(${c[0]},${c[1]},${c[2]},${alpha * 0.7})`);
  grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

// ── Draw soft clover (4-5 overlapping circles) ──────────
function drawClover(cx, cy, size, petals, color, alpha) {
  for (let i = 0; i < petals; i++) {
    const angle = (i / petals) * Math.PI * 2 + Math.random() * 0.3;
    const px = cx + Math.cos(angle) * size * 0.4;
    const py = cy + Math.sin(angle) * size * 0.4;
    drawBlob(px, py, size * 0.55, color, alpha);
  }
  drawBlob(cx, cy, size * 0.3, color, alpha * 0.5);
}

// ── Color palette ───────────────────────────────────────
const CRIMSON = [180, 0, 40];
const DEEP_RED = [140, 0, 30];
const HOT_PINK = [220, 20, 80];
const MAGENTA = [180, 0, 90];
const CYAN = [0, 180, 220];
const BLUE = [0, 60, 180];
const TEAL = [0, 140, 160];

const PALETTE = [CRIMSON, CRIMSON, DEEP_RED, HOT_PINK, MAGENTA, CYAN, BLUE, TEAL];

// ── Draw source image ───────────────────────────────────
function drawSource() {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  
  // Scattered soft blobs and clovers
  for (let i = 0; i < 35; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const size = 80 + Math.random() * 250;
    const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const alpha = 0.4 + Math.random() * 0.5;
    
    if (Math.random() < 0.5) {
      drawBlob(x, y, size, color, alpha);
    } else {
      drawClover(x, y, size, 4 + Math.floor(Math.random() * 2), color, alpha);
    }
  }
  
  // Text along spiral/curved paths
  ctx.globalCompositeOperation = 'multiply';
  ctx.font = '900 120px "Inter", sans-serif';
  ctx.fillStyle = '#111';
  
  // Glory — upper left, slightly rotated
  ctx.save();
  ctx.translate(350, 300);
  ctx.rotate(-0.15);
  ctx.fillText('Glory', 0, 0);
  ctx.restore();
  
  // and — center, different angle
  ctx.save();
  ctx.translate(850, 580);
  ctx.rotate(0.1);
  ctx.font = '900 100px "Inter", sans-serif';
  ctx.fillText('and', 0, 0);
  ctx.restore();
  
  // Joy — lower right
  ctx.save();
  ctx.translate(1300, 780);
  ctx.rotate(-0.08);
  ctx.font = '900 140px "Inter", sans-serif';
  ctx.fillText('Joy', 0, 0);
  ctx.restore();
  
  // Repeated text along spiral (like reference's rotated typography)
  ctx.globalAlpha = 0.3;
  ctx.font = '800 60px "Inter", sans-serif';
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const r = 300 + i * 40;
    const x = W/2 + Math.cos(angle) * r;
    const y = H/2 + Math.sin(angle) * r;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI/2);
    ctx.fillText('Glory and Joy', 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

// ── WebGL spin blur ─────────────────────────────────────
const glCanvas = document.getElementById('gl');
const gl = glCanvas.getContext('webgl');

const VS = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FS = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_time;
uniform float u_aspect;

// 5 vortex centers
const vec2 centers[5] = vec2[5](
  vec2(0.25, 0.30),
  vec2(0.72, 0.22),
  vec2(0.50, 0.55),
  vec2(0.80, 0.75),
  vec2(0.18, 0.78)
);
const float strengths[5] = float[5](1.0, 0.7, 0.9, 0.6, 0.5);
const float speeds[5] = float[5](0.2, -0.25, 0.15, -0.18, 0.22);

void main() {
  vec2 uv = v_uv;
  vec2 uvA = vec2(uv.x * u_aspect, uv.y);
  
  // Distance-weighted blend of all 5 spin blur centers
  vec4 totalColor = vec4(0.0);
  float totalWeight = 0.0;
  
  for (int i = 0; i < 5; i++) {
    vec2 center = centers[i];
    vec2 cA = vec2(center.x * u_aspect, center.y);
    float dist = length(uvA - cA);
    
    float w = 1.0 / (dist * dist + 0.03);
    vec2 dir = uv - center;
    
    // Spin blur amount — proportional to distance
    float blurAngle = dist * strengths[i] * 0.6;
    float baseAngle = u_time * speeds[i];
    
    // 8 samples — enough for visible streaks
    vec4 cColor = vec4(0.0);
    for (int s = 0; s < 8; s++) {
      float t = (float(s) / 7.0) - 0.5;
      float angle = baseAngle + t * blurAngle;
      float co = cos(angle);
      float sn = sin(angle);
      vec2 rotDir = vec2(dir.x * co - dir.y * sn, dir.x * sn + dir.y * co);
      cColor += texture2D(u_tex, clamp(center + rotDir, 0.0, 1.0));
    }
    cColor /= 8.0;
    
    totalColor += cColor * w;
    totalWeight += w;
  }
  
  gl_FragColor = totalColor / totalWeight;
}`;

let program, tex;

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
  
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  
  tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);
  
  gl.uniform1f(gl.getUniformLocation(program, 'u_aspect'), W / H);
  return true;
}

function resize() {
  const vw = innerWidth, vh = innerHeight;
  const scale = Math.min(vw / W, vh / H);
  glCanvas.style.width = (W * scale) + 'px';
  glCanvas.style.height = (H * scale) + 'px';
  glCanvas.style.position = 'absolute';
  glCanvas.style.left = ((vw - W * scale) / 2) + 'px';
  glCanvas.style.top = ((vh - H * scale) / 2) + 'px';
}

let t0 = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const t = (now - t0) * 0.001;
  gl.viewport(0, 0, W, H);
  gl.uniform1f(gl.getUniformLocation(program, 'u_time'), t);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

document.fonts.ready.then(() => {
  drawSource();
  if (!initGL()) return;
  resize();
  window.addEventListener('resize', resize);
  t0 = performance.now();
  requestAnimationFrame(frame);
});
