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
let wireMesh = null;     // wireframe mesh
let particleMesh = null; // DISSOLVING 단계 파편 point cloud
let meshGroup = null;    // 전체 묶음 (카메라 회전용)

let originalPositions = null; // Float32Array, 원본 vertex 위치
let displacedPositions = null; // Float32Array, displacement 적용된 위치
let particleVelocities = null; // DISSOLVING velocity

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

  const COLS = 140, ROWS = 140; // grid density
  const geo = new THREE.PlaneGeometry(planeW, planeH, COLS - 1, ROWS - 1);

  const hSamplesW = 180;
  const hSamplesH = Math.round(180 / aspect);
  const heights = sampleHeightmap(imgEl, hSamplesW, hSamplesH);

  // displacement 적용 + 기준 위치 보관
  const pos = geo.attributes.position;
  const displaceScale = 0.55; // 깊이감 강도

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // UV 좌표 기반 heightmap 샘플링
    const u = (x / planeW) + 0.5;
    const v = 1 - ((y / planeH) + 0.5);
    const px = Math.max(0, Math.min(hSamplesW - 1, Math.floor(u * hSamplesW)));
    const py = Math.max(0, Math.min(hSamplesH - 1, Math.floor(v * hSamplesH)));
    const h = heights[py * hSamplesW + px];
    // 밝을수록 앞(+z), 어두울수록 뒤(-z)
    const z = (h - 0.3) * displaceScale;
    pos.setZ(i, z);
  }
  geo.computeVertexNormals();

  // 원본 위치 저장 (DISSOLVING/HOLDING 용)
  originalPositions = new Float32Array(pos.array);
  displacedPositions = new Float32Array(pos.array);

  // 텍스처
  const tex = new THREE.Texture(imgEl);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.SRGBColorSpace;

  // Solid 재질 — 텍스처 + lambert (음영)
  const solidMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.7,
    metalness: 0.15,
    side: THREE.DoubleSide,
  });

  // Wireframe 재질 — 네온 시안
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x4ab8ff,
    wireframe: true,
    transparent: true,
    opacity: 0,
  });

  reliefMesh = new THREE.Mesh(geo, solidMat);
  wireMesh = new THREE.Mesh(geo, wireMat); // 같은 geometry 공유 (wireframe overlay)

  meshGroup = new THREE.Group();
  meshGroup.add(reliefMesh);
  meshGroup.add(wireMesh);
  scene.add(meshGroup);

  // 파티클 geometry — solid mesh vertex 와 같음, points 로 렌더
  const pGeo = geo.clone();
  // 각 vertex 색상을 텍스처에서 샘플 (DISSOLVING 파편 색으로 쓸 것)
  const colors = new Float32Array(pGeo.attributes.position.count * 3);
  // 이미지 픽셀 컬러 샘플 (저해상도)
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = hSamplesW;
  colorCanvas.height = hSamplesH;
  const cCtx = colorCanvas.getContext('2d');
  cCtx.drawImage(imgEl, 0, 0, hSamplesW, hSamplesH);
  const cData = cCtx.getImageData(0, 0, hSamplesW, hSamplesH).data;

  for (let i = 0; i < pGeo.attributes.position.count; i++) {
    const x = pGeo.attributes.position.getX(i);
    const y = pGeo.attributes.position.getY(i);
    const u = (x / planeW) + 0.5;
    const v = 1 - ((y / planeH) + 0.5);
    const px = Math.max(0, Math.min(hSamplesW - 1, Math.floor(u * hSamplesW)));
    const py = Math.max(0, Math.min(hSamplesH - 1, Math.floor(v * hSamplesH)));
    const idx = (py * hSamplesW + px) * 4;
    colors[i * 3]     = cData[idx]     / 255;
    colors[i * 3 + 1] = cData[idx + 1] / 255;
    colors[i * 3 + 2] = cData[idx + 2] / 255;
  }
  pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const pMat = new THREE.PointsMaterial({
    size: 0.025,
    vertexColors: true,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
  });
  particleMesh = new THREE.Points(pGeo, pMat);
  meshGroup.add(particleMesh);

  // DISSOLVING velocity 준비
  particleVelocities = new Float32Array(pGeo.attributes.position.count * 3);
  for (let i = 0; i < pGeo.attributes.position.count; i++) {
    const ox = pGeo.attributes.position.getX(i);
    const oy = pGeo.attributes.position.getY(i);
    const oz = pGeo.attributes.position.getZ(i);
    const len = Math.hypot(ox, oy, oz) || 1;
    const spread = 0.8 + Math.random() * 1.4;
    particleVelocities[i * 3]     = (ox / len) * spread + (Math.random() - 0.5) * 0.3;
    particleVelocities[i * 3 + 1] = (oy / len) * spread + (Math.random() - 0.5) * 0.3 + 0.2;
    particleVelocities[i * 3 + 2] = (oz / len) * spread + (Math.random() - 0.5) * 0.3;
  }

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
        obj.material.dispose();
      }
    });
  }
  meshGroup = null;
  reliefMesh = null;
  wireMesh = null;
  particleMesh = null;
  originalPositions = null;
  displacedPositions = null;
  particleVelocities = null;
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
  if (state === STATE.ENTERED) {
    if (stateTimer >= 2.0) {
      state = STATE.DIGITIZING; stateTimer = 0; updateStateBadge();
    }
  } else if (state === STATE.DIGITIZING) {
    const dur = 2.8;
    const prog = Math.min(1, stateTimer / dur);
    // solid → wireframe 크로스페이드
    if (reliefMesh) reliefMesh.material.opacity = 1;
    if (reliefMesh) {
      reliefMesh.material.transparent = true;
      // solid 는 약간 어두워지면서 80% 까지 살아있음 (완전 투명 안 됨)
      reliefMesh.material.opacity = 1 - prog * 0.4;
    }
    // wireframe 은 점점 선명해짐
    if (wireMesh) wireMesh.material.opacity = prog * 0.85;
    if (stateTimer >= dur) {
      state = STATE.DISSOLVING; stateTimer = 0;
      updateStateBadge();
      // 파티클 점점 드러나고 mesh 는 서서히 사라짐
    }
  } else if (state === STATE.DISSOLVING) {
    if (isHolding) {
      state = STATE.HOLDING; stateTimer = 0; updateStateBadge();
    } else {
      const dissolveProgress = Math.min(1, stateTimer / 3);
      if (reliefMesh) reliefMesh.material.opacity = Math.max(0, 0.6 - dissolveProgress * 0.6);
      if (wireMesh) wireMesh.material.opacity = Math.max(0, 0.85 - dissolveProgress * 0.85);
      if (particleMesh) particleMesh.material.opacity = dissolveProgress;

      // 파티클 확산 — DISSOLVING 진입 시 원위치에서 velocity 받음
      if (particleMesh && displacedPositions && particleVelocities) {
        const pos = particleMesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          particleVelocities[i * 3 + 1] -= 0.8 * dt; // gravity
          pos.setX(i, pos.getX(i) + particleVelocities[i * 3]     * dt);
          pos.setY(i, pos.getY(i) + particleVelocities[i * 3 + 1] * dt);
          pos.setZ(i, pos.getZ(i) + particleVelocities[i * 3 + 2] * dt);
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
      // 파티클 원위치로 수렴 (holdPoint 가까운 것부터)
      if (particleMesh && displacedPositions) {
        const pos = particleMesh.geometry.attributes.position;
        // holdPoint 를 mesh 공간으로 변환 (단순화: 평면 크기 기준 2.0 범위)
        const hx = holdPointNorm.x * 2;
        const hy = holdPointNorm.y * 1.5;

        const basePull = 4.0 * dt;
        for (let i = 0; i < pos.count; i++) {
          const ox = displacedPositions[i * 3];
          const oy = displacedPositions[i * 3 + 1];
          const oz = displacedPositions[i * 3 + 2];
          const d = Math.hypot(ox - hx, oy - hy);
          const nearBoost = 1 + Math.max(0, (1.2 - d) / 1.2) * 2.5;
          const pull = Math.min(basePull * nearBoost, 1);
          pos.setX(i, pos.getX(i) + (ox - pos.getX(i)) * pull);
          pos.setY(i, pos.getY(i) + (oy - pos.getY(i)) * pull);
          pos.setZ(i, pos.getZ(i) + (oz - pos.getZ(i)) * pull);
          particleVelocities[i * 3]     *= 0.85;
          particleVelocities[i * 3 + 1] *= 0.85;
          particleVelocities[i * 3 + 2] *= 0.85;
        }
        pos.needsUpdate = true;
      }
      // 복원도 측정
      let avg = 0;
      if (particleMesh && displacedPositions) {
        const pos = particleMesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          avg += Math.abs(pos.getX(i) - displacedPositions[i * 3])
               + Math.abs(pos.getY(i) - displacedPositions[i * 3 + 1]);
        }
        avg /= pos.count;
      }
      // 복원되면 solid 다시 보이게
      const restored = Math.max(0, 1 - avg / 0.8);
      if (reliefMesh) reliefMesh.material.opacity = restored * 0.9;
      if (wireMesh) wireMesh.material.opacity = Math.max(0.3, restored * 0.8);
      if (particleMesh) particleMesh.material.opacity = Math.max(0.15, 1 - restored * 0.7);

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
