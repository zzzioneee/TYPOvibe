// Day 16 — Wait, is it summer already?
// Falloff + Simplex Noise 분해 + Lerp 복귀 (스프링/바운스 없음)

const IS_THUMB = new URLSearchParams(location.search).has('thumb');
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

let W, H, dpr;
let particles = [];
let isReady = false;

// 마우스 상태 + 궤적 히스토리
const mouse = { x: -9999, y: -9999, active: false };
const TRAIL_LEN = 20;  // 꼬리 길이 (프레임 수)
const mouseTrail = []; // 최근 마우스 위치 히스토리

// 여름 컬러
const SUMMER = [
  [255, 0, 0],
  [255, 0, 0],
  [255, 0, 0],
  [255, 0, 0],
  [255, 0, 0],
  [255, 0, 0],
  [255, 0, 0],
  [255, 0, 0],
  [255, 0, 0],
  [255, 0, 0],
];

// ── Simplex Noise 2D ──
const _p = (() => {
  const arr = new Uint8Array(512);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0;
    [base[i], base[j]] = [base[j], base[i]];
  }
  for (let i = 0; i < 512; i++) arr[i] = base[i & 255];
  return arr;
})();

function snoise(x, y) {
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  const s = (x + y) * F2;
  const i = Math.floor(x + s), j = Math.floor(y + s);
  const t = (i + j) * G2;
  const x0 = x - (i - t), y0 = y - (j - t);
  const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
  const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
  const ii = i & 255, jj = j & 255;
  const g = (h, gx, gy) => {
    const gs = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
    const [a, b] = gs[h & 7]; return a * gx + b * gy;
  };
  let n0 = 0, n1 = 0, n2 = 0;
  let t0 = 0.5 - x0*x0 - y0*y0; if (t0 >= 0) { t0 *= t0; n0 = t0*t0 * g(_p[ii+_p[jj]], x0, y0); }
  let t1 = 0.5 - x1*x1 - y1*y1; if (t1 >= 0) { t1 *= t1; n1 = t1*t1 * g(_p[ii+i1+_p[jj+j1]], x1, y1); }
  let t2 = 0.5 - x2*x2 - y2*y2; if (t2 >= 0) { t2 *= t2; n2 = t2*t2 * g(_p[ii+1+_p[jj+1]], x2, y2); }
  return 70 * (n0 + n1 + n2);
}

// ── 하늘 배경 — 픽셀 디더링 구름 (중앙 텍스트 영역 비움)
let cloudOffset = 0;
let skyCanvas = null;
const SKY_PIXEL = 3;

function buildSky() {
  const cW = W * 3, cH = H;
  skyCanvas = document.createElement('canvas');
  skyCanvas.width = cW; skyCanvas.height = cH;
  const sc = skyCanvas.getContext('2d');

  // 1. 하늘 파랑으로 전체 채우기
  const skyW = Math.ceil(cW / SKY_PIXEL);
  const skyH = Math.ceil(cH / SKY_PIXEL);

  // 구름 랜덤 생성 — 중앙 텍스트 영역(x: 0.2~0.7, y: 0.15~0.85) 피함
  const TW = cW, TH = cH;
  const clouds = [];
  const rng = (() => { let s = 42; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; }; })();

  const COUNT = 35;
  for (let i = 0; i < COUNT; i++) {
    const cx = rng() * TW;
    const cy = rng() * TH;
    const sizeRand = rng();
    const r = TH * (0.06 + Math.pow(sizeRand, 2.0) * 0.28);
    clouds.push({ cx, cy, r });
  }

  // 구름 마스크 생성 (각 픽셀이 구름 안인지)
  // 구름은 여러 원의 합집합 — 각 구름 중심에서 r 이내면 구름
  // 구름 내부도 노이즈로 디더링
  for (let py = 0; py < skyH; py++) {
    for (let px = 0; px < skyW; px++) {
      const wx = px * SKY_PIXEL + SKY_PIXEL / 2;
      const wy = py * SKY_PIXEL + SKY_PIXEL / 2;
      const yFrac = wy / TH;

      // 하늘 파랑
      const skyR = Math.round(70 + yFrac * 50);
      const skyG = Math.round(155 + yFrac * 45);
      const skyB = Math.round(225 + yFrac * 20);

      // 가장 가까운 구름까지 거리 계산 (y축 압축 → 가로로 납작)
      let minDist = Infinity;
      let nearR = 1;
      for (const c of clouds) {
        const d = Math.hypot((wx - c.cx), (wy - c.cy) * 2.0);
        if (d < minDist) { minDist = d; nearR = c.r; }
      }

      // 구름 영향권 내에서 Simplex Noise 디더링
      // 중심에 가까울수록 흰색 밀도 높음, 가장자리는 파랑과 섞임
      const cloudDensity = Math.max(0, 1 - minDist / nearR);

      // 다중 옥타브 노이즈로 자연스러운 구름 질감
      // 스케일 낮게 → 넓은 덩어리, 높게 → 잘게 흩어짐
      const ns = 0.025; // 낮게 → 큰 덩어리
      const n1 = snoise(px * ns, py * ns);
      const n2 = snoise(px * ns * 2.0 + 3.7, py * ns * 2.0 + 1.3) * 0.4;
      const noiseVal = (n1 + n2 + 1.4) / 2.8; // 0~1 정규화

      // 구름 밀도 + 노이즈로 이진 디더링
      // threshold 낮을수록 구름 많음
      const threshold = 1.0 - cloudDensity * 0.90;
      const isCloud = noiseVal > threshold;
      if (isCloud) {
        sc.fillStyle = '#ffffff';
      } else {
        sc.fillStyle = `rgb(${skyR},${skyG},${skyB})`;
      }
      sc.fillRect(px * SKY_PIXEL, py * SKY_PIXEL, SKY_PIXEL, SKY_PIXEL);
    }
  }
}
const PIXEL       = IS_THUMB ? 5 : 7;
const RADIUS      = IS_THUMB ? 30 : 45;  // Falloff 반경 줄임
const NOISE_SCALE = 0.012;
const NOISE_FORCE = IS_THUMB ? 8 : 14;    // 노이즈 가속도 강도
const DRIFT_X     = 0.6;                  // 우하향 드리프트 X
const DRIFT_Y     = 0.8;                  // 우하향 드리프트 Y
const FRICTION    = 0.88;                 // 마찰력 (속도 감쇠)
const LERP_RATE   = 0.10;                 // 복귀 Lerp 비율
const ARRIVE_DIST = 1.5;                  // 도착 판정 거리 (px)

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);
  if (isReady) { buildSky(); buildParticles(); }
}

function buildParticles() {
  particles = [];
  const lowW = Math.ceil(W / PIXEL), lowH = Math.ceil(H / PIXEL);
  const shortSide = Math.min(W, H);
  const fontSize = Math.round(shortSide * 0.19 / 7); // 텍스트 크기 원래대로
  const fontStr = `italic 400 ${fontSize}px 'Playfair Display', Georgia, serif`;

  // 텍스트 레이아웃 측정 후 중앙 배치
  const measure = document.createElement('canvas');
  measure.width = lowW; measure.height = lowH;
  const mc = measure.getContext('2d');
  mc.font = fontStr;
  const texts = ['Wait,', 'is it', 'summer', 'already?'];
  const widths = texts.map(t => mc.measureText(t).width);
  const lineH = Math.round(fontSize * 0.95);
  const totalH = lineH * 4;
  const centerY = Math.round(lowH * 0.5 - totalH * 0.5);
  const blockRight = Math.max(widths[0], widths[2], widths[0] - widths[1] + widths[3]);
  const xWait = Math.round((lowW - blockRight) / 2);
  const xWaitRight = xWait + Math.round(widths[0]);
  const xIsIt = xWaitRight - Math.round(widths[1]);
  const layout = [
    { text: 'Wait,',    x: xWait, y: centerY + lineH * 0 + fontSize },
    { text: 'is it',    x: xIsIt, y: centerY + lineH * 1 + fontSize },
    { text: 'summer',   x: xWait, y: centerY + lineH * 2 + fontSize },
    { text: 'already?', x: xIsIt, y: centerY + lineH * 3 + fontSize },
  ];

  // 저해상도 캔버스에 렌더링
  const low = document.createElement('canvas');
  low.width = lowW; low.height = lowH;
  const lc = low.getContext('2d');
  lc.imageSmoothingEnabled = false;
  layout.forEach(l => {
    lc.font = fontStr;
    lc.fillStyle = '#fff';
    lc.textAlign = 'left';
    lc.fillText(l.text, l.x, l.y);
  });

  const imgData = lc.getImageData(0, 0, lowW, lowH).data;
  for (let py = 0; py < lowH; py++) {
    for (let px = 0; px < lowW; px++) {
      if (imgData[(py * lowW + px) * 4 + 3] > 50) {
        const wx = px * PIXEL, wy = py * PIXEL;
        const sc = SUMMER[Math.floor(Math.random() * SUMMER.length)];
        particles.push({
          ox: wx, oy: wy,   // 원래 위치
          x: wx,  y: wy,   // 현재 위치
          vx: 0,  vy: 0,   // 속도
          sc,               // 여름 컬러
          colorT: 0,        // 0=흰색, 1=여름컬러
          size: PIXEL,
          displaced: false, // 분해 중 여부
        });
      }
    }
  }
}

document.fonts.ready.then(() => {
  document.fonts.load(`italic 400 32px 'Playfair Display'`).then(() => {
    resize();
    isReady = true;
    buildSky();
    buildParticles();
    animate();
  });
});

window.addEventListener('resize', resize);

window.addEventListener('mousemove', e => {
  mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
});
window.addEventListener('mouseleave', () => { mouse.active = false; });
window.addEventListener('touchmove', e => {
  if (e.touches.length) {
    mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; mouse.active = true;
  }
}, { passive: true });
window.addEventListener('touchend', () => { mouse.active = false; });

// Lerp 함수
function lerp(a, b, t) { return a + (b - a) * t; }

let lastTime = 0;
let noiseT = 0;

function animate(now = 0) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 16.67, 3);
  lastTime = now;
  noiseT += 0.004 * dt;

  ctx.clearRect(0, 0, W, H);
  // 구름 스크롤 — skyCanvas는 W*4 크기, 그 안에서 루프
  cloudOffset += 0.3 * dt;
  const skyW = skyCanvas ? skyCanvas.width : W;
  if (cloudOffset >= skyW) cloudOffset -= skyW;
  if (skyCanvas) {
    const ox = Math.round(cloudOffset);
    ctx.drawImage(skyCanvas, -ox, 0);
    // 오른쪽 끝이 화면을 벗어날 경우 이어붙이기
    if (skyW - ox < W) {
      ctx.drawImage(skyCanvas, skyW - ox, 0);
    }
  }

  // 마우스 궤적 히스토리 업데이트
  if (mouse.active) {
    mouseTrail.push({ x: mouse.x, y: mouse.y });
    if (mouseTrail.length > TRAIL_LEN) mouseTrail.shift();
  } else {
    if (mouseTrail.length > 0) mouseTrail.shift(); // 서서히 꼬리 줄이기
  }

  for (const p of particles) {
    // 꼬리 전체에서 가장 강한 Falloff 찾기
    let maxFalloff = 0;
    for (let ti = 0; ti < mouseTrail.length; ti++) {
      const tp = mouseTrail[ti];
      const dist = Math.hypot(p.x - tp.x, p.y - tp.y);
      if (dist < RADIUS) {
        const ageFactor = (ti + 1) / mouseTrail.length; // 최신일수록 강하게
        const f = (1 - dist / RADIUS) * ageFactor;
        if (f > maxFalloff) maxFalloff = f;
      }
    }
    const falloff = maxFalloff;
    const inRange = falloff > 0.01;

    if (inRange) {
      // ── 분해 발동 ──
      const nx = snoise(p.ox * NOISE_SCALE + noiseT, p.oy * NOISE_SCALE);
      const ny = snoise(p.ox * NOISE_SCALE, p.oy * NOISE_SCALE + noiseT + 3.7);

      p.vx += (nx * NOISE_FORCE + DRIFT_X) * falloff * dt;
      p.vy += (ny * NOISE_FORCE + DRIFT_Y) * falloff * dt;

      p.displaced = true;
      p.colorT = Math.min(1, p.colorT + 0.30 * falloff);

    } else if (p.displaced) {
      // ── 복귀 로직 (Lerp + Friction, 스프링 없음) ──

      // 1. 마찰력으로 속도 감쇠
      p.vx *= FRICTION;
      p.vy *= FRICTION;

      // 2. 속도가 충분히 줄면 Lerp로 원위치 흡수
      const speed = Math.hypot(p.vx, p.vy);
      if (speed < 2) {
        p.x = lerp(p.x, p.ox, LERP_RATE);
        p.y = lerp(p.y, p.oy, LERP_RATE);
        p.vx = 0; p.vy = 0;
      }

      // 3. 원위치 도착 판정
      const returnDist = Math.hypot(p.x - p.ox, p.y - p.oy);
      if (returnDist < ARRIVE_DIST) {
        p.x = p.ox; p.y = p.oy;
        p.vx = 0; p.vy = 0;
        p.displaced = false;
        p.colorT = 0; // 즉시 흰색 복구
      } else {
        // 컬러 서서히 복구
        p.colorT = Math.max(0, p.colorT - 0.04);
      }
    }

    // 속도 적용
    if (p.displaced || inRange) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // 렌더링 — colorT > 0이면 즉시 빨강, 아니면 흰색
    if (p.colorT > 0.5) {
      ctx.fillStyle = '#ff0000';
    } else {
      ctx.fillStyle = '#ff0000';
    }

    ctx.fillRect(
      Math.round(p.x / PIXEL) * PIXEL,
      Math.round(p.y / PIXEL) * PIXEL,
      p.size, p.size
    );
  }
}
