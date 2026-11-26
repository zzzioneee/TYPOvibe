// Day 40 마감 직전 — 발등에 불 떨어졌다 = 발등튀김.
// 왼쪽에 업무 요청(주문)이 쌓이면, 가운데 부엌(탑뷰)에서 서랍 속 발등을 꺼내 밀가루 → 달걀물 → 빵가루를 문질러 입히고
// 기름에 튀겨 초록일 때 건져, 오른쪽 트레이(정면 뷰)에 올린다.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const THUMB = new URLSearchParams(location.search).has('thumb');
if (THUMB) document.documentElement.classList.add('thumb');
const $ = (s) => document.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- 렌더러 ----------
const canvas = $('#view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const pmrem = new THREE.PMREMGenerator(renderer), envTex = pmrem.fromScene(new RoomEnvironment(), .04).texture;

// 부엌(가운데, 탑뷰)
const kitchen = new THREE.Scene(); kitchen.environment = envTex; kitchen.environmentIntensity = .55;
const camK = new THREE.PerspectiveCamera(26, 1, .5, 80); camK.up.set(0, 0, -1);
kitchen.add(new THREE.HemisphereLight(0xfff1e0, 0x4a2a16, .45));
const sun = new THREE.DirectionalLight(0xfff1df, 3.4); sun.position.set(-6, 9, -5); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -7; sun.shadow.camera.right = 7; sun.shadow.camera.top = 7; sun.shadow.camera.bottom = -7; sun.shadow.radius = 9; sun.shadow.blurSamples = 20; sun.shadow.bias = -.0005;
kitchen.add(sun);
// 트레이(오른쪽, 정면 뷰)
const trayScene = new THREE.Scene(); trayScene.environment = envTex; trayScene.environmentIntensity = .9; trayScene.background = new THREE.Color(0x000000);
const camT = new THREE.PerspectiveCamera(30, 1, .1, 50); camT.position.set(0, 5.6, 11); camT.lookAt(0, 2.3, 0);
trayScene.add(new THREE.HemisphereLight(0xfff1e0, 0x222222, .5));
const sunT = new THREE.DirectionalLight(0xfff1df, 3.2); sunT.position.set(-3, 6, 3); sunT.castShadow = true; sunT.shadow.mapSize.set(1024, 1024); sunT.shadow.radius = 8; sunT.shadow.blurSamples = 16; Object.assign(sunT.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 }); sunT.shadow.bias = -.0005; trayScene.add(sunT);

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  { const a = (innerWidth * .6) / innerHeight, half = Math.max(4.4, 4.4 / a), dist = half / Math.tan(13 * Math.PI / 180) + .6; camK.aspect = a; camK.position.set(-.2, dist, 0); camK.lookAt(-.2, 0, 0); camK.updateProjectionMatrix(); if (window.__comp) window.__comp.setSize(innerWidth * .6, innerHeight); }
  camT.aspect = (innerWidth * .2) / innerHeight; camT.updateProjectionMatrix(); if (window.__compT) window.__compT.setSize(innerWidth * .2, innerHeight);
}
addEventListener('resize', resize); resize();

// ---------- 클레이 재질 ----------
function clayTex(base, spots) {   // 손으로 빚은 듯 미세하게 얼룩진 표면
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${rnd(.02, spots)})`; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, rnd(.5, 2.5), 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const bumpTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? 255 : 0},${Math.random() < .5 ? 255 : 0},${Math.random() < .5 ? 255 : 0},.08)`; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, rnd(1, 4), 0, 7); g.fill(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
const clay = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: .55, sheen: .4, sheenColor: new THREE.Color(0xffffff), sheenRoughness: .6, bumpMap: bumpTex, bumpScale: .6, ...o });

// ---------- 부엌 ----------
const TABLE_Y = 0;
{
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#4a2a16'; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) { g.fillStyle = `rgba(0,0,0,${rnd(.05, .18)})`; g.fillRect(0, y, 512, 64); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, y, 512, 2); }   // 널빤지
  for (let i = 0; i < 260; i++) { const y = Math.random() * 512, w = rnd(.5, 2); g.strokeStyle = `rgba(${Math.random() < .5 ? '20,8,2' : '120,70,35'},${rnd(.15, .4)})`; g.lineWidth = w; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * .02 + i) * rnd(1, 4)); g.stroke(); }   // 나뭇결
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); const table = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ map: t, roughness: .7, bumpMap: t, bumpScale: .8 }));
  table.rotation.x = -Math.PI / 2; table.receiveShadow = true; kitchen.add(table);
}
// 스테인리스: 살짝 솔질된 금속
const steelTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#b9bec5'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '60,65,70'},${rnd(.03, .1)})`; g.fillRect(0, Math.random() * 256, 256, rnd(.5, 1.5)); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
const steel = new THREE.MeshPhysicalMaterial({ color: 0xc9ced4, map: steelTex, metalness: 1, roughness: .32, clearcoat: .3, clearcoatRoughness: .3 });
// 사각 스테이션: 탑뷰에서 테트리스처럼 빈틈없이 맞물린다 (x0..x1, z0..z1)
const ST = {
  tray: { x0: -4.15, x1: -2.45, z0: -3.75, z1: 3.75, label: '발등' },
  flour: { x0: -2.3, x1: -.4, z0: -3.75, z1: .25, label: '밀가루' },
  egg: { x0: -.25, x1: 1.65, z0: -3.75, z1: .25, label: '달걀물' },
  crumb: { x0: 1.8, x1: 3.7, z0: -3.75, z1: .25, label: '빵가루' },
  pot: { x0: -2.3, x1: 3.7, z0: .45, z1: 3.75, label: '튀김기' },
};
for (const k in ST) { const o = ST[k]; o.x = (o.x0 + o.x1) / 2; o.z = (o.z0 + o.z1) / 2; o.w = o.x1 - o.x0; o.d = o.z1 - o.z0; }
// 호텔팬 모양 스텐 트레이 (깊이 h, 가장자리 턱)
function rrect(w, d, r) { const s = new THREE.Shape(), x = -w / 2, y = -d / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d); s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
function pan(o, h = .5, inset = .08) {
  const g = new THREE.Group(); g.position.set(o.x, 0, o.z);
  const w = o.w - inset * 2, d = o.d - inset * 2, t = .06, r = .22;
  const add = (geo, y, mat = steel) => { const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.y = y; m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  // 벽: 둥근 사각 고리를 높이만큼 밀어낸다 (안쪽으로 살짝 좁아지는 경사)
  const ring = rrect(w, d, r); ring.holes.push(rrect(w - t * 2, d - t * 2, r - t));
  add(new THREE.ExtrudeGeometry(ring, { depth: h, bevelEnabled: false, curveSegments: 10 }), 0);
  // 바닥: 조금 어두운 스텐
  add(new THREE.ShapeGeometry(rrect(w - t * 2, d - t * 2, r - t), 10), .03, new THREE.MeshPhysicalMaterial({ color: 0x9aa0a7, map: steelTex, metalness: 1, roughness: .38 }));
  // 말린 테두리: 둥근 사각 링을 둥글게 깎아서
  const lip = rrect(w + .14, d + .14, r + .07); lip.holes.push(rrect(w - t * 2 + .02, d - t * 2 + .02, r - t));
  add(new THREE.ExtrudeGeometry(lip, { depth: .02, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 4, curveSegments: 10 }), h - .02);
  kitchen.add(g); return { w: w - t * 2, d: d - t * 2 };
}
const fillY = .4;
// 밀가루: 고운 흰 가루가 수북한 직사각 팬
{
  const { w, d } = pan(ST.flour);
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#f7f4ee'; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 14000; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '200,190,175'},${rnd(.1, .5)})`; g.fillRect(Math.random() * 256, Math.random() * 512, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(w, d, 40, 80), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (w / 2), y = p.getY(i) / (d / 2); p.setZ(i, .08 * (1 - x * x) * (1 - y * y) + Math.sin(x * 9 + y * 4) * .01 + rnd(0, .006)); }
  geo.computeVertexNormals();
  const f = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: 1, bumpMap: t, bumpScale: 1.2 })); f.rotation.x = -Math.PI / 2; f.position.set(ST.flour.x, fillY - .05, ST.flour.z); f.receiveShadow = true; kitchen.add(f);
}
// 달걀물: 반투명하게 찰랑이는 노란 액체 + 노른자
let eggMesh;
{
  const { w, d } = pan(ST.egg);
  const geo = new THREE.PlaneGeometry(w, d, 40, 80);
  eggMesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0xf2a412, roughness: .2, clearcoat: .4, clearcoatRoughness: .25, transmission: .2, thickness: .4, ior: 1.36, transparent: true, opacity: .93, attenuationColor: new THREE.Color(0xe08a00), attenuationDistance: .6 }));
  eggMesh.rotation.x = -Math.PI / 2; eggMesh.position.set(ST.egg.x, fillY - .02, ST.egg.z); kitchen.add(eggMesh);
  eggMesh.userData.base = geo.attributes.position.array.slice(); eggMesh.userData.half = [w / 2, d / 2];
  for (const [ox, oz, r] of [[.35, -1.1, .17], [-.3, .6, .14]]) { const yolk = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), new THREE.MeshPhysicalMaterial({ color: 0xff9a00, roughness: .1, clearcoat: 1 })); yolk.scale.y = .35; yolk.position.set(ST.egg.x + ox, fillY + .01, ST.egg.z + oz); kitchen.add(yolk); }
}
// 빵가루: 굵고 거친 알갱이가 가득한 팬
{
  const { w, d } = pan(ST.crumb);
  const n = 3800, geo = new THREE.IcosahedronGeometry(.036, 0), mat = new THREE.MeshStandardMaterial({ color: 0xe9c88a, roughness: .95 });
  const im = new THREE.InstancedMesh(geo, mat, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = rnd(-w / 2 + .05, w / 2 - .05), z = rnd(-d / 2 + .05, d / 2 - .05), h = .07 * (1 - (2 * x / w) ** 2) * (1 - (2 * z / d) ** 2);
    q.setFromEuler(e.set(rnd(0, 6), rnd(0, 6), rnd(0, 6))); const s = rnd(.6, 1.6);
    m4.compose(new THREE.Vector3(ST.crumb.x + x, fillY - .07 + h + rnd(0, .04), ST.crumb.z + z), q, new THREE.Vector3(s, s * rnd(.5, 1), s * rnd(.6, 1.2)));
    im.setMatrixAt(i, m4); im.setColorAt(i, col.setHSL(.1, rnd(.45, .7), rnd(.58, .78)));
  }
  im.receiveShadow = true; kitchen.add(im);
}
// 튀김기: 둥근 모서리 스텐 몸통, 깊은 기름 칸, 촘촘한 철망 바구니, 조절판(다이얼·눈금·불빛), 통풍구
let oilMesh, bubbles;
{
  const o = ST.pot;
  const brushed = new THREE.MeshStandardMaterial({ color: 0xe6e9ed, map: steelTex, metalness: .95, roughness: .26 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c2f35, metalness: .5, roughness: .45 });
  const rbox = (w, h, d, r, mat) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat); m.castShadow = m.receiveShadow = true; return m; };
  // 몸통
  const bodyMesh = []; // 기름 칸 위치가 정해진 뒤 만든다
  // 조절판
  const panelW = 1.05, panel = rbox(panelW, .12, o.d - .3, .05, dark); panel.position.set(o.x1 - panelW / 2 - .15, .6, o.z); kitchen.add(panel);
  const px = o.x1 - panelW / 2 - .15;
  for (const dz of [-.75, .55]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.33, .035, 10, 48), new THREE.MeshStandardMaterial({ color: 0xd8261c, roughness: .35 })); ring.rotation.x = Math.PI / 2; ring.position.set(px, .67, o.z + dz); kitchen.add(ring);
    for (let i = 0; i < 9; i++) { const a = -2.3 + i * 4.6 / 8, tk = new THREE.Mesh(new THREE.BoxGeometry(.015, .01, .06), new THREE.MeshBasicMaterial({ color: 0xffffff })); tk.position.set(px + Math.sin(a) * .41, .67, o.z + dz - Math.cos(a) * .41); tk.rotation.y = -a; kitchen.add(tk); }   // 눈금
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(.26, .28, .16, 48), new THREE.MeshPhysicalMaterial({ color: 0xf5f5f5, roughness: .3, clearcoat: .6 })); knob.position.set(px, .74, o.z + dz); knob.castShadow = true; kitchen.add(knob);
    const grip = rbox(.07, .08, .4, .03, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .25, clearcoat: .8 })); grip.position.set(px, .84, o.z + dz); grip.rotation.y = .6; kitchen.add(grip);
    const mark = new THREE.Mesh(new THREE.BoxGeometry(.03, .01, .12), new THREE.MeshBasicMaterial({ color: 0xd8261c })); mark.position.set(px + Math.sin(.6) * -.14, .89, o.z + dz - Math.cos(.6) * .14); mark.rotation.y = .6; kitchen.add(mark);
  }
  for (const [dz, col] of [[1.35, 0x37d35a], [-1.45, 0xff4030]]) {
    const bez = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .04, 24), brushed); bez.position.set(px, .67, o.z + dz); kitchen.add(bez);
    const l = new THREE.Mesh(new THREE.SphereGeometry(.09, 20, 10), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.4 })); l.scale.y = .5; l.position.set(px, .7, o.z + dz); kitchen.add(l);
  }
  // 기름 칸: 안쪽 벽(어두운 스텐) + 테두리 턱
  const well = { x0: o.x0 + .25, x1: px - panelW / 2 - .15, z0: o.z0 + .25, z1: o.z1 - .25 };
  well.w = well.x1 - well.x0; well.d = well.z1 - well.z0; well.x = (well.x0 + well.x1) / 2; well.z = (well.z0 + well.z1) / 2; ST.pot.well = well;
  {
    const shell = rrect(o.w, o.d, .22), hole = rrect(well.w, well.d, .12); hole.curves.forEach((c) => { for (const k of ['v0', 'v1', 'v2']) if (c[k]) { c[k].x += well.x - o.x; c[k].y -= well.z - o.z; } }); shell.holes.push(hole);
    const top = new THREE.Mesh(new THREE.ExtrudeGeometry(shell, { depth: .5, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 5, curveSegments: 12 }), brushed);
    top.rotation.x = -Math.PI / 2; top.position.set(o.x, .02, o.z); top.castShadow = top.receiveShadow = true; kitchen.add(top);
    const floor = new THREE.Mesh(new THREE.ShapeGeometry(rrect(well.w, well.d, .12), 12), new THREE.MeshStandardMaterial({ color: 0x3a2610, roughness: .5 })); floor.rotation.x = -Math.PI / 2; floor.position.set(well.x, .06, well.z); kitchen.add(floor);
  }
  const lip = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, map: steelTex, metalness: 1, roughness: .18 });
  { const r = rrect(well.w + .2, well.d + .2, .18); r.holes.push(rrect(well.w, well.d, .12)); const m = new THREE.Mesh(new THREE.ExtrudeGeometry(r, { depth: .02, bevelEnabled: true, bevelThickness: .025, bevelSize: .025, bevelSegments: 4, curveSegments: 12 }), lip); m.rotation.x = -Math.PI / 2; m.position.set(well.x, .56, well.z); m.castShadow = m.receiveShadow = true; kitchen.add(m); }
  // 기름: 가운데는 밝고 가장자리로 갈수록 짙은 금빛, 잔잔한 광택
  const ot = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d'); const gr = g.createRadialGradient(256, 128, 10, 256, 128, 300); gr.addColorStop(0, '#e9a637'); gr.addColorStop(.55, '#c87a16'); gr.addColorStop(1, '#7a420a'); g.fillStyle = gr; g.fillRect(0, 0, 512, 256); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,220,150,${rnd(.02, .07)})`; g.beginPath(); g.ellipse(Math.random() * 512, Math.random() * 256, rnd(6, 30), rnd(2, 6), rnd(0, 3), 0, 7); g.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const geo = new THREE.PlaneGeometry(well.w, well.d, 60, 36);
  oilMesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: ot, roughness: .3, clearcoat: .5, clearcoatRoughness: .2 }));
  oilMesh.rotation.x = -Math.PI / 2; oilMesh.position.set(well.x, .38, well.z); kitchen.add(oilMesh);
  oilMesh.userData.base = geo.attributes.position.array.slice(); oilMesh.userData.half = [well.w / 2, well.d / 2];
  // 철망 바구니: 촘촘한 격자 + 굵은 테 + 손잡이 걸쇠
  const wire = new THREE.MeshStandardMaterial({ color: 0xd6dbe0, metalness: 1, roughness: .22 });
  const bx0 = well.x0 + .12, bx1 = well.x1 - .12, bz0 = well.z0 + .12, bz1 = well.z1 - .12, bw = bx1 - bx0, bd = bz1 - bz0, gap = .11;
  const nx = Math.round(bw / gap), nz = Math.round(bd / gap), bars = new THREE.InstancedMesh(new THREE.CylinderGeometry(.007, .007, 1, 5), wire, nx + nz + 2), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); let k = 0;
  for (let i = 0; i <= nx; i++) { m4.compose(new THREE.Vector3(bx0 + i * bw / nx, .44, (bz0 + bz1) / 2), q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), new THREE.Vector3(1, bd, 1)); bars.setMatrixAt(k++, m4); }
  for (let i = 0; i <= nz; i++) { m4.compose(new THREE.Vector3((bx0 + bx1) / 2, .441, bz0 + i * bd / nz), q.setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), new THREE.Vector3(1, bw, 1)); bars.setMatrixAt(k++, m4); }
  bars.count = k; kitchen.add(bars);
  for (const [sx, sz, x, z] of [[bw, .035, (bx0 + bx1) / 2, bz0], [bw, .035, (bx0 + bx1) / 2, bz1], [.035, bd, bx0, (bz0 + bz1) / 2], [.035, bd, bx1, (bz0 + bz1) / 2]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, .14, sz), wire); m.position.set(x, .48, z); m.castShadow = true; kitchen.add(m); }
  // 빨간 손잡이: 바구니 앞에서 튀김기 밖으로 뻗는다 (탑뷰에서 잘 보이게 위로 살짝)
  const hx = (bx0 + bx1) / 2 - bw * .25;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .7, 10), wire); rod.rotation.x = Math.PI / 2; rod.position.set(hx, .62, bz1 + .3); kitchen.add(rod);
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(.085, .85, 8, 20), new THREE.MeshPhysicalMaterial({ color: 0xd2261c, roughness: .3, clearcoat: .8 })); handle.rotation.x = Math.PI / 2; handle.position.set(hx, .7, o.z1 + .55); handle.castShadow = true; kitchen.add(handle);
  // 몸통 앞쪽 통풍구
  for (let i = 0; i < 8; i++) { const v = rbox(.32, .02, .05, .02, dark); v.position.set(o.x0 + .5 + i * .42, .57, o.z1 - .11); kitchen.add(v); }
  bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(.04, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0xfff3cf, roughness: .05, clearcoat: 1, transparent: true, opacity: .85 }), 260);
  bubbles.userData.p = Array.from({ length: 260 }, () => ({ x: rnd(-.5, .5), z: rnd(-.5, .5), t: rnd(0, 1), s: rnd(.5, 1.4) })); bubbles.count = 0; kitchen.add(bubbles);
}
ST.pot.y = .44;

// ---------- 발등 (말랑한 쿠션 발) ----------
// 메타볼로 다리·발바닥·뒤꿈치·발가락을 매끈하게 녹여 붙인 한 덩어리
const footGeo = (() => {
  const mc = new MarchingCubes(64, new THREE.MeshBasicMaterial(), false, false, 200000); mc.isolation = 80; mc.reset();
  const ball = (x, z, r, y = .5) => mc.addBall(x, y, z, r * r * 92, 12);
  for (let z = .14; z <= .5; z += .03) ball(.33, z, .085);           // 다리(발목 위)
  ball(.31, .58, .1); ball(.34, .62, .1);                              // 뒤꿈치
  for (let x = .36; x <= .66; x += .03) ball(x, .63, .088);          // 발등·발바닥
  ball(.62, .6, .095); ball(.63, .66, .09); ball(.7, .62, .08);                            // 앞발 볼
  // 통통하고 제각각인 발가락 네 개 (길이·굵기·기울기가 조금씩 다르게)
  // 통통하고 제각각인 발가락 네 개: 마디처럼 이어진 손가락 모양, 끝은 둥글게
  const toes = [[.86, .512, .046, -.05], [.91, .583, .052, -.01], [.9, .658, .049, .025], [.85, .728, .042, .06]];
  toes.forEach(([x, z, r, tilt]) => { for (let k = 0; k < 5; k++) { const t = k / 4; ball(x - .11 + t * .12, z + tilt * (t - .5), r * (1 - t * .12)); } });
  for (let i = 0; i < 3; i++) { const a = toes[i], b = toes[i + 1], z = (a[1] + b[1]) / 2, x = (a[0] + b[0]) / 2; for (const dx of [-.05, -.01, .03, .06]) mc.addBall(x + dx, .5, z, -.09, 0); }
  mc.update();
  const n = mc.count, g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(mc.positionArray.slice(0, n * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(mc.normalArray.slice(0, n * 3), 3));
  g.scale(1, .62, 1); g.computeBoundingBox(); const bb = g.boundingBox, c = bb.getCenter(new THREE.Vector3()), s = 1.55 / Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
  g.translate(-c.x, -c.y, -c.z); g.scale(-s, s, s);
  { const p = g.attributes.position.array; for (let i = 0; i < p.length; i += 9) for (let j = 0; j < 3; j++) { const t = p[i + 3 + j]; p[i + 3 + j] = p[i + 6 + j]; p[i + 6 + j] = t; } }   // 뒤집힌 면 방향 되돌리기
  g.computeVertexNormals(); g.computeBoundingBox();
  return g;
})();
// 표면 위 점 뽑기 (가루·빵가루 알갱이 자리)
function surfacePoints(geo, n) {
  const p = geo.attributes.position, tri = p.count / 3, areas = [], A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3();
  let tot = 0; for (let i = 0; i < tri; i++) { A.fromBufferAttribute(p, i * 3); B.fromBufferAttribute(p, i * 3 + 1); C.fromBufferAttribute(p, i * 3 + 2); tot += B.clone().sub(A).cross(C.clone().sub(A)).length() / 2; areas.push(tot); }
  const out = [];
  for (let k = 0; k < n; k++) {
    const r = Math.random() * tot; let lo = 0, hi = tri - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (areas[m] < r) lo = m + 1; else hi = m; }
    A.fromBufferAttribute(p, lo * 3); B.fromBufferAttribute(p, lo * 3 + 1); C.fromBufferAttribute(p, lo * 3 + 2);
    let u = Math.random(), v = Math.random(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const pt = A.clone().add(B.clone().sub(A).multiplyScalar(u)).add(C.clone().sub(A).multiplyScalar(v));
    N.copy(B).sub(A).cross(C.clone().sub(A)).normalize(); out.push({ p: pt, n: N.clone() });
  }
  return out;
}
const FOOT_PTS = surfacePoints(footGeo, 2600);

// 발 재질: 살색 → 밀가루(희끗) → 달걀물(노랗고 번들) → 빵가루(거친 황금빛) → 튀김(금빛·갈색·숯)
const NOISE = `
float h3(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }`;
function footMaterial() {
  const u = { uFlour: { value: 0 }, uEgg: { value: 0 }, uCrumb: { value: 0 }, uFry: { value: 0 }, uOil: { value: 0 } };
  const m = clay(0xe9b3a3, { roughness: .62, sheen: .6, sheenColor: new THREE.Color(0xffe0d6) });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vOP;\nuniform float uFlour, uEgg, uCrumb, uFry, uOil;\n${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float nf = n3(vOP * 30.) * .6 + n3(vOP * 80.) * .4;
        float flourM = smoothstep(1.02 - uFlour, 1.12 - uFlour, nf) * step(.001, uFlour);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.97, .96, .93), flourM * .92);
        float ne = n3(vOP * 5. + 3.);
        float eggM = uEgg * smoothstep(.05, .35, ne + uEgg * .6);
        float drip = smoothstep(.55, .75, n3(vOP * vec3(3., 14., 3.) + 7.));   // 흘러내린 자국
        vec3 eggCol = mix(vec3(.88, .42, .0), vec3(.98, .62, .05), n3(vOP * 18.));
        diffuseColor.rgb = mix(diffuseColor.rgb, eggCol * (.85 + .25 * nf), eggM * (.9 + .1 * drip));
        float nc = n3(vOP * 42.);
        float crM = uCrumb * smoothstep(.25, .45, nc + uCrumb * .35);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.93, .8, .55) * (.85 + .3 * nf), crM * .9);
        float f1 = clamp(uFry / .62, 0., 1.), f2 = clamp((uFry - .74) / .18, 0., 1.), f3 = clamp((uFry - .88) / .18, 0., 1.);
        float spot = n3(vOP * 7.);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.86, .52, .15) * (.8 + .35 * nf), f1 * .92);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.4, .19, .06), f2 * smoothstep(.15, .75, spot + f2 * .55));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.06, .035, .025), f3 * smoothstep(.25, .7, spot + f3 * .7));`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, .96, flourM);
        roughnessFactor = mix(roughnessFactor, .14, eggM * (1. - crM));
        roughnessFactor = mix(roughnessFactor, .75, crM);
        roughnessFactor = mix(roughnessFactor, .3, uOil * .7);`);
  };
  m.userData.u = u; return m;
}
const flourGeo = new THREE.SphereGeometry(.016, 6, 4), crumbGeo = new THREE.IcosahedronGeometry(.032, 0);
function makeFoot() {
  const g = new THREE.Group(), mat = footMaterial(), body = new THREE.Mesh(footGeo, mat); body.castShadow = body.receiveShadow = true; g.add(body);
  // 밀가루 가루 · 빵가루 알갱이 — 입힌 만큼만 보인다
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const flour = new THREE.InstancedMesh(flourGeo, new THREE.MeshStandardMaterial({ color: 0xfbfaf6, roughness: 1 }), 1400);
  const crumbs = new THREE.InstancedMesh(crumbGeo, new THREE.MeshStandardMaterial({ color: 0xe6c487, roughness: .9 }), 1800);
  const col = new THREE.Color();
  FOOT_PTS.slice(0, 1400).forEach(({ p, n }, i) => { const s = rnd(.5, 1.3); m4.compose(p.clone().addScaledVector(n, .004), q.setFromEuler(e.set(rnd(0, 6), rnd(0, 6), 0)), new THREE.Vector3(s, s * .35, s)); flour.setMatrixAt(i, m4); });
  FOOT_PTS.slice(800, 2600).forEach(({ p, n }, i) => { const s = rnd(.55, 1.5); m4.compose(p.clone().addScaledVector(n, .012), q.setFromEuler(e.set(rnd(0, 6), rnd(0, 6), rnd(0, 6))), new THREE.Vector3(s, s * rnd(.5, 1), s * rnd(.7, 1.3))); crumbs.setMatrixAt(i, m4); crumbs.setColorAt(i, col.setHSL(.1, rnd(.4, .65), rnd(.62, .82))); });
  flour.count = 0; crumbs.count = 0; crumbs.castShadow = true; g.add(flour, crumbs);
  const f = { g, body, mat, flour, crumbs, s: { flour: 0, egg: 0, crumb: 0, fry: 0 }, where: 'table', y: .25, ty: .25, rot: rnd(-.12, .12) };
  g.rotation.y = f.rot; return f;
}
function paint(f) {   // 상태를 재질·알갱이에 반영
  const u = f.mat.userData.u, s = f.s; f.mat.sheen = .6 * (1 - s.egg) * (1 - s.flour * .5);
  u.uFlour.value = s.flour; u.uEgg.value = s.egg; u.uCrumb.value = s.crumb; u.uFry.value = s.fry; u.uOil.value = f.where === 'pot' ? 1 : Math.max(0, u.uOil.value - .002);
  f.flour.count = Math.round(1400 * s.flour * (1 - s.egg * .8) * (1 - s.crumb * .85));
  f.crumbs.count = Math.round(1800 * s.crumb);
  // 튀길수록 알갱이도 금빛 → 갈색 → 숯
  const c = f.crumbs.material.color, fr = s.fry;
  if (fr < .62) c.setRGB(.9, .77, .53).lerp(new THREE.Color(.86, .53, .18), fr / .62);
  else if (fr < .88) c.setRGB(.86, .53, .18).lerp(new THREE.Color(.42, .2, .07), (fr - .62) / .26);
  else c.setRGB(.42, .2, .07).lerp(new THREE.Color(.07, .04, .03), clamp((fr - .88) / .15, 0, 1));
  f.flour.material.color.setRGB(.98, .97, .95).lerp(new THREE.Color(1, .78, .25), s.egg * .8).lerp(new THREE.Color(.86, .55, .2), clamp(fr / .6, 0, 1));
}

// 발등 보관 트레이: 꺼내 쓸 발등이 줄지어 누워 있다
{
  pan(ST.tray, .45);
  for (let i = 0; i < 4; i++) { const f = makeFoot(); f.g.scale.setScalar(.92); f.g.position.set(ST.tray.x + .05, .28, ST.tray.z0 + .95 + i * 1.75); f.g.rotation.y = rnd(-.08, .08); kitchen.add(f.g); }
}
// ---------- 트레이 (정면 뷰, 둥근 스텐 시트팬 + 식힘망) ----------
const stack = [];
{
  const tsteel = new THREE.MeshPhysicalMaterial({ color: 0xcfd4da, map: steelTex, metalness: 1, roughness: .28, clearcoat: .3 });
  const W = 2.7, D = 1.8, r = .16;
  const ring = rrect(W, D, r); ring.holes.push(rrect(W - .12, D - .12, r - .06));
  const wall = new THREE.Mesh(new THREE.ExtrudeGeometry(ring, { depth: .16, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 4, curveSegments: 10 }), tsteel); wall.rotation.x = -Math.PI / 2; wall.castShadow = wall.receiveShadow = true; trayScene.add(wall);
  const floor = new THREE.Mesh(new THREE.ShapeGeometry(rrect(W - .12, D - .12, r - .06), 10), new THREE.MeshPhysicalMaterial({ color: 0x9aa0a7, map: steelTex, metalness: 1, roughness: .35 })); floor.rotation.x = -Math.PI / 2; floor.position.y = .01; floor.receiveShadow = true; trayScene.add(floor);
  // 식힘망: 굵은 테 + 촘촘한 격자, 다리로 살짝 떠 있다
  const wire = new THREE.MeshStandardMaterial({ color: 0xe2e6ea, metalness: 1, roughness: .2 });
  const gw = W - .3, gd = D - .3, bars = new THREE.InstancedMesh(new THREE.CylinderGeometry(.01, .01, 1, 6), wire, 90), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); let k = 0;
  for (let i = 0; i <= 30; i++) { m4.compose(new THREE.Vector3(-gw / 2 + i * gw / 30, .15, 0), q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), new THREE.Vector3(1, gd, 1)); bars.setMatrixAt(k++, m4); }
  for (let i = 0; i <= 18; i++) { m4.compose(new THREE.Vector3(0, .16, -gd / 2 + i * gd / 18), q.setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), new THREE.Vector3(1, gw, 1)); bars.setMatrixAt(k++, m4); }
  bars.count = k; bars.castShadow = true; trayScene.add(bars);
  const fr = rrect(gw + .04, gd + .04, .05); fr.holes.push(rrect(gw - .04, gd - .04, .03));
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(fr, { depth: .03, bevelEnabled: false, curveSegments: 6 }), wire); frame.rotation.x = -Math.PI / 2; frame.position.y = .14; frame.castShadow = true; trayScene.add(frame);
  // 검은 바닥(그림자 받는 면)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: .6 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -.03; ground.receiveShadow = true; trayScene.add(ground);
}
function addToTray(f) {
  const c = makeFoot(); Object.assign(c.s, f.s); c.where = 'tray'; paint(c); c.mat.userData.u.uOil.value = .6;
  const n = stack.length, layer = Math.floor(n / 4), slot = n % 4;
  c.g.scale.setScalar(.62); c.g.position.set((slot % 2 ? .45 : -.45) + rnd(-.1, .1), .32 + layer * .26, (slot < 2 ? -.3 : .3) + rnd(-.08, .08));
  c.g.rotation.set(rnd(-.15, .15), rnd(0, 6.3), rnd(-.15, .15)); c.g.traverse((m) => { if (m.isMesh) m.castShadow = m.receiveShadow = true; }); trayScene.add(c.g); stack.push(c);
  c.g.position.y += 1.2; c.drop = c.g.position.y - 1.2;
  if (stack.length > 20) { const old = stack.shift(); trayScene.remove(old.g); }
}

// ---------- 업무 요청 ----------
// 대표님은 세부 지시 대신 격식 있는 큰 방향만
const CEO_TASKS = ['이번 분기 브랜드 방향성 공유 부탁드립니다.', '다음 주 이사회 보고 자료 검토 바랍니다.', '전사 리브랜딩 일정 점검 부탁드립니다.', '고객 경험 관점에서 한 번 더 고민해 주시기 바랍니다.', '진행 상황 금일 중 보고 부탁드립니다.', '파트너사 미팅 전 핵심 메시지 정리 바랍니다.', '전체적인 완성도를 조금 더 높여 주시기 바랍니다.', '투자사 공유용 자료 준비 부탁드립니다.'];
const SENDERS = [['팀장님', '#ff9500'], ['기획팀', '#34c759'], ['PM', '#af52de'], ['대표님', '#ff3b30'], ['개발팀', '#007aff'], ['인쇄소', '#5ac8fa'], ['클라이언트', '#ffcc00'], ['마케팅팀', '#ff2d55']];
const TASKS = ['기획안 한 장으로 줄여 주세요', '레퍼런스 몇 개만 더 찾아 주세요', '와이어프레임 오늘 공유 가능해요?', '컨셉 방향 A, B 둘 다 보여 주세요', '무드보드 다시 잡아 볼까요?', '시안 하나만 더요', '로고 조금만 더 크게요', '폰트만 바꿔 주세요', '1px만 내려 주세요', '색 조금만 더 밝게', '이거 좀 더 힙하게요', '여백 조금만 줄여 주세요', '아이콘 스타일 통일해 주세요', '배너 사이즈 세 개 더요', '썸네일 버전도 주세요', '다크모드 버전도 필요해요', '피그마 링크 다시 주세요', '컴포넌트 이름 정리해 주세요', '개발 전달용 스펙 주세요', '에셋 2x, 3x로 뽑아 주세요', '애니메이션 타이밍 조금만 빠르게', 'QA 이슈 하나 더 있어요', '반응형 깨졌어요', '인쇄소 발주 오늘 마감이에요', '종이 샘플 다시 받아 볼까요?', '견적 다시 받아 주세요', '별색 번호 확인 부탁요', '재단선 확인해 주세요', '인쇄 감리 내일 아침 7시예요', '색이 화면이랑 달라요', '현장 사진 보내 주세요', '최종_진짜최종_v3 보내 주세요', '방금 거 취소요', '다시 원래대로요', '아까 그거요', '간단한 거예요', '이건 내일이어도 돼요(오늘)', '혹시 지금 되세요?', '확인 부탁드려요 🙏'];
const reqs = []; let started = false, nextReq = 0, done = 0, late = 0, burnt = 0;
function addReq() {
  const [who, col] = SENDERS[(Math.random() * SENDERS.length) | 0], el = document.createElement('div');
  const dl = rnd(40, 70); el.className = 'card';
  el.innerHTML = `<div class="from"><b style="background:${col}"></b>${who} · 지금</div><div class="ttl">${(who === '대표님' ? CEO_TASKS : TASKS)[(Math.random() * (who === '대표님' ? CEO_TASKS : TASKS).length) | 0]}</div><div class="bar"><i></i></div>`;
  $('#cards').prepend(el); const r = { el, t0: performance.now() / 1000, dl, late: false }; reqs.push(r); ding();
  if (reqs.length > 8) { const v = reqs.find((q) => !q.el.classList.contains('hide')); }
}
function completeReq() {   // 가장 급한(남은 시간이 적은) 요청부터
  if (!reqs.length) return false;
  const now = performance.now() / 1000; reqs.sort((a, b) => (a.t0 + a.dl - now) - (b.t0 + b.dl - now));
  const r = reqs.shift(); r.el.classList.add('done'); setTimeout(() => r.el.remove(), 450); if (r.late) late--; done++; return true;
}
function updateReqs(t) {
  for (const r of reqs) {
    const left = 1 - (t - r.t0) / r.dl, bar = r.el.querySelector('.bar i');
    bar.style.transform = `scaleX(${clamp(left, 0, 1)})`; bar.style.background = left > .5 ? '#34c759' : left > .2 ? '#ffcc00' : '#ff3b30';
    if (left <= 0 && !r.late) { r.late = true; r.el.classList.add('late'); late++; buzz(); }
  }
  // 요청이 감당 못 하게 쌓이면 [회사 폭발시키기]
  const overload = reqs.length >= 9 || late >= 4;   // 밀리면 남은 폭탄이 깜빡인다
  $('#bombs').classList.toggle('alert', started && overload && !booming && bombsLeft > 0);
  $('#sDone').textContent = done; $('#sLate').textContent = late; $('#sBurn').textContent = burnt;
  if (started && t > nextReq) {   // 자잘한 요청이 수시로, 가끔은 우르르
    addReq(); if (Math.random() < .15) setTimeout(addReq, rnd(400, 900));
    nextReq = t + Math.max(3.5, 8 - done * .25) * rnd(.75, 1.25);
  }
}

// ---------- 게이지 ----------
const gauges = {};
for (const k of ['flour', 'egg', 'crumb']) {
  const el = document.createElement('div'); el.className = 'gauge idle'; el.innerHTML = `<div class="track"><div class="fill"></div></div>`; document.body.appendChild(el); gauges[k] = el;
}
const v3 = new THREE.Vector3();
function toScreen(x, y, z) { v3.set(x, y, z).project(camK); return { x: innerWidth * .2 + (v3.x + 1) / 2 * innerWidth * .6, y: (1 - v3.y) / 2 * innerHeight }; }
function placeGauges(feet) {
  for (const k of ['flour', 'egg', 'crumb']) {
    const p = toScreen(ST[k].x, .6, ST[k].z0 + .45), el = gauges[k]; el.style.left = p.x + 'px'; el.style.top = (p.y - 8) + 'px';
    const f = feet.find((q) => q.where === k) || (drag && overStation(drag.f) === k ? drag.f : null);
    el.classList.toggle('idle', !f); el.querySelector('.fill').style.width = (f ? f.s[k] * 100 : 0) + '%';
  }
  for (const f of feet) {   // 기름 속 발등마다 튀김 게이지
    if (f.where !== 'pot') { if (f.gauge) { f.gauge.remove(); f.gauge = null; } continue; }
    if (!f.gauge) { f.gauge = document.createElement('div'); f.gauge.className = 'gauge fry'; f.gauge.innerHTML = '<div class="track"><div class="needle"></div></div>'; document.body.appendChild(f.gauge); }
    const p = toScreen(f.g.position.x, 1, f.g.position.z - .75); f.gauge.style.left = p.x + 'px'; f.gauge.style.top = (p.y - 10) + 'px';
    f.gauge.querySelector('.needle').style.left = clamp(f.s.fry, 0, 1) * 100 + '%';
  }
}

// ---------- 끌기 ----------
const feet = [];
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.1), hit = new THREE.Vector3();
let drag = null;
function inKitchen(e) { return e.clientX > innerWidth * .2 && e.clientX < innerWidth * .8; }
function kRay(e) { ndc.set(((e.clientX - innerWidth * .2) / (innerWidth * .6)) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camK); }
function overStation(f) {
  const p = f.g.position;
  for (const k of ['flour', 'egg', 'crumb', 'pot']) { const o = k === 'pot' ? ST.pot.well : ST[k]; if (p.x > o.x0 && p.x < o.x1 && p.z > o.z0 && p.z < o.z1) return k; }
  return null;
}
canvas.addEventListener('pointerdown', (e) => {
  if (!started || !inKitchen(e)) return; hideCoach(); audio(); kRay(e);
  const hits = ray.intersectObjects(feet.map((f) => f.body)); let f = null;
  if (hits.length) f = feet.find((q) => q.body === hits[0].object);
  else if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -.4), hit) && hit.x > ST.tray.x0 && hit.x < ST.tray.x1 && hit.z > ST.tray.z0 && hit.z < ST.tray.z1) {
    f = makeFoot(); f.g.position.copy(hit); kitchen.add(f.g); feet.push(f); paint(f); pop(); toast('발등 하나 꺼냈다');
  }
  if (!f) return;
  if (f.where === 'pot') splash(.3);
  f.where = 'held'; drag = { f, last: null }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing';
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) { if (started && inKitchen(e)) { kRay(e); const over = ray.intersectObjects(feet.map((f) => f.body)).length; canvas.style.cursor = over ? 'grab' : 'default'; } return; }
  kRay(e); if (!ray.ray.intersectPlane(plane, hit)) return;
  const f = drag.f; f.g.position.x = hit.x; f.g.position.z = hit.z;
  const st = overStation(f);
  // 그릇 위에서 문지르면 옷이 입혀진다
  if (st && st !== 'pot') {
    f.ty = fillY + .12;
    if (drag.last) {
      const d = Math.hypot(hit.x - drag.last.x, hit.z - drag.last.z), need = { flour: null, egg: 'flour', crumb: 'egg' }[st];
      if (need && f.s[need] < 1) { if (!drag.warned) { toast(`${ST[need].label} 먼저!`); drag.warned = 1; } }
      else if (f.s[st] < 1) { f.s[st] = Math.min(1, f.s[st] + d * .28); rub(st, d); if (st === 'egg') jiggle(d); if (f.s[st] >= 1) toast(`${ST[st].label} 완료`); }
    }
  } else f.ty = 1.1;
  drag.last = { x: hit.x, z: hit.z };
  $('#serve .drop').classList.toggle('on', e.clientX > innerWidth * .8);
});
function release(e) {
  if (!drag) return; const f = drag.f; drag = null; canvas.style.cursor = 'default'; $('#serve .drop').classList.remove('on');
  if (e.clientX > innerWidth * .8) { serve(f); return; }
  const st = overStation(f);
  if (st === 'pot') { f.where = 'pot'; f.ty = ST.pot.y - .02; const wl = ST.pot.well; f.g.position.x = clamp(f.g.position.x, wl.x0 + .7, wl.x1 - .7); f.g.position.z = clamp(f.g.position.z, wl.z0 + .6, wl.z1 - .6); splash(1); }
  else if (st) { f.where = st; f.ty = fillY + .1; }
  else { f.where = 'table'; f.ty = .25; f.g.position.x = clamp(f.g.position.x, -2.1, 3.4); f.g.position.z = clamp(f.g.position.z, -3, 3); }
}
canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
function serve(f) {
  const fr = f.s.fry; let msg;
  if (fr < .55) { msg = fr < .05 ? '날 발등은 안 받아요' : '덜 익었어요'; toast(msg); f.where = 'table'; f.ty = .25; f.g.position.set(-1.3, 1, -1.8); return; }
  kitchen.remove(f.g); feet.splice(feet.indexOf(f), 1); if (f.gauge) f.gauge.remove(); addToTray(f);
  if (fr > .89) { burnt++; toast('숯이 된 발등… 요청 처리 실패'); thud(); return; }
  const full = f.s.flour >= 1 && f.s.egg >= 1 && f.s.crumb >= 1;
  if (completeReq()) { chime(); toast(fr < .76 ? (full ? '완벽한 발등튀김! 요청 하나 처리' : '튀김옷이 덜 입혀졌지만… 처리') : '조금 탔지만 처리'); }
  else { chime(); toast('요청이 없어도 튀김은 쌓인다'); }
}
let toastT;
function toast() {}   // 화면 안내 문구는 쓰지 않는다

// ---------- 액체 물결 ----------
let eggWave = 0, oilWave = 0;
function jiggle(d) { eggWave = Math.min(1.2, eggWave + d * .6); }
function splash(a) { oilWave = Math.min(1.5, oilWave + a); sizzleBurst(); }
function wave(mesh, amp, t, k) {
  const pos = mesh.geometry.attributes.position, base = mesh.userData.base;
  const [hx, hy] = mesh.userData.half;
  for (let i = 0; i < pos.count; i++) { const x = base[i * 3], y = base[i * 3 + 1], edge = Math.min(hx - Math.abs(x), hy - Math.abs(y)); pos.setZ(i, (Math.sin(Math.hypot(x, y * .6) * k - t * 6) * .5 + Math.sin(x * 7 + t * 3.1) * .3 + Math.sin(y * 6 - t * 2.4) * .2) * amp * Math.min(1, edge * 5)); }
  pos.needsUpdate = true; mesh.geometry.computeVertexNormals();
}

// ---------- 소리 ----------
let ac, master, sizzle;
function audio() {
  if (!ac) {
    ac = new AudioContext(); master = ac.createGain(); master.gain.value = .8; master.connect(ac.destination);
    const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < .04 ? 1 : .25);
    const s = ac.createBufferSource(); s.buffer = b; s.loop = true; const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500; sizzle = ac.createGain(); sizzle.gain.value = 0; s.connect(f).connect(sizzle).connect(master); s.start();
  }
  if (ac.state === 'suspended') ac.resume();
}
function tone(f0, f1, at, dur, vol, type = 'sine') { if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + at; o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(master); o.start(t); o.stop(t + dur + .05); }
function noiseHit(dur, freq, vol, type = 'bandpass') { if (!ac) return; const b = ac.createBuffer(1, ac.sampleRate * dur | 0, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2; const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = b; f.type = type; f.frequency.value = freq; g.gain.value = vol; s.connect(f).connect(g).connect(master); s.start(); }
const ding = () => { tone(1320, 1300, 0, .25, .12); tone(1760, 1740, .09, .35, .1); };
const chime = () => { tone(880, 870, 0, .3, .12); tone(1175, 1160, .08, .3, .1); tone(1568, 1550, .16, .5, .1); };
const buzz = () => { tone(180, 160, 0, .25, .15, 'square'); };
const thud = () => { tone(110, 50, 0, .35, .4); };
const pop = () => { tone(420, 900, 0, .08, .15); };
let lastRub = 0; function rub(st, d) { const t = performance.now(); if (t - lastRub < 45) return; lastRub = t; if (st === 'egg') { tone(300 + Math.random() * 120, 180, 0, .09, .06, 'triangle'); } else noiseHit(.06, st === 'flour' ? 5000 : 2200, st === 'flour' ? .12 : .25); }
function sizzleBurst() { noiseHit(.6, 4000, .5, 'highpass'); }

// ---------- 폭탄 3개: 누르면 [회사 폭발시키기] → 메시지가 펑 터지고 싹 리셋. 기회는 세 번 ----------
let booming = false, bombsLeft = 3;
const bombSVG = '<svg viewBox="0 0 48 48"><circle cx="21" cy="28" r="15" fill="#1b1b1b"/><circle cx="16" cy="23" r="4" fill="#fff" opacity=".35"/><rect x="25" y="9" width="9" height="8" rx="2" transform="rotate(40 29.5 13)" fill="#3a3a3a"/><path d="M33 9 q4-5 8-3" stroke="#c9a46a" stroke-width="2.4" fill="none" stroke-linecap="round"/><g class="fuse"><circle cx="42" cy="6" r="3.2" fill="#ffcc00"/><circle cx="42" cy="6" r="1.6" fill="#fff"/></g></svg>';
document.querySelectorAll('#bombs .bomb').forEach((b) => { b.innerHTML = bombSVG; b.onclick = () => detonate(b); });
function detonate(btn) {
  if (booming || !started || btn.classList.contains('used')) return;
  booming = true; bombsLeft--; btn.classList.add('used'); audio();
  nextReq = performance.now() / 1000 + 99;   // 터지는 동안 새 요청 멈춤
  // 1) 경고: 가운데에 [회사 폭발시키기], 메시지들이 빨갛게 달아오르며 떤다
  const sign = $('#boom'); sign.classList.add('on');
  fuseHiss();
  [...document.querySelectorAll('.card')].forEach((el) => { el.style.animation = 'none'; el.classList.add('heat'); });
  setTimeout(() => {
    sign.classList.remove('on'); kaboom();
    const inbox = $('#inbox').getBoundingClientRect(), cx = inbox.left + inbox.width / 2, cy = inbox.top + inbox.height / 2;
    // 2) 섬광 + 충격파 + 화면 크게 흔들기
    $('#flash').classList.add('on'); setTimeout(() => $('#flash').classList.remove('on'), 160);
    const wave = document.createElement('i'); wave.className = 'shock'; wave.style.left = cx + 'px'; wave.style.top = cy + 'px'; document.body.appendChild(wave);
    wave.animate([{ transform: 'translate(-50%,-50%) scale(0)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(9)', opacity: 0 }], { duration: 900, easing: 'cubic-bezier(.1,.8,.3,1)' }).onfinish = () => wave.remove();
    const shake = []; for (let i = 0; i < 14; i++) { const k = 1 - i / 14; shake.push({ transform: `translate(${rnd(-18, 18) * k}px, ${rnd(-14, 14) * k}px) rotate(${rnd(-.8, .8) * k}deg)` }); } shake.push({ transform: 'none' });
    document.body.animate(shake, { duration: 900 });
    // 3) 카드가 산산이 흩어진다 (천천히 날아가며 빙글빙글, 불에 그을림)
    [...document.querySelectorAll('.card')].forEach((el, i) => {
      const r = el.getBoundingClientRect(), a = Math.atan2(r.top + r.height / 2 - cy, r.left + r.width / 2 - cx) + rnd(-.7, .7), d = rnd(600, 1300);
      el.animate([{ transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1, filter: 'brightness(4) saturate(0)' },
        { offset: .25, transform: `translate(${Math.cos(a) * d * .35}px, ${Math.sin(a) * d * .35 - 120}px) rotate(${rnd(-120, 120)}deg) scale(1.05)`, filter: 'brightness(.5) sepia(1) saturate(3) hue-rotate(-20deg)' },
        { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d + 380}px) rotate(${rnd(-720, 720)}deg) scale(${rnd(.2, .6)})`, opacity: 0, filter: 'brightness(.15)' }], { duration: rnd(1600, 2400), easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' });
    });
    // 4) 불꽃·연기·남는 불씨
    for (let k = 0; k < 70; k++) {
      const p = document.createElement('i'); p.className = 'spark'; const sz = rnd(4, 14); p.style.width = p.style.height = sz + 'px';
      p.style.left = cx + 'px'; p.style.top = cy + 'px'; p.style.background = ['#ff3b30', '#ff9500', '#ffcc00', '#fff6d0'][k % 4]; document.body.appendChild(p);
      const a = Math.random() * Math.PI * 2, d = rnd(80, 520), dur = rnd(800, 2000);
      p.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { offset: .6, opacity: .9 }, { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d + d * .5}px) scale(0)`, opacity: 0 }], { duration: dur, easing: 'cubic-bezier(.1,.7,.3,1)' }).onfinish = () => p.remove();
    }
    for (let k = 0; k < 16; k++) {
      const sm = document.createElement('i'); sm.className = 'smoke'; const sz = rnd(90, 200); sm.style.width = sm.style.height = sz + 'px';
      sm.style.left = cx + rnd(-60, 60) + 'px'; sm.style.top = cy + rnd(-80, 80) + 'px'; document.body.appendChild(sm);
      sm.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 }, { offset: .15, opacity: .85 }, { transform: `translate(calc(-50% + ${rnd(-80, 80)}px), calc(-50% - ${rnd(120, 300)}px)) scale(${rnd(1.6, 2.6)})`, opacity: 0 }], { duration: rnd(2600, 3800), easing: 'ease-out' }).onfinish = () => sm.remove();
    }
    // 5) 창이 그을렸다가 천천히 돌아온다
    $('#inbox').animate([{ filter: 'brightness(2.5) saturate(0)' }, { offset: .15, filter: 'brightness(.25) sepia(.6)' }, { offset: .7, filter: 'brightness(.45) sepia(.4)' }, { filter: 'none' }], { duration: 3600, easing: 'ease-out' });
    setTimeout(() => { reqs.length = 0; $('#cards').innerHTML = ''; late = 0; }, 2400);
    setTimeout(() => { booming = false; nextReq = performance.now() / 1000 + 3; }, 3400);
  }, 1100);
}
function fuseHiss() { if (!ac) return; noiseHit(1.1, 6000, .25, 'highpass'); tone(880, 1760, .1, .9, .05, 'square'); }
function kaboom() {
  if (!ac) return;
  noiseHit(3.2, 140, 1.8, 'lowpass'); tone(80, 22, 0, 2.4, .9); noiseHit(.6, 2200, .6, 'bandpass');
  for (let i = 0; i < 14; i++) setTimeout(() => noiseHit(.12, 2500 + Math.random() * 4000, .18), 150 + i * rnd(80, 200));   // 파편 떨어지는 소리
  setTimeout(() => noiseHit(2.2, 500, .35, 'lowpass'), 600);   // 여운
}
// ---------- 시작 ----------
$('#go').onclick = () => { audio(); $('#start').classList.add('off'); started = true; const t = performance.now() / 1000; addReq(); setTimeout(addReq, 1400); nextReq = t + 6; };
if (THUMB) { $('#start').classList.add('off'); }

// 합성된 부엌 화면을 가운데 칸에 붙여 그리는 한 장짜리 판
const blitMat = new THREE.ShaderMaterial({ uniforms: { t: { value: null } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }', depthTest: false, depthWrite: false });
const blitScene = new THREE.Scene(), blitCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); blitScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blitMat));
// ---------- 그리기 ----------
let last = performance.now() / 1000;
(function frame() {
  const t = performance.now() / 1000, dt = Math.min(.05, t - last); last = t;
  let frying = 0;
  for (const f of feet) {
    if (f.where === 'pot') { f.s.fry += dt / 15; frying++; f.g.position.y += Math.sin(t * 9 + f.rot * 5) * .002; f.g.rotation.y += Math.sin(t * .7 + f.rot) * .002; }
    f.y += (f.ty - f.y) * Math.min(1, dt * 10); f.g.position.y = f.y + (f.where === 'held' ? Math.sin(t * 6) * .03 : 0);
    paint(f);
  }
  if (sizzle) sizzle.gain.setTargetAtTime(frying ? .12 + frying * .06 + feet.filter((f) => f.where === 'pot' && f.s.fry > .8).length * .08 : 0, ac.currentTime, .15);
  // 기름: 튀기는 동안 끓어오르는 거품
  eggWave *= .96; oilWave = oilWave * .97 + (frying ? .03 : 0);
  wave(eggMesh, .004 + eggWave * .02, t, 6); wave(oilMesh, .0025 + oilWave * .015, t * 1.3, 7);
  { const m4 = new THREE.Matrix4(); const n = frying ? Math.min(220, 60 + frying * 50) : 0; bubbles.count = n;
    for (let i = 0; i < n; i++) { const b = bubbles.userData.p[i], wl = ST.pot.well; b.t += dt * b.s * 1.6; if (b.t > 1) { b.t = 0; b.x = rnd(-.5, .5); b.z = rnd(-.5, .5); } const s = Math.sin(b.t * Math.PI) * b.s; m4.compose(new THREE.Vector3(wl.x + b.x * (wl.w - .2), ST.pot.y + .02, wl.z + b.z * (wl.d - .2)), new THREE.Quaternion(), new THREE.Vector3(s, s * .6, s)); bubbles.setMatrixAt(i, m4); }
    bubbles.instanceMatrix.needsUpdate = true; }
  for (const c of stack) if (c.drop != null) { c.g.position.y += (c.drop - c.g.position.y) * Math.min(1, dt * 9); if (Math.abs(c.g.position.y - c.drop) < .002) c.drop = null; }
  updateReqs(t); placeGauges(feet);
  // 가운데 부엌(탑뷰) + 오른쪽 트레이(정면 뷰)
  const W = innerWidth, H = innerHeight; renderer.setScissorTest(true);
  renderer.setScissorTest(false);
  if (!window.__comp) { const c = new EffectComposer(renderer); c.addPass(new RenderPass(kitchen, camK)); const ao = new GTAOPass(kitchen, camK, W * .6, H); ao.blendIntensity = .9; ao.updateGtaoMaterial({ radius: .6, distanceExponent: 1.4, thickness: 1.5, scale: 1.2 }); c.addPass(ao); c.addPass(new OutputPass()); c.renderToScreen = false; c.setSize(W * .6, H); window.__comp = c; }
  window.__comp.render();
  { const rt = window.__comp.readBuffer; renderer.setRenderTarget(null); renderer.setScissorTest(true); renderer.setViewport(W * .2, 0, W * .6, H); renderer.setScissor(W * .2, 0, W * .6, H); blitMat.uniforms.t.value = rt.texture; renderer.render(blitScene, blitCam); }
  renderer.setScissorTest(false);
  if (!window.__compT) { const c = new EffectComposer(renderer); c.addPass(new RenderPass(trayScene, camT)); const ao = new GTAOPass(trayScene, camT, W * .2, H); ao.blendIntensity = .9; ao.updateGtaoMaterial({ radius: .3, distanceExponent: 1.4, thickness: 1, scale: 1.2 }); c.addPass(ao); c.addPass(new OutputPass()); c.renderToScreen = false; c.setSize(W * .2, H); window.__compT = c; }
  window.__compT.render();
  renderer.setRenderTarget(null); renderer.setScissorTest(true); renderer.setViewport(W * .8, 0, W * .2, H); renderer.setScissor(W * .8, 0, W * .2, H); blitMat.uniforms.t.value = window.__compT.readBuffer.texture; renderer.render(blitScene, blitCam);
  requestAnimationFrame(frame);
})();
window.__dbg = { feet, ST, makeFoot, kitchen, paint, addToTray, camK };

// ---------- 처음 안내: 손 포인터가 발등을 집어 밀가루 트레이로 끌고 문지르는 시범 ----------
const coach = document.createElement('div'); coach.id = 'coach';
coach.innerHTML = '<svg viewBox="0 0 40 48" width="46"><path d="M14 4c2.2 0 4 1.8 4 4v13l2.1-.5c2-.4 4 .9 4.5 2.9l.2.9 1.6-.3c2-.4 4 .9 4.5 2.9l.3 1.3 1.1-.2c2.2-.4 4.3 1.1 4.7 3.3l1 6.4c.5 3.4-.6 6.9-3 9.3L32 49H15l-8.3-12.4c-1.2-1.8-.8-4.3 1-5.6 1.7-1.2 4-1 5.4.5L10 30V8c0-2.2 1.8-4 4-4z" fill="#fff" stroke="#1a1a1a" stroke-width="2.2" stroke-linejoin="round"/></svg><span class="ring"></span>';
document.body.appendChild(coach);
let coachOn = true;
function hideCoach() { if (!coachOn) return; coachOn = false; coach.style.opacity = 0; setTimeout(() => coach.remove(), 400); }
(function coachLoop() {
  if (!coachOn) return;
  const t = (performance.now() / 1000) % 3.6;
  const a = toScreen(ST.tray.x, .3, ST.tray.z0 + .95), b = toScreen(ST.flour.x, .4, ST.flour.z);
  let x = a.x, y = a.y, press = 0;
  if (t < .5) { press = 0; } else if (t < .8) { press = (t - .5) / .3; }
  else if (t < 2.1) { const k = (t - .8) / 1.3, e = k * k * (3 - 2 * k); x = a.x + (b.x - a.x) * e; y = a.y + (b.y - a.y) * e; press = 1; }
  else if (t < 3.1) { x = b.x + Math.sin((t - 2.1) * 14) * 26; y = b.y; press = 1; }
  else { x = b.x; y = b.y; press = 1 - (t - 3.1) / .5; }
  coach.style.left = x + 'px'; coach.style.top = y + 'px'; coach.style.opacity = started ? 1 : 0;
  coach.style.setProperty('--p', press.toFixed(2));
  requestAnimationFrame(coachLoop);
})();
