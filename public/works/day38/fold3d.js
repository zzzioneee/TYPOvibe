// Day 38 접기 — 세 칸(풀·비둘기 광장·나무; 산새·비둘기·참새) 위에서 새 무늬 색종이가 3D로 접혀 종이새가 되고, 제 칸 안을 날거나 걷는다.
// 종이 무늬·완성 새 생김새는 참고 이미지(ref) 그대로. 접기는 실제 접선을 축으로 면이 돈다.
import * as THREE from 'three';
const D = Math.PI / 180;

// 칸 번호, 움직임, 크기(칸 너비 대비)
const BIRDS = {
  sparrow: { panel: 2, mode: 'fly', size: .34, song: 'chirp',
    flap: ['art3/sparrow-f5.webp', 'art3/sparrow-f7.webp'] },             // 처음 버전처럼 날갯짓 두 장을 번갈아
  pigeon: { panel: 1, mode: 'walk', size: .36, song: 'coo', img: [1024, 991] },
  robin: { panel: 0, mode: 'perch', size: .4, song: 'robin', face: -1, rest: 1,
    flap: ['art3/robin-up.webp', 'art3/robin-down.webp'] },                  // 날개 올림·내림 두 장을 번갈아
};
// 풀 칸: 산새가 내려앉을 풀밭 자리(칸 안 비율). 아래일수록 가까운 풀
const PERCH = [[.3, .78], [.55, .72], [.7, .84], [.42, .88], [.62, .66], [.35, .7]];

// ---------- 장면 ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, .1, 200); camera.position.set(0, 0, 14);
const hemi = new THREE.HemisphereLight(0xffffff, 0xb8b0a6, 2.1); hemi.layers.enableAll(); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4e6, 1.5); sun.position.set(3, 5, 8); sun.layers.enableAll(); scene.add(sun);
const VH = () => 2 * camera.position.z * Math.tan(15 * D), VW = () => VH() * camera.aspect;
const PW = () => VW() / 3;                                  // 칸 하나의 너비(세계 단위)
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
// 칸(i) 안 비율 좌표 → 세계 좌표. z가 깊을수록 같은 화면 위치를 유지하도록 넓힌다
function at(i, px, py, z = 0) { const k = (camera.position.z - z) / camera.position.z, fx = (i + px) / 3; return new THREE.Vector3((fx - .5) * VW() * k, (.5 - py) * VH() * k, z); }
function screenToWorld(x, y) { return new THREE.Vector3((x / innerWidth - .5) * VW(), (.5 - y / innerHeight) * VH(), 0); }

const loader = new THREE.TextureLoader();
const cache = {};
const tex = (u) => cache[u] || (cache[u] = (() => { const t = loader.load(u); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })());
const paperMat = (map, alpha) => new THREE.MeshStandardMaterial({ map, roughness: .95, metalness: 0, side: THREE.DoubleSide, alphaTest: alpha ? .5 : 0 });

function hinge(parent, p, d, c, sign = 1) {
  const g = new THREE.Group(); g.position.set(p[0], p[1], 0); parent.add(g);
  const inner = new THREE.Group(); inner.position.set(-p[0], -p[1], 0); g.add(inner);
  const ax = new THREE.Vector3(d[0], d[1], 0).normalize(), vx = c[0] - p[0], vy = c[1] - p[1];
  if ((ax.x * vy - ax.y * vx) * sign < 0) ax.negate();
  g.userData.set = (a) => g.quaternion.setFromAxisAngle(ax, a);
  return { g, inner };
}
function poly(pts, uvOf, z = 0, holes = []) {
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  holes.forEach((h) => sh.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y)))));
  const geo = new THREE.ShapeGeometry(sh), pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) { const [u, v] = uvOf(pos.getX(i), pos.getY(i)); uv.setXY(i, u, v); pos.setZ(i, z); }
  geo.computeVertexNormals(); return geo;
}
const cen = (pts) => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];

// ---------- 접는 종이 ----------
function makeSheet(k) {
  const map = tex(`art3/${k}-sheet.jpg`), mat = paperMat(map), root = new THREE.Group(), parts = [];
  const uvOf = (x, y) => [(x + 1) / 2, (y + 1) / 2];
  for (const s of [1, -1]) {
    const sw = (p) => (s > 0 ? p : [p[1], p[0]]), P = (arr) => arr.map(sw), z = s > 0 ? 0 : -.006;
    let base = root, diag = null;
    if (s < 0) { diag = hinge(root, [0, 0], [1, 1], sw([.5, -.5]), 1); base = diag.inner; }
    base.add(new THREE.Mesh(poly(P([[-.3, -1], [.35, -1], [1, -.35], [1, .3], [.65, .65], [-.65, -.65]]), uvOf, z), mat));
    const fl = [
      { pts: [[-1, -1], [-.3, -1], [-.65, -.65]], h: [[-.3, -1], [-.65, -.65]] },
      { pts: [[1, 1], [.65, .65], [1, .3]], h: [[.65, .65], [1, .3]] },
      { pts: [[1, -1], [1, -.35], [.35, -1]], h: [[.35, -1], [1, -.35]] },
    ].map((f) => {
      const pts = P(f.pts), h = P(f.h), hg = hinge(base, h[0], [h[1][0] - h[0][0], h[1][1] - h[0][1]], cen(pts), s);
      hg.inner.add(new THREE.Mesh(poly(pts, uvOf, z), mat)); return hg.g;
    });
    parts.push({ diag: diag && diag.g, fl });
  }
  root.userData.set = (S) => {
    for (const p of parts) {
      if (p.diag) p.diag.userData.set(S.fold * 180 * D);
      p.fl[0].userData.set(S.c1 * 175 * D); p.fl[1].userData.set(S.c1 * 175 * D); p.fl[2].userData.set(S.c2 * 175 * D);
    }
  };
  return root;
}

// ---------- 완성 새 ----------
function plane(map, aw, ah, holes = []) {
  const M = ([x, y]) => [x - aw / 2, ah / 2 - y], uvOf = (x, y) => [(x + aw / 2) / aw, (y + ah / 2) / ah];
  return { M, uvOf, mesh: new THREE.Mesh(poly([[0, 0], [aw, 0], [aw, ah], [0, ah]].map(M), uvOf, 0, holes.map((h) => h.map(M))), paperMat(map, true)) };
}
function makeBird(k) {
  const b = BIRDS[k], g = new THREE.Group();
  if (b.flap) {   // 날갯짓 두 장을 같은 종이 면에 번갈아 입힌다
    const maps = b.flap.map(tex), p = plane(maps[0], 1, 1); g.add(p.mesh);
    g.userData.flap = (i) => { if (p.mesh.material.map !== maps[i]) { p.mesh.material.map = maps[i]; p.mesh.material.needsUpdate = true; } };
    return g;
  }
  const map = tex(`art3/${k}-bird.webp`), aw = b.img[0] / Math.max(...b.img), ah = b.img[1] / Math.max(...b.img);
  const p = plane(map, aw, ah, b.wing ? [b.wing.poly] : []); g.add(p.mesh);
  if (b.wing) {
    const h = b.wing.hinge.map(p.M), pts = b.wing.poly.map(p.M);
    const hg = hinge(g, h[0], [h[1][0] - h[0][0], h[1][1] - h[0][1]], cen(pts), 1);
    hg.inner.add(new THREE.Mesh(poly(pts, p.uvOf, .002), paperMat(map, true))); g.userData.wing = hg.g;
  }
  return g;
}

// ---------- 접기 흐름 (여러 장을 동시에 접어도 된다) ----------
const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const inQ = (t) => t * t * t, outQ = (t) => 1 - (1 - t) ** 3;
const jobs = [], flock = [];
const layer = (obj, l) => obj.traverse((o) => o.layers.set(l));
// 한 칸에 여러 장을 접을 때 겹치지 않게 놓을 자리(칸 안 x, y, 깊이)
const SLOTS = [[.5, .58, 0], [.3, .42, -1.5], [.7, .46, -1.5], [.32, .72, 0], [.68, .74, 0], [.5, .3, -3]];
const PLAN = [['fly', .7], ['fold', 1], ['c1', .75], ['c2', .65], ['turn', .3], ['born', .45]];
function pick(k, el) {
  audio(); document.getElementById('hint').style.opacity = 0;
  const r = el.getBoundingClientRect(), from = screenToWorld(r.left + r.width / 2, r.top + r.height / 2);
  const b = BIRDS[k], busy = jobs.filter((j) => j.k === k).map((j) => j.slot);
  const free = SLOTS.map((_, i) => i).filter((i) => !busy.includes(i)), slot = free.length ? free[(Math.random() * free.length) | 0] : (Math.random() * SLOTS.length) | 0;
  const to = at(b.panel, SLOTS[slot][0], SLOTS[slot][1], SLOTS[slot][2]);
  const sheet = makeSheet(k); sheet.position.copy(from); scene.add(sheet); layer(sheet, 0);
  const S = { fold: 0, c1: 0, c2: 0 }; sheet.userData.set(S);
  const big = PW() * .15, small = (r.width / innerWidth) * VW() / 2;   // 종이 반지름(세계 단위)
  jobs.push({ k, sheet, S, t: 0, from, to, big, small, step: -1, slot });
  rustle(.35, .18);
}
function runJob(j, dt) {
  j.t += dt; let acc = 0, i = 0;
  for (; i < PLAN.length; i++) { if (j.t < acc + PLAN[i][1]) break; acc += PLAN[i][1]; }
  if (i !== j.step) { if (i >= 1 && i <= 3) rustle(); j.step = i; }
  if (i >= PLAN.length) { j.bird.rotation.y = 0; j.o.live = true; j.o.t0 = performance.now() / 1000; return true; }
  const [name, dur] = PLAN[i], p = Math.min(1, (j.t - acc) / dur);
  for (let q = 1; q < i && q <= 3; q++) j.S[PLAN[q][0]] = 1;
  if (name === 'fly') {   // 서랍에서 꺼내 칸 위로: 앞으로 들리며 날아오른다
    const e = ease(p); j.sheet.position.lerpVectors(j.from, j.to, e); j.sheet.position.z += Math.sin(e * Math.PI) * .8;
    j.sheet.scale.setScalar(j.small + (j.big - j.small) * e); j.sheet.rotation.set(-14 * D * e, (1 - e) * -40 * D + 10 * D * e, 0);
  } else if (i <= 3) { if (!j.inPanel) { layer(j.sheet, BIRDS[j.k].panel + 1); j.inPanel = 1; } j.S[name] = ease(p); j.sheet.userData.set(j.S); }
  if (name === 'turn') { j.sheet.rotation.y = 10 * D + inQ(p) * 80 * D; j.sheet.scale.setScalar(j.big * (1 - .2 * p)); }
  if (name === 'born') {
    if (!j.bird) {   // 종이가 모로 선 순간 새로 바뀐다
      scene.remove(j.sheet); crease();
      j.bird = makeBird(j.k); j.bird.position.copy(j.to); scene.add(j.bird); layer(j.bird, BIRDS[j.k].panel + 1); j.o = spawn(j.k, j.bird);
    }
    j.bird.rotation.y = (-90 + outQ(p) * 90) * D + (BIRDS[j.k].face < 0 ? Math.PI : 0); j.bird.scale.setScalar(j.o.size);
  }
  return false;
}
function spawn(k, g) {
  const b = BIRDS[k], R = (a, c) => a + Math.random() * (c - a);
  const o = { k, g, b, dir: 1, turn: 0, size: PW() * b.size * 1.15, seed: Math.random() * 100, live: false, perch: 0,
    v: { sx: R(.6, 1.5), sy: R(.6, 1.5), sz: R(.5, 1.4), ax: R(.18, .38), ay: R(.1, .24), cx: R(.4, .6), cy: R(.3, .48), dz: R(-5, -1), cyc: R(6.5, 11) } };
  flock.push(o); setTimeout(() => sing(k), 600);
  const mine = flock.filter((f) => f.k === k); if (mine.length > 6) { const old = mine[0]; old.leave = performance.now() / 1000; }
  return o;
}

// ---------- 움직임 ----------
// 새 몸이 칸 테두리에 걸리지 않게: 중심을 몸 반 너비만큼 안쪽으로
const inside = (b, px) => { const m = b.size * .6; return Math.max(m, Math.min(1 - m, px)); };
function target(o, t) { const g = target0(o, t); if (!o.leave) g.p.x = at(o.b.panel, inside(o.b, g.px), .5, g.p.z).x; return g; }
function target0(o, t) {
  const b = o.b, s = o.seed, a = t - o.t0, P = b.panel;
  if (o.leave) return { p: at(P, 1.4, -.3, -6), fly: true };
  if (b.mode === 'fly') {   // 풀 위를 크게 오가며 난다
    const v = o.v, px = v.cx + v.ax * Math.sin(a * .27 * v.sx + s), py = v.cy + v.ay * Math.sin(a * .41 * v.sy + s * 2), z = v.dz + 3 * Math.sin(a * .17 * v.sz + s);
    return { p: at(P, px, py, z), fly: true, px };
  }
  if (b.mode === 'walk') {   // 광장 바닥: 영상의 높은 눈높이에 맞춰 멀수록 위로
    const v = o.v, px = v.cx + v.ax * Math.sin(a * .07 * v.sx + s), z = -4 + 3.5 * Math.sin(a * .05 * v.sz + s * 3), py = .64 + .3 * (z + 8) / 8;
    return { p: at(P, px, py, z), fly: false, ground: true, px };
  }
  // 산새: 풀밭 위를 크게 돌며 날다가 풀에 잠깐 내려앉고 다시 난다
  const cyc = o.v.cyc, n = Math.floor((a + s) / cyc), f = ((a + s) % cyc) / cyc;
  const A = PERCH[(n + (s | 0)) % PERCH.length];
  if (f < .3) return { p: at(P, A[0], A[1] - .03, -1), fly: false, perch: true, hop: f, px: A[0] };
  const q = (f - .3) / .7, B = PERCH[(n + 1 + (s | 0)) % PERCH.length];
  // 한 바퀴 크게 돌아 다음 가지로: 위로 솟았다가 내려앉는 고리
  const ang = q * Math.PI * 2, rx = .3, ry = .22;
  const cx = A[0] + (B[0] - A[0]) * q, cy = A[1] + (B[1] - A[1]) * q - .03;
  const px = cx + Math.sin(ang) * rx * Math.sin(q * Math.PI), py = cy - (1 - Math.cos(ang)) * ry * .5 * Math.sin(q * Math.PI) - Math.sin(q * Math.PI) * .12;
  return { p: at(P, px, Math.max(.08, py), -1 - Math.sin(q * Math.PI) * 3), fly: true, px };
}
function tick(o, t, dt) {
  if (!o.live) return;
  const g = target(o, t), b = o.b, a = t - o.t0, k = Math.min(1, dt * (a < 2.5 ? 1 : (b.mode === 'perch' ? 3 : 1.5)));
  const prev = o.g.position.x; o.g.position.lerp(g.p, k);
  const vx = o.g.position.x - prev; if (Math.abs(vx) > .003) o.dir = vx > 0 ? 1 : -1;
  const face = b.face || 1, want = (o.dir * face > 0 ? 0 : 180);
  o.turn += (want - o.turn) * Math.min(1, dt * 3.5);   // 방향 바꿀 땐 종이 한 장이 뒤집히듯
  const peck = g.ground ? (Math.sin(a * 1.9 + o.seed) > .9 ? -10 : Math.sin(a * 6) * 1.5) : 0;
  o.g.rotation.order = 'YXZ';
  o.g.rotation.set(g.ground ? -22 * D : 0, o.turn * D - 6 * D, g.fly ? Math.max(-.2, Math.min(.2, (g.p.y - o.g.position.y) * .2)) * o.dir : peck * D * o.dir * face);
  const sz = PW() * b.size * (g.ground ? 1 : .9); o.size += (sz - o.size) * Math.min(1, dt * 1.5); o.g.scale.setScalar(o.size);
  if (o.g.userData.flap) o.g.userData.flap(g.perch ? (Math.sin(a * 3.1 + o.seed) > .85 ? ((a * 9) | 0) % 2 : b.rest) : ((a * (b.mode === 'perch' ? 8 : 7)) | 0) % 2);
  if (o.g.userData.wing) {   // 날 때는 크게 퍼덕이고, 앉아서도 가끔 날개를 털고 고개를 돌린다
    const flick = g.perch && Math.sin(a * 3.1 + o.seed) > .8 ? Math.sin(a * 30) * 25 : 0;
    o.g.userData.wing.userData.set(g.fly ? (Math.sin(a * 16) * 48 + 6) * D : (62 + flick) * D);
    if (g.perch) { o.g.position.y += Math.max(0, Math.sin(a * 5 + o.seed)) * .025; if (Math.sin(a * .9 + o.seed) > .7) o.dir = Math.sin(a * .45 + o.seed) > 0 ? 1 : -1; }
  }
  if (o.leave && t - o.leave > 4) { scene.remove(o.g); o.dead = true; }
  if (!o.next) o.next = t + 4 + Math.random() * 6; else if (t > o.next) { o.next = t + 6 + Math.random() * 8; if (Math.random() < .4) sing(o.k); }
}

// ---------- 소리 ----------
let ac;
function audio() { if (!ac) ac = new AudioContext(); if (ac.state === 'suspended') ac.resume(); document.querySelectorAll('video').forEach((v) => v.play().catch(() => {})); }
function noise(dur, fill, hp, vol) {
  if (!ac) return; const b = ac.createBuffer(1, ac.sampleRate * dur | 0, ac.sampleRate); fill(b.getChannelData(0), ac.sampleRate);
  const s = ac.createBufferSource(), h = ac.createBiquadFilter(), g = ac.createGain(); h.type = 'highpass'; h.frequency.value = hp; g.gain.value = vol;
  s.buffer = b; s.connect(h).connect(g).connect(ac.destination); s.start();
}
// 바스락: 짧은 종이 마찰 알갱이들 + 낮게 쓸리는 소리
function rustle(dur = .55, vol = .28) { noise(dur, (d, sr) => { for (let k = 0; k < 60; k++) { const st = Math.random() * (d.length - sr * .015) | 0, len = sr * (.002 + Math.random() * .01) | 0, amp = Math.random() ** 2; for (let i = 0; i < len; i++) d[st + i] += (Math.random() * 2 - 1) * amp * Math.exp(-i / (len * .3)); } for (let i = 0; i < d.length; i++) d[i] += (Math.random() * 2 - 1) * .08 * Math.sin(Math.PI * i / d.length); }, 1300, vol); }
function crease() { noise(.09, (d) => { for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / d.length) ** 2; }, 2500, .16); }
function tone(f0, f1, at, dur, vol, type = 'sine') {
  if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * .25); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + .05);
}
const SONGS = {
  chirp() { const n = 2 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) { const at = i * (.11 + Math.random() * .05); tone(4600 + Math.random() * 900, 3000, at, .07, .07); tone(3200, 5200, at + .05, .05, .035); } },
  robin() { let at = 0; for (let i = 0; i < 6; i++) { const f = 2600 + Math.random() * 1800; tone(f, f * (Math.random() < .5 ? 1.25 : .8), at, .12, .05); at += .1 + Math.random() * .08; } },
  coo() {
    if (!ac) return; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(ac.destination);
    [[0, .55, 1], [.7, .22, .92], [.98, .34, .96]].forEach(([at, d, m]) => {
      const o = ac.createOscillator(), v = ac.createOscillator(), vg = ac.createGain(), g = ac.createGain(), t = ac.currentTime + at;
      o.type = 'triangle'; o.frequency.setValueAtTime(300 * m, t); o.frequency.linearRampToValueAtTime(336 * m, t + d * .35); o.frequency.linearRampToValueAtTime(270 * m, t + d);
      v.frequency.value = 22; vg.gain.value = 9; v.connect(vg).connect(o.frequency);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.18, t + .05); g.gain.setValueAtTime(.18, t + d * .7); g.gain.linearRampToValueAtTime(0, t + d);
      o.connect(g).connect(lp); o.start(t); v.start(t); o.stop(t + d + .05); v.stop(t + d + .05);
    });
  },
};
const sing = (k) => SONGS[BIRDS[k].song]();

// ---------- 서랍 ----------
document.querySelectorAll('.sheet').forEach((el) => (el.onclick = () => pick(el.dataset.k, el)));
const drawer = document.getElementById('drawer'), handle = document.getElementById('handle');
handle.onclick = () => drawer.classList.toggle('shut');
document.body.addEventListener('pointerdown', audio, { once: true });

let last = performance.now() / 1000;
(function frame() {
  const t = performance.now() / 1000, dt = Math.min(.05, t - last); last = t;
  for (let i = jobs.length - 1; i >= 0; i--) if (runJob(jobs[i], dt)) jobs.splice(i, 1);
  for (const o of flock) tick(o, t, dt);
  for (let i = flock.length - 1; i >= 0; i--) if (flock[i].dead) flock.splice(i, 1);
  // 칸마다 가위질(scissor)해서 그 칸 새·종이는 칸 밖으로 넘치지 않게
  const w = innerWidth, h = innerHeight; renderer.autoClear = false; renderer.clear();
  renderer.setScissorTest(false); camera.layers.set(0); renderer.render(scene, camera);
  renderer.setScissorTest(true);
  for (let p = 0; p < 3; p++) { const x0 = Math.round(w * p / 3), x1 = Math.round(w * (p + 1) / 3); renderer.setScissor(x0, 0, x1 - x0, h); camera.layers.set(p + 1); renderer.render(scene, camera); }
  renderer.setScissorTest(false);
  requestAnimationFrame(frame);
})();
window.__pick = (k) => pick(k, document.querySelector(`.sheet[data-k="${k}"]`));
