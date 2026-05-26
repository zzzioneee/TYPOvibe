// Day 22 — Glory and Joy
// WebGL per-pixel spin blur with strong source contrast
// 4 large centers, 2-pass, uniform weight sampling

const W = 1920, H = 1080;
const srcCanvas = document.getElementById('source');
srcCanvas.width = W; srcCanvas.height = H;
const ctx = srcCanvas.getContext('2d');

// ── Source: large bold color blocks (not small flowers) ─
// Big opaque shapes with hard edges = sharp smear lines after blur
function drawSource() {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  
  const shapes = [
    { x: 300, y: 200, r: 350, color: '#ff0055' },
    { x: 900, y: 150, r: 280, color: '#cc00ff' },
    { x: 1500, y: 300, r: 320, color: '#ff0088' },
    { x: 200, y: 600, r: 300, color: '#00cc77' },
    { x: 700, y: 500, r: 400, color: '#ff3300' },
    { x: 1200, y: 650, r: 350, color: '#9900ff' },
    { x: 1600, y: 700, r: 280, color: '#ff0066' },
    { x: 500, y: 850, r: 300, color: '#ccff00' },
    { x: 1000, y: 900, r: 320, color: '#0066ff' },
    { x: 1500, y: 900, r: 250, color: '#ff44aa' },
    { x: 400, y: 400, r: 200, color: '#00aaff' },
    { x: 1100, y: 350, r: 250, color: '#ff6600' },
  ];
  
  for (const s of shapes) {
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, s.r, s.r * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Text
  ctx.font = '900 160px "Inter", sans-serif';
  ctx.fillStyle = '#111';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText('Glory', 80, 150);
  ctx.textAlign = 'center';
  ctx.fillText('and', W * 0.5, 440);
  ctx.textAlign = 'right';
  ctx.fillText('Joy', W - 80, 730);
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
