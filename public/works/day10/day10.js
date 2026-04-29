// Day 10 — 파편이 맥락이 될 때
// 3D 뷰포트에서 조각 사진을 displacement relief 로 3D화 → 분해/복원 인터랙션

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const IS_THUMB = new URLSearchParams(location.search).has('thumb');

// ═══════════════════════════════════════════════════════════════
// 작품 데이터
// ═══════════════════════════════════════════════════════════════

const SCULPTURES = [
  { id:'01', file:'01-rodin-burghers.jpg', artist:'AUGUSTE RODIN', work:'Burghers of Calais', year:'1889', material:'Bronze', mass:2200, dim:'200×197×177cm' },
  { id:'02', file:'02-rodin-thinker.jpg',  artist:'AUGUSTE RODIN', work:'The Thinker',        year:'c.1880',  material:'Bronze', mass:700,  dim:'189×98×140cm' },
  { id:'03', file:'03-bernini-david.jpg',  artist:'GIAN LORENZO BERNINI', work:'David',       year:'1623–24', material:'Carrara Marble', mass:800,  dim:'170×75×82cm' },
  { id:'04', file:'04-venus-de-milo.jpg',  artist:'UNKNOWN (HELLENISTIC)', work:'Venus de Milo', year:'c.130 BC', material:'Parian Marble', mass:900, dim:'203cm tall' },
  { id:'05', file:'05-winged-victory.jpg', artist:'UNKNOWN (HELLENISTIC)', work:'Winged Victory of Samothrace', year:'c.190 BC', material:'Parian Marble', mass:2800, dim:'244cm tall' },
  { id:'06', file:'06-michelangelo-pieta.jpg', artist:'MICHELANGELO', work:'Pietà',           year:'1498–99', material:'Carrara Marble', mass:2000, dim:'174×195cm' },
  { id:'07', file:'07-moai.jpeg',          artist:'RAPA NUI', work:"Hoa Hakananai'a",         year:'c.1200',  material:'Basalt', mass:4200, dim:'242cm tall' },
  { id:'08', file:'08-colossi-memnon.jpg', artist:'ANCIENT EGYPT', work:'Colossi of Memnon',  year:'c.1350 BC', material:'Quartzite Sandstone', mass:720000, dim:'18m tall' },
  { id:'09', file:'09-sphinx.jpg',         artist:'ANCIENT EGYPT', work:'Great Sphinx of Giza', year:'c.2500 BC', material:'Limestone', mass:20000000, dim:'73m long' },
  { id:'10', file:'10-laocoon.jpg',        artist:'UNKNOWN (HELLENISTIC)', work:'Laocoön and His Sons', year:'c.27 BC – AD 68', material:'Marble', mass:800, dim:'208×163×112cm' },
];

function formatMass(kg) {
  if (kg >= 1000000) return (kg / 1000000).toFixed(1) + ' 천톤';
  if (kg >= 1000) return (kg / 1000).toFixed(1) + ' t';
  if (kg >= 1) return kg.toFixed(1) + ' kg';
  if (kg <= 0) return '0 g';
  return (kg * 1000).toFixed(0) + ' g';
}

// ═══════════════════════════════════════════════════════════════
// 1막: 피드
// ═══════════════════════════════════════════════════════════════

const feedEl = document.getElementById('feed');
const feedListEl = document.getElementById('feed-list');

function buildFeed() {
  const repeated = [...SCULPTURES, ...SCULPTURES];
  repeated.forEach((s) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.id = s.id;
    card.innerHTML = `
      <div class="img-wrap">
        <img src="./sculptures/${s.file}" alt="${s.work}" loading="lazy" decoding="async" draggable="false">
      </div>
      <div class="tag-digital">0 g · DIGITAL</div>
      <div class="meta">
        <div><span class="num">#${s.id}</span><span class="artist">${s.artist}</span></div>
        <div class="work">${s.work}</div>
        <div class="data-row"><span class="k">YEAR</span><span class="v">${s.year}</span></div>
        <div class="data-row"><span class="k">MATERIAL</span><span class="v">${s.material}</span></div>
        <div class="data-row"><span class="k">MASS</span><span class="v">${formatMass(s.mass)}</span></div>
        <div class="data-row"><span class="k">DIM</span><span class="v">${s.dim}</span></div>
      </div>
    `;
    card.addEventListener('click', () => enterStage(s));
    feedListEl.appendChild(card);
  });
}
buildFeed();

function setupInfiniteScroll() {
  const singleHeight = feedListEl.scrollHeight / 2;
  // 초기 위치 — 첫 번째 반복의 시작 근처
  requestAnimationFrame(() => {
    feedEl.scrollTop = singleHeight * 0.5;
  });
  let lockScroll = false;
  feedEl.addEventListener('scroll', () => {
    if (lockScroll) return;
    const st = feedEl.scrollTop;
    const oneHalf = feedListEl.scrollHeight / 2;
    // 끝 근처 — 아래로 리셋
    if (st > oneHalf * 1.5) {
      lockScroll = true;
      feedEl.scrollTop = st - oneHalf;
      setTimeout(() => lockScroll = false, 50);
    }
    // 맨 위 근처 — 아래로 리셋
    else if (st < oneHalf * 0.05) {
      lockScroll = true;
      feedEl.scrollTop = st + oneHalf;
      setTimeout(() => lockScroll = false, 50);
    }
  });
}
setTimeout(setupInfiniteScroll, 400);

// ═══════════════════════════════════════════════════════════════
// 2막+3막: Three.js 뷰포트
// ═══════════════════════════════════════════════════════════════

const STATE = {
  LOADING:    'LOADING',
  ENTERED:    'ENTERED',     // 3D 조각 등장, 카메라 느린 orbit
  DIGITIZING: 'DIGITIZING',  // solid → wireframe 전환
  DISSOLVING: 'DISSOLVING',  // vertex 흩어짐
  HOLDING:    'HOLDING',     // 마우스로 수렴
  GONE:       'GONE',
};

const stageEl     = document.getElementById('stage');
const backBtn     = document.getElementById('back-btn');
const stateBadge  = document.getElementById('state-badge');
const stageMeta   = document.getElementById('stage-meta');
const massValue   = document.getElementById('mass-value');
const messagesEl  = document.getElementById('messages');

// ─── Three.js scene ───
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 0, 5.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
stageEl.appendChild(renderer.domElement);
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.inset = '0';
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
renderer.domElement.style.pointerEvents = 'none'; // 이벤트는 stageEl 에서 받음

// 조명
const ambient = new THREE.AmbientLight(0xffffff, 0.85);
scene.add(ambient);
const key = new THREE.DirectionalLight(0xffffff, 0.6);
key.position.set(2, 3, 4);
scene.add(key);
const rim = new THREE.DirectionalLight(0xaaccff, 0.4);
rim.position.set(-3, 1, -2);
scene.add(rim);

// ─── 전역 상태 ───
let currentSculpture = null;
let state = STATE.LOADING;
let stateTimer = 0;
let isHolding = false;
let holdPointNorm = { x: 0, y: 0 };  // -1..1
let mass = 0;
let massInitial = 0;
let mouseNorm = { x: 0, y: 0 };  // parallax

let reliefMesh = null;   // solid 재질 mesh
let wireMesh = null;     // wireframe LineSegments (파편 대상)
let meshGroup = null;    // 전체 묶음 (카메라 회전용)

let originalPositions = null; // Float32Array, solid mesh 원본 vertex
let displacedPositions = null; // (DISSOLVING 시 비교용)

// edge 파편 데이터
let edgeOriginalPositions = null; // wireGeo.position 의 원본 복사본
let edgeVelocities = null;        // edge 당 1개 velocity (x,y,z)
let edgeAngularVel = null;        // edge 당 회전 속도
let edgeRotation = null;          // edge 당 현재 회전

let messagesShown = new Set();
const MESSAGES = [
  { at: 3.0, text: '방치하면 흩어집니다.' },
  { at: 6.8, text: '0g의 영원함은 없습니다.' },
  { at: 10.5, text: '당신이 지켜야 합니다.' },
];

// ─── resize ───
function resize() {
  const w = stageEl.clientWidth || window.innerWidth;
  const h = stageEl.clientHeight || window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  renderer.domElement.style.width = w + 'px';
  renderer.domElement.style.height = h + 'px';
}
window.addEventListener('resize', resize);
resize(); // 초기 셋업

// ═══════════════════════════════════════════════════════════════
// Duotone 변환 — 이미지를 두 색(shadow, highlight) 사이의 그라데이션으로 매핑
// ═══════════════════════════════════════════════════════════════

function applyDuotone(imgEl, shadowRGB, highlightRGB) {
  const off = document.createElement('canvas');
  // 텍스처 메모리 적당히
  const MAX = 1024;
  const ratio = imgEl.naturalWidth / imgEl.naturalHeight;
  let w, h;
  if (ratio > 1) { w = MAX; h = Math.round(MAX / ratio); }
  else           { h = MAX; w = Math.round(MAX * ratio); }
  off.width = w;
  off.height = h;
  const c = off.getContext('2d');
  c.drawImage(imgEl, 0, 0, w, h);
  const data = c.getImageData(0, 0, w, h);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    // 밝기 0..1
    const lum = (0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]) / 255;
    // lum 을 5-pow 로 slight S-curve 줘서 contrast 올림
    const t = Math.pow(lum, 0.9);
    d[i]     = shadowRGB[0] + (highlightRGB[0] - shadowRGB[0]) * t;
    d[i + 1] = shadowRGB[1] + (highlightRGB[1] - shadowRGB[1]) * t;
    d[i + 2] = shadowRGB[2] + (highlightRGB[2] - shadowRGB[2]) * t;
  }
  c.putImageData(data, 0, 0);
  return off;
}

// ═══════════════════════════════════════════════════════════════
// Relief mesh 빌드 — 이미지를 3D displacement 로 변환
// ═══════════════════════════════════════════════════════════════

// heightmap 샘플링: 저해상도 이미지에서 각 grid vertex 의 밝기 추출
function sampleHeightmap(imageBitmapOrImg, cols, rows) {
  const off = document.createElement('canvas');
  off.width = cols;
  off.height = rows;
  const octx = off.getContext('2d');
  // 이미지를 cols×rows 로 축소해서 픽셀값 읽기
  octx.drawImage(imageBitmapOrImg, 0, 0, cols, rows);
  const data = octx.getImageData(0, 0, cols, rows).data;
  const heights = new Float32Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    heights[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255; // 0..1
  }
  return heights;
}

function buildReliefMesh(imgEl) {
  const aspect = imgEl.naturalWidth / imgEl.naturalHeight;

  // 현재 뷰포트 크기를 기준으로 plane 크기 동적 계산
  // 카메라 FOV 38° + 거리 5.5 → 화면에 보이는 월드 높이 ≈ 2 * 5.5 * tan(19°) ≈ 3.8
  const camDist = 5.5;
  const fovRad = (38 * Math.PI) / 180;
  const viewH = 2 * camDist * Math.tan(fovRad / 2); // ≈ 3.79
  const viewAspect = stageEl.clientWidth / stageEl.clientHeight;
  const viewW = viewH * viewAspect;
  // 이미지가 화면의 70% 안에 들어오도록 scale 계산
  const fit = 0.7;
  let planeW, planeH;
  if (aspect > viewAspect) {
    // 이미지가 화면보다 더 가로로 긴 경우 — 가로 기준 fit
    planeW = viewW * fit;
    planeH = planeW / aspect;
  } else {
    planeH = viewH * fit;
    planeW = planeH * aspect;
  }

  const COLS = 80, ROWS = 80; // voxel 스텝 뚜렷하게 보이도록 grid 거칠게
  const geo = new THREE.PlaneGeometry(planeW, planeH, COLS - 1, ROWS - 1);

  const hSamplesW = 120;
  const hSamplesH = Math.round(120 / aspect);
  const heights = sampleHeightmap(imgEl, hSamplesW, hSamplesH);

  // displacement 적용 + 기준 위치 보관
  const pos = geo.attributes.position;
  const displaceScale = 1.6; // voxel 스타일 — 깊이감 강하게
  const BINS = 5;             // 밝기 5단계 양자화

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const u = (x / planeW) + 0.5;
    const v = 1 - ((y / planeH) + 0.5);
    const px = Math.max(0, Math.min(hSamplesW - 1, Math.floor(u * hSamplesW)));
    const py = Math.max(0, Math.min(hSamplesH - 1, Math.floor(v * hSamplesH)));
    const h = heights[py * hSamplesW + px];
    // 5단계 step — 연속 아닌 계단식 (voxel 느낌)
    const qBin = Math.min(BINS - 1, Math.floor(h * BINS));
    const qH = qBin / (BINS - 1); // 0, 0.25, 0.5, 0.75, 1
    const z = (qH - 0.3) * displaceScale;
    pos.setZ(i, z);
  }
  geo.computeVertexNormals();

  // 원본 위치 저장 (DISSOLVING/HOLDING 용)
  originalPositions = new Float32Array(pos.array);
  displacedPositions = new Float32Array(pos.array);

  // ─── 두 가지 색온도 텍스처 ─────
  // Warm duotone: 따뜻한 시작 상태 (데이터화 전 - 오렌지/크림 LED)
  const warmCanvas = applyDuotone(imgEl, [58, 22, 8],   [255, 213, 160]); // 짙은 갈색 → 크림 오렌지
  // Cool duotone: 차가운 완료 상태 (디지털화 후 - 청록/아이보리 기술도면)
  const coolCanvas = applyDuotone(imgEl, [18, 30, 50],  [210, 225, 240]); // 딥 네이비 → 연한 시안-화이트

  const warmTex = new THREE.CanvasTexture(warmCanvas);
  const coolTex = new THREE.CanvasTexture(coolCanvas);
  warmTex.colorSpace = THREE.SRGBColorSpace;
  coolTex.colorSpace = THREE.SRGBColorSpace;

  // Solid 재질 — warm 텍스처로 시작, DIGITIZING 동안 cool 로 크로스페이드
  const solidMat = new THREE.MeshStandardMaterial({
    map: warmTex,
    roughness: 0.65,
    metalness: 0.12,
    side: THREE.DoubleSide,
    flatShading: true, // voxel 스텝의 각 면마다 음영 뚜렷하게
  });
  solidMat.userData = {
    uMix: { value: 0 },
    uCoolMap: { value: coolTex },
  };
  solidMat.onBeforeCompile = (shader) => {
    shader.uniforms.uMix = solidMat.userData.uMix;
    shader.uniforms.uCoolMap = solidMat.userData.uCoolMap;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uMix;\nuniform sampler2D uCoolMap;')
      .replace(
        '#include <map_fragment>',
        `
          #ifdef USE_MAP
            vec4 warmColor = texture2D( map, vMapUv );
            vec4 coolColor = texture2D( uCoolMap, vMapUv );
            vec4 sampledDiffuseColor = mix( warmColor, coolColor, uMix );
            diffuseColor *= sampledDiffuseColor;
          #endif
        `
      );
  };

  reliefMesh = new THREE.Mesh(geo, solidMat);

  // 폴리곤 경계 라인 — DIGITIZING 이후 서서히 드러남 (짙은 네이비)
  const edgeGeo = new THREE.EdgesGeometry(geo, 15); // 15° threshold
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0x0e1828,
    transparent: true,
    opacity: 0,
  });
  wireMesh = new THREE.LineSegments(edgeGeo, edgeMat);

  meshGroup = new THREE.Group();
  meshGroup.add(reliefMesh);
  meshGroup.add(wireMesh);
  scene.add(meshGroup);

  // ─── Edge 파편화 준비 ─────
  // wireMesh 의 EdgesGeometry position attribute 를 파편 운동에 사용
  // 각 edge = 두 vertex. 두 vertex 는 같은 velocity 로 움직여 선 형태 유지.
  // edge 개수 = position.count / 2
  const wireGeo = wireMesh.geometry;
  const wirePos = wireGeo.attributes.position;
  const edgeCount = wirePos.count / 2;

  // edge 별 원위치 보관 (복원용)
  edgeOriginalPositions = new Float32Array(wirePos.array);
  // edge 별 velocity (edge 마다 하나의 velocity 로 두 vertex 동시에 이동)
  edgeVelocities = new Float32Array(edgeCount * 3);
  edgeAngularVel = new Float32Array(edgeCount);
  edgeRotation  = new Float32Array(edgeCount);

  // 중심에서 멀어지는 방향으로 velocity 부여
  for (let e = 0; e < edgeCount; e++) {
    const ia = e * 2;
    const ib = e * 2 + 1;
    const ax = wirePos.getX(ia), ay = wirePos.getY(ia), az = wirePos.getZ(ia);
    const bx = wirePos.getX(ib), by = wirePos.getY(ib), bz = wirePos.getZ(ib);
    const mx = (ax + bx) / 2, my = (ay + by) / 2, mz = (az + bz) / 2;
    const len = Math.hypot(mx, my, mz) || 1;
    const spread = 0.6 + Math.random() * 1.2;
    edgeVelocities[e * 3]     = (mx / len) * spread + (Math.random() - 0.5) * 0.4;
    edgeVelocities[e * 3 + 1] = (my / len) * spread + (Math.random() - 0.5) * 0.4 + 0.15;
    edgeVelocities[e * 3 + 2] = (mz / len) * spread + (Math.random() - 0.5) * 0.4;
    edgeAngularVel[e] = (Math.random() - 0.5) * 3; // 회전 속도
    edgeRotation[e] = 0;
  }

  // ─── 바운딩 박스 (CAD 뷰포트 느낌) ─────
  geo.computeBoundingBox();
  const bbox = geo.boundingBox;
  const box = new THREE.Box3Helper(bbox, 0x1a2538);
  box.material.transparent = true;
  box.material.opacity = 0;
  box.material.depthTest = false;
  meshGroup.add(box);
  // userData 로 box 참조 저장해서 animate 에서 opacity 제어
  meshGroup.userData.box = box;

  // ─── CAD 속성 패널 값 채우기 ─────
  const verts = geo.attributes.position.count;
  const faces = geo.index ? geo.index.count / 3 : Math.round(verts / 3);
  const w = (bbox.max.x - bbox.min.x).toFixed(2);
  const h = (bbox.max.y - bbox.min.y).toFixed(2);
  const d = (bbox.max.z - bbox.min.z).toFixed(2);
  document.getElementById('cad-object').textContent = `SCULPT_${currentSculpture.id}`;
  document.getElementById('cad-vertices').textContent = verts.toLocaleString();
  document.getElementById('cad-faces').textContent = faces.toLocaleString();
  document.getElementById('cad-material').textContent = currentSculpture.material.toUpperCase().slice(0, 18);
  document.getElementById('cad-bound').textContent = `${w}×${h}×${d}`;

  return { planeW, planeH };
}

// ═══════════════════════════════════════════════════════════════
// 스테이지 진입/이탈
// ═══════════════════════════════════════════════════════════════

function enterStage(sculpture) {
  if (IS_THUMB) return;
  currentSculpture = sculpture;
  mass = massInitial = sculpture.mass;
  state = STATE.LOADING;
  stateTimer = 0;
  messagesShown.clear();
  messagesEl.innerHTML = '';

  stageMeta.querySelector('.artist').textContent = sculpture.artist;
  stageMeta.querySelector('.work').textContent = sculpture.work;
  stageMeta.querySelector('.year').textContent = `${sculpture.year} · ${sculpture.material}`;
  updateStateBadge();
  updateMass();

  feedEl.classList.add('hidden');
  stageEl.classList.add('active');

  // 기존 mesh 청소
  cleanupMeshes();

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    // stage 가 flex/fade-in 끝날 시간 확보 → resize 정확
    requestAnimationFrame(() => {
      resize();
      requestAnimationFrame(() => {
        buildReliefMesh(img);
        state = STATE.ENTERED;
        stateTimer = 0;
        updateStateBadge();
        if (!animating) { animating = true; lastTime = 0; animate(); }
      });
    });
  };
  img.src = `./sculptures/${sculpture.file}`;
}

function cleanupMeshes() {
  if (meshGroup) {
    scene.remove(meshGroup);
    meshGroup.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (obj.material.map) obj.material.map.dispose();
        if (obj.material.userData?.uCoolMap?.value) obj.material.userData.uCoolMap.value.dispose();
        obj.material.dispose();
      }
    });
  }
  meshGroup = null;
  reliefMesh = null;
  wireMesh = null;
  originalPositions = null;
  displacedPositions = null;
  edgeOriginalPositions = null;
  edgeVelocities = null;
  edgeAngularVel = null;
  edgeRotation = null;
}

function exitStage() {
  stageEl.classList.remove('active');
  feedEl.classList.remove('hidden');
  cleanupMeshes();
  currentSculpture = null;
  animating = false;
  isHolding = false;
}
backBtn.addEventListener('click', exitStage);

// ═══════════════════════════════════════════════════════════════
// 인터랙션
// ═══════════════════════════════════════════════════════════════

function onPointerMove(e) {
  const rect = stageEl.getBoundingClientRect();
  const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
  mouseNorm = { x: nx, y: ny };
  if (isHolding) {
    holdPointNorm = { x: nx, y: ny };
  }
}
function onPointerDown(e) {
  if (state === STATE.DISSOLVING || state === STATE.GONE) {
    isHolding = true;
    const rect = stageEl.getBoundingClientRect();
    holdPointNorm = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
    };
  }
}
function onPointerUp() {
  isHolding = false;
}
stageEl.addEventListener('pointermove', onPointerMove);
stageEl.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('pointercancel', onPointerUp);
window.addEventListener('blur', onPointerUp);
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && stageEl.classList.contains('active')) {
    e.preventDefault();
    if (state === STATE.DISSOLVING || state === STATE.GONE) {
      isHolding = true;
      if (!holdPointNorm) holdPointNorm = { x: 0, y: 0 };
    }
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') { e.preventDefault(); isHolding = false; }
});

// ═══════════════════════════════════════════════════════════════
// UI 업데이트
// ═══════════════════════════════════════════════════════════════

function updateStateBadge() {
  const labels = {
    LOADING:    '⟳ 로딩 / LOADING',
    ENTERED:    '● 물질 / SOLID',
    DIGITIZING: '▲ 데이터 전환 / DIGITIZING',
    DISSOLVING: '✕ 흩어지는 중 / DISSOLVING',
    HOLDING:    '◆ 복원 중 / HOLDING',
    GONE:       '○ 소멸됨 / 0g',
  };
  stateBadge.textContent = labels[state] || state;
  stateBadge.dataset.state = state;
  // CAD UI 표시 여부 — DIGITIZING 부터 활성
  const digi = (state === STATE.DIGITIZING);
  const digital = (state === STATE.DISSOLVING || state === STATE.HOLDING || state === STATE.GONE);
  stageEl.classList.toggle('digitizing', digi);
  stageEl.classList.toggle('digital', digital);
}

function updateMass() {
  massValue.textContent = formatMass(mass);
  massValue.classList.toggle('low', mass > 0 && mass < massInitial * 0.3);
  massValue.classList.toggle('zero', mass <= 0.0001);
}

function updateMessages() {
  for (let i = 0; i < MESSAGES.length; i++) {
    const m = MESSAGES[i];
    if (!messagesShown.has(i) && stateTimer >= m.at) {
      messagesShown.add(i);
      const el = document.createElement('div');
      el.className = 'msg';
      el.textContent = m.text;
      messagesEl.appendChild(el);
      requestAnimationFrame(() => el.classList.add('show'));
      setTimeout(() => el.classList.remove('show'), 5200);
      setTimeout(() => el.remove(), 6500);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 메인 루프
// ═══════════════════════════════════════════════════════════════

let animating = false;
let lastTime = 0;
let totalRotation = 0;

function animate(now = 0) {
  if (!animating) return;
  requestAnimationFrame(animate);

  const t = now / 1000;
  const dt = Math.min((t - lastTime) || 0.016, 0.05);
  lastTime = t;
  stateTimer += dt;

  if (!meshGroup) { renderer.render(scene, camera); return; }

  // ─── 상태 전이 ─────

  // ease functions
  const easeInOutCubic = (x) => x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x+2, 3) / 2;

  // 배경 warm/cool 전환 (stageEl 의 background-color 직접 컨트롤)
  // 현재 상태의 '디지털화 진행도' 계산
  let digiProg = 0;
  if (state === STATE.ENTERED)    digiProg = 0;
  else if (state === STATE.DIGITIZING) digiProg = easeInOutCubic(Math.min(1, stateTimer / 2.8));
  else if (state === STATE.HOLDING) {
    // 복원 중엔 HOLDING 측정치 반영 (뒤에서 restored 계산 — 여기선 대략 1)
    digiProg = 1;
  }
  else digiProg = 1;
  // warm: 크림 따뜻한 배경 (249, 240, 226), cool: 차가운 회색-화이트 (228, 234, 242)
  const bgR = Math.round(249 + (228 - 249) * digiProg);
  const bgG = Math.round(240 + (234 - 240) * digiProg);
  const bgB = Math.round(226 + (242 - 226) * digiProg);
  stageEl.style.backgroundColor = `rgb(${bgR}, ${bgG}, ${bgB})`;

  if (state === STATE.ENTERED) {
    // warm 에서 안정
    if (reliefMesh?.material?.userData?.uMix) {
      reliefMesh.material.userData.uMix.value = 0;
    }
    if (stateTimer >= 2.0) {
      state = STATE.DIGITIZING; stateTimer = 0; updateStateBadge();
    }
  } else if (state === STATE.DIGITIZING) {
    const dur = 2.8;
    const prog = easeInOutCubic(Math.min(1, stateTimer / dur));
    // warm → cool 색온도 shift
    if (reliefMesh?.material?.userData?.uMix) {
      reliefMesh.material.userData.uMix.value = prog;
    }
    // solid 는 서서히 투명화 — DIGITIZING 후반부터 확실히 사라짐
    if (reliefMesh) {
      reliefMesh.material.transparent = true;
      reliefMesh.material.opacity = 1 - prog * 0.85; // 100% → 15%
    }
    // 폴리곤 경계 라인 — 서서히 드러남, 끝에선 뼈대가 주인공
    if (wireMesh) {
      wireMesh.material.opacity = prog * 0.9;
    }
    // 바운딩 박스도 서서히 드러남
    if (meshGroup?.userData?.box) {
      meshGroup.userData.box.material.opacity = prog * 0.5;
    }
    if (stateTimer >= dur) {
      state = STATE.DISSOLVING; stateTimer = 0;
      updateStateBadge();
    }
  } else if (state === STATE.DISSOLVING) {
    if (isHolding) {
      state = STATE.HOLDING; stateTimer = 0; updateStateBadge();
    } else {
      // uMix = 1 유지 (완전 디지털화 상태)
      if (reliefMesh?.material?.userData?.uMix) {
        reliefMesh.material.userData.uMix.value = 1;
      }
      const dissolveProgress = Math.min(1, stateTimer / 3);
      // solid 는 완전 투명
      if (reliefMesh) {
        reliefMesh.material.transparent = true;
        reliefMesh.material.opacity = 0;
      }
      // wireframe edge 는 분해되면서 서서히 투명화
      if (wireMesh) {
        wireMesh.material.opacity = Math.max(0, 0.9 - dissolveProgress * 0.6);
      }
      // 바운딩 박스도 서서히 사라짐
      if (meshGroup?.userData?.box) {
        meshGroup.userData.box.material.opacity = Math.max(0, 0.5 - dissolveProgress * 0.5);
      }

      // Edge 파편 운동 — 각 edge 의 두 vertex 를 같은 velocity 로 이동
      if (wireMesh && edgeVelocities) {
        const pos = wireMesh.geometry.attributes.position;
        const edgeCount = pos.count / 2;
        for (let e = 0; e < edgeCount; e++) {
          // 중력
          edgeVelocities[e * 3 + 1] -= 0.8 * dt;
          // 회전 각도 업데이트
          edgeRotation[e] += edgeAngularVel[e] * dt;
          // 두 vertex 이동 + 회전 (edge 중점 기준)
          const ia = e * 2, ib = e * 2 + 1;
          // 중점 기준 회전은 단순화 — 실제로는 위치만 병진 이동시킴 (회전은 생략해도 케이블 파편 느낌 충분)
          const dx = edgeVelocities[e * 3] * dt;
          const dy = edgeVelocities[e * 3 + 1] * dt;
          const dz = edgeVelocities[e * 3 + 2] * dt;
          pos.setX(ia, pos.getX(ia) + dx);
          pos.setY(ia, pos.getY(ia) + dy);
          pos.setZ(ia, pos.getZ(ia) + dz);
          pos.setX(ib, pos.getX(ib) + dx);
          pos.setY(ib, pos.getY(ib) + dy);
          pos.setZ(ib, pos.getZ(ib) + dz);
        }
        pos.needsUpdate = true;
      }

      mass = Math.max(0, mass - massInitial * 0.13 * dt);
      if (mass <= 0.0001) {
        state = STATE.GONE; stateTimer = 0; updateStateBadge();
      }
    }
  } else if (state === STATE.HOLDING) {
    if (!isHolding) {
      state = STATE.DISSOLVING; stateTimer = 0; updateStateBadge();
    } else {
      // edge 파편 원위치로 수렴 (holdPoint 가까운 것부터)
      if (wireMesh && edgeOriginalPositions) {
        const pos = wireMesh.geometry.attributes.position;
        const edgeCount = pos.count / 2;
        const hx = holdPointNorm.x * 2;
        const hy = holdPointNorm.y * 1.5;

        const basePull = 4.0 * dt;
        let avg = 0;
        for (let e = 0; e < edgeCount; e++) {
          const ia = e * 2, ib = e * 2 + 1;
          const oax = edgeOriginalPositions[ia * 3];
          const oay = edgeOriginalPositions[ia * 3 + 1];
          const oaz = edgeOriginalPositions[ia * 3 + 2];
          const obx = edgeOriginalPositions[ib * 3];
          const oby = edgeOriginalPositions[ib * 3 + 1];
          const obz = edgeOriginalPositions[ib * 3 + 2];
          // edge 중점 계산 (holdPoint 근접도 기준)
          const mx = (oax + obx) / 2;
          const my = (oay + oby) / 2;
          const distFromHold = Math.hypot(mx - hx, my - hy);
          const nearBoost = 1 + Math.max(0, (1.2 - distFromHold) / 1.2) * 2.5;
          const pull = Math.min(basePull * nearBoost, 1);

          // 두 vertex 모두 원위치로 lerp
          pos.setX(ia, pos.getX(ia) + (oax - pos.getX(ia)) * pull);
          pos.setY(ia, pos.getY(ia) + (oay - pos.getY(ia)) * pull);
          pos.setZ(ia, pos.getZ(ia) + (oaz - pos.getZ(ia)) * pull);
          pos.setX(ib, pos.getX(ib) + (obx - pos.getX(ib)) * pull);
          pos.setY(ib, pos.getY(ib) + (oby - pos.getY(ib)) * pull);
          pos.setZ(ib, pos.getZ(ib) + (obz - pos.getZ(ib)) * pull);
          // velocity 감쇠
          edgeVelocities[e * 3]     *= 0.85;
          edgeVelocities[e * 3 + 1] *= 0.85;
          edgeVelocities[e * 3 + 2] *= 0.85;

          // 복원도 누적
          avg += Math.abs(pos.getX(ia) - oax) + Math.abs(pos.getY(ia) - oay);
        }
        pos.needsUpdate = true;
        avg /= edgeCount;

        // 복원도 기반 UI 업데이트
        const restored = Math.max(0, 1 - avg / 0.8);
        if (reliefMesh) {
          reliefMesh.material.opacity = restored;
          if (reliefMesh.material.userData?.uMix) {
            reliefMesh.material.userData.uMix.value = 1 - restored * 0.7;
          }
        }
        if (wireMesh) {
          wireMesh.material.opacity = Math.max(0.35, 0.9 - restored * 0.4);
        }
        if (meshGroup?.userData?.box) {
          meshGroup.userData.box.material.opacity = Math.max(0.2, restored * 0.5);
        }
      }

      mass = Math.min(massInitial, mass + massInitial * 0.17 * dt);
    }
  } else if (state === STATE.GONE) {
    if (isHolding) {
      state = STATE.HOLDING; stateTimer = 0; updateStateBadge();
    }
  }

  // ─── 카메라 회전/parallax ─────
  if (meshGroup) {
    // 기본 idle 회전 (느리게)
    totalRotation += dt * 0.15;
    const baseRotY = Math.sin(totalRotation) * 0.3;  // -17~+17도
    // 마우스 parallax (살짝 기울임)
    const targetRotY = baseRotY + mouseNorm.x * 0.15;
    const targetRotX = -mouseNorm.y * 0.1;
    meshGroup.rotation.y += (targetRotY - meshGroup.rotation.y) * 0.05;
    meshGroup.rotation.x += (targetRotX - meshGroup.rotation.x) * 0.05;
  }

  updateMass();
  updateMessages();
  renderer.render(scene, camera);
}

// 썸네일
if (IS_THUMB) {
  feedEl.style.pointerEvents = 'none';
  feedEl.style.overflow = 'hidden';
}
