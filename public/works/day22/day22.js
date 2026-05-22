import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { AfterimagePass } from "three/addons/postprocessing/AfterimagePass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// ── Config ──────────────────────────────────────────────
const PARTICLE_COUNT = 18000;
const SPARK_COUNT = 2500;
const STAR_COUNT = 5000;
const MORPH_SPEED = 0.018;
const AUTO_MORPH_INTERVAL = 4500; // ms between auto morphs

// ── Color palettes per word ─────────────────────────────
const PALETTES = {
  glory: [0xaaff00, 0xccff33, 0xffff00, 0x88ff44, 0xddff88, 0xffffff].map(c => new THREE.Color(c)),
  and:   [0x00aaff, 0x44ccff, 0x0066ff, 0x88ddff, 0x00ffee, 0xffffff].map(c => new THREE.Color(c)),
  joy:   [0xff3399, 0xff66aa, 0xff0066, 0xff88cc, 0xffaadd, 0xffffff].map(c => new THREE.Color(c)),
};

// ── Text → particle positions ───────────────────────────
function textToPoints(text, count, fontSize = 280) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200; canvas.height = 400;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.font = `900 ${fontSize}px "Playfair Display", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = [];
  for (let y = 0; y < canvas.height; y += 2) {
    for (let x = 0; x < canvas.width; x += 2) {
      const idx = (y * canvas.width + x) * 4;
      if (imageData.data[idx + 3] > 128) {
        pixels.push({ x: x - canvas.width / 2, y: -(y - canvas.height / 2) });
      }
    }
  }

  const points = [];
  for (let i = 0; i < count; i++) {
    const p = pixels[Math.floor(Math.random() * pixels.length)];
    const scale = 0.1;
    const z = (Math.random() - 0.5) * 8;
    points.push(new THREE.Vector3(p.x * scale, p.y * scale, z));
  }
  return points;
}

// ── Normalize points to fit a bounding size ─────────────
function normalise(points, size) {
  if (!points.length) return points;
  const box = new THREE.Box3().setFromPoints(points);
  const maxDim = Math.max(...box.getSize(new THREE.Vector3()).toArray()) || 1;
  const centre = box.getCenter(new THREE.Vector3());
  return points.map(p => p.clone().sub(centre).multiplyScalar(size / maxDim));
}

// ── Pattern generators ──────────────────────────────────
const PATTERNS = [
  (n) => normalise(textToPoints('Glory', n, 300), 55),
  (n) => normalise(textToPoints('and', n, 300), 45),
  (n) => normalise(textToPoints('Joy', n, 300), 55),
];
const PATTERN_PALETTES = ['glory', 'and', 'joy'];
const PATTERN_SHAPES = [0.0, 1.0, 2.0]; // 0=star, 1=glow, 2=flower

// ── Scene setup ─────────────────────────────────────────
let scene, camera, renderer, composer, controls;
let particles, sparkles, stars;
let clock = new THREE.Clock();
let currentPattern = 0, isTrans = false, prog = 0;
let autoTimer = null;

function createStars() {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(STAR_COUNT * 3);
  const col = new Float32Array(STAR_COUNT * 3);
  const size = new Float32Array(STAR_COUNT);
  const rnd = new Float32Array(STAR_COUNT);
  const R = 900;
  for (let i = 0; i < STAR_COUNT; i++) {
    const i3 = i * 3;
    const θ = Math.random() * 2 * Math.PI;
    const φ = Math.acos(2 * Math.random() - 1);
    const r = R * Math.cbrt(Math.random());
    pos[i3] = r * Math.sin(φ) * Math.cos(θ);
    pos[i3 + 1] = r * Math.sin(φ) * Math.sin(θ);
    pos[i3 + 2] = r * Math.cos(φ);
    const c = new THREE.Color().setHSL(Math.random() * 0.6, 0.3 + 0.3 * Math.random(), 0.55 + 0.35 * Math.random());
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    size[i] = 0.25 + Math.pow(Math.random(), 4) * 2.1;
    rnd[i] = Math.random() * Math.PI * 2;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(size, 1));
  geo.setAttribute("random", new THREE.BufferAttribute(rnd, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `attribute float size; attribute float random; varying vec3 vColor; varying float vRnd;
    void main(){ vColor=color; vRnd=random; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=size*(250./-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float time; varying vec3 vColor; varying float vRnd;
    void main(){ vec2 uv=gl_PointCoord-.5; float d=length(uv); float a=1.-smoothstep(.4,.5,d); a*=.7+.3*sin(time*(.6+vRnd*.3)+vRnd*5.); if(a<.02)discard; gl_FragColor=vec4(vColor,a); }`,
    transparent: true, depthWrite: false, vertexColors: true, blending: THREE.AdditiveBlending
  });
  return new THREE.Points(geo, mat);
}

function makeParticles(count, palette) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const rnd = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const base = palette[Math.random() * palette.length | 0];
    const hsl = { h: 0, s: 0, l: 0 }; base.getHSL(hsl);
    hsl.h += (Math.random() - 0.5) * 0.05;
    hsl.s = Math.min(1, Math.max(0.7, hsl.s + (Math.random() - 0.5) * 0.3));
    hsl.l = Math.min(0.9, Math.max(0.5, hsl.l + (Math.random() - 0.5) * 0.4));
    const c = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    size[i] = 0.4 + Math.pow(Math.random(), 2) * 2.5;
    rnd[i3] = Math.random() * 10; rnd[i3 + 1] = Math.random() * Math.PI * 2; rnd[i3 + 2] = 0.5 + 0.5 * Math.random();
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(size, 1));
  geo.setAttribute("random", new THREE.BufferAttribute(rnd, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, hueSpeed: { value: 0.08 }, shape: { value: 0.0 } },
    vertexShader: `uniform float time; attribute float size; attribute vec3 random; varying vec3 vCol; varying float vR;
    void main(){ vCol=color; vR=random.z; vec3 p=position; float t=time*.25*random.z; float ax=t+random.y, ay=t*.75+random.x;
    float amp=(.6+sin(random.x+t*.6)*.3)*random.z; p.x+=sin(ax+p.y*.06+random.x*.1)*amp; p.y+=cos(ay+p.z*.06+random.y*.1)*amp;
    p.z+=sin(ax*.85+p.x*.06+random.z*.1)*amp; vec4 mv=modelViewMatrix*vec4(p,1.); float pulse=.9+.1*sin(time*1.15+random.y);
    gl_PointSize=size*pulse*(350./-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float time; uniform float hueSpeed; uniform float shape; varying vec3 vCol; varying float vR;
    vec3 hueShift(vec3 c, float h){const vec3 k=vec3(0.57735);float cosA=cos(h);float sinA=sin(h);return c*cosA+cross(k,c)*sinA+k*dot(k,c)*(1.-cosA);}
    
    // 4-point star shape
    float starShape(vec2 uv) {
      float d = length(uv);
      float angle = atan(uv.y, uv.x);
      float star = pow(abs(cos(angle * 2.0)), 8.0) * 0.4 + 0.1;
      float mask = smoothstep(star + 0.05, star, d);
      float core = smoothstep(0.08, 0.0, d);
      return mask * 0.7 + core;
    }
    
    // 4-petal flower shape
    float flowerShape(vec2 uv) {
      float d = length(uv);
      float angle = atan(uv.y, uv.x);
      float petal = pow(abs(cos(angle * 2.0)), 1.5) * 0.38 + 0.06;
      float mask = smoothstep(petal + 0.04, petal - 0.02, d);
      float center = 1.0 - smoothstep(0.06, 0.1, d);
      return max(mask * 0.8, center);
    }
    
    // Original glow shape
    float glowShape(vec2 uv, float t, float r) {
      float d = length(uv);
      float core = smoothstep(0.05, 0.0, d);
      float angle = atan(uv.y, uv.x);
      float flare = pow(max(0.0, sin(angle * 6.0 + t * 2.0 * r)), 4.0);
      flare *= smoothstep(0.5, 0.0, d);
      float glow = smoothstep(0.4, 0.1, d);
      return core + flare * 0.5 + glow * 0.2;
    }
    
    void main(){
      vec2 uv = gl_PointCoord - 0.5;
      float alpha;
      if (shape < 0.5) {
        alpha = starShape(uv);
      } else if (shape < 1.5) {
        alpha = glowShape(uv, time, vR);
      } else {
        alpha = flowerShape(uv);
      }
      if(alpha < 0.01) discard;
      vec3 color = hueShift(vCol, time * hueSpeed);
      float d = length(uv);
      float core = smoothstep(0.08, 0.0, d);
      vec3 finalColor = mix(color, vec3(1.0, 0.98, 0.95), core * 0.7);
      gl_FragColor = vec4(finalColor, alpha);
    }`,
    transparent: true, depthWrite: false, vertexColors: true, blending: THREE.AdditiveBlending
  });
  return new THREE.Points(geo, mat);
}

function createSparkles(count) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const rnd = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    size[i] = 0.5 + Math.random() * 0.8;
    rnd[i * 3] = Math.random() * 10; rnd[i * 3 + 1] = Math.random() * Math.PI * 2; rnd[i * 3 + 2] = 0.5 + 0.5 * Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('random', new THREE.BufferAttribute(rnd, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `uniform float time; attribute float size; attribute vec3 random;
    void main(){ vec3 p=position; float t=time*.25*random.z; float ax=t+random.y, ay=t*.75+random.x;
    float amp=(.6+sin(random.x+t*.6)*.3)*random.z; p.x+=sin(ax+p.y*.06+random.x*.1)*amp; p.y+=cos(ay+p.z*.06+random.y*.1)*amp;
    p.z+=sin(ax*.85+p.x*.06+random.z*.1)*amp; vec4 mv=modelViewMatrix*vec4(p,1.); gl_PointSize=size*(300./-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `void main(){ float d=length(gl_PointCoord-vec2(.5)); float a=1.-smoothstep(.4,.5,d); if(a<.01)discard; gl_FragColor=vec4(1.,1.,1.,a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  return new THREE.Points(geo, mat);
}

// ── Color transition ────────────────────────────────────
function transitionColors(palette, progress) {
  const colArr = particles.geometry.attributes.color.array;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const base = palette[i % palette.length];
    const hsl = { h: 0, s: 0, l: 0 }; base.getHSL(hsl);
    hsl.h += (Math.random() - 0.5) * 0.03;
    hsl.s = Math.min(1, Math.max(0.7, hsl.s + (Math.random() - 0.5) * 0.2));
    hsl.l = Math.min(0.9, Math.max(0.5, hsl.l + (Math.random() - 0.5) * 0.3));
    const c = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
    const i3 = i * 3;
    colArr[i3] += (c.r - colArr[i3]) * progress * 0.05;
    colArr[i3 + 1] += (c.g - colArr[i3 + 1]) * progress * 0.05;
    colArr[i3 + 2] += (c.b - colArr[i3 + 2]) * progress * 0.05;
  }
  particles.geometry.attributes.color.needsUpdate = true;
}

// ── Init ────────────────────────────────────────────────
function init() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050203, 0.008);
  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2500);
  camera.position.set(0, 0, 80);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  document.getElementById("container").appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 30;
  controls.maxDistance = 200;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.3;

  stars = createStars();
  scene.add(stars);

  particles = makeParticles(PARTICLE_COUNT, PALETTES.glory);
  sparkles = createSparkles(SPARK_COUNT);
  scene.add(particles);
  scene.add(sparkles);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.5, 0.85));
  const after = new AfterimagePass(); after.uniforms.damp.value = 0.9;
  composer.addPass(after);
  composer.addPass(new OutputPass());

  applyPattern(currentPattern);

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  });

  // Auto morph loop
  autoTimer = setInterval(() => {
    if (!isTrans) beginMorph();
  }, AUTO_MORPH_INTERVAL);
}

function applyPattern(i) {
  const pts = PATTERNS[i](PARTICLE_COUNT);
  const pArr = particles.geometry.attributes.position.array;
  const sArr = sparkles.geometry.attributes.position.array;
  for (let j = 0; j < PARTICLE_COUNT; j++) {
    const idx = j * 3;
    const p = pts[j] || new THREE.Vector3();
    pArr[idx] = p.x; pArr[idx + 1] = p.y; pArr[idx + 2] = p.z;
    if (j < SPARK_COUNT) { sArr[idx] = p.x; sArr[idx + 1] = p.y; sArr[idx + 2] = p.z; }
  }
  particles.geometry.attributes.position.needsUpdate = true;
  sparkles.geometry.attributes.position.needsUpdate = true;
}

function beginMorph() {
  isTrans = true; prog = 0;
  const next = (currentPattern + 1) % PATTERNS.length;
  const fromPts = particles.geometry.attributes.position.array.slice();
  const toPts = PATTERNS[next](PARTICLE_COUNT);
  const to = new Float32Array(PARTICLE_COUNT * 3);
  for (let j = 0; j < PARTICLE_COUNT; j++) {
    const idx = j * 3, p = toPts[j];
    to[idx] = p.x; to[idx + 1] = p.y; to[idx + 2] = p.z;
  }
  particles.userData = { from: fromPts, to, next };
}

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta(), t = clock.getElapsedTime();
  controls.update();
  particles.material.uniforms.time.value = t;
  sparkles.material.uniforms.time.value = t;
  stars.material.uniforms.time.value = t;

  if (isTrans) {
    prog += MORPH_SPEED;
    const eased = prog >= 1 ? 1 : 1 - Math.pow(1 - prog, 3);
    const { from, to, next } = particles.userData;
    if (to) {
      const pArr = particles.geometry.attributes.position.array;
      const sArr = sparkles.geometry.attributes.position.array;
      for (let i = 0; i < pArr.length; i++) {
        const val = from[i] + (to[i] - from[i]) * eased;
        pArr[i] = val;
        if (i < sArr.length) sArr[i] = val;
      }
      particles.geometry.attributes.position.needsUpdate = true;
      sparkles.geometry.attributes.position.needsUpdate = true;
      // Transition colors
      transitionColors(PALETTES[PATTERN_PALETTES[next]], eased);
      // Switch shape at midpoint
      if (eased > 0.5) {
        particles.material.uniforms.shape.value = PATTERN_SHAPES[next];
      }
    }
    if (prog >= 1) {
      currentPattern = particles.userData.next;
      particles.material.uniforms.shape.value = PATTERN_SHAPES[currentPattern];
      isTrans = false;
    }
  }

  composer.render(dt);
}

// Wait for font to load then init
document.fonts.ready.then(() => {
  init();
  animate();
});
