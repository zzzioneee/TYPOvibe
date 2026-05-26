// Day 22 — Glory and Joy
// Soft blobs + text on white → WebGL multi-center spin blur

const W = 1920, H = 1080;
const srcCanvas = document.getElementById('source');
srcCanvas.width = W; srcCanvas.height = H;
const ctx = srcCanvas.getContext('2d');

// ── Draw varied flower shapes (reference-inspired) ───────

// Type 1: Tulip — rounded cup shape
function drawTulip(cx, cy, size, color1, color2, rotation) {
  const grad = ctx.createLinearGradient(cx - size, cy, cx + size, cy);
  grad.addColorStop(0, color1); grad.addColorStop(1, color2);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, -size * 0.2, size * 0.5, size * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // stem
  ctx.strokeStyle = '#00aa66';
  ctx.lineWidth = size * 0.06;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, size * 0.3);
  ctx.quadraticCurveTo(size * 0.1, size * 0.7, -size * 0.05, size * 1.1);
  ctx.stroke();
  ctx.restore();
}

// Type 2: Star/spiky flower — long thin petals radiating
function drawStarFlower(cx, cy, size, petals, color1, color2, rotation) {
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size);
  grad.addColorStop(0, color2); grad.addColorStop(1, color1);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.fillStyle = grad;
  ctx.beginPath();
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const tipX = Math.cos(a) * size;
    const tipY = Math.sin(a) * size;
    const cw = size * 0.12;
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(
      Math.cos(a + 0.3) * cw, Math.sin(a + 0.3) * cw,
      tipX * 0.7, tipY * 0.7,
      tipX, tipY
    );
    ctx.bezierCurveTo(
      tipX * 0.7, tipY * 0.7,
      Math.cos(a - 0.3) * cw, Math.sin(a - 0.3) * cw,
      0, 0
    );
  }
  ctx.fill();
  ctx.restore();
}

// Type 3: Round blob — single organic shape
function drawBlobFlower(cx, cy, size, color1, color2, rotation) {
  const grad = ctx.createLinearGradient(cx - size, cy - size, cx + size, cy + size);
  grad.addColorStop(0, color1); grad.addColorStop(1, color2);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.fillStyle = grad;
  ctx.beginPath();
  // Organic blob with bezier curves
  ctx.moveTo(size * 0.4, 0);
  ctx.bezierCurveTo(size * 0.5, -size * 0.6, -size * 0.2, -size * 0.7, -size * 0.4, -size * 0.2);
  ctx.bezierCurveTo(-size * 0.7, size * 0.1, -size * 0.3, size * 0.6, size * 0.1, size * 0.5);
  ctx.bezierCurveTo(size * 0.5, size * 0.4, size * 0.6, size * 0.2, size * 0.4, 0);
  ctx.fill();
  ctx.restore();
}

// Type 4: Multi-petal (like reference clover but varied petal count/shape)
function drawMultiPetal(cx, cy, size, petals, color1, color2, rotation) {
  const grad = ctx.createLinearGradient(cx - size, cy - size, cx + size, cy + size);
  grad.addColorStop(0, color1); grad.addColorStop(1, color2);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.fillStyle = grad;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const petalLen = size * (0.6 + (i * 0.13 % 0.4));
    const petalW = size * (0.2 + (i * 0.07 % 0.15));
    ctx.beginPath();
    ctx.ellipse(
      Math.cos(a) * petalLen * 0.5,
      Math.sin(a) * petalLen * 0.5,
      petalLen * 0.5, petalW,
      a, 0, Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();
}

// Type 5: Leaf/teardrop
function drawLeaf(cx, cy, size, color1, color2, rotation) {
  const grad = ctx.createLinearGradient(cx, cy - size, cx, cy + size);
  grad.addColorStop(0, color1); grad.addColorStop(1, color2);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * 0.6, -size * 0.3, size * 0.5, size * 0.5, 0, size * 0.8);
  ctx.bezierCurveTo(-size * 0.5, size * 0.5, -size * 0.6, -size * 0.3, 0, -size);
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

// ── Pre-generate flower data ─────────────────────────────
const flowerData = [];
const cols = 6, rows = 5;
const cellW = W / cols, cellH = H / rows;
for (let i = 0; i < 45; i++) {
  const col = i % cols;
  const row = Math.floor(i / cols) % rows;
  flowerData.push({
    x: col * cellW + (Math.random() - 0.2) * cellW,
    y: row * cellH + (Math.random() - 0.2) * cellH,
    size: 80 + Math.pow(Math.random(), 0.6) * 320,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rot: Math.random() * Math.PI * 2,
    type: Math.floor(Math.random() * 5),
    petals: 3 + Math.floor(Math.random() * 5),
    delay: i * 60, // staggered appearance
  });
}

// ── Draw source (animated: flowers pop in based on elapsed) ──
function drawSource(elapsed) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  
  for (const f of flowerData) {
    // Bloom: fade in smoothly (opacity 0→1)
    const age = Math.max(0, elapsed - f.delay);
    const alpha = Math.min(1, age / 500); // 500ms fade in
    if (alpha < 0.01) continue;
    
    ctx.globalAlpha = alpha;
    
    const [c1, c2] = f.color;
    if (f.type === 0) drawTulip(f.x, f.y, f.size, c1, c2, f.rot);
    else if (f.type === 1) drawStarFlower(f.x, f.y, f.size, f.petals, c1, c2, f.rot);
    else if (f.type === 2) drawBlobFlower(f.x, f.y, f.size, c1, c2, f.rot);
    else if (f.type === 3) drawMultiPetal(f.x, f.y, f.size, f.petals, c1, c2, f.rot);
    else drawLeaf(f.x, f.y, f.size, c1, c2, f.rot);
    
    ctx.globalAlpha = 1;
  }
  
  // Text (appears after flowers)
  if (elapsed > 2000) {
    const textAlpha = Math.min(1, (elapsed - 2000) / 600);
    ctx.globalAlpha = textAlpha;
    ctx.font = '900 130px "Inter", sans-serif';
    ctx.fillStyle = '#111';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText('Glory', 100, 200);
    ctx.textAlign = 'center';
    ctx.fillText('and', W * 0.52, 480);
    ctx.textAlign = 'right';
    ctx.fillText('Joy', W - 100, 740);
    ctx.globalAlpha = 1;
  }
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

uniform float u_blurMix;

void main() {
  vec2 uv = v_uv;
  
  if (u_blurMix < 0.01) {
    gl_FragColor = texture2D(u_tex, uv);
    return;
  }
  
  vec2 uvA = vec2(uv.x * u_aspect, uv.y);
  
  // Find strongest disc influence on this pixel
  float bestInf = 0.0;
  vec2 bestCenter = vec2(0.5);
  float bestStrength = 0.0;
  float bestSpeed = 0.0;
  float bestDist = 0.0;
  
  for (int i = 0; i < 5; i++) {
    vec2 cA = vec2(u_centers[i].x * u_aspect, u_centers[i].y);
    float d = length(uvA - cA);
    float inf = smoothstep(0.30, 0.08, d); // radius ~0.30, feather inward
    if (inf > bestInf) {
      bestInf = inf;
      bestCenter = u_centers[i];
      bestStrength = u_strengths[i];
      bestSpeed = u_speeds[i];
      bestDist = d;
    }
  }
  
  if (bestInf < 0.01) {
    gl_FragColor = texture2D(u_tex, uv);
    return;
  }
  
  vec2 dir = uv - bestCenter;
  
  // Blur stronger at rim, weak at center
  float edgeFactor = smoothstep(0.04, 0.25, bestDist);
  float blurAngle = edgeFactor * bestStrength * 0.5 * u_blurMix;
  float baseAngle = u_time * bestSpeed;
  
  vec4 blurred = vec4(0.0);
  for (int s = 0; s < 30; s++) {
    float t = (float(s) / 29.0) - 0.5;
    float angle = baseAngle + t * blurAngle;
    float co = cos(angle);
    float sn = sin(angle);
    vec2 rotDir = vec2(dir.x * co - dir.y * sn, dir.x * sn + dir.y * co);
    blurred += texture2D(u_tex, clamp(bestCenter + rotDir, 0.0, 1.0));
  }
  blurred /= 30.0;
  
  vec4 original = texture2D(u_tex, uv);
  gl_FragColor = mix(original, blurred, bestInf);
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
    0.30, 0.20,   // 상단 좌
    0.72, 0.18,   // 상단 우
    0.48, 0.52,   // 중앙 (큰 원)
    0.25, 0.80,   // 하단 좌
    0.75, 0.78,   // 하단 우
  ]));
  gl.uniform1fv(gl.getUniformLocation(program, 'u_strengths'), new Float32Array([0.9, 0.7, 1.2, 0.8, 0.6]));
  gl.uniform1fv(gl.getUniformLocation(program, 'u_speeds'), new Float32Array([0.2, -0.25, 0.12, -0.18, 0.22]));
  
  uBlurMix = gl.getUniformLocation(program, 'u_blurMix');
  
  return true;
}

function resize() {
  glCanvas.style.width = '100%';
  glCanvas.style.height = '100%';
  glCanvas.style.position = 'fixed';
  glCanvas.style.top = '0';
  glCanvas.style.left = '0';
}

let t0 = 0;
let uBlurMix;
const BLUR_START = 4000;    // blur starts after all flowers popped
const BLUR_RAMP = 3000;     // takes 3s to reach full — smooth transition

function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = now - t0;
  const t = elapsed * 0.001;
  
  // Re-draw source with animated flowers
  drawSource(elapsed);
  
  // Re-upload texture
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);
  
  // Blur mix: smooth ramp
  let blurMix = 0;
  if (elapsed > BLUR_START) {
    blurMix = Math.min(1, (elapsed - BLUR_START) / BLUR_RAMP);
    blurMix = blurMix * blurMix; // ease-in for natural feel
  }
  
  gl.viewport(0, 0, W, H);
  gl.uniform1f(gl.getUniformLocation(program, 'u_time'), t);
  gl.uniform1f(uBlurMix, blurMix);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

document.fonts.ready.then(() => {
  if (!initGL()) return;
  resize();
  window.addEventListener('resize', resize);
  t0 = performance.now();
  requestAnimationFrame(frame);
});
