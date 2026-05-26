import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// ── Scene setup ─────────────────────────────────────────
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0008);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 0, 12);

// ── Fluid ribbon colors — Crimson, Magenta, Cyan, Deep Blue ──
const RIBBON_CONFIGS = [
  { color1: '#cc0033', color2: '#ff1466', opacity: 0.55, radius: 4.5, speed: 0.15, yOffset: 0, phase: 0 },
  { color1: '#8b0022', color2: '#ff0044', opacity: 0.5, radius: 3.8, speed: -0.12, yOffset: 0.5, phase: 1.2 },
  { color1: '#ff0066', color2: '#ff3399', opacity: 0.45, radius: 5.0, speed: 0.1, yOffset: -0.3, phase: 2.4 },
  { color1: '#0088aa', color2: '#00eeff', opacity: 0.4, radius: 3.2, speed: -0.18, yOffset: 0.8, phase: 3.6 },
  { color1: '#1a0044', color2: '#6600cc', opacity: 0.35, radius: 4.0, speed: 0.14, yOffset: -0.6, phase: 4.8 },
  { color1: '#cc0044', color2: '#ff6688', opacity: 0.5, radius: 5.5, speed: -0.08, yOffset: 0.2, phase: 0.8 },
  { color1: '#003366', color2: '#0099cc', opacity: 0.3, radius: 3.5, speed: 0.2, yOffset: -0.8, phase: 2.0 },
];

// ── Create fluid ribbon geometry ────────────────────────
function createRibbon(config) {
  const { color1, color2, opacity, radius, speed, yOffset, phase } = config;
  
  // Ribbon = TubeGeometry along a toroidal knot-like curve
  const segments = 200;
  const tubeRadius = 0.6 + Math.random() * 0.8;
  
  class RibbonCurve extends THREE.Curve {
    getPoint(t) {
      const angle = t * Math.PI * 2 * 2; // 2 loops
      const r = radius + Math.sin(angle * 3 + phase) * 1.2;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = Math.sin(angle * 2 + phase) * 2.5 + yOffset;
      return new THREE.Vector3(x, y, z);
    }
  }
  
  const curve = new RibbonCurve();
  const geometry = new THREE.TubeGeometry(curve, segments, tubeRadius, 8, true);
  
  // Gradient material — translucent, additive
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      u_color1: { value: c1 },
      u_color2: { value: c2 },
      u_opacity: { value: opacity },
      u_time: { value: 0 },
    },
    vertexShader: `
      varying vec3 vPos;
      varying vec2 vUv;
      void main() {
        vPos = position;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 u_color1;
      uniform vec3 u_color2;
      uniform float u_opacity;
      uniform float u_time;
      varying vec3 vPos;
      varying vec2 vUv;
      void main() {
        // Gradient along the ribbon + subtle animated shimmer
        float grad = vUv.x + sin(vUv.y * 6.0 + u_time) * 0.15;
        vec3 color = mix(u_color1, u_color2, grad);
        // Soft edge falloff on tube sides
        float edge = 1.0 - pow(abs(vUv.y - 0.5) * 2.0, 2.0);
        float alpha = u_opacity * edge * (0.8 + 0.2 * sin(vUv.x * 12.0 + u_time * 0.5));
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData = { speed, phase };
  return mesh;
}

// ── Create all ribbons ──────────────────────────────────
const ribbons = [];
for (const cfg of RIBBON_CONFIGS) {
  const ribbon = createRibbon(cfg);
  scene.add(ribbon);
  ribbons.push(ribbon);
}

// ── Text (HTML overlay approach — simpler, always readable) ──
// We'll add 3D text planes
function createTextPlane(text, size, x, y, z, rotZ) {
  const canvas2d = document.createElement('canvas');
  canvas2d.width = 1024; canvas2d.height = 256;
  const ctx = canvas2d.getContext('2d');
  ctx.font = '900 180px "Inter", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 512, 128);
  
  const texture = new THREE.CanvasTexture(canvas2d);
  texture.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.9,
  });
  const geometry = new THREE.PlaneGeometry(size * 4, size);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.z = rotZ || 0;
  return mesh;
}

// Add text planes slightly tilted
const textGlory = createTextPlane('Glory', 2.2, -2, 2.5, 2, -0.1);
const textAnd = createTextPlane('and', 1.8, 1.5, 0, 1, 0.05);
const textJoy = createTextPlane('Joy', 2.2, 2, -2.5, 3, 0.08);
scene.add(textGlory, textAnd, textJoy);

// ── Post-processing ─────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.8, 0.6, 0.6));
composer.addPass(new OutputPass());

// ── Animation ───────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  
  // Rotate ribbons (vortex spinning)
  for (const ribbon of ribbons) {
    ribbon.rotation.y = t * ribbon.userData.speed;
    ribbon.rotation.x = Math.sin(t * 0.3 + ribbon.userData.phase) * 0.15;
    ribbon.material.uniforms.u_time.value = t;
  }
  
  // Subtle camera drift
  camera.position.x = Math.sin(t * 0.1) * 0.5;
  camera.position.y = Math.cos(t * 0.08) * 0.3;
  camera.lookAt(0, 0, 0);
  
  composer.render();
}

// ── Resize ──────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// ── Start ───────────────────────────────────────────────
animate();
