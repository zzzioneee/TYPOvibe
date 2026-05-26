import * as THREE from "three";

// ── Scene ───────────────────────────────────────────────
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.sortObjects = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a0011);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 0, 18);

// ── Color palette: deep crimson ↔ cyan/blue ─────────────
const COLORS = [
  new THREE.Color('#8b0022'), // deep crimson
  new THREE.Color('#cc0033'), // crimson
  new THREE.Color('#ff0044'), // bright red
  new THREE.Color('#ff1466'), // hot pink-red
  new THREE.Color('#cc0066'), // magenta-red
  new THREE.Color('#660033'), // dark wine
  new THREE.Color('#0066aa'), // deep blue
  new THREE.Color('#0099cc'), // teal
  new THREE.Color('#00ccee'), // cyan
  new THREE.Color('#003355'), // dark navy
];

// ── Create translucent panels in vortex structure ───────
const PANEL_COUNT = 350;
const panels = [];

for (let i = 0; i < PANEL_COUNT; i++) {
  const t = i / PANEL_COUNT;
  
  // Spiral placement — multiple arms
  const arm = i % 5;
  const armOffset = (arm / 5) * Math.PI * 2;
  const spiralAngle = t * Math.PI * 8 + armOffset; // 4 full turns per arm
  const radius = 1.5 + t * 12; // expanding outward
  const y = (Math.random() - 0.5) * 8 + Math.sin(spiralAngle * 0.5) * 2;
  
  const x = Math.cos(spiralAngle) * radius;
  const z = Math.sin(spiralAngle) * radius;
  
  // Panel size varies — larger toward outside
  const w = 1.2 + Math.random() * 3.0 + t * 1.5;
  const h = 0.8 + Math.random() * 2.0 + t * 1.0;
  
  const geometry = new THREE.PlaneGeometry(w, h);
  
  // Color: mostly crimson/red, with 20% chance of cyan/blue accent
  const isCyan = Math.random() < 0.2;
  const colorIdx = isCyan 
    ? 6 + Math.floor(Math.random() * 4) 
    : Math.floor(Math.random() * 6);
  const color = COLORS[colorIdx];
  
  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.15 + Math.random() * 0.35,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  
  // Orient panels tangent to the spiral (facing roughly toward center)
  mesh.lookAt(0, y * 0.3, 0);
  // Add some random tilt
  mesh.rotation.x += (Math.random() - 0.5) * 0.6;
  mesh.rotation.z += (Math.random() - 0.5) * 0.4;
  
  mesh.userData = { 
    baseY: y,
    speed: 0.05 + Math.random() * 0.1,
    arm,
    t,
    spiralAngle,
    radius,
  };
  
  scene.add(mesh);
  panels.push(mesh);
}

// ── Text planes ─────────────────────────────────────────
function createText(text, size, x, y, z) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.font = '900 200px "Inter", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 512, 140);
  
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const geo = new THREE.PlaneGeometry(size * 3.5, size);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  return mesh;
}

const textGlory = createText('Glory', 3, -3, 3, 5);
const textAnd = createText('and', 2.2, 2, 0, 7);
const textJoy = createText('Joy', 3, 3, -3.5, 4);
scene.add(textGlory, textAnd, textJoy);

// ── Animation ───────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  
  // Slowly rotate entire vortex structure
  scene.rotation.y = t * 0.04;
  scene.rotation.x = Math.sin(t * 0.05) * 0.05;
  
  // Subtle panel breathing
  for (const panel of panels) {
    const pd = panel.userData;
    panel.position.y = pd.baseY + Math.sin(t * pd.speed * 2 + pd.spiralAngle) * 0.3;
  }
  
  // Camera subtle drift
  camera.position.x = Math.sin(t * 0.08) * 1.0;
  camera.position.y = Math.cos(t * 0.06) * 0.5;
  camera.lookAt(0, 0, 0);
  
  renderer.render(scene, camera);
}

// ── Resize ──────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── Start ───────────────────────────────────────────────
document.fonts.ready.then(() => animate());
