// Day 10 — 파편이 맥락이 될 때
// 3D 뷰포트에서 조각 사진을 displacement relief 로 3D화 → 분해/복원 인터랙션

import * as THREE from 'https://esm.sh/three@0.160.0';
import { Line2 } from 'https://esm.sh/three@0.160.0/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'https://esm.sh/three@0.160.0/examples/jsm/lines/LineMaterial.js';
import { LineSegmentsGeometry } from 'https://esm.sh/three@0.160.0/examples/jsm/lines/LineSegmentsGeometry.js';

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

// ─── CAD 뷰포트 배경 격자 — 바닥/벽 3면 ─────
(function buildViewportGrids() {
  const gridSize = 12;
  const gridDiv = 24;
  const gridColorMajor = 0xcfd6e0;
  const gridColorMinor = 0xe6eaf0;

  // 바닥 (Y = -3)
  const gridFloor = new THREE.GridHelper(gridSize, gridDiv, gridColorMajor, gridColorMinor);
  gridFloor.position.y = -3;
  gridFloor.material.opacity = 0.55;
  gridFloor.material.transparent = true;
  scene.add(gridFloor);

  // 뒷벽 (Z = -4) — GridHelper 를 90도 회전
  const gridBack = new THREE.GridHelper(gridSize, gridDiv, gridColorMajor, gridColorMinor);
  gridBack.rotation.x = Math.PI / 2;
  gridBack.position.z = -4;
  gridBack.material.opacity = 0.4;
  gridBack.material.transparent = true;
  scene.add(gridBack);
})();

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
  // Line2 는 resolution 필요
  if (wireMesh?.material?.resolution) {
    wireMesh.material.resolution.set(w, h);
  }
}
window.addEventListener('resize', resize);
resize();

// ═══════════════════════════════════════════════════════════════
// Duotone 변환 — 원본 warm 톤 (데이터화 전)
// ═══════════════════════════════════════════════════════════════

function applyDuotone(imgEl, shadowRGB, highlightRGB) {
  const off = document.createElement('canvas');
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
    const lum = (0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]) / 255;
    const t = Math.pow(lum, 0.9);
    d[i]     = shadowRGB[0] + (highlightRGB[0] - shadowRGB[0]) * t;
    d[i + 1] = shadowRGB[1] + (highlightRGB[1] - shadowRGB[1]) * t;
    d[i + 2] = shadowRGB[2] + (highlightRGB[2] - shadowRGB[2]) * t;
  }
  c.putImageData(data, 0, 0);
  return off;
}

// ═══════════════════════════════════════════════════════════════
// CAD LED 패널 텍스처 생성 — 4단계 컬러코딩 flat 면 + LED dot grid overlay
// (B: 면이 사진이 아닌 "LED 픽셀 격자" 로 보이게)
// ═══════════════════════════════════════════════════════════════

// CAD 컬러 팔레트 — RGB 비비드 / 기능 코딩
// 밝기 구간별로 다른 "역할" 부여 (원본 색과 무관하게 CAD 렌더처럼 재분류)
const CAD_PALETTE = [
  { r:  17, g:  17, b:  17 }, // shadow — 순수 검정 (트러스/프레임)
  { r:   0, g: 214, b:  94 }, // low-mid — 비비드 그린 (케이블)
  { r: 255, g: 107, b:   0 }, // mid-high — 비비드 오렌지 (LED 모듈)
  { r:  61, g: 174, b: 221 }, // highlight — 비비드 시안 (LED 패널)
];
// 조명/신호 컬러 (케이블용)
const CAD_ACCENT = {
  magenta: { r: 255, g:   0, b: 128 },
  green:   { r:   0, g: 214, b:  94 },
  cyan:    { r:  61, g: 174, b: 221 },
  yellow:  { r: 255, g: 220, b:  20 },
};

function buildCADTexture(imgEl) {
  const off = document.createElement('canvas');
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
  const bins = CAD_PALETTE.length;
  // 1차: 밝기 양자화 → 컬러 팔레트 매핑
  for (let i = 0; i < d.length; i += 4) {
    const lum = (0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]) / 255;
    const bin = Math.min(bins - 1, Math.floor(lum * bins));
    const p = CAD_PALETTE[bin];
    d[i]     = p.r;
    d[i + 1] = p.g;
    d[i + 2] = p.b;
  }
  c.putImageData(data, 0, 0);

  // 2차: LED dot grid overlay — 작은 검은 점 격자 덮어서 픽셀 질감
  // 점 간격 6px, 점 크기 1.5px
  const DOT_STEP = 6;
  const DOT_R = 1.2;
  c.fillStyle = 'rgba(10, 15, 25, 0.55)';
  for (let y = DOT_STEP / 2; y < h; y += DOT_STEP) {
    for (let x = DOT_STEP / 2; x < w; x += DOT_STEP) {
      c.beginPath();
      c.arc(x, y, DOT_R, 0, Math.PI * 2);
      c.fill();
    }
  }
  // 3차: 밝은 영역에만 격자 가로/세로 라인 추가 (LED 프레임 느낌)
  // 단순화 — 전체에 옅은 그리드 라인 (매우 얇게)
  c.strokeStyle = 'rgba(10, 15, 25, 0.35)';
  c.lineWidth = 0.6;
  c.beginPath();
  for (let x = DOT_STEP; x < w; x += DOT_STEP * 4) {
    c.moveTo(x, 0); c.lineTo(x, h);
  }
  for (let y = DOT_STEP; y < h; y += DOT_STEP * 4) {
    c.moveTo(0, y); c.lineTo(w, y);
  }
  c.stroke();

  return off;
}

// ═══════════════════════════════════════════════════════════════
// CAD 주변 오브제 — 트러스, 케이블, LED 패널 (조각 옆에 배치)
// ═══════════════════════════════════════════════════════════════

function buildCADSurroundings(planeW, planeH) {
  const group = new THREE.Group();

  // ─── 1. 조각 뒤 트러스 격자 ─────
  // 큰 사각 프레임 + 내부 교차 bracing
  const trussMat = new THREE.LineBasicMaterial({
    color: 0x111111,
    transparent: true,
    opacity: 0,
  });
  const trussSize = Math.max(planeW, planeH) * 1.6;
  const trussZ = -0.9; // 조각 뒤
  const trussPoints = [];
  // 외곽 프레임
  const hx = trussSize / 2, hy = trussSize * 0.6 / 2;
  trussPoints.push(-hx, -hy, trussZ, hx, -hy, trussZ);
  trussPoints.push(hx, -hy, trussZ,  hx,  hy, trussZ);
  trussPoints.push(hx,  hy, trussZ, -hx,  hy, trussZ);
  trussPoints.push(-hx,  hy, trussZ, -hx, -hy, trussZ);
  // 내부 교차선 (X pattern)
  trussPoints.push(-hx, -hy, trussZ, hx,  hy, trussZ);
  trussPoints.push(-hx,  hy, trussZ, hx, -hy, trussZ);
  // 수평 3등분
  const yStep = (2 * hy) / 3;
  for (let i = 1; i < 3; i++) {
    const y = -hy + yStep * i;
    trussPoints.push(-hx, y, trussZ, hx, y, trussZ);
  }
  // 수직 4등분
  const xStep = (2 * hx) / 4;
  for (let i = 1; i < 4; i++) {
    const x = -hx + xStep * i;
    trussPoints.push(x, -hy, trussZ, x, hy, trussZ);
  }
  const trussGeo = new THREE.BufferGeometry();
  trussGeo.setAttribute('position', new THREE.Float32BufferAttribute(trussPoints, 3));
  const truss = new THREE.LineSegments(trussGeo, trussMat);
  group.add(truss);
  group.userData.truss = truss;

  // ─── 2. 화면 가장자리 LED 패널 사각 격자 ─────
  // 조각 좌우 상단에 작은 패널 2개 (기울어져 배치)
  const panelMat = new THREE.LineBasicMaterial({
    color: 0x3daedd,
    transparent: true,
    opacity: 0,
  });
  const panels = new THREE.Group();
  const panelConfigs = [
    { x: -planeW * 1.1, y:  planeH * 0.9,  z: -0.4, rotZ: -0.25, w: planeW * 0.55, h: planeH * 0.45 },
    { x:  planeW * 1.15, y:  planeH * 0.8,  z: -0.4, rotZ:  0.2,  w: planeW * 0.5,  h: planeH * 0.4 },
    { x:  planeW * 1.05, y: -planeH * 0.9,  z: -0.4, rotZ:  0.15, w: planeW * 0.45, h: planeH * 0.4 },
  ];
  for (const pc of panelConfigs) {
    const panelPoints = [];
    const ghx = pc.w / 2, ghy = pc.h / 2;
    // 외곽
    panelPoints.push(-ghx, -ghy, 0, ghx, -ghy, 0);
    panelPoints.push(ghx, -ghy, 0, ghx, ghy, 0);
    panelPoints.push(ghx, ghy, 0, -ghx, ghy, 0);
    panelPoints.push(-ghx, ghy, 0, -ghx, -ghy, 0);
    // 내부 격자 — 8x6
    const gw = 8, gh = 6;
    const gxs = pc.w / gw, gys = pc.h / gh;
    for (let i = 1; i < gw; i++) {
      const x = -ghx + gxs * i;
      panelPoints.push(x, -ghy, 0, x, ghy, 0);
    }
    for (let j = 1; j < gh; j++) {
      const y = -ghy + gys * j;
      panelPoints.push(-ghx, y, 0, ghx, y, 0);
    }
    const panelGeo = new THREE.BufferGeometry();
    panelGeo.setAttribute('position', new THREE.Float32BufferAttribute(panelPoints, 3));
    const panel = new THREE.LineSegments(panelGeo, panelMat.clone());
    panel.position.set(pc.x, pc.y, pc.z);
    panel.rotation.z = pc.rotZ;
    panels.add(panel);
  }
  group.add(panels);
  group.userData.panels = panels;

  return group;
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
  // Warm duotone: 따뜻한 시작 상태 (데이터화 전 - 오렌지/크림)
  const warmCanvas = applyDuotone(imgEl, [58, 22, 8],   [255, 213, 160]);
  // Cool CAD 텍스처: 완료 상태 (4단계 컬러코딩 + LED dot grid)
  const coolCanvas = buildCADTexture(imgEl);

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

  // 폴리곤 경계 라인 — DIGITIZING 이후 서서히 드러남
  // A: 컬러 코딩 — 각 edge vertex 의 높이(z 값, displacement) 에 따라 색상 다르게
  const edgeGeo = new THREE.EdgesGeometry(geo, 25);
  const edgeVertexCount = edgeGeo.attributes.position.count;

  // ─── Line2 로 변환 (두꺼운 선 렌더) ─────
  // LineSegmentsGeometry 는 setPositions 에 flat 배열 받음 (이미 edgeGeo.position 과 호환)
  const posArray = edgeGeo.attributes.position.array;

  // z 값 min/max (컬러 코딩용)
  let zMin = Infinity, zMax = -Infinity;
  for (let i = 0; i < edgeVertexCount; i++) {
    const z = edgeGeo.attributes.position.getZ(i);
    if (z < zMin) zMin = z;
    if (z > zMax) zMax = z;
  }
  const zRange = Math.max(0.0001, zMax - zMin);

  // 컬러 배열 (edge 당 2 vertex 같은 색)
  const colorArray = new Float32Array(edgeVertexCount * 3);
  for (let i = 0; i < edgeVertexCount; i += 2) {
    const z1 = edgeGeo.attributes.position.getZ(i);
    const z2 = edgeGeo.attributes.position.getZ(i + 1);
    const zAvg = (z1 + z2) / 2;
    const t = (zAvg - zMin) / zRange;
    const bin = Math.min(3, Math.floor(t * 4));
    const p = CAD_PALETTE[bin];
    const r = p.r / 255, g = p.g / 255, b = p.b / 255;
    colorArray[i * 3]     = r;
    colorArray[i * 3 + 1] = g;
    colorArray[i * 3 + 2] = b;
    colorArray[(i + 1) * 3]     = r;
    colorArray[(i + 1) * 3 + 1] = g;
    colorArray[(i + 1) * 3 + 2] = b;
  }

  const line2Geo = new LineSegmentsGeometry();
  line2Geo.setPositions(posArray);
  line2Geo.setColors(colorArray);

  const line2Mat = new LineMaterial({
    linewidth: 2.8,          // 픽셀 굵기 — 묵직하지만 조각 디테일 유지
    vertexColors: true,
    transparent: true,
    opacity: 0,
    resolution: new THREE.Vector2(stageEl.clientWidth, stageEl.clientHeight),
    worldUnits: false,
    dashed: false,
    alphaToCoverage: false,
  });

  wireMesh = new Line2(line2Geo, line2Mat);
  wireMesh.computeLineDistances();

  // edgeGeo 는 이제 파편 운동 레퍼런스로만 남고, 실제 렌더는 wireMesh (Line2)
  // 파편 운동을 위해 LineSegmentsGeometry 의 내부 position 을 업데이트하는 API 가 제한적이라
  // 원본 position 배열을 보관해두고 매 프레임 setPositions 로 갱신
  wireMesh.userData.livePositions = new Float32Array(posArray);

  meshGroup = new THREE.Group();
  meshGroup.add(reliefMesh);
  meshGroup.add(wireMesh);
  scene.add(meshGroup);

  // ─── Edge 파편화 준비 ─────
  // wireMesh 는 이제 Line2. 파편 운동은 livePositions 배열 직접 조작하고
  // 매 프레임 line2Geo.setPositions(livePositions) 호출
  const livePos = wireMesh.userData.livePositions;
  const edgeCount = livePos.length / 6; // 각 edge = 2 vertex * 3 float

  // edge 별 원위치 보관 (복원용)
  edgeOriginalPositions = new Float32Array(livePos);
  // edge 별 velocity (edge 마다 하나의 velocity 로 두 vertex 동시에 이동)
  edgeVelocities = new Float32Array(edgeCount * 3);
  edgeAngularVel = new Float32Array(edgeCount);
  edgeRotation  = new Float32Array(edgeCount);

  // 중심에서 멀어지는 방향으로 velocity 부여 — 천천히 부양
  for (let e = 0; e < edgeCount; e++) {
    const ax = livePos[e * 6],     ay = livePos[e * 6 + 1], az = livePos[e * 6 + 2];
    const bx = livePos[e * 6 + 3], by = livePos[e * 6 + 4], bz = livePos[e * 6 + 5];
    const mx = (ax + bx) / 2, my = (ay + by) / 2, mz = (az + bz) / 2;
    const len = Math.hypot(mx, my, mz) || 1;
    const spread = 0.22 + Math.random() * 0.45;
    edgeVelocities[e * 3]     = (mx / len) * spread + (Math.random() - 0.5) * 0.15;
    edgeVelocities[e * 3 + 1] = (my / len) * spread + (Math.random() - 0.5) * 0.15 + 0.08;
    edgeVelocities[e * 3 + 2] = (mz / len) * spread + (Math.random() - 0.5) * 0.15;
    edgeAngularVel[e] = (Math.random() - 0.5) * 1.5;
    edgeRotation[e] = 0;
  }

  // ─── 바운딩 박스 (CAD 뷰포트 느낌) ─────
  geo.computeBoundingBox();
  const bbox = geo.boundingBox;
  const box = new THREE.Box3Helper(bbox, 0x111111);
  box.material.transparent = true;
  box.material.opacity = 0;
  box.material.depthTest = false;
  meshGroup.add(box);
  // userData 로 box 참조 저장해서 animate 에서 opacity 제어
  meshGroup.userData.box = box;

  // ─── 치수선 (dimension lines) ─────
  // 바운딩 박스 하단 + 좌측에 치수선 그리기
  const dimGroup = new THREE.Group();
  const dimMat = new THREE.LineBasicMaterial({ color: 0xff0080, transparent: true, opacity: 0 });
  // 가로 치수 — 하단 extent
  const dimY = bbox.min.y - 0.12;
  const dimPts = [
    bbox.min.x, dimY - 0.04, 0,   bbox.min.x, dimY + 0.04, 0,  // 좌측 end tick
    bbox.max.x, dimY - 0.04, 0,   bbox.max.x, dimY + 0.04, 0,  // 우측 end tick
    bbox.min.x, dimY, 0,           bbox.max.x, dimY, 0,          // 가로 메인선
  ];
  // 세로 치수 — 좌측 extent
  const dimX = bbox.min.x - 0.12;
  dimPts.push(
    dimX - 0.04, bbox.min.y, 0,   dimX + 0.04, bbox.min.y, 0,
    dimX - 0.04, bbox.max.y, 0,   dimX + 0.04, bbox.max.y, 0,
    dimX, bbox.min.y, 0,           dimX, bbox.max.y, 0
  );
  const dimGeo = new THREE.BufferGeometry();
  dimGeo.setAttribute('position', new THREE.Float32BufferAttribute(dimPts, 3));
  const dimLines = new THREE.LineSegments(dimGeo, dimMat);
  dimGroup.add(dimLines);
  meshGroup.add(dimGroup);
  meshGroup.userData.dimensions = dimGroup;

  // ─── CAD 주변 오브제 (트러스, 케이블, LED 패널) ─────
  const cadGroup = buildCADSurroundings(planeW, planeH);
  meshGroup.add(cadGroup);
  meshGroup.userData.cadGroup = cadGroup;

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
  const treeSculpt = document.getElementById('tree-sculpt');
  if (treeSculpt) treeSculpt.textContent = `SCULPTURE_${currentSculpture.id}`;

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
    // warm → cool(CAD LED 면) 색온도 shift
    if (reliefMesh?.material?.userData?.uMix) {
      reliefMesh.material.userData.uMix.value = prog;
    }
    // solid (LED 면) 은 투명 안 되고 유지
    if (reliefMesh) {
      reliefMesh.material.transparent = false;
      reliefMesh.material.opacity = 1;
    }
    // wireframe edge — 서서히 드러남
    if (wireMesh) {
      wireMesh.material.opacity = prog * 0.95;
    }
    // 바운딩 박스 — 서서히 드러남
    if (meshGroup?.userData?.box) {
      meshGroup.userData.box.material.opacity = prog * 0.5;
    }
    // 치수선 — 서서히 드러남
    if (meshGroup?.userData?.dimensions) {
      meshGroup.userData.dimensions.traverse(o => {
        if (o.isLineSegments) o.material.opacity = prog * 0.7;
      });
    }
    // CAD 주변 오브제 — 서서히 드러남
    const cadGroup = meshGroup?.userData?.cadGroup;
    if (cadGroup) {
      // truss
      if (cadGroup.userData.truss) {
        cadGroup.userData.truss.material.opacity = prog * 0.55;
      }
      // panels
      if (cadGroup.userData.panels) {
        cadGroup.userData.panels.traverse(obj => {
          if (obj.isLineSegments) obj.material.opacity = prog * 0.7;
        });
      }
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
      const dissolveProgress = Math.min(1, stateTimer / 6); // 6초 기준 — 느리게
      // solid (CAD LED 면) 도 천천히 투명화
      if (reliefMesh) {
        reliefMesh.material.transparent = true;
        reliefMesh.material.opacity = Math.max(0, 1 - dissolveProgress * 0.9);
      }
      // wireframe edge 는 분해되면서 서서히 투명화
      if (wireMesh) {
        wireMesh.material.opacity = Math.max(0.2, 0.95 - dissolveProgress * 0.5);
      }
      // 바운딩 박스도 서서히 사라짐
      if (meshGroup?.userData?.box) {
        meshGroup.userData.box.material.opacity = Math.max(0, 0.5 - dissolveProgress * 0.5);
      }
      // 치수선도 같이 사라짐
      if (meshGroup?.userData?.dimensions) {
        meshGroup.userData.dimensions.traverse(o => {
          if (o.isLineSegments) o.material.opacity = Math.max(0, 0.7 - dissolveProgress * 0.7);
        });
      }
      // CAD 주변 오브제도 같이 사라짐 (느리게)
      const cadGroup2 = meshGroup?.userData?.cadGroup;
      if (cadGroup2) {
        const fade = Math.max(0, 1 - dissolveProgress * 0.7);
        if (cadGroup2.userData.truss) {
          cadGroup2.userData.truss.material.opacity = 0.55 * fade;
        }
        if (cadGroup2.userData.panels) {
          cadGroup2.userData.panels.traverse(obj => {
            if (obj.isLineSegments) obj.material.opacity = 0.7 * fade;
          });
        }
      }

      // Edge 파편 운동 — livePositions 직접 조작 후 setPositions 로 갱신
      if (wireMesh && edgeVelocities) {
        const livePos = wireMesh.userData.livePositions;
        const edgeCount = livePos.length / 6;
        for (let e = 0; e < edgeCount; e++) {
          edgeVelocities[e * 3 + 1] -= 0.3 * dt; // 중력 약함
          const dx = edgeVelocities[e * 3] * dt;
          const dy = edgeVelocities[e * 3 + 1] * dt;
          const dz = edgeVelocities[e * 3 + 2] * dt;
          // edge 당 2 vertex = 6 float
          livePos[e * 6]     += dx;
          livePos[e * 6 + 1] += dy;
          livePos[e * 6 + 2] += dz;
          livePos[e * 6 + 3] += dx;
          livePos[e * 6 + 4] += dy;
          livePos[e * 6 + 5] += dz;
        }
        wireMesh.geometry.setPositions(livePos);
      }

      mass = Math.max(0, mass - massInitial * 0.06 * dt); // 절반으로 감소 → 15초 지속
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
        const livePos = wireMesh.userData.livePositions;
        const edgeCount = livePos.length / 6;
        const hx = holdPointNorm.x * 2;
        const hy = holdPointNorm.y * 1.5;

        const basePull = 4.0 * dt;
        let avg = 0;
        for (let e = 0; e < edgeCount; e++) {
          const i6 = e * 6;
          const oax = edgeOriginalPositions[i6];
          const oay = edgeOriginalPositions[i6 + 1];
          const oaz = edgeOriginalPositions[i6 + 2];
          const obx = edgeOriginalPositions[i6 + 3];
          const oby = edgeOriginalPositions[i6 + 4];
          const obz = edgeOriginalPositions[i6 + 5];
          // edge 중점 (holdPoint 근접도 기준)
          const mx = (oax + obx) / 2;
          const my = (oay + oby) / 2;
          const distFromHold = Math.hypot(mx - hx, my - hy);
          const nearBoost = 1 + Math.max(0, (1.2 - distFromHold) / 1.2) * 2.5;
          const pull = Math.min(basePull * nearBoost, 1);

          // 두 vertex 를 원위치로 lerp
          livePos[i6]     += (oax - livePos[i6])     * pull;
          livePos[i6 + 1] += (oay - livePos[i6 + 1]) * pull;
          livePos[i6 + 2] += (oaz - livePos[i6 + 2]) * pull;
          livePos[i6 + 3] += (obx - livePos[i6 + 3]) * pull;
          livePos[i6 + 4] += (oby - livePos[i6 + 4]) * pull;
          livePos[i6 + 5] += (obz - livePos[i6 + 5]) * pull;
          // velocity 감쇠
          edgeVelocities[e * 3]     *= 0.85;
          edgeVelocities[e * 3 + 1] *= 0.85;
          edgeVelocities[e * 3 + 2] *= 0.85;

          // 복원도 누적 (첫 vertex 기준)
          avg += Math.abs(livePos[i6] - oax) + Math.abs(livePos[i6 + 1] - oay);
        }
        wireMesh.geometry.setPositions(livePos);
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
          wireMesh.material.opacity = Math.max(0.35, 0.95 - restored * 0.3);
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
