// Day 39 잔돈 — 낡은 100원 하나를 현미경처럼 들여다본다.
// 기스를 누르면 흰 선과 네모 박스가 꼬리를 물고 이어지며, 추상적인 형태에서 그 상처가 생긴 장면까지 점점 구체화된다.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const THUMB = new URLSearchParams(location.search).has('thumb');
if (THUMB) document.documentElement.classList.add('thumb');

// ---------- 기스 다섯 개: 어디에, 어떤 모양으로, 어떤 이야기로 ----------
// face: obv(앞면 이순신) / rev(뒷면 100), 좌표는 면 안 -1~1
const SCARS = [
  { id: 'S01', face: 'obv', at: [.42, -.52], kind: 'dents', img: 'asphalt', sound: 'asphalt', est: '2019.12 ± 1',
    txt: ['불규칙한 함몰 7곳. 가장자리가 짓눌려 있다.', '격자무늬 압흔. 단단한 주철 표면에 부딪힌 듯.', '젖은 맨홀 뚜껑. 동전은 한 번 튀고 굴렀다.', '겨울 밤 버스정류장 앞. 장갑 낀 손에서 미끄러져 맨홀 위로 떨어졌다.'] },
  { id: 'S02', face: 'rev', at: [-.05, -.1], kind: 'arcs', img: 'washer', sound: 'washer', est: '2021.07 ± 2',
    txt: ['동심원을 그리는 잔 긁힘 수십 줄.', '구멍 뚫린 금속면에 오래 문질린 자국.', '세탁기 드럼. 한 시간 넘게 같은 방향으로 돌았다.', '바지 뒷주머니에 남아 있던 채로 빨래와 함께 돌았다. 꺼냈을 땐 아직 따뜻했다.'] },
  { id: 'S03', face: 'obv', at: [-.5, .3], kind: 'rails', img: 'vending', sound: 'vending', est: '2017.03 ± 1',
    txt: ['평행한 직선 세 줄. 같은 방향, 같은 깊이.', '좁은 금속 홈을 따라 밀려 내려간 흔적.', '자판기 동전 레일. 걸렸다가 다시 굴러 나왔다.', '지하철역 구석 자판기. 두 번 넣어도 반환구로 돌아왔다. 세 번째에 음료가 나왔다.'] },
  { id: 'S04', face: 'rev', at: [.46, .42], kind: 'gouge', img: 'keys', sound: 'keys', est: '2022.02 ± 1',
    txt: ['깊게 패인 지그재그 홈 하나.', '톱니 모양 금속 끝이 반복해서 찍힌 자국.', '주머니 속 열쇠 꾸러미와 한데 엉켜 있었다.', '현관 계단을 뛰어 내려갈 때마다 열쇠와 부딪혔다. 그날은 지각이었다.'] },
  { id: 'S05', face: 'obv', at: [-.18, -.7], kind: 'stain', img: 'fountain', sound: 'fountain', est: '2015.08 ± 3',
    txt: ['초록빛 얼룩이 둥글게 번져 있다. 산화 흔적.', '물에 오래 잠겨 있던 금속의 무늬.', '분수대 바닥. 다른 동전들과 함께 가라앉아 있었다.', '여름날 공원 분수대. 누군가 소원을 빌며 등 뒤로 던졌다. 몇 달 뒤 건져 올려졌다.'] },
];

// ---------- 렌더러·장면 ----------
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .85;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .22;
const camera = new THREE.PerspectiveCamera(30, 1, .01, 50);
// 비스듬히 스치는 빛이 기스를 드러낸다
const key = new THREE.DirectionalLight(0xfff3e2, 2.2); key.position.set(-3, 2.2, .4); camera.add(key); key.target.position.set(0, 0, -3); camera.add(key.target);
const rim = new THREE.DirectionalLight(0xcfe0ff, .9); rim.position.set(3, -1.5, -1); camera.add(rim); rim.target.position.set(0, 0, -3); camera.add(rim.target);
const fill = new THREE.DirectionalLight(0xffffff, .15); fill.position.set(.5, .5, 1); camera.add(fill); fill.target.position.set(0, 0, -3); camera.add(fill.target); scene.add(camera);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .12, .4, .93); composer.addPass(bloom);
composer.addPass(new OutputPass());

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = .07; controls.enablePan = false;
controls.enableRotate = false; controls.zoomSpeed = .9; controls.minDistance = .45; controls.maxDistance = 6;

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
// 처음엔 동전이 화면 높이의 1.4배쯤 되게, 살짝 기울여서
const startDist = 2 / (1.15 * 2 * Math.tan(15 * Math.PI / 180));
camera.position.set(.35, -.55, startDist).normalize().multiplyScalar(startDist); controls.update();

// ---------- 동전 면 텍스처 만들기 ----------
const R = 1, T = .146;   // 지름 24mm, 두께 1.75mm 비율
const N = 2048;
const loadImg = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
const rnd = (a, b) => a + Math.random() * (b - a);
// 면 좌표(-1~1, 위가 +) → 캔버스 픽셀
const P = (x, y) => [(x + 1) / 2 * N, (1 - (y + 1) / 2) * N];

function arcText(g, str, r, start, end, size, top, sx = 1, sy = 1) {
  g.save(); g.translate(N / 2, N / 2); g.font = `900 ${size}px "Noto Sans KR", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const chars = [...str], n = chars.length;
  chars.forEach((c, i) => {
    const a = start + (end - start) * (n === 1 ? .5 : i / (n - 1));
    g.save(); g.rotate(a); g.translate(0, -r * N / 2); if (!top) g.rotate(Math.PI); g.scale(sx, sy); g.fillText(c, 0, 0); g.restore();
  });
  g.restore();
}

// 기스 그리기: 높이(h, 패이면 어둡게)와 색(c, 긁히면 밝은 금속)에 함께
function drawScar(h, c, rough, s) {
  const [cx, cy] = s.at, u = N / 2;
  const line = (pts, w, depth) => {
    for (const [ctx, col, ww] of [[h, `rgba(0,0,0,${depth})`, w], [c, 'rgba(255,250,240,.55)', w * .6], [rough, 'rgba(25,25,25,.9)', w * .7]]) {
      ctx.strokeStyle = col; ctx.lineWidth = ww; ctx.lineCap = 'round'; ctx.beginPath();
      pts.forEach(([x, y], i) => { const p = P(x, y); i ? ctx.lineTo(...p) : ctx.moveTo(...p); }); ctx.stroke();
    }
  };
  if (s.kind === 'dents') {   // 짓눌린 함몰 여러 개 + 거친 마찰
    for (let i = 0; i < 7; i++) {
      const x = cx + rnd(-.1, .1), y = cy + rnd(-.08, .08), r = rnd(.008, .022) * u;
      const gr = h.createRadialGradient(...P(x, y), 0, ...P(x, y), r); gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      h.fillStyle = gr; h.beginPath(); h.arc(...P(x, y), r, 0, 7); h.fill();
      c.fillStyle = 'rgba(70,64,58,.35)'; c.beginPath(); c.arc(...P(x, y), r * .7, 0, 7); c.fill();
    }
    for (let i = 0; i < 60; i++) { const x = cx + rnd(-.13, .13), y = cy + rnd(-.1, .1), a = rnd(0, 6.3), l = rnd(.004, .02); line([[x, y], [x + Math.cos(a) * l, y + Math.sin(a) * l]], rnd(1, 2.4), .35); }
  } else if (s.kind === 'arcs') {   // 세탁기: 중심을 도는 잔 긁힘
    for (let i = 0; i < 46; i++) {
      const r = rnd(.35, .78), a0 = rnd(3.3, 4.6), a1 = a0 + rnd(.15, .6), pts = [];
      for (let k = 0; k <= 24; k++) { const a = a0 + (a1 - a0) * k / 24; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
      line(pts, rnd(.8, 2), rnd(.18, .38));
    }
  } else if (s.kind === 'rails') {   // 자판기 레일: 평행한 직선 세 줄
    for (let i = 0; i < 3; i++) { const o = (i - 1) * .035; line([[cx - .2, cy + .12 + o], [cx + .2, cy - .12 + o]], 3.2 - i * .6, .7); }
    for (let i = 0; i < 12; i++) { const o = rnd(-.05, .05); line([[cx - .18 + rnd(0, .05), cy + .1 + o], [cx + .14, cy - .09 + o]], .8, .2); }
  } else if (s.kind === 'gouge') {   // 열쇠 톱니: 깊은 지그재그
    const pts = []; for (let k = 0; k < 11; k++) pts.push([cx - .14 + k * .028, cy + (k % 2 ? .03 : -.03) + k * .006]);
    line(pts, 5, .85); line(pts.map(([x, y]) => [x + .004, y - .006]), 1.4, .3);
  } else if (s.kind === 'stain') {   // 분수대: 초록빛 산화 얼룩 + 잔 부식
    for (let i = 0; i < 5; i++) {
      const x = cx + rnd(-.06, .06), y = cy + rnd(-.04, .04), r = rnd(.06, .12) * u;
      const gr = c.createRadialGradient(...P(x, y), r * .2, ...P(x, y), r);
      gr.addColorStop(0, 'rgba(70,110,85,.0)'); gr.addColorStop(.65, 'rgba(70,115,90,.45)'); gr.addColorStop(.85, 'rgba(95,80,50,.35)'); gr.addColorStop(1, 'rgba(70,110,85,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(...P(x, y), r, 0, 7); c.fill();
      rough.fillStyle = 'rgba(230,230,230,.35)'; rough.beginPath(); rough.arc(...P(x, y), r * .8, 0, 7); rough.fill();
    }
    for (let i = 0; i < 160; i++) { const x = cx + rnd(-.14, .14), y = cy + rnd(-.1, .1); h.fillStyle = 'rgba(0,0,0,.25)'; h.fillRect(...P(x, y), 2, 2); }
  }
}

function heightToNormal(hc, strength) {
  const n = 1024, src = document.createElement('canvas'); src.width = src.height = n;
  const sg = src.getContext('2d'); sg.drawImage(hc, 0, 0, n, n);
  const hd = sg.getImageData(0, 0, n, n).data, out = sg.createImageData(n, n), od = out.data;
  const H = (x, y) => hd[(((y + n) % n) * n + ((x + n) % n)) * 4] / 255;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * n + x) * 4;
    od[i] = (-dx / l * .5 + .5) * 255; od[i + 1] = (dy / l * .5 + .5) * 255; od[i + 2] = (1 / l * .5 + .5) * 255; od[i + 3] = 255;
  }
  sg.putImageData(out, 0, 0); return src;
}

async function makeFace(which) {
  // 실제 100원 배치: 앞면 = 정면 흉상 + 좌우 '백' '원', 뒷면 = 위 연도 · 큰 100 · 아래 '한국은행'
  await Promise.all(['700 100px "Noto Sans KR"', '700 100px "Noto Serif KR"', '900 100px "Noto Serif KR"'].map((f) => document.fonts.load(f, '백원한국은행0123456789').catch(() => {})));
  const relief = which === 'obv' ? await loadImg('art/face_obv.png') : null;
  const [revText, baek, won] = which === 'obv' ? [null, await loadImg('art/baek.png'), await loadImg('art/won.png')] : [await loadImg('art/rev_text.png'), null, null];
  const glyph = (img, x, y, hgt) => { if (!img) return; const hh = N * hgt, ww = hh * img.width / img.height, [px, py] = P(x, y); h.save(); h.globalCompositeOperation = 'lighter'; h.filter = 'blur(1.4px)'; h.drawImage(img, px - ww / 2, py - hh / 2, ww, hh); h.restore(); };
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = N; return [c, c.getContext('2d')]; };
  const [hc, h] = mk(), [cc, c] = mk(), [rc, r] = mk();
  h.fillStyle = '#6a6a6a'; h.fillRect(0, 0, N, N);
  const word = (txt, x, y, size, weight = 700, sx = 1, fam = '"Noto Serif KR", serif') => { h.save(); h.translate(...P(x, y)); h.scale(sx, 1); h.font = `${weight} ${size}px ${fam}`; h.textAlign = 'center'; h.textBaseline = 'middle'; h.fillText(txt, 0, 0); h.restore(); };
  if (which === 'obv') {
    if (relief) {
      h.save(); h.beginPath(); h.arc(N / 2, N / 2, N * .456, 0, 7); h.clip();
      h.globalCompositeOperation = 'lighter'; h.globalAlpha = .6; h.filter = 'blur(1.5px)';
      const sz = N * 1.02; h.drawImage(relief, (N - sz) / 2, N * .956 - sz * .93, sz, sz);   // 어깨 아래가 테두리에 딱 닿게
      h.restore(); h.filter = 'none'; h.globalAlpha = 1; h.globalCompositeOperation = 'source-over';
    }
    h.fillStyle = '#e8e8e8'; h.filter = 'blur(1.3px)';
    glyph(baek, -.66, .06, .13); glyph(won, .66, .06, .13);   // 실제 동전처럼 각진 옛 한글 글씨
    h.filter = 'none';
  } else {
    // 실제 동전 글씨(1999 · 100 · 한국은행)를 따라 그린 높이 그림
    if (revText) { h.save(); h.globalCompositeOperation = 'lighter'; h.globalAlpha = .7; h.filter = 'blur(1.6px)'; const sz = N * .98; h.drawImage(revText, (N - sz) / 2, (N - sz) / 2, sz, sz); h.restore(); }
  }
  // 테두리 안쪽 점선 고리
  h.fillStyle = '#d8d8d8';
  if (which === 'rev') for (let i = 0; i < 132; i++) { const a = i / 132 * Math.PI * 2; h.beginPath(); h.arc(...P(Math.cos(a) * .885, Math.sin(a) * .885), N * .0045, 0, 7); h.fill(); }
  // 테두리: 솟은 가장자리와 안쪽 경사
  const ring = h.createRadialGradient(N / 2, N / 2, N * .455, N / 2, N / 2, N * .5);
  ring.addColorStop(0, 'rgba(106,106,106,1)'); ring.addColorStop(.35, 'rgba(235,235,235,1)'); ring.addColorStop(1, 'rgba(225,225,225,1)');
  h.save(); h.beginPath(); h.arc(N / 2, N / 2, N * .5, 0, Math.PI * 2); h.moveTo(N / 2 + N * .455, N / 2); h.arc(N / 2, N / 2, N * .455, 0, Math.PI * 2, true); h.fillStyle = ring; h.fill('evenodd'); h.restore();
  // 닳은 표면: 오래 문질린 미세 요철
  for (let i = 0; i < 9000; i++) { h.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},.05)`; h.fillRect(Math.random() * N, Math.random() * N, rnd(1, 3), rnd(1, 3)); }
  for (let i = 0; i < 260; i++) { const x = rnd(-.9, .9), y = rnd(-.9, .9), a = rnd(0, 6.3), l = rnd(.01, .08); h.strokeStyle = 'rgba(0,0,0,.12)'; h.lineWidth = rnd(.6, 1.4); h.beginPath(); h.moveTo(...P(x, y)); h.lineTo(...P(x + Math.cos(a) * l, y + Math.sin(a) * l)); h.stroke(); }

  // 색: 백동(구리·니켈) 은회색. 오목한 곳엔 때가 끼고, 튀어나온 곳은 닳아 밝다
  c.fillStyle = '#8e8a83'; c.fillRect(0, 0, N, N);
  c.globalCompositeOperation = 'multiply'; c.filter = 'blur(10px)'; c.globalAlpha = .55; c.drawImage(hc, 0, 0); c.filter = 'none'; c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 40; i++) {   // 손때·변색 얼룩
    const x = rnd(-.9, .9), y = rnd(-.9, .9), rr = rnd(.05, .25) * N / 2;
    const gr = c.createRadialGradient(...P(x, y), 0, ...P(x, y), rr);
    const col = Math.random() < .6 ? '88,72,52' : '150,140,120'; gr.addColorStop(0, `rgba(${col},${rnd(.05, .16)})`); gr.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = gr; c.fillRect(0, 0, N, N);
  }
  // 거칠기: 대체로 반무광, 닳은 부분은 매끈
  r.fillStyle = '#7a7a7a'; r.fillRect(0, 0, N, N);
  r.globalCompositeOperation = 'difference'; r.globalAlpha = .3; r.filter = 'blur(6px)'; r.drawImage(hc, 0, 0); r.filter = 'none'; r.globalAlpha = 1; r.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 4000; i++) { r.fillStyle = `rgba(${Math.random() < .5 ? '40,40,40' : '200,200,200'},.12)`; r.fillRect(Math.random() * N, Math.random() * N, 2, 2); }

  for (const s of SCARS) if (s.face === which) drawScar(h, c, r, s);
  const tex = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return new THREE.MeshPhysicalMaterial({
    map: tex(cc, true), normalMap: tex(heightToNormal(hc, 5.5)), normalScale: new THREE.Vector2(1.1, 1.1), roughnessMap: tex(rc),
    metalness: 1, roughness: .62, clearcoat: .08, clearcoatRoughness: .6,
  });
}
function edgeMaterial() {   // 톱니 테두리
  const w = 4096, hh = 64, cv = document.createElement('canvas'); cv.width = w; cv.height = hh; const g = cv.getContext('2d');
  for (let x = 0; x < w; x++) { const v = Math.round(128 + 110 * Math.sin(x / w * Math.PI * 2 * 110)); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, hh); }
  const n = heightToNormal(cv, 3), col = document.createElement('canvas'); col.width = 512; col.height = 16;
  const cg = col.getContext('2d'); cg.fillStyle = '#a9a59d'; cg.fillRect(0, 0, 512, 16);
  for (let i = 0; i < 300; i++) { cg.fillStyle = `rgba(80,66,50,${rnd(.05, .2)})`; cg.fillRect(Math.random() * 512, Math.random() * 16, rnd(2, 20), 2); }
  const nt = new THREE.CanvasTexture(n), ct = new THREE.CanvasTexture(col); ct.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshPhysicalMaterial({ map: ct, normalMap: nt, normalScale: new THREE.Vector2(2, 0), metalness: 1, roughness: .48 });
}

const coin = new THREE.Group(); scene.add(coin);
const faces = {};
const [obvMat, revMat] = await Promise.all([makeFace('obv'), makeFace('rev')]);
{
  const geo = new THREE.CircleGeometry(R, 256);
  faces.obv = new THREE.Mesh(geo, obvMat); faces.obv.position.z = T / 2; coin.add(faces.obv);
  faces.rev = new THREE.Mesh(geo, revMat); faces.rev.rotation.y = Math.PI; faces.rev.position.z = -T / 2; coin.add(faces.rev);
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(R, R, T, 256, 1, true), edgeMaterial()); edge.rotation.x = Math.PI / 2; coin.add(edge);
}
coin.rotation.set(-.12, .2, .05);

// ---------- 필름 그레인 ----------
{
  const g = document.getElementById('grain'), s = 256; g.width = g.height = s; const gc = g.getContext('2d'), im = gc.createImageData(s, s);
  for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  gc.putImageData(im, 0, 0); g.style.imageRendering = 'pixelated';
  let f = 0; (function jitter() { f++; g.style.transform = `translate(${(f * 37) % 50 - 25}%, ${(f * 53) % 50 - 25}%)`; setTimeout(jitter, 80); })();
}

// ---------- 기스 표시와 고르기 ----------
const marksEl = document.getElementById('notes'), svg = document.getElementById('lines');
const marks = SCARS.map((s) => { const m = document.createElement('div'); m.className = 'mark'; m.innerHTML = `<span class="id">${s.id}</span>`; marksEl.appendChild(m); return m; });
const wp = new THREE.Vector3(), nrm = new THREE.Vector3(), toCam = new THREE.Vector3();
function scarScreen(s) {   // 기스 위치의 화면 좌표와, 그 면이 카메라를 보는지
  const f = faces[s.face]; wp.set(s.at[0] * R, s.at[1] * R, 0); f.localToWorld(wp);
  nrm.set(0, 0, 1).applyQuaternion(f.getWorldQuaternion(new THREE.Quaternion())); toCam.copy(camera.position).sub(wp);
  const vis = nrm.dot(toCam) > 0; const p = wp.clone().project(camera);
  return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight, vis: vis && p.z < 1 };
}
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
let hover = -1, downAt = null;
function pickScar(e) {
  mouse.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects([faces.obv, faces.rev])[0]; if (!hit) return -1;
  const which = hit.object === faces.obv ? 'obv' : 'rev', x = hit.uv.x * 2 - 1, y = hit.uv.y * 2 - 1;
  let best = -1, bd = .16;
  SCARS.forEach((s, i) => { if (s.face !== which) return; const d = Math.hypot(s.at[0] - x, s.at[1] - y); if (d < bd) { bd = d; best = i; } });
  return best;
}
canvas.addEventListener('pointermove', (e) => { hover = pickScar(e); canvas.style.cursor = hover >= 0 ? 'pointer' : 'grab'; });
let drag = null; const spin = { x: 0, y: 0 };
canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; drag = [e.clientX, e.clientY]; canvas.setPointerCapture(e.pointerId); audio(); });
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return; const k = .006 * Math.min(1, camera.position.length() / startDist);
  spin.y = (e.clientX - drag[0]) * k; spin.x = (e.clientY - drag[1]) * k; drag = [e.clientX, e.clientY];
});
addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;   // 드래그는 회전
  const i = pickScar(e); if (i >= 0) openChain(i); else if (chains.size) closeAll();
});
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

// ---------- 분석 박스: 꼬리에 꼬리를 물고 ----------
const chains = new Map();
const analyzed = new Set();
const BOX_W = 190, BOX_H = 305;
// 새 흔적을 파고들면, 이전 흔적들은 흐릿하게(투명도+블러+그레인) 물러난다
let focusSeq = 0;
function focusChain(ch) {
  ch.seq = ++focusSeq;
  for (const c of chains.values()) {
    const dim = c !== ch;
    c.boxes.forEach((b) => { b.el.classList.toggle('dim', dim); b.el.style.zIndex = (dim ? 5 : 20) + c.boxes.indexOf(b); for (const n of [b.ln, b.dot, b.end]) n.style.opacity = dim ? .22 : 1; });
  }
}
function openChain(i) {
  if (chains.has(i)) { const ch = chains.get(i); focusChain(ch); ch.boxes.at(-1).el.animate([{ opacity: .3 }, { opacity: 1 }], { duration: 300 }); return; }
  const ch = { i, boxes: [] }; chains.set(i, ch); addBox(ch);
  document.getElementById('help').style.opacity = 0;
}
function placeBox(ch) {
  // 앞 상자(없으면 기스)에서 바깥쪽으로 뻗되 방향을 들쭉날쭉하게. 살짝 겹치는 건 괜찮고 많이 겹치는 것만 피한다
  const s = SCARS[ch.i], from = ch.boxes.length ? center(ch.boxes.at(-1)) : scarScreen(s);
  const out = ch.boxes.length ? ch.dir : Math.atan2(from.y - innerHeight / 2, from.x - innerWidth / 2);
  const all = [...chains.values()].flatMap((c) => c.boxes);
  let best = null, bestScore = -1e9;
  for (let k = 0; k < 40; k++) {
    const a = out + (Math.random() - .5) * (ch.boxes.length ? 2.4 : 1.4), d = ch.boxes.length ? rnd(230, 300) : rnd(200, 260);
    let x = from.x + Math.cos(a) * (d + 60) - BOX_W / 2, y = from.y + Math.sin(a) * d - BOX_H / 2;
    x = Math.max(12, Math.min(innerWidth - BOX_W - 12, x)); y = Math.max(12, Math.min(innerHeight - BOX_H - 12, y));
    const c = { x: x + BOX_W / 2, y: y + BOX_H / 2 }, link = Math.hypot(c.x - from.x, c.y - from.y);
    const overlap = all.reduce((m, b) => { const ox = Math.max(0, BOX_W - Math.abs(b.x - x)), oy = Math.max(0, BOX_H - Math.abs(b.y - y)); const f = (ox * oy) / (BOX_W * BOX_H); return m + (f > .1 ? f * 6 : f * .4); }, 0);
    const gap = Math.min(Math.abs(c.x - from.x) - BOX_W, Math.abs(c.y - from.y) - BOX_H);   // 상자 사이에 선이 보일 틈
    const score = -overlap * 1000 - Math.max(0, 40 - Math.max(Math.abs(c.x - from.x) - BOX_W, Math.abs(c.y - from.y) - BOX_H)) * 12 - Math.abs(link - 280) * .5;
    if (score > bestScore) { bestScore = score; best = { x, y, a }; }
  }
  ch.dir = best.a + (Math.random() - .5) * .8;
  return best;
}
const center = (b) => ({ x: b.x + BOX_W / 2, y: b.y + BOX_H / 2 });
function addBox(ch) {
  const s = SCARS[ch.i], stage = ch.boxes.length, last = stage === 3;
  if (ch.boxes.length) ch.boxes.at(-1).el.classList.add('done');
  const pos = placeBox(ch), el = document.createElement('div'); el.className = 'note' + (last ? ' done' : '');
  el.style.left = pos.x + 'px'; el.style.top = pos.y + 'px';
  el.innerHTML = `<div class="frame"><div class="pic"></div>
    <div class="meta"><span>${s.id}-${String.fromCharCode(65 + stage)} · ${stage + 1}/4</span><span>${['DEPTH 3.2µm', 'MAG ×240', 'MAG ×18', 'EST ' + s.est][stage]}</span></div>
    <div class="txt">${s.txt[stage]}</div><div class="more">${last ? '' : '▸ 더 들여다보기'}</div></div>`;
  const pic = el.querySelector('.pic');
  if (stage === 0) pic.appendChild(blobGraphic(s));
  else { const im = new Image(); im.src = `art/${s.img}_${stage}.jpg`; pic.appendChild(im); }
  el.addEventListener('click', (e) => { e.stopPropagation(); if (ch.boxes.at(-1).el === el && ch.boxes.length < 4) addBox(ch); });
  marksEl.appendChild(el);
  const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line'), dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot.setAttribute('r', stage ? 2 : 3); const end = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); end.setAttribute('width', 5); end.setAttribute('height', 5); svg.append(ln, dot, end);
  el.style.zIndex = 10 + stage; ch.boxes.push({ el, x: pos.x, y: pos.y, ln, dot, end });
  focusChain(ch);
  tick();
  if (last) { analyzed.add(ch.i); document.getElementById('found').textContent = `SCARS ${analyzed.size} / 5 ANALYZED`; playScene(s.sound); }
}
function closeAll() {   // 바탕을 누르면 분석이 흩어지며 사라진다
  const all = [...chains.values()].flatMap((c) => c.boxes); chains.clear();
  all.forEach((b, k) => {
    b.el.style.transition = `opacity .35s ${k * .03}s, transform .35s ${k * .03}s`; b.el.style.opacity = 0; b.el.style.transform = 'scale(.96)';
    b.ln.style.transition = b.dot.style.transition = 'opacity .3s'; b.ln.style.opacity = b.dot.style.opacity = 0;
    setTimeout(() => { b.el.remove(); b.ln.remove(); b.dot.remove(); b.end?.remove(); }, 450 + k * 30);
  });
}

// 1단계 힌트: 다음 단계 사진을 기스마다 다른 기법으로 추상화 (무엇인지 알기 어렵게)
// asphalt 픽셀 덩어리 / washer 소용돌이로 끌린 1비트 망점 / vending 세로 선 스크린 / keys 가로로 녹아내린 글리치 / fountain 번진 하프톤 원
const ABS = { asphalt: 'blocks', washer: 'swirl', vending: 'lines', keys: 'smear', fountain: 'halftone' };
function blobGraphic(s) {
  const W = 200, H = 250, S = 2, cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S; const g = cv.getContext('2d'); g.scale(S, S);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const im = new Image(); im.src = `art/${s.img}_1.jpg`;
  im.onload = () => {
    // 사진 밝기 읽기 (w×h 격자)
    const lumOf = (w, h, blur = 0) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); if (blur) x.filter = `blur(${blur}px)`; x.drawImage(im, 0, 0, w, h); const d = x.getImageData(0, 0, w, h).data, L = new Float32Array(w * h); for (let i = 0; i < w * h; i++) L[i] = d[i * 4] / 255;
      const so = [...L].sort((a, b) => a - b), lo = so[(so.length * .05) | 0], hi = so[(so.length * .95) | 0];   // 대비를 넓혀 형태가 드러나게
      for (let i = 0; i < L.length; i++) L[i] = Math.max(0, Math.min(1, (L[i] - lo) / (hi - lo || 1))); return L; };
    const kind = ABS[s.img];
    g.fillStyle = '#fff'; g.strokeStyle = '#fff';
    if (kind === 'blocks') {
      const cols = 22, rows = 28, L = lumOf(cols, rows), th = [...L].sort((a, b) => a - b)[(L.length * .42) | 0];
      const on = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows && L[y * cols + x] < th, cw = W / cols, ch = H / rows;
      g.fillStyle = 'rgba(255,255,255,.14)'; g.lineWidth = .8;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (on(x, y)) {
        g.fillRect(x * cw, y * ch, cw, ch); g.beginPath();
        if (!on(x, y - 1)) { g.moveTo(x * cw, y * ch); g.lineTo((x + 1) * cw, y * ch); }
        if (!on(x, y + 1)) { g.moveTo(x * cw, (y + 1) * ch); g.lineTo((x + 1) * cw, (y + 1) * ch); }
        if (!on(x - 1, y)) { g.moveTo(x * cw, y * ch); g.lineTo(x * cw, (y + 1) * ch); }
        if (!on(x + 1, y)) { g.moveTo((x + 1) * cw, y * ch); g.lineTo((x + 1) * cw, (y + 1) * ch); }
        g.stroke();
      }
      for (let k = 0; k < 26; k++) { const x = Math.random() * W, y = Math.random() * H, w = rnd(3, 8); g.strokeRect(x, y, w, w * .6); }
    } else if (kind === 'lines') {   // 세로 선 스크린: 어두운 곳일수록 선이 굵게 부풀고, 밝은 곳은 점선만
      const cols = 34, rows = 125, L = lumOf(cols, rows, 1), cw = W / cols, ch = H / rows;
      for (let x = 0; x < cols; x++) {
        const cx = x * cw + cw / 2;
        for (let y = 0; y < rows; y++) {
          const d = 1 - L[y * cols + x], w = Math.pow(Math.max(0, d - .25) / .75, 1.4) * cw * .95;
          if (w > .5) g.fillRect(cx - w / 2, y * ch, w, ch + .3);
          else if (y % 3 === 0) g.fillRect(cx - .4, y * ch, .8, .8);
        }
      }
    } else if (kind === 'halftone') {   // 번진 하프톤: 밝기만큼 원 크기, 살짝 흐리게
      const step = 8.5, cols = Math.ceil(W / step), rows = Math.ceil(H / step), L = lumOf(cols, rows, 1.5);
      g.filter = 'blur(.6px)';
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const v = L[y * cols + x], r = Math.pow(v, 1.6) * step * .7;
        if (r > .35) { g.beginPath(); g.arc(x * step + (y % 2 ? step / 2 : 0), y * step, r, 0, Math.PI * 2); g.fill(); }
      }
      g.filter = 'none';
    } else if (kind === 'smear' || kind === 'swirl') {   // 녹아내린·소용돌이 치는 1비트 망점
      const w = W, h = H, L = lumOf(w, h), out = g.createImageData(w * S, h * S), od = out.data;
      const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      for (let y = 0; y < h * S; y++) for (let x = 0; x < w * S; x++) {
        let sx = x / S, sy = y / S;
        if (kind === 'smear') { sx += Math.sin(sy * .045 + Math.sin(sx * .02) * 2) * 22 * Math.sin(sx * .018); sy += Math.sin(sx * .06) * 4; }
        else { const dx = sx - w / 2, dy = sy - h / 2, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx) + (1 - Math.min(1, r / (w * .7))) * 2.6; sx = w / 2 + Math.cos(a) * r; sy = h / 2 + Math.sin(a) * r; }
        const xi = Math.max(0, Math.min(w - 1, sx | 0)), yi = Math.max(0, Math.min(h - 1, sy | 0));
        const v = L[yi * w + xi], t = (bayer[(y % 4) * 4 + (x % 4)] + .5) / 16;
        const on = v > t, i = (y * w * S + x) * 4; od[i] = od[i + 1] = od[i + 2] = on ? 255 : 0; od[i + 3] = 255;
      }
      g.putImageData(out, 0, 0);
    }
  };
  return cv;
}

// 선 갱신: 기스(움직이는 동전 위) → 첫 상자 → 다음 상자 …
function tick() {
  for (const ch of chains.values()) {
    const sp = scarScreen(SCARS[ch.i]);
    ch.boxes.forEach((b, k) => {
      const a = k ? center(ch.boxes[k - 1]) : sp, c = center(b);
      // 상자 테두리에서 선이 시작·끝나도록
      const edge = (p, q) => { const dx = q.x - p.x, dy = q.y - p.y, t = Math.min(BOX_W / 2 / Math.abs(dx || 1e-6), BOX_H / 2 / Math.abs(dy || 1e-6)); return { x: p.x + dx * t, y: p.y + dy * t }; };
      const s0 = k ? edge(a, c) : a, e0 = edge(c, a);
      b.ln.setAttribute('x1', s0.x); b.ln.setAttribute('y1', s0.y); b.ln.setAttribute('x2', e0.x); b.ln.setAttribute('y2', e0.y);
      b.dot.setAttribute('cx', s0.x); b.dot.setAttribute('cy', s0.y); b.end.setAttribute('x', e0.x - 2.5); b.end.setAttribute('y', e0.y - 2.5);
      b.ln.style.opacity = !k && !sp.vis ? .25 : 1;
    });
  }
}

// ---------- 현장음 (합성) ----------
let ac, master;
function audio() { if (!ac) { ac = new AudioContext(); master = ac.createGain(); master.gain.value = .9; master.connect(ac.destination); } if (ac.state === 'suspended') ac.resume(); }
function noiseSrc(dur) { const b = ac.createBuffer(1, ac.sampleRate * dur | 0, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ac.createBufferSource(); s.buffer = b; return s; }
function env(node, t, a, peak, hold, rel) { const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(.0001, t + a + hold + rel); node.connect(g); g.connect(master); return g; }
function ping(t, f, vol, dec) { for (const m of [1, 2.76, 5.4]) { const o = ac.createOscillator(); o.frequency.value = f * m; env(o, t, .002, vol / m, 0, dec / m); o.start(t); o.stop(t + dec + .1); } }
function filtNoise(t, dur, type, freq, q, vol, a = .05, rel = .3) { const n = noiseSrc(dur + rel + .1), f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; n.connect(f); env(f, t, a, vol, dur, rel); n.start(t); return f; }
const SCENES = {
  asphalt(t) {   // 아스팔트: 동전이 튀며 구르고, 멀리 차 소리
    filtNoise(t, 3.2, 'lowpass', 380, .5, .22, .6, 1.2);
    let tt = t + .25, gap = .32, v = .5; for (let i = 0; i < 9; i++) { ping(tt, 3300 + Math.random() * 300, v, .18); tt += gap; gap *= .72; v *= .78; }
    filtNoise(tt, .9, 'bandpass', 2600, 2, .06, .05, .4);
  },
  washer(t) {   // 세탁기: 낮게 웅웅 도는 소리와 툭툭
    const f = filtNoise(t, 3.5, 'lowpass', 160, 1, .5, .4, 1);
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 1.3; lg.gain.value = 60; lfo.connect(lg).connect(f.frequency); lfo.start(t); lfo.stop(t + 5);
    for (let i = 0; i < 6; i++) { const o = ac.createOscillator(); o.frequency.setValueAtTime(90, t + .4 + i * .62); o.frequency.exponentialRampToValueAtTime(45, t + .52 + i * .62); env(o, t + .4 + i * .62, .005, .35, 0, .18); o.start(t + .4 + i * .62); o.stop(t + .8 + i * .62); ping(t + .45 + i * .62, 2400, .08, .1); }
  },
  vending(t) {   // 자판기: 레일을 긁으며 내려가다 쿵
    const f = filtNoise(t, 1.6, 'bandpass', 1800, 6, .35, .05, .2); f.frequency.setValueAtTime(2600, t); f.frequency.linearRampToValueAtTime(900, t + 1.6);
    for (let i = 0; i < 4; i++) ping(t + .3 + i * .33, 2900 - i * 120, .2, .12);
    const o = ac.createOscillator(); o.frequency.setValueAtTime(120, t + 1.9); o.frequency.exponentialRampToValueAtTime(50, t + 2.1); env(o, t + 1.9, .004, .6, 0, .35); o.start(t + 1.9); o.stop(t + 2.5);
    filtNoise(t + 1.9, .1, 'lowpass', 900, 1, .4, .002, .25);
  },
  keys(t) {   // 주머니 속 열쇠와 동전: 짤랑짤랑, 계단 발소리
    for (let s = 0; s < 5; s++) {
      const st = t + s * .55; filtNoise(st, .04, 'lowpass', 300, 1, .5, .003, .15);
      for (let i = 0; i < 5; i++) ping(st + .02 + Math.random() * .12, 3800 + Math.random() * 2600, .12, .25);
    }
  },
  fountain(t) {   // 분수대: 물소리와 퐁당
    filtNoise(t, 3.4, 'bandpass', 1100, .6, .3, .6, 1);
    filtNoise(t, 3.4, 'highpass', 4500, .5, .08, .6, 1);
    const o = ac.createOscillator(); o.frequency.setValueAtTime(380, t + .7); o.frequency.exponentialRampToValueAtTime(900, t + .78); env(o, t + .7, .003, .4, 0, .12); o.start(t + .7); o.stop(t + .9);
    filtNoise(t + .7, .08, 'lowpass', 1400, 1, .4, .002, .3);
    for (let i = 0; i < 10; i++) { const tt = t + 1 + Math.random() * 2, b = ac.createOscillator(); b.frequency.setValueAtTime(600 + Math.random() * 500, tt); b.frequency.exponentialRampToValueAtTime(1400 + Math.random() * 800, tt + .05); env(b, tt, .002, .06, 0, .05); b.start(tt); b.stop(tt + .1); }
  },
};
function playScene(k) { audio(); SCENES[k](ac.currentTime + .05); }

// ---------- 그리기 ----------
(function frame() {
  controls.update();
  // 드래그한 만큼 동전을 화면 축 기준으로 돌리고, 손을 떼면 천천히 멈춘다
  if (Math.abs(spin.x) + Math.abs(spin.y) > 1e-5) {
    const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion), spin.x);
    const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion), spin.y);
    coin.quaternion.premultiply(qx).premultiply(qy);
    if (!drag) { spin.x *= .92; spin.y *= .92; } else { spin.x *= .5; spin.y *= .5; }
  }
  coin.rotateZ(.0004);   // 숨 쉬듯 아주 천천히
  key.position.x = -3 + Math.sin(performance.now() / 6000) * .6;   // 스치는 빛이 아주 천천히 움직인다
  composer.render();
  SCARS.forEach((s, i) => {
    const p = scarScreen(s), m = marks[i]; m.style.left = p.x + 'px'; m.style.top = p.y + 'px';
    const near = p.vis && camera.position.length() < startDist * 1.15;
    m.className = 'mark' + (p.vis && (hover === i || chains.has(i)) ? ' hot' : near ? ' near' : '');
  });
  tick();
  requestAnimationFrame(frame);
})();

window.__dbg = { camera, controls, coin, openChain, SCARS, scarScreen };
