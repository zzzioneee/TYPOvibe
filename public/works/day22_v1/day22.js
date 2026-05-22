import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { AfterimagePass } from "three/addons/postprocessing/AfterimagePass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// ── Config ──────────────────────────────────────────────
const PARTICLE_COUNT = 20000;
const SPARK_COUNT = 3000;
const STAR_COUNT = 4000;
const MORPH_SPEED = 0.012;
const HOLD_TIME = 2500; // ms to hold text/scatter before next morph

// ── Color palettes ──────────────────────────────────────
const PALETTES = {
  glory: [0xaaff00, 0xccff33, 0xffff00, 0x88ff44, 0xddff88, 0xffffff].map(c => new THREE.Color(c)),
  and:   [0x00aaff, 0x44ccff, 0x0066ff, 0x88ddff, 0x00ffee, 0xffffff].map(c => new THREE.Color(c)),
  joy:   [0xff3399, 0xff66aa, 0xff0066, 0xff88cc, 0xffaadd, 0xffffff].map(c => new THREE.Color(c)),
};

// ── Text → particle positions ───────────────────────────
function textToPoints(text, count, fontSize = 320) {
  const canvas = document.createElement('canvas');
  canvas.width = 1400; canvas.height = 500;
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
      if (imageData.data[(y * canvas.width + x) * 4 + 3] > 128) {
        pixels.push({ x: x - canvas.width / 2, y: -(y - canvas.height / 2) });
      }
    }
  }

  const points = [];
  for (let i = 0; i < count; i++) {
    const p = pixels[Math.floor(Math.random() * pixels.length)];
    const scale = 0.09;
    points.push(new THREE.Vector3(p.x * scale, p.y * scale, (Math.random() - 0.5) * 6));
  }
  return normalise(points, 55);
}

// ── Scatter patterns (background states) ────────────────
// Stars scattered — sparkle-like random spread
function scatterStars(count) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const r = 30 + Math.random() * 50;
    const θ = Math.random() * Math.PI * 2;
    const φ = Math.acos(2 * Math.random() - 1);
    pts.push(new THREE.Vector3(
      r * Math.sin(φ) * Math.cos(θ),
      r * Math.sin(φ) * Math.sin(θ),
      r * Math.cos(φ)
    ));
  }
  return pts;
}

// Circles scattered — orbiting rings
function scatterCircles(count) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const ring = Math.floor(Math.random() * 5);
    const r = 20 + ring * 10 + Math.random() * 5;
    const θ = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 30;
    pts.push(new THREE.Vector3(r * Math.cos(θ), y, r * Math.sin(θ)));
  }
  return pts;
}

// Flowers scattered — clusters like a flower field
function scatterFlowers(count) {
  const pts = [];
  const clusters = 12;
  for (let i = 0; i < count; i++) {
    const ci = i % clusters;
    const cx = (ci % 4 - 1.5) * 25;
    const cy = (Math.floor(ci / 4) - 1) * 25;
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 12;
    pts.push(new THREE.Vector3(
      cx + Math.cos(angle) * r,
      cy + Math.sin(angle) * r,
      (Math.random() - 0.5) * 15
    ));
  }
  return pts;
}

function normalise(points, size) {
  if (!points.length) return points;
  const box = new THREE.Box3().setFromPoints(points);
  const maxDim = Math.max(...box.getSize(new THREE.Vector3()).toArray()) || 1;
  const centre = box.getCenter(new THREE.Vector3());
  return points.map(p => p.clone().sub(centre).multiplyScalar(size / maxDim));
}

// ── Sequence: scatter → text → scatter → text → ...
// Each step: { points, palette, shape }
// shape: 0=star, 1=glow, 2=flower
const SEQUENCE = [
  { gen: (n) => scatterStars(n),               palette: 'glory', shape: 0.0 },
  { gen: (n) => textToPoints('Glory', n, 320), palette: 'glory', shape: 0.0 },
  { gen: (n) => scatterCircles(n),             palette: 'and',   shape: 1.0 },
  { gen: (n) => textToPoints('and', n, 320),   palette: 'and',   shape: 1.0 },
  { gen: (n) => scatterFlowers(n),             palette: 'joy',   shape: 2.0 },
  { gen: (n) => textToPoints('Joy', n, 320),   palette: 'joy',   shape: 2.0 },
];

// ── Scene ───────────────────────────────────────────────
let scene, camera, renderer, composer, controls;
let particles, sparkles, stars;
let clock = new THREE.Clock();
let currentStep = 0, isTrans = false, prog = 0;
let holdTimer = null;

function createStars() {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(STAR_COUNT * 3);
  const col = new Float32Array(STAR_COUNT * 3);
  const size = new Float32Array(STAR_COUNT);
  const rnd = new Float32Array(STAR_COUNT);
  const R = 600;
  for (let i = 0; i < STAR_COUNT; i++) {
    const i3 = i * 3;
    const θ = Math.random() * 2 * Math.PI;
    const φ = Math.acos(2 * Math.random() - 1);
    const r = R * Math.cbrt(Math.random());
    pos[i3] = r * Math.sin(φ) * Math.cos(θ);
    pos[i3 + 1] = r * Math.sin(φ) * Math.sin(θ);
    pos[i3 + 2] = r * Math.cos(φ);
    const c = new THREE.Color().setHSL(Math.random() * 0.6, 0.2 + 0.2 * Math.random(), 0.4 + 0.3 * Math.random());
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    size[i] = 0.2 + Math.pow(Math.random(), 4) * 1.5;
    rnd[i] = Math.random() * Math.PI * 2;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(size, 1));
  geo.setAttribute("random", new THREE.BufferAttribute(rnd, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `attribute float size; attribute float random; varying vec3 vColor; varying float vRnd;
    void main(){ vColor=color; vRnd=random; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=size*(200./-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float time; varying vec3 vColor; varying float vRnd;
    void main(){ vec2 uv=gl_PointCoord-.5; float d=length(uv); float a=1.-smoothstep(.4,.5,d); a*=.6+.4*sin(time*(.5+vRnd*.2)+vRnd*5.); if(a<.02)discard; gl_FragColor=vec4(vColor,a); }`,
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
    // Bigger size range for more contrast
    size[i] = 0.3 + Math.pow(Math.random(), 1.5) * 3.5;
    rnd[i3] = Math.random() * 10; rnd[i3 + 1] = Math.random() * Math.PI * 2; rnd[i3 + 2] = 0.5 + 0.5 * Math.random();
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(size, 1));
  geo.setAttribute("random", new THREE.BufferAttribute(rnd, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, hueSpeed: { value: 0.08 }, shape: { value: 0.0 } },
    vertexShader: `uniform float time; attribute float size; attribute vec3 random; varying vec3 vCol; varying float vR;
    void main(){ vCol=color; vR=random.z; vec3 p=position; float t=time*.2*random.z; float ax=t+random.y, ay=t*.7+random.x;
    float amp=(.5+sin(random.x+t*.5)*.25)*random.z; p.x+=sin(ax+p.y*.05)*amp; p.y+=cos(ay+p.z*.05)*amp;
    p.z+=sin(ax*.8+p.x*.05)*amp; vec4 mv=modelViewMatrix*vec4(p,1.); float pulse=.9+.1*sin(time*1.1+random.y);
    gl_PointSize=size*pulse*(400./-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float time; uniform float hueSpeed; uniform float shape; varying vec3 vCol; varying float vR;
    vec3 hueShift(vec3 c, float h){const vec3 k=vec3(0.57735);float cosA=cos(h);float sinA=sin(h);return c*cosA+cross(k,c)*sinA+k*dot(k,c)*(1.-cosA);}
    
    float starShape(vec2 uv) {
      float d = length(uv);
      float angle = atan(uv.y, uv.x);
      float star = pow(abs(cos(angle * 2.0)), 6.0) * 0.42 + 0.08;
      float mask = smoothstep(star + 0.03, star - 0.01, d);
      float core = smoothstep(0.06, 0.0, d);
      return mask * 0.8 + core;
    }
    
    float flowerShape(vec2 uv) {
      float d = length(uv);
      float angle = atan(uv.y, uv.x);
      float petal = pow(abs(cos(angle * 2.0)), 1.2) * 0.4 + 0.05;
      float mask = smoothstep(petal + 0.03, petal - 0.02, d);
      float center = 1.0 - smoothstep(0.05, 0.09, d);
      return max(mask * 0.85, center);
    }
    
    float glowShape(vec2 uv, float t, float r) {
      float d = length(uv);
      float core = smoothstep(0.06, 0.0, d);
      float angle = atan(uv.y, uv.x);
      float flare = pow(max(0.0, sin(angle * 4.0 + t * 1.5 * r)), 3.0);
      flare *= smoothstep(0.5, 0.0, d);
      float glow = smoothstep(0.45, 0.08, d);
      return core + flare * 0.4 + glow * 0.3;
    }
    
    void main(){
      vec2 uv = gl_PointCoord - 0.5;
      float alpha;
      if (shape < 0.5) { alpha = starShape(uv); }
      else if (shape < 1.5) { alpha = glowShape(uv, time, vR); }
      else { alpha = flowerShape(uv); }
      if(alpha < 0.01) discard;
      vec3 color = hueShift(vCol, time * hueSpeed);
      float d = length(uv);
      float core = smoothstep(0.07, 0.0, d);
      vec3 finalColor = mix(color, vec3(1.0, 0.98, 0.95), core * 0.8);
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
    size[i] = 0.4 + Math.random() * 1.0;
    rnd[i * 3] = Math.random() * 10; rnd[i * 3 + 1] = Math.random() * Math.PI * 2; rnd[i * 3 + 2] = 0.5 + 0.5 * Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('random', new THREE.BufferAttribute(rnd, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `uniform float time; attribute float size; attribute vec3 random;
    void main(){ vec3 p=position; float t=time*.2*random.z; float ax=t+random.y;
    float amp=(.5+sin(random.x+t*.5)*.25)*random.z; p.x+=sin(ax+p.y*.05)*amp; p.y+=cos(ax*.7+p.z*.05)*amp;
    vec4 mv=modelViewMatrix*vec4(p,1.); gl_PointSize=size*(300./-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `void main(){ float d=length(gl_PointCoord-vec2(.5)); float a=1.-smoothstep(.35,.5,d); if(a<.01)discard; gl_FragColor=vec4(1.,1.,1.,a*.7); }`,
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
    hsl.h += (Math.random() - 0.5) * 0.02;
    hsl.s = Math.min(1, Math.max(0.7, hsl.s + (Math.random() - 0.5) * 0.15));
    hsl.l = Math.min(0.9, Math.max(0.5, hsl.l + (Math.random() - 0.5) * 0.2));
    const c = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
    const i3 = i * 3;
    colArr[i3] += (c.r - colArr[i3]) * progress * 0.04;
    colArr[i3 + 1] += (c.g - colArr[i3 + 1]) * progress * 0.04;
    colArr[i3 + 2] += (c.b - colArr[i3 + 2]) * progress * 0.04;
  }
  particles.geometry.attributes.color.needsUpdate = true;
}

// ── Init ────────────────────────────────────────────────
function init() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050203, 0.006);
  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2500);
  camera.position.set(0, 0, 60); // closer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  document.getElementById("container").appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 25;
  controls.maxDistance = 150;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.25;

  stars = createStars();
  scene.add(stars);

  particles = makeParticles(PARTICLE_COUNT, PALETTES.glory);
  sparkles = createSparkles(SPARK_COUNT);
  scene.add(particles);
  scene.add(sparkles);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.4, 0.8));
  const after = new AfterimagePass(); after.uniforms.damp.value = 0.88;
  composer.addPass(after);
  composer.addPass(new OutputPass());

  // Apply initial step (scattered stars)
  applyStep(0);
  // Start sequence after a moment
  holdTimer = setTimeout(() => beginMorph(), HOLD_TIME);

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  });
}

function applyStep(idx) {
  const step = SEQUENCE[idx];
  const pts = step.gen(PARTICLE_COUNT);
  const pArr = particles.geometry.attributes.position.array;
  const sArr = sparkles.geometry.attributes.position.array;
  for (let j = 0; j < PARTICLE_COUNT; j++) {
    const i3 = j * 3;
    const p = pts[j] || new THREE.Vector3();
    pArr[i3] = p.x; pArr[i3 + 1] = p.y; pArr[i3 + 2] = p.z;
    if (j < SPARK_COUNT) { sArr[i3] = p.x; sArr[i3 + 1] = p.y; sArr[i3 + 2] = p.z; }
  }
  particles.geometry.attributes.position.needsUpdate = true;
  sparkles.geometry.attributes.position.needsUpdate = true;
  particles.material.uniforms.shape.value = step.shape;
}

function beginMorph() {
  isTrans = true; prog = 0;
  const next = (currentStep + 1) % SEQUENCE.length;
  const fromPts = particles.geometry.attributes.position.array.slice();
  const toPts = SEQUENCE[next].gen(PARTICLE_COUNT);
  const to = new Float32Array(PARTICLE_COUNT * 3);
  for (let j = 0; j < PARTICLE_COUNT; j++) {
    const i3 = j * 3, p = toPts[j];
    to[i3] = p.x; to[i3 + 1] = p.y; to[i3 + 2] = p.z;
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
      // Color + shape transition
      const nextStep = SEQUENCE[next];
      transitionColors(PALETTES[nextStep.palette], eased);
      if (eased > 0.5) particles.material.uniforms.shape.value = nextStep.shape;
    }
    if (prog >= 1) {
      currentStep = particles.userData.next;
      isTrans = false;
      // Schedule next morph
      holdTimer = setTimeout(() => beginMorph(), HOLD_TIME);
    }
  }

  composer.render(dt);
}

document.fonts.ready.then(() => { init(); animate(); });
