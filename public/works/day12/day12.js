// Day 12 — Met Gala 2026: Fashion Is Art (v3)
// Three.js InstancedMesh 꽃 — flower.png/leaf.png alphaMap
// 마네킹 실루엣 마스크 기반, 검은 배경 없음

const IS_THUMB = new URLSearchParams(location.search).has('thumb');

// ═══════════════════════════════════════════════════════════════
// 1. Three.js 셋업
// ═══════════════════════════════════════════════════════════════

const container = document.getElementById('container');
let W = window.innerWidth, H = window.innerHeight;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(W, H);
renderer.setClearColor(0x000000, 0); // 투명 배경
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
camera.position.z = 35;

window.addEventListener('resize', () => {
  W = window.innerWidth; H = window.innerHeight;
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  renderer.setSize(W, H);
  if (mannequinReady) buildMask();
});

// ═══════════════════════════════════════════════════════════════
// 2. 마네킹 — HTML canvas로 배경에 그림
// ═══════════════════════════════════════════════════════════════

const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');

const mannequinImg = new Image();
mannequinImg.src = './Mannequin.png';
let mannequinReady = false;

// 마스크 (픽셀 단위 — 꽃 배치용)
const MASK_SCALE = 4;
let maskData = null, maskW = 0, maskH = 0;
let mBounds = { mx: 0, my: 0, mW: 0, mH: 0 };

function getMannequinBounds() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cW = W * dpr, cH = H * dpr;
  const mH = cH * 0.82;
  const mW = mH * (mannequinImg.naturalWidth / mannequinImg.naturalHeight);
  const mx = (cW - mW) / 2;
  const my = (cH - mH) / 2 + cH * 0.02;
  mBounds = { mx, my, mW, mH, cW, cH };
  return mBounds;
}

function buildMask() {
  getMannequinBounds();
  const { mx, my, mW, mH, cW, cH } = mBounds;
  maskW = Math.ceil(cW / MASK_SCALE);
  maskH = Math.ceil(cH / MASK_SCALE);
  const off = document.createElement('canvas');
  off.width = maskW; off.height = maskH;
  const oc = off.getContext('2d');
  oc.drawImage(mannequinImg, mx / MASK_SCALE, my / MASK_SCALE, mW / MASK_SCALE, mH / MASK_SCALE);
  maskData = oc.getImageData(0, 0, maskW, maskH).data;

  // 배경 캔버스에 마네킹 그리기
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  bgCanvas.width  = W * dpr;
  bgCanvas.height = H * dpr;
  bgCanvas.style.width  = W + 'px';
  bgCanvas.style.height = H + 'px';
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  bgCtx.filter = 'drop-shadow(0px 8px 32px rgba(0,0,0,0.85))';
  bgCtx.drawImage(mannequinImg, mx, my, mW, mH);
  bgCtx.filter = 'none';
}

// 마네킹 몸 위인지 (expandPx: 경계 확장 픽셀)
function isOnBody(x, y, expandPx) {
  if (!maskData) return false;
  const sx = Math.round(x / MASK_SCALE);
  const sy = Math.round(y / MASK_SCALE);
  if (!expandPx) {
    if (sx < 0 || sx >= maskW || sy < 0 || sy >= maskH) return false;
    return maskData[(sy * maskW + sx) * 4 + 3] > 40;
  }
  const ep = Math.round(expandPx / MASK_SCALE);
  for (let dy = -ep; dy <= ep; dy += 2) {
    for (let dx = -ep; dx <= ep; dx += 2) {
      const cx = sx + dx, cy = sy + dy;
      if (cx < 0 || cx >= maskW || cy < 0 || cy >= maskH) continue;
      if (maskData[(cy * maskW + cx) * 4 + 3] > 40) return true;
    }
  }
  return false;
}

// Three.js 좌표 → 픽셀 좌표 변환
function threeToPixel(tx, ty) {
  // Three.js 화면 좌표 → NDC → 픽셀
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const ndcX = tx / (W / 2);  // 대략적 변환 (camera z=35, fov=45)
  const ndcY = ty / (H / 2);
  const px = (ndcX * 0.5 + 0.5) * W * dpr;
  const py = (1 - (ndcY * 0.5 + 0.5)) * H * dpr;
  return { px, py };
}

mannequinImg.onload = () => {
  mannequinReady = true;
  buildMask();
  initParticles(0);
  animate();
};

// ═══════════════════════════════════════════════════════════════
// 3. 텍스처 로드 (GitHub raw)
// ═══════════════════════════════════════════════════════════════

const loader = new THREE.TextureLoader();
const FLOWER_URL = './flower.png';
const LEAF_URL   = './leaf.png';

const flowerTex = loader.load(FLOWER_URL);
const leafTex   = loader.load(LEAF_URL);

const particleGeo = new THREE.PlaneGeometry(1.2, 1.2);

// ShaderMaterial — alphaMap + instanceColor 동시 지원 (r128 MeshBasicMaterial 버그 우회)
const FLOWER_VERT = `
  varying vec2 vUv;
  varying vec3 vColor;
  void main() {
    vUv = uv;
    #ifdef USE_INSTANCING_COLOR
      vColor = instanceColor;
    #else
      vColor = vec3(1.0);
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;
const FLOWER_FRAG = `
  uniform sampler2D uAlpha;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vColor;
  void main() {
    float a = texture2D(uAlpha, vUv).r;
    gl_FragColor = vec4(vColor, a * uOpacity);
  }
`;

function makeFlowerMat(tex, opacity) {
  return new THREE.ShaderMaterial({
    uniforms: { uAlpha: { value: tex }, uOpacity: { value: opacity } },
    vertexShader: FLOWER_VERT,
    fragmentShader: FLOWER_FRAG,
    transparent: true,
    depthTest: false,
  });
}

// ═══════════════════════════════════════════════════════════════
// 4. 작품별 팔레트
// ═══════════════════════════════════════════════════════════════

const ARTWORKS = [
  { name: 'Monet — Water Lilies',
    // 수련 원화 구조: 상체=라벤더(하늘반영), 스커트=청회녹(물), 하단=짙은청회녹
    huesTop:  [245, 252, 238, 258, 248, 242, 255, 250, 260],
    satTop:   [0.18, 0.16, 0.20, 0.15, 0.18, 0.14, 0.16, 0.17, 0.15],
    lightTop: [0.72, 0.78, 0.68, 0.75, 0.80, 0.70, 0.74, 0.66, 0.76],
    huesBot:  [178, 185, 170, 190, 175, 182, 168, 188, 172,
               272, 265, 278, 268, 275, 262],
    satBot:   [0.22, 0.25, 0.20, 0.24, 0.22, 0.26, 0.20, 0.23, 0.24,
               0.24, 0.22, 0.26, 0.20, 0.24, 0.22],
    lightBot: [0.28, 0.32, 0.24, 0.35, 0.26, 0.30, 0.22, 0.34, 0.28,
               0.30, 0.26, 0.34, 0.28, 0.32, 0.24],
    // 수련 잎: 연두+회녹 포인트
    accentHue: 142, accentSat: 0.22, accentLight: [0.42, 0.56], accentRatio: 0.07,
    leafHue: 152, leafSat: 0.18, leafLight: [0.38, 0.50] },
  { name: 'Van Gogh — Starry Night',
    // 별이 빛나는 밤 — 밝은 코발트~거의 검정까지 명도 차이 크게
    hues: [218, 222, 215, 225, 230, 235, 240, 210, 220],
    sat:  [0.55, 0.60, 0.50, 0.58, 0.45, 0.35, 0.25, 0.65, 0.40],
    light:[0.62, 0.55, 0.68, 0.48, 0.32, 0.20, 0.14, 0.72, 0.38],
    // 노란 꽃: 작은 쫑쫑 (2%)
    accentHue: 47, accentSat: 0.68, accentLight: [0.58, 0.68], accentRatio: 0.02,
    // 큰 노랑 덩어리: extras로 별도 처리
    leafHue: 220, leafSat: 0.30, leafLight: [0.20, 0.35] },
  { name: 'Klimt — The Kiss',
    // 전체: 황금갈색+올리브골드 메인, 진황금 서브
    // huesMid 없이 단일 huesTop/huesBot 구조 — 상하 거의 동일한 골드 톤
    huesTop:  [42, 45, 38, 48, 40, 44, 36, 46, 43, 50, 41, 47],
    satTop:   [0.62, 0.68, 0.58, 0.65, 0.60, 0.70, 0.55, 0.66, 0.64, 0.72, 0.58, 0.68],
    lightTop: [0.42, 0.48, 0.38, 0.52, 0.44, 0.46, 0.36, 0.50, 0.40, 0.55, 0.38, 0.45],
    huesBot:  [40, 44, 36, 46, 38, 42, 35, 48, 41, 45, 37, 43],
    satBot:   [0.58, 0.65, 0.55, 0.62, 0.60, 0.68, 0.52, 0.64, 0.58, 0.66, 0.54, 0.62],
    lightBot: [0.32, 0.38, 0.28, 0.42, 0.34, 0.36, 0.26, 0.40, 0.30, 0.38, 0.28, 0.35],
    // 검정 accent 5%
    accentHue: 40, accentSat: 0.10, accentLight: [0.08, 0.14], accentRatio: 0.05,
    // 빨강 accent2, 파랑 accent3 — extras로 처리
    splitY: 0.50, splitTilt: 0.04,
    leafHue: 118, leafSat: 0.40, leafLight: [0.22, 0.35] },
  { name: 'Botticelli — Birth of Venus',
    hues:  [195, 200, 192, 205, 198, 188, 202, 196, 204],
    sat:   0.38,
    light: [0.58, 0.65, 0.55, 0.68, 0.60, 0.52, 0.64, 0.58, 0.62],
    accentRatio: 0,
    botticelli: true,
    leafHue: 172, leafSat: 0.35, leafLight: [0.28, 0.42] },
  { name: 'Munch — The Scream',
    // y기반 물결: 상단=빨강+주황, 중간=노랑+황금, 하단=파랑+네이비, 중앙=검정
    hues: [8, 18, 28, 42, 48, 35, 215, 22, 12, 38],
    sat:  0.82,
    light: [0.48, 0.58],
    munch: true,
    leafHue: 25, leafSat: 0.50, leafLight: [0.22, 0.35] },
];

// 드레스 타입별 영역 정의 (마네킹 높이 비율 0=머리꼭대기, 1=발끝)
// 드레스 타입 정의
// yStart/yEnd: 꽃 Y 범위 (마네킹 비율, 0=머리, 1=발)
// waistY: 허리 위치 비율
// xTopRatio/xWaistRatio/xBotRatio: 각 위치 X 폭 (마네킹 폭 대비)
// arms: true면 팔 포함 (마스크 그대로), false면 몸통만
// extras: 특수 파티클 (트레인, 깃 등)
const DRESS_TYPES = [
  // 0: Monet — 오픈숄더 + 벨 스커트 (팔 끝 제외, 모자 없음)
  { yStart: 0.22, yEnd: 1.0, waistY: 0.38,
    xTopRatio: 0.52, xWaistRatio: 0.90, xBotRatio: 2.2,
    arms: false, scaleTop: 0.8, scaleBot: 2.0,
    extras: null },

  // 1: Van Gogh — 민소매 + 긴 치마 (팔 없음)
  { yStart: 0.22, yEnd: 1.0, waistY: 0.42,
    xTopRatio: 0.45, xWaistRatio: 0.50, xBotRatio: 1.3,
    arms: false, scaleTop: 0.8, scaleBot: 1.4,
    // 큰 노랑 덩어리: 상체 중앙 + 스커트 포인트 2~3곳
    extras: { type: 'vangogh_stars', count: 4 } },

  // 2: Klimt — 일자 슬림 드레스 (튜브탑 스타일)
  { yStart: 0.22, yEnd: 1.0, waistY: 0.42,
    xTopRatio: 0.38, xWaistRatio: 0.42, xBotRatio: 0.48,
    arms: false, scaleTop: 0.85, scaleBot: 1.0,
    trainRight: false,
    extras: null },

  // 3: Botticelli — 볼륨 미니 드레스 (어깨 드러냄, 짧은 치마)
  { yStart: 0.28, yEnd: 0.72, waistY: 0.38,
    xTopRatio: 0.42, xWaistRatio: 0.60, xBotRatio: 1.60,
    arms: false, scaleTop: 0.9, scaleBot: 1.6,
    extras: null },

  // 4: Mondrian — 짧은 미니 드레스 (깃 없음)
  { yStart: 0.24, yEnd: 0.65, waistY: 0.38,
    xTopRatio: 0.48, xWaistRatio: 0.52, xBotRatio: 0.80,
    arms: false, scaleTop: 0.9, scaleBot: 1.0,
    extras: null },
];

// 각 작품에 드레스 타입 매핑
const ARTWORK_DRESS = [0, 1, 2, 3, 4];

let particles = [];
let flowerMesh = null, leafMesh = null;
// 크로스페이드용 다음 옷 파티클
let nextParticles = [];
let nextFlowerMesh = null, nextLeafMesh = null;
let crossfading = false;
const dummy = new THREE.Object3D();
let currentArtwork = 0;

const PHASE_BLOOM = 0.8;
const PHASE_HOLD  = 2.5;
const PHASE_WILT  = 0.6;
const PHASE_TOTAL = PHASE_BLOOM + PHASE_HOLD + PHASE_WILT;
let phaseTimer = 0;

// Three.js 좌표계에서 마네킹 범위 계산
function getManBoundsScene() {
  // 픽셀 → Three.js 좌표 (camera z=35, fov=45)
  const fov = camera.fov * Math.PI / 180;
  const visH = 2 * Math.tan(fov / 2) * camera.position.z;
  const visW = visH * (W / H);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const { mx, my, mW, mH, cW, cH } = mBounds;

  // 픽셀 → 0~1 정규화 → Three.js 좌표
  const left   = (mx / cW - 0.5) * visW;
  const right  = ((mx + mW) / cW - 0.5) * visW;
  const top    = (0.5 - my / cH) * visH;
  const bottom = (0.5 - (my + mH) / cH) * visH;

  return { left, right, top, bottom, visW, visH };
}

function initParticles(artIdx) {
  const art   = ARTWORKS[artIdx];
  const dress = DRESS_TYPES[ARTWORK_DRESS[artIdx]];
  particles = [];

  if (!mannequinReady) return;
  const bounds = getManBoundsScene();
  const mH  = bounds.top - bounds.bottom;
  const mW  = bounds.right - bounds.left;
  const mCX = (bounds.left + bounds.right) / 2;

  // 드레스 Y 범위 (비율 → Three.js 좌표, top=위)
  const dressTop    = bounds.top - mH * dress.yStart;
  const dressBottom = bounds.top - mH * dress.yEnd;

  // ── Monet 전용: Voronoi 세그먼트 시드 생성 ──
  let voronoiSeeds = null;
  if (artIdx === 0 && art.huesTop && art.huesBot) {  // artIdx 0 = Monet만
    voronoiSeeds = [];

    const lavPal = {
      hues:  [245, 252, 238, 258, 248, 242, 255, 250, 260, 235, 265],
      sats:  [0.13, 0.11, 0.15, 0.10, 0.13, 0.09, 0.12, 0.11, 0.14, 0.09, 0.12],
      lights:[0.80, 0.86, 0.74, 0.82, 0.88, 0.78, 0.84, 0.76, 0.80, 0.90, 0.72],
    };
    const greenPal = {
      hues:  [175, 182, 168, 188, 172, 178, 165],
      sats:  [0.18, 0.20, 0.16, 0.19, 0.17, 0.18, 0.16],
      lights:[0.34, 0.38, 0.30, 0.40, 0.32, 0.36, 0.28],
    };
    const purplePal = {
      hues:  [268, 275, 260, 272, 265, 278],
      sats:  [0.18, 0.20, 0.16, 0.19, 0.17, 0.21],
      lights:[0.34, 0.38, 0.30, 0.36, 0.32, 0.40],
    };

    // 라벤더 시드 10개 — 전체 영역
    for (let i = 0; i < 10; i++) {
      voronoiSeeds.push({
        sx: mCX + (Math.random() - 0.5) * mW * 1.8,
        sy: dressBottom + Math.random() * (dressTop - dressBottom),
        pal: lavPal,
      });
    }
    // 짙은 색 시드 정확히 2개 — 스커트 하단 절반에만
    const darkPals = [greenPal, purplePal];
    for (let i = 0; i < 2; i++) {
      voronoiSeeds.push({
        sx: mCX + (Math.random() - 0.5) * mW * 1.4,
        sy: dressBottom + Math.random() * (dressTop - dressBottom) * 0.45,
        pal: darkPals[i],
      });
    }
  }

  const count = 900;
  let attempts = 0;

  while (particles.length < count && attempts < 18000) {
    attempts++;

    const ty = dressBottom + Math.random() * (dressTop - dressBottom);
    const yRatio = (dressTop - dressBottom) > 0
      ? (ty - dressBottom) / (dressTop - dressBottom) : 0.5;

    const waistRatio = 1.0 - dress.waistY;  // yRatio 기준: 0=하체, 1=상체
    // waistY=0.50 → waistRatio=0.50: yRatio < 0.50 = 스커트(하체)
    let xRatio;
    if (yRatio > waistRatio) {
      // 상체
      const t = (yRatio - waistRatio) / (1.0 - waistRatio);
      xRatio = dress.xWaistRatio + (dress.xTopRatio - dress.xWaistRatio) * t;
    } else {
      // 스커트: 이차함수로 아래로 갈수록 급격히 넓어짐
      const t = 1.0 - (yRatio / waistRatio);  // 0=허리, 1=발끝
      xRatio = dress.xWaistRatio + (dress.xBotRatio - dress.xWaistRatio) * (t * t);
    }

    const xHalf = mW * 0.5 * xRatio;
    const tx    = mCX + (Math.random() - 0.5) * xHalf * 2;

    const { cW, cH } = mBounds;
    const px = ((tx / bounds.visW) + 0.5) * cW;
    const py = (0.5 - (ty / bounds.visH)) * cH;

    const isSkirt = yRatio < waistRatio;

    if (isSkirt) {
      // 스커트: xRatio 범위 안에 있으면 OK (벨 스커트는 마네킹 밖으로 퍼짐)
      const xHalfSkirt = mW * 0.5 * xRatio;
      if (tx < mCX - xHalfSkirt || tx > mCX + xHalfSkirt) continue;
      // 화면 밖 제외
      if (py < 0 || py > mBounds.cH * 1.05) continue;
    } else {
      // 상체: arms=true면 마스크 그대로, false면 몸통 중심만
      if (dress.arms) {
        // expand 8px — 마네킹 경계 근처도 허용해서 빈 곳 채움
        if (!isOnBody(px, py, W * 0.025)) continue;
      } else {
        const bodyXHalf = mW * 0.5 * dress.xTopRatio;
        if (Math.abs(tx - mCX) > bodyXHalf) continue;
        if (!isOnBody(px, py, W * 0.008)) continue;
      }
    }

    const scaleMult = dress.scaleTop + (dress.scaleBot - dress.scaleTop) * (1 - yRatio);
    // 하복부~허벅지 구간(yRatio 0.15~0.60) 꽃 크기 보너스 — 더 강하게
    const midBonus = (yRatio > 0.15 && yRatio < 0.60)
      ? 1.0 + (1 - Math.abs(yRatio - 0.38) / 0.23) * 1.2
      : 1.0;
    const finalScale = scaleMult * midBonus;

    const isLeaf = false;
    let hue, sat, lightness;

    if (isLeaf) {
      hue = art.leafHue + (Math.random() - 0.5) * 15;
      sat = art.leafSat;
      const [lLo, lHi] = art.leafLight;
      lightness = lLo + Math.random() * (lHi - lLo);
    } else if (art.huesTop) {
      // 상체/하체 색상 분기
      const tiltOffset = (tx - mCX) / mW * (art.splitTilt || 0.08);

      let hues, sats, lights;

      if (art.huesMid && art.satMid) {
        // Klimt: 3구간 (하단=녹색, 중간=갈색, 상단=황금)
        const splitBase = (art.splitY || 0.18) + tiltOffset;
        const midLo = splitBase;
        const midHi = splitBase + 0.22;  // 갈색 구간 좁게 — 황금이 더 넓게
        if (yRatio < midLo) {
          hues = art.huesBot; sats = art.satBot; lights = art.lightBot;
        } else if (yRatio < midHi) {
          hues = art.huesMid; sats = art.satMid; lights = art.lightMid;
        } else {
          hues = art.huesTop; sats = art.satTop; lights = art.lightTop;
        }
      } else if (voronoiSeeds && artIdx === 0) {
        // Monet: Voronoi 세그먼트 — 가장 가까운 시드의 팔레트 사용
        // 단, 상체(허리 위)는 무조건 라벤더
        const waistR = 1.0 - dress.waistY;
        const isBodyTop = yRatio > waistR;

        if (isBodyTop) {
          // 상체: 항상 밝은 라벤더
          hues = art.huesTop; sats = art.satTop; lights = art.lightTop;
        } else {
          let minDist = Infinity, nearPal = voronoiSeeds[0].pal;
          for (const seed of voronoiSeeds) {
            const dx = (tx - seed.sx) / (mW * 1.2);
            const dy = (ty - seed.sy) / (mH * 0.6);
            const d  = dx * dx + dy * dy;
            if (d < minDist) { minDist = d; nearPal = seed.pal; }
          }
          hues = nearPal.hues; sats = nearPal.sats; lights = nearPal.lights;
        }
      } else {
        // 기본 2구간 보간 (Monet splitY 있을 때)
        const splitLo = art.splitY ? art.splitY - 0.15 + tiltOffset : 0.20;
        const splitHi = art.splitY ? art.splitY + 0.15 + tiltOffset : 0.70;
        const topProb = Math.min(1, Math.max(0, (yRatio - splitLo) / (splitHi - splitLo)));
        const useTop  = Math.random() < topProb;
        hues   = useTop ? art.huesTop  : art.huesBot;
        sats   = useTop ? art.satTop   : art.satBot;
        lights = useTop ? art.lightTop : art.lightBot;
      }

      if (art.accentHue && Math.random() < (art.accentRatio || 0)) {
        hue       = art.accentHue + (Math.random() - 0.5) * 8;
        sat       = art.accentSat;
        const [aLo, aHi] = art.accentLight;
        lightness = aLo + Math.random() * (aHi - aLo);
      } else if (hues && hues.length) {
        const idx = Math.floor(Math.random() * hues.length);
        hue       = hues[idx]   + (Math.random() - 0.5) * 18;
        sat       = sats[idx]   + (Math.random() - 0.5) * 0.05;
        lightness = lights[idx] + (Math.random() - 0.5) * 0.06;
        // Klimt 전용: 빨강(3%), 파랑(2%), 초록(3%) 간헐적 포인트
        if (art.name && art.name.includes('Klimt')) {
          const roll = Math.random();
          if (roll < 0.03) { hue = 4 + Math.random()*8; sat = 0.80; lightness = 0.35 + Math.random()*0.10; }
          else if (roll < 0.05) { hue = 215 + Math.random()*15; sat = 0.70; lightness = 0.30 + Math.random()*0.12; }
          else if (roll < 0.08) { hue = 118 + Math.random()*15; sat = 0.45; lightness = 0.22 + Math.random()*0.14; }
        }
      } else {
        hue = 270; sat = 0.2; lightness = 0.75;
      }
    } else if (Array.isArray(art.sat)) {
      // hues/sat/light 배열 — Van Gogh는 소용돌이 노이즈, noSwirl이면 단순 인덱스
      const idx = Math.floor(Math.random() * art.hues.length);
      hue = art.hues[idx] + (Math.random() - 0.5) * 12;
      sat = art.sat[idx]  + (Math.random() - 0.5) * 0.05;
      if (art.noSwirl) {
        if (art.greenZone) {
          const waistR = 1.0 - dress.waistY;
          const yFromBottom = yRatio / waistR;  // 0=발끝, 1=허리
          const isSkirtArea = yRatio < waistR;  // 스커트 영역만

          if (isSkirtArea) {
            const nx = (tx - mCX) / (mW * 0.5);
            const noiseVal = Math.sin(nx * 3.1 + 1.2) * Math.sin(yFromBottom * 4.5 + 0.7) * 0.5 + 0.5;

            // 하단 40%: 진녹+진보라 덩어리
            const darkProb = yFromBottom < 0.40
              ? (1 - yFromBottom / 0.40) * 0.60 * noiseVal
              : 0;
            // 하단 70%: 연한 녹색 포인트
            const lightGreenProb = yFromBottom < 0.70 ? 0.08 : 0;

            const roll = Math.random();
            if (roll < darkProb * 0.5) {
              // 진녹색 — 현재 보라 톤과 비슷한 명채도
              hue = 152 + Math.random() * 22;
              sat = 0.20 + Math.random() * 0.10;
              lightness = 0.38 + Math.random() * 0.14;
            } else if (roll < darkProb) {
              // 진보라 — 현재 청보라보다 채도/명도 낮게
              hue = 255 + Math.random() * 20;
              sat = 0.22 + Math.random() * 0.10;
              lightness = 0.35 + Math.random() * 0.14;
            } else if (roll < darkProb + lightGreenProb) {
              // 연한 녹색 포인트 (스커트 전체)
              hue = 148 + Math.random() * 25;
              sat = 0.14 + Math.random() * 0.08;
              lightness = 0.60 + Math.random() * 0.14;
            } else {
              const lLo = Math.min(...art.light), lHi = Math.max(...art.light);
              lightness = art.light[idx] + (Math.random() - 0.5) * 0.08;
              lightness = Math.max(lLo - 0.05, Math.min(lHi + 0.05, lightness));
            }
          } else {
            // 상체: 청보라만, 녹색 없음
            const lLo = Math.min(...art.light), lHi = Math.max(...art.light);
            lightness = art.light[idx] + (Math.random() - 0.5) * 0.08;
            lightness = Math.max(lLo - 0.05, Math.min(lHi + 0.05, lightness));
          }
        } else {
          const lLo = Math.min(...art.light), lHi = Math.max(...art.light);
          lightness = art.light[idx] + (Math.random() - 0.5) * 0.08;
          lightness = Math.max(lLo - 0.05, Math.min(lHi + 0.05, lightness));
        }
      } else {
        // 소용돌이 노이즈 (Van Gogh)
        const dx = tx - mCX;
        const dy = ty - (bounds.top + bounds.bottom) * 0.5;
        const angle = Math.atan2(dy, dx);
        const dist  = Math.sqrt(dx*dx + dy*dy) / (mW * 0.5);
        const swirlNoise = Math.sin(angle * 2.5 + dist * 4.0) * 0.18;
        const randNoise  = (Math.random() - 0.5) * 0.14;
        lightness = Math.max(0.10, Math.min(0.80, art.light[idx] + swirlNoise + randNoise));
      }
    } else if (art.munch) {
      // Munch — 절규: y기반 물결 + 중앙 검정
      const xNorm = (tx - mCX) / (mW * 0.5);
      // 중앙 인물: 검정
      if (Math.abs(xNorm) < 0.22 && Math.random() < 0.55) {
        hue = 20 + Math.random() * 15;
        sat = 0.20 + Math.random() * 0.15;
        lightness = 0.06 + Math.random() * 0.08;
      } else {
        const swirlNoise = Math.sin(xNorm * 4.0 + yRatio * 6.0) * 0.12;
        if (yRatio > 0.65) {
          hue = 5 + Math.random() * 25 + swirlNoise * 20;
          sat = 0.80 + Math.random() * 0.12;
          lightness = 0.45 + Math.random() * 0.15 + swirlNoise;
        } else if (yRatio > 0.35) {
          hue = 30 + Math.random() * 22 + swirlNoise * 15;
          sat = 0.75 + Math.random() * 0.15;
          lightness = 0.48 + Math.random() * 0.18 + swirlNoise;
        } else {
          if (Math.random() < 0.35) {
            hue = 210 + Math.random() * 18;
            sat = 0.55 + Math.random() * 0.18;
            lightness = 0.28 + Math.random() * 0.16;
          } else {
            hue = 18 + Math.random() * 18;
            sat = 0.50 + Math.random() * 0.18;
            lightness = 0.22 + Math.random() * 0.16;
          }
        }
      }
    } else if (art.botticelli) {
      const xNorm2 = (tx - mCX) / (mW * 0.5);
      const waistR = 1.0 - dress.waistY;
      const yFromBottom = yRatio / waistR;
      const isUpper = yRatio > waistR;
      const ivoryBleed = Math.max(0, (yFromBottom - 0.75) / 0.25);

      if (isUpper) {
        if (Math.abs(xNorm2) < 0.45 && Math.random() < 0.40) {
          hue = 38 + Math.random() * 14; sat = 0.18 + Math.random() * 0.12; lightness = 0.84 + Math.random() * 0.08;
        } else {
          hue = 192 + Math.random() * 16; sat = 0.28 + Math.random() * 0.12; lightness = 0.68 + Math.random() * 0.12;
        }
      } else {
        if (ivoryBleed > 0 && Math.abs(xNorm2) < 0.50 && Math.random() < ivoryBleed * 0.55) {
          hue = 38 + Math.random() * 14; sat = 0.18 + Math.random() * 0.12; lightness = 0.82 + Math.random() * 0.10;
        } else if ((yFromBottom < 0.22 || xNorm2 < -0.25) && Math.random() < 0.35) {
          hue = 170 + Math.random() * 16; sat = 0.35 + Math.random() * 0.18; lightness = 0.07 + Math.random() * 0.08;
        } else if (xNorm2 > 0.30 && Math.random() < 0.15) {
          hue = 2 + Math.random() * 12; sat = 0.55 + Math.random() * 0.15; lightness = 0.42 + Math.random() * 0.14;
        } else if (Math.random() < 0.18) {
          hue = 168 + Math.random() * 18; sat = 0.22 + Math.random() * 0.14; lightness = 0.72 + Math.random() * 0.14;
        } else {
          hue = 168 + Math.random() * 18; sat = 0.40 + Math.random() * 0.16; lightness = 0.38 + Math.random() * 0.16;
        }
      }
    } else {
      hue = art.hues[Math.floor(Math.random() * art.hues.length)] + (Math.random() - 0.5) * 12;
      sat = art.sat;
      const [lLo, lHi] = art.light;
      lightness = lLo + Math.random() * (lHi - lLo);
    }

    particles.push({
      type: isLeaf ? 1 : 0,
      x: tx, y: ty,
      z: (Math.random() - 0.5) * 0.3,
      hue, sat, lightness,
      scale: 0,
      maxScale: isLeaf
        ? (0.35 + 0.5 * Math.pow(Math.random(), 3)) * finalScale
        : (0.55 + 0.85 * Math.pow(Math.random(), 2)) * finalScale,
      deltaScale: 0.04 + 0.08 * Math.random(),
      isGrowing: true,
      toDelete: false,
      age: Math.PI * Math.random(),
      ageDelta: 0.01 + 0.02 * Math.random(),
      rotZ: (Math.random() - 0.5) * Math.PI,
      birthDelay: Math.random() * PHASE_BLOOM * 0.7,
      depth: ty,
    });
  }

  particles.sort((a, b) => a.depth - b.depth);

  // extras 파티클 추가 (트레인, 깃, vangogh_stars)
  if (dress.extras) {
    const ex = dress.extras;

    // Van Gogh 큰 노랑 덩어리 — 별처럼 특정 위치에 클러스터
    if (ex.type === 'monet_green') {
      // 진녹색 비정형 물결 클러스터 — sin 파형으로 스커트 하단에 불규칙하게
      const hemY   = bounds.top - mH * dress.yEnd;   // 스커트 발끝
      const waveCount = 120;
      for (let wi = 0; wi < waveCount; wi++) {
        // x: 스커트 전체 폭에 고르게
        const xP  = (Math.random() - 0.5) * 2;  // -1 ~ 1
        const tx3 = mCX + xP * mW * 1.0;

        // y: sin 파형 기반 — 위치마다 다른 높이로 물결
        const wave1 = Math.sin(xP * Math.PI * 2.5 + 0.8) * mH * 0.08;
        const wave2 = Math.sin(xP * Math.PI * 4.0 + 2.1) * mH * 0.05;
        const wave3 = Math.sin(xP * Math.PI * 1.3 + 0.3) * mH * 0.06;
        const baseY = hemY + mH * 0.05;  // 발끝보다 살짝 위
        const ty3   = baseY + wave1 + wave2 + wave3 + (Math.random() - 0.5) * mH * 0.06;

        // 화면 밖 제외
        const { cH: cH3 } = mBounds;
        const py3 = (0.5 - (ty3 / bounds.visH)) * cH3;
        if (py3 < 0 || py3 > cH3 * 1.1) continue;

        // 진녹색 — 채도 있게, 명도 낮게
        const greenHues = [155, 148, 162, 140, 158, 145, 165, 152];
        const hue3 = greenHues[Math.floor(Math.random() * greenHues.length)] + (Math.random() - 0.5) * 10;
        const sat3 = 0.32 + Math.random() * 0.15;
        const light3 = 0.22 + Math.random() * 0.18;

        particles.push({
          type: 0,  // 꽃 텍스처 (잎보다 덜 눈에 띔)
          x: tx3, y: ty3, z: (Math.random() - 0.5) * 0.3,
          hue: hue3, sat: sat3, lightness: light3,
          scale: 0, maxScale: 0.6 + Math.random() * 0.8,
          deltaScale: 0.04 + 0.06 * Math.random(),
          isGrowing: true, toDelete: false,
          age: Math.PI * Math.random(), ageDelta: 0.01 + 0.02 * Math.random(),
          rotZ: (Math.random() - 0.5) * Math.PI,
          birthDelay: Math.random() * PHASE_BLOOM * 0.6,
          depth: ty3, isExtra: true,
        });
      }
    } else if (ex.type === 'hat') {
      // 플로피햇: 챙(넓고 납작) + 크라운(챙 위에 봉긋)
      // 마네킹 머리: bounds.top에서 약간 아래 (yStart=0.22 기준 머리는 0~0.12)
      const headY  = bounds.top - mH * 0.10;  // 챙이 놓일 Y (머리 중심)
      const crownY = bounds.top - mH * 0.04;  // 크라운 중심 (챙보다 위)

      // 챙: headY 기준 넓고 납작한 타원 — 꽉 채움
      for (let hi = 0; hi < 120; hi++) {
        const r   = mW * 0.38 * Math.sqrt(Math.random());
        const a   = Math.random() * Math.PI * 2;
        const tx3 = mCX + Math.cos(a) * r;
        const ty3 = headY + Math.sin(a) * r * 0.22;  // 납작하게 (너무 납작하면 날개처럼 보임)
        const hue3   = art.huesTop[Math.floor(Math.random()*art.huesTop.length)] + (Math.random()-0.5)*12;
        const sat3   = art.satTop[0] + 0.04;
        const light3 = art.lightTop[0] - 0.02;
        particles.push({
          type: 0, x: tx3, y: ty3, z: 0,
          hue: hue3, sat: sat3, lightness: light3,
          scale: 0, maxScale: 0.50 + Math.random()*0.40,
          deltaScale: 0.05, isGrowing: true, toDelete: false,
          age: Math.PI*Math.random(), ageDelta: 0.015,
          rotZ: (Math.random()-0.5)*Math.PI,
          birthDelay: Math.random()*PHASE_BLOOM*0.4,
          depth: ty3 - 0.1, isExtra: true,
        });
      }

      // 크라운: 챙 위(crownY)에 작고 둥근 덩어리 — 챙보다 위에 위치
      for (let hi = 0; hi < 45; hi++) {
        const r   = mW * 0.10 * Math.sqrt(Math.random());
        const a   = Math.random() * Math.PI * 2;
        const tx3 = mCX + Math.cos(a) * r;
        const ty3 = crownY + Math.sin(a) * r * 0.75;  // 거의 원형
        const hue3   = art.huesTop[Math.floor(Math.random()*art.huesTop.length)] + (Math.random()-0.5)*12;
        const sat3   = art.satTop[0] + 0.08;
        const light3 = art.lightTop[0] - 0.06;
        particles.push({
          type: 0, x: tx3, y: ty3, z: 0.3,
          hue: hue3, sat: sat3, lightness: light3,
          scale: 0, maxScale: 0.38 + Math.random()*0.28,
          deltaScale: 0.05, isGrowing: true, toDelete: false,
          age: Math.PI*Math.random(), ageDelta: 0.015,
          rotZ: (Math.random()-0.5)*Math.PI,
          birthDelay: Math.random()*PHASE_BLOOM*0.4,
          depth: ty3, isExtra: true,
        });
      }
    } else if (ex.type === 'vangogh_stars') {      const starCount = ex.count || 4;
      // 별 위치: 상체 중앙, 어깨, 스커트 2곳
      const starPositions = [
        { ty: bounds.top - mH * 0.30, tx: mCX + mW * 0.05 },   // 상체 중앙
        { ty: bounds.top - mH * 0.55, tx: mCX - mW * 0.15 },   // 스커트 왼쪽
        { ty: bounds.top - mH * 0.70, tx: mCX + mW * 0.20 },   // 스커트 오른쪽
        { ty: bounds.top - mH * 0.80, tx: mCX - mW * 0.05 },   // 스커트 하단
      ];
      starPositions.slice(0, starCount).forEach(pos => {
        // 각 별 위치 주변에 큰 노랑 1개 + 작은 노랑 3~5개
        const clusterSizes = [1.8, 0.6, 0.5, 0.4, 0.45];
        clusterSizes.forEach((sc, ci) => {
          const jx = ci === 0 ? 0 : (Math.random()-0.5) * mW * 0.18;
          const jy = ci === 0 ? 0 : (Math.random()-0.5) * mH * 0.08;
          particles.push({
            type: 0,
            x: pos.tx + jx, y: pos.ty + jy,
            z: (Math.random()-0.5)*0.3,
            hue: 47 + (Math.random()-0.5)*8,
            sat: 0.65, lightness: 0.60 + Math.random()*0.08,
            scale: 0, maxScale: sc,
            deltaScale: 0.04+0.06*Math.random(),
            isGrowing: true, toDelete: false,
            age: Math.PI*Math.random(), ageDelta: 0.01+0.02*Math.random(),
            rotZ: (Math.random()-0.5)*Math.PI,
            birthDelay: Math.random()*PHASE_BLOOM*0.5,
            depth: pos.ty + jy, isExtra: true,
          });
        });
      });
      // 왼쪽 치마에 블랙 클러스터 추가
      const blackPositions = [
        { ty: bounds.top - mH * 0.60, tx: mCX - mW * 0.08 },
        { ty: bounds.top - mH * 0.72, tx: mCX - mW * 0.12 },
        { ty: bounds.top - mH * 0.82, tx: mCX - mW * 0.06 },
      ];
      blackPositions.forEach(pos => {
        const clusterSizes = [1.4, 1.2, 1.0, 0.9, 1.1, 0.8];
        clusterSizes.forEach((sc, ci) => {
          const jx = (Math.random() - 0.5) * mW * 0.22;
          const jy = (Math.random() - 0.5) * mH * 0.06;
          particles.push({
            type: 0,
            x: pos.tx + jx, y: pos.ty + jy,
            z: (Math.random() - 0.5) * 0.3,
            hue: 220 + (Math.random() - 0.5) * 15,
            sat: 0.25 + Math.random() * 0.15,
            lightness: 0.08 + Math.random() * 0.08,  // 거의 블랙
            scale: 0, maxScale: sc,
            deltaScale: 0.04 + 0.06 * Math.random(),
            isGrowing: true, toDelete: false,
            age: Math.PI * Math.random(), ageDelta: 0.01 + 0.02 * Math.random(),
            rotZ: (Math.random() - 0.5) * Math.PI,
            birthDelay: Math.random() * PHASE_BLOOM * 0.5,
            depth: pos.ty + jy, isExtra: true,
          });
        });
      });

    } else {
    const exTop    = bounds.top - mH * ex.yStart;
    const exBottom = bounds.top - mH * ex.yEnd;
    const exCount  = 280;  // 트레인 꽃 많이
    let exAttempts = 0;

    while (exAttempts < 3000 && particles.filter(p=>p.isExtra).length < exCount) {      exAttempts++;
      const ty2 = exBottom + Math.random() * (exTop - exBottom);

      let tx2;
      if (ex.type === 'train') {
        // 트레인: 치마 왼쪽 하단에서 시작 → 오른쪽 아래로 포물선으로 흘러내림
        // 시작점: 치마 왼쪽 하단 (mCX - mW*0.3, dressHemY)
        // 끝점: 오른쪽 아래 (mCX + mW*0.8, dressHemY - mH*0.25)
        const dressHemY = bounds.top - mH * dress.yEnd;

        const xProgress = Math.random();  // 0=시작, 1=끝
        const startX = mCX - mW * 0.30;
        const endX   = mCX + mW * 0.85;
        const tx2    = startX + xProgress * (endX - startX);

        // Y: 포물선 — 시작은 치마 발끝, 끝으로 갈수록 아래로 처짐
        const sag      = xProgress * xProgress * mH * 0.22;  // 포물선 처짐
        const spread   = mH * 0.06 * (1 - xProgress * 0.6);  // 두께 (끝으로 갈수록 좁아짐)
        const ty2final = dressHemY - sag + (Math.random() - 0.5) * spread;
        // Y 범위 체크
        const { cW: cW3, cH: cH3 } = mBounds;
        const py3 = (0.5 - (ty2final / bounds.visH)) * cH3;
        if (py3 < 0 || py3 > cH3 * 1.05) continue;

        const isLeaf3 = Math.random() < 0.15;
        let hue3, sat3, light3;
        if (isLeaf3) {
          hue3 = art.leafHue + (Math.random()-0.5)*15;
          sat3 = art.leafSat;
          const [lLo3, lHi3] = art.leafLight;
          light3 = lLo3 + Math.random()*(lHi3-lLo3);
        } else if (Array.isArray(art.sat)) {
          if (art.accentHue && Math.random() < art.accentRatio) {
            hue3 = art.accentHue + (Math.random()-0.5)*8;
            sat3 = art.accentSat;
            const [aLo3, aHi3] = art.accentLight;
            light3 = aLo3 + Math.random()*(aHi3-aLo3);
          } else {
            const idx3 = Math.floor(Math.random()*art.hues.length);
            hue3 = art.hues[idx3] + (Math.random()-0.5)*12;
            sat3 = art.sat[idx3];
            light3 = art.light[idx3] + (Math.random()-0.5)*0.06;
          }
        } else if (art.huesTop) {
          // huesTop/huesBot 구조 (Monet, Klimt) — 전체 팔레트 합쳐서 사용
          const allH = [...art.huesTop, ...art.huesBot];
          const allS = [...art.satTop,  ...art.satBot];
          const allL = [...art.lightTop,...art.lightBot];
          if (art.accentHue && Math.random() < (art.accentRatio||0)) {
            hue3 = art.accentHue + (Math.random()-0.5)*8;
            sat3 = art.accentSat;
            const [aLo3, aHi3] = art.accentLight;
            light3 = aLo3 + Math.random()*(aHi3-aLo3);
          } else {
            const idx3 = Math.floor(Math.random()*allH.length);
            hue3 = allH[idx3] + (Math.random()-0.5)*12;
            sat3 = allS[idx3];
            light3 = allL[idx3] + (Math.random()-0.5)*0.06;
          }
        } else {
          hue3 = art.hues[Math.floor(Math.random()*art.hues.length)] + (Math.random()-0.5)*12;
          sat3 = art.sat;
          const [lLo3, lHi3] = art.light;
          light3 = lLo3 + Math.random()*(lHi3-lLo3);
        }
        particles.push({
          type: isLeaf3 ? 1 : 0,
          x: tx2, y: ty2final, z: (Math.random()-0.5)*0.3,
          hue: hue3, sat: sat3, lightness: light3,
          scale: 0,
          maxScale: (0.5 + 0.8*Math.pow(Math.random(),2)) * (ex.scaleBot || 1.0),
          deltaScale: 0.04+0.08*Math.random(),
          isGrowing: true, toDelete: false,
          age: Math.PI*Math.random(), ageDelta: 0.01+0.02*Math.random(),
          rotZ: (Math.random()-0.5)*Math.PI,
          birthDelay: Math.random()*PHASE_BLOOM*0.7,
          depth: ty2final, isExtra: true,
        });
        continue;
      } else if (ex.type === 'collar') {
        // 깃: 목 주변 부채꼴
        const t = (ty2 - exBottom) / (exTop - exBottom);
        const collarW = mW * ex.xWidth * Math.sin(t * Math.PI);
        tx2 = mCX + (Math.random() - 0.5) * collarW;
      }

      // Y 범위 체크
      const { cW, cH } = mBounds;
      const py2 = (0.5 - (ty2 / bounds.visH)) * cH;
      if (py2 < 0 || py2 > cH * 1.1) continue;

      const isLeaf2 = Math.random() < 0.15;
      let hue2, sat2, lightness2;
      if (isLeaf2) {
        hue2 = art.leafHue + (Math.random()-0.5)*15;
        sat2 = art.leafSat;
        const [lLo2, lHi2] = art.leafLight;
        lightness2 = lLo2 + Math.random()*(lHi2-lLo2);
      } else if (Array.isArray(art.sat)) {
        // Klimt처럼 배열 팔레트
        if (art.accentHue && Math.random() < art.accentRatio) {
          hue2 = art.accentHue + (Math.random()-0.5)*8;
          sat2 = art.accentSat;
          const [aLo, aHi] = art.accentLight;
          lightness2 = aLo + Math.random()*(aHi-aLo);
        } else {
          const idx2 = Math.floor(Math.random()*art.hues.length);
          hue2 = art.hues[idx2] + (Math.random()-0.5)*12;
          sat2 = art.sat[idx2];
          lightness2 = art.light[idx2] + (Math.random()-0.5)*0.06;
        }
      } else {
        hue2 = art.hues[Math.floor(Math.random()*art.hues.length)] + (Math.random()-0.5)*12;
        sat2 = art.sat;
        const [lLo2, lHi2] = art.light;
        lightness2 = lLo2 + Math.random()*(lHi2-lLo2);
      }

      particles.push({
        type: isLeaf2 ? 1 : 0,
        x: tx2, y: ty2,
        z: (Math.random()-0.5)*0.3,
        hue: hue2, sat: sat2,
        lightness: lightness2,
        scale: 0,
        maxScale: (0.6 + 0.9*Math.pow(Math.random(),2)) * (ex.scaleBot || 1.0),
        deltaScale: 0.04 + 0.08*Math.random(),
        isGrowing: true, toDelete: false,
        age: Math.PI*Math.random(),
        ageDelta: 0.01+0.02*Math.random(),
        rotZ: (Math.random()-0.5)*Math.PI,
        birthDelay: Math.random()*PHASE_BLOOM*0.7,
        depth: ty2,
        isExtra: true,
      });
    }
    } // end else (non-vangogh_stars)
  }

  // trainRight 트레인: 치마 오른쪽 하단에서 자연스럽게 이어지는 추가 꽃
  if (dress.trainRight) {
    const dressHemY  = bounds.top - mH * dress.yEnd;  // 치마 발끝
    const trainCount = 200;
    let tc = 0, ta = 0;
    while (tc < trainCount && ta < 4000) {
      ta++;
      const xP  = Math.random();  // 0=치마 오른쪽, 1=트레인 끝
      const startX = mCX + mW * 0.05;
      const endX   = mCX + mW * 0.90;
      const tx3    = startX + xP * (endX - startX);

      // Y: 치마 발끝에서 시작, 오른쪽으로 갈수록 아래로 처짐
      const sag    = xP * xP * mH * 0.18;
      const spread = mH * 0.10 * (1 - xP * 0.7);
      const ty3    = dressHemY - sag + (Math.random() - 0.5) * spread;

      // 치마 왼쪽은 제외 (오른쪽 트레인만)
      if (tx3 < mCX - mW * 0.1) continue;

      const { cW: cW4, cH: cH4 } = mBounds;
      const py4 = (0.5 - (ty3 / bounds.visH)) * cH4;
      if (py4 < 0 || py4 > cH4 * 1.1) continue;

      const isLeaf4 = Math.random() < 0.18;
      let hue4, sat4, light4;
      if (isLeaf4) {
        hue4 = art.leafHue + (Math.random()-0.5)*15;
        sat4 = art.leafSat;
        const [l4lo, l4hi] = art.leafLight;
        light4 = l4lo + Math.random()*(l4hi-l4lo);
      } else if (art.huesTop) {
        const allH4 = [...art.huesTop, ...art.huesBot];
        const allS4 = [...art.satTop,  ...art.satBot];
        const allL4 = [...art.lightTop,...art.lightBot];
        const i4 = Math.floor(Math.random()*allH4.length);
        hue4 = allH4[i4] + (Math.random()-0.5)*12;
        sat4 = allS4[i4];
        light4 = allL4[i4] + (Math.random()-0.5)*0.06;
      } else {
        hue4 = art.hues[Math.floor(Math.random()*art.hues.length)] + (Math.random()-0.5)*12;
        sat4 = art.sat; light4 = art.light[0];
      }

      const sc4 = (0.6 + 0.9*Math.pow(Math.random(),2)) * (1 - xP * 0.3);
      particles.push({
        type: isLeaf4 ? 1 : 0,
        x: tx3, y: ty3, z: (Math.random()-0.5)*0.3,
        hue: hue4, sat: sat4, lightness: light4,
        scale: 0, maxScale: sc4,
        deltaScale: 0.04+0.08*Math.random(),
        isGrowing: true, toDelete: false,
        age: Math.PI*Math.random(), ageDelta: 0.01+0.02*Math.random(),
        rotZ: (Math.random()-0.5)*Math.PI,
        birthDelay: Math.random()*PHASE_BLOOM*0.7,
        depth: ty3, isExtra: true,
      });
      tc++;
    }
  }

  rebuildMeshes(art);
}

function rebuildMeshes(art) {
  scene.remove(flowerMesh, leafMesh);

  const flowers = particles.filter(p => p.type === 0);
  const leaves  = particles.filter(p => p.type === 1);

  const fMat = makeFlowerMat(flowerTex, 0.92);
  const lMat = makeFlowerMat(leafTex, 0.85);

  flowerMesh = new THREE.InstancedMesh(particleGeo, fMat, Math.max(1, flowers.length));
  leafMesh   = new THREE.InstancedMesh(particleGeo, lMat, Math.max(1, leaves.length));

  flowers.forEach((p, i) => {
    const c = new THREE.Color(); c.setHSL(p.hue/360, p.sat ?? 0.8, p.lightness);
    flowerMesh.setColorAt(i, c);
  });
  leaves.forEach((p, i) => {
    const c = new THREE.Color(); c.setHSL(p.hue/360, p.sat ?? 0.6, p.lightness);
    leafMesh.setColorAt(i, c);
  });

  if (flowerMesh.instanceColor) flowerMesh.instanceColor.needsUpdate = true;
  if (leafMesh.instanceColor)   leafMesh.instanceColor.needsUpdate   = true;

  scene.add(flowerMesh, leafMesh);
}

// ═══════════════════════════════════════════════════════════════
// 6. 업데이트
// ═══════════════════════════════════════════════════════════════

function updateParticles(ptcls, fMesh, lMesh, phaseTime) {
  ptcls.forEach(p => {
    if (phaseTime < PHASE_BLOOM) {
      const prog = Math.max(0, (phaseTime - p.birthDelay) / (PHASE_BLOOM * 0.9));
      if (prog > 0 && p.isGrowing) {
        p.deltaScale *= 0.97;
        p.scale += p.deltaScale;
        if (p.scale >= p.maxScale) { p.scale = p.maxScale; p.isGrowing = false; }
      }
    } else if (phaseTime < PHASE_BLOOM + PHASE_HOLD) {
      if (!p.isGrowing) {
        p.age += p.ageDelta;
        p.scale = p.maxScale + 0.08 * Math.sin(p.age);
        if (p.type === 0) p.rotZ += 0.001 * Math.cos(p.age);
      }
    } else {
      const wP = (phaseTime - PHASE_BLOOM - PHASE_HOLD) / PHASE_WILT;
      p.scale = p.maxScale * Math.max(0, 1 - wP * wP);
    }
  });

  let fi = 0, li = 0;
  ptcls.forEach(p => {
    dummy.quaternion.copy(camera.quaternion);
    dummy.rotation.z = p.rotZ;
    dummy.scale.set(p.scale, p.scale, p.scale);
    dummy.position.set(p.x, p.y, p.z);
    dummy.updateMatrix();
    if (p.type === 0 && fMesh) fMesh.setMatrixAt(fi++, dummy.matrix);
    else if (p.type === 1 && lMesh) lMesh.setMatrixAt(li++, dummy.matrix);
  });
  if (fMesh) fMesh.instanceMatrix.needsUpdate = true;
  if (lMesh) lMesh.instanceMatrix.needsUpdate = true;
}

// ═══════════════════════════════════════════════════════════════
// 7. 메인 루프
// ═══════════════════════════════════════════════════════════════

let lastTime = 0;
let prebuiltNext = null;
let prebuildScheduled = false;
let nextPhaseTimer = 0;

function prebuildNext() {
  const nextIdx = (currentArtwork + 1) % ARTWORKS.length;
  const savedParticles = particles;
  const savedFlower = flowerMesh;
  const savedLeaf = leafMesh;
  particles = [];
  flowerMesh = null;
  leafMesh = null;

  initParticles(nextIdx);

  prebuiltNext = {
    particles: particles,
    flowerMesh: flowerMesh,
    leafMesh: leafMesh,
    artIdx: nextIdx,
  };

  scene.add(prebuiltNext.flowerMesh, prebuiltNext.leafMesh);
  prebuiltNext.flowerMesh.visible = false;
  prebuiltNext.leafMesh.visible   = false;

  particles  = savedParticles;
  flowerMesh = savedFlower;
  leafMesh   = savedLeaf;
  prebuildScheduled = false;
}

function animate(now = 0) {
  requestAnimationFrame(animate);
  const t  = now / 1000;
  const dt = Math.min(t - lastTime, 0.05);
  lastTime = t;

  phaseTimer += dt;

  // HOLD 20% 시점에 미리 빌드 예약
  const prebuildAt = PHASE_BLOOM + PHASE_HOLD * 0.2;
  if (!prebuiltNext && !prebuildScheduled && phaseTimer >= prebuildAt) {
    prebuildScheduled = true;
    setTimeout(prebuildNext, 0);
  }

  // WILT 시작 시점에 다음 옷 bloom 시작 — 두 옷 동시 렌더
  const wiltStart = PHASE_BLOOM + PHASE_HOLD;
  if (prebuiltNext && !prebuiltNext.blooming && phaseTimer >= wiltStart) {
    prebuiltNext.blooming = true;
    prebuiltNext.flowerMesh.visible = true;
    prebuiltNext.leafMesh.visible   = true;
    nextPhaseTimer = 0;
  }

  // 다음 옷 bloom 업데이트 (현재 옷과 동시에)
  if (prebuiltNext && prebuiltNext.blooming) {
    nextPhaseTimer += dt;
    updateParticles(prebuiltNext.particles, prebuiltNext.flowerMesh, prebuiltNext.leafMesh, nextPhaseTimer);
  }

  // 현재 옷 TOTAL — 현재 옷 제거, 다음 옷으로 교체
  if (phaseTimer >= PHASE_TOTAL) {
    scene.remove(flowerMesh, leafMesh);
    if (prebuiltNext) {
      particles      = prebuiltNext.particles;
      flowerMesh     = prebuiltNext.flowerMesh;
      leafMesh       = prebuiltNext.leafMesh;
      currentArtwork = prebuiltNext.artIdx;
      prebuiltNext   = null;
      prebuildScheduled = false;
      phaseTimer     = nextPhaseTimer;  // bloom 중인 타이머 이어받기
    } else {
      currentArtwork = (currentArtwork + 1) % ARTWORKS.length;
      initParticles(currentArtwork);
      scene.add(flowerMesh, leafMesh);
      phaseTimer = 0;
    }
    flowerMesh.visible = true;
    leafMesh.visible   = true;
  }

  updateParticles(particles, flowerMesh, leafMesh, phaseTimer);
  renderer.render(scene, camera);
}
