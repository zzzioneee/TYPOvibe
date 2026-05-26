// Day 22 — Glory and Joy
// Soft blobs + text on white → WebGL multi-center spin blur

const W = 1920, H = 1080;
const srcCanvas = document.getElementById('source');
srcCanvas.width = W; srcCanvas.height = H;
const ctx = srcCanvas.getContext('2d');

// ── Draw solid flower (sharp edge, gradient fill) ────────
function drawFlower(cx, cy, size, petals, color1, color2, rotation) {
  const grad = ctx.createLinearGradient(cx - size, cy - size, cx + size, cy + size);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.fillStyle = grad;
  ctx.beginPath();
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const px = Math.cos(a) * size * 0.45;
    const py = Math.sin(a) * size * 0.45;
    ctx.moveTo(0, 0);
    ctx.ellipse(px, py, size * 0.44, size * 0.22, a, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

// ── Color pairs: crimson/red dominant + cyan accent ─────
const COLORS = [
  ['#ff0066', '#ff3399'],  // hot pink → magenta
  ['#ff0044', '#ff6688'],  // vivid red → pink
  ['#cc00ff', '#9966ff'],  // purple → lavender
  ['#9933ff', '#cc99ff'],  // violet → light purple
  ['#ccff00', '#aaff33'],  // neon lime → yellow-green
  ['#88ff00', '#ccff66'],  // chartreuse → light lime
  ['#00aa66', '#00cc88'],  // emerald → green
  ['#ff0088', '#ff44aa'],  // magenta → bright pink
];

// ── Draw source ─────────────────────────────────────────
function drawSource() {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  
  // Grid-based flower placement for even spread
  const cols = 5, rows = 4;
  const cellW = W / cols, cellH = H / rows;
  for (let i = 0; i < 24; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols) % rows;
    const x = col * cellW + Math.random() * cellW;
    const y = row * cellH + Math.random() * cellH;
    const size = 100 + Math.random() * 220;
    const [c1, c2] = COLORS[Math.floor(Math.random() * COLORS.length)];
    drawFlower(x, y, size, 4 + Math.floor(Math.random() * 3), c1, c2, Math.random() * Math.PI * 2);
  }
  
  // Text
  ctx.font = '900 130px "Inter", sans-serif';
  ctx.fillStyle = '#111';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText('Glory', 100, 200);
  ctx.textAlign = 'center';
  ctx.fillText('and', W * 0.52, 480);
  ctx.textAlign = 'right';
  ctx.fillText('Joy', W - 100, 740);
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
uniform vec2 u_centers[5];
uniform float u_strengths[5];
uniform float u_speeds[5];

void main() {
  vec2 uv = v_uv;
  vec2 uvA = vec2(uv.x * u_aspect, uv.y);
  
  vec4 totalColor = vec4(0.0);
  float totalWeight = 0.0;
  
  for (int i = 0; i < 5; i++) {
    vec2 center = u_centers[i];
    vec2 cA = vec2(center.x * u_aspect, center.y);
    float dist = length(uvA - cA);
    
    float w = 1.0 / (dist * dist + 0.03);
    vec2 dir = uv - center;
    
    float blurAngle = dist * u_strengths[i] * 1.2;
    float baseAngle = u_time * u_speeds[i];
    
    vec4 cColor = vec4(0.0);
    for (int s = 0; s < 60; s++) {
      float t = (float(s) / 59.0) - 0.5;
      float angle = baseAngle + t * blurAngle;
      float co = cos(angle);
      float sn = sin(angle);
      vec2 rotDir = vec2(dir.x * co - dir.y * sn, dir.x * sn + dir.y * co);
      cColor += texture2D(u_tex, clamp(center + rotDir, 0.0, 1.0));
    }
    cColor /= 60.0;
    
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
  
  // Set vortex center uniforms
  gl.uniform2fv(gl.getUniformLocation(program, 'u_centers'), new Float32Array([
    0.25, 0.30,  0.72, 0.22,  0.50, 0.55,  0.80, 0.75,  0.18, 0.78
  ]));
  gl.uniform1fv(gl.getUniformLocation(program, 'u_strengths'), new Float32Array([1.0, 0.7, 0.9, 0.6, 0.5]));
  gl.uniform1fv(gl.getUniformLocation(program, 'u_speeds'), new Float32Array([0.2, -0.25, 0.15, -0.18, 0.22]));
  
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
