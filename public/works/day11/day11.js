// Day 11 — 차이나 쇼크 2.0 (v10)
// 풀스크린 검정 배경 + 흰 텍스트 + 국기 S-curve 스트립 펄럭임

const IS_THUMB = new URLSearchParams(location.search).has('thumb');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let W, H;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = canvas.width = window.innerWidth * dpr;
  H = canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  renderText();
  renderCyanText();
  renderComp();
}

// ═══════════════════════════════════════════════════════════════
// 1. 국기
// ═══════════════════════════════════════════════════════════════

const FLAG_W = 900, FLAG_H = 600, CELL = 2;
const flagClean = document.createElement('canvas');
flagClean.width = FLAG_W; flagClean.height = FLAG_H;
const fcCtx = flagClean.getContext('2d');

const flagDithered = document.createElement('canvas');
flagDithered.width = FLAG_W; flagDithered.height = FLAG_H;
const fdCtx = flagDithered.getContext('2d');

function drawStar(c, cx, cy, r, rot, col) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.382;
    c.lineTo(cx + Math.cos(a - Math.PI/2) * rr, cy + Math.sin(a - Math.PI/2) * rr);
  }
  c.closePath(); c.fillStyle = col; c.fill();
}

function buildBaseFlag() {
  fcCtx.fillStyle = '#EE1C25'; fcCtx.fillRect(0, 0, FLAG_W, FLAG_H);
  const u = FLAG_W / 30;
  drawStar(fcCtx, u*5, u*5, u*3, 0, '#FFDE00');
  [[10,2],[12,4],[12,7],[10,9]].forEach(([sx,sy]) => {
    const a = Math.atan2(u*5 - u*sy, u*5 - u*sx);
    drawStar(fcCtx, u*sx, u*sy, u, a + Math.PI/2, '#FFDE00');
  });
}
buildBaseFlag();

const RED_PAL = ['#EE1C25','#EE1C25','#EE1C25','#EE1C25','#FF2233','#DD1122','#FF4455','#CC0011'];
const YEL_PAL = ['#FFDE00','#FFDE00','#FFDE00','#FFE833','#FFD000'];

function ditherFlag() {
  const src = fcCtx.getImageData(0, 0, FLAG_W, FLAG_H).data;
  const d = document.createElement('canvas');
  d.width = FLAG_W; d.height = FLAG_H;
  const dc = d.getContext('2d');
  for (let y = 0; y < FLAG_H; y += CELL) {
    for (let x = 0; x < FLAG_W; x += CELL) {
      const cx = Math.min(FLAG_W-1, x+CELL/2)|0;
      const cy = Math.min(FLAG_H-1, y+CELL/2)|0;
      const idx = (cy*FLAG_W+cx)*4;
      const isY = src[idx]>200 && src[idx+1]>180 && src[idx+2]<100;
      const pal = isY ? YEL_PAL : RED_PAL;
      dc.fillStyle = pal[Math.floor(Math.random()*pal.length)];
      dc.fillRect(x, y, CELL, CELL);
    }
  }
  fdCtx.drawImage(d, 0, 0);
}
ditherFlag();

// ═══════════════════════════════════════════════════════════════
// 2. 텍스트 (검정 배경 + 흰 텍스트)
// ═══════════════════════════════════════════════════════════════

const TEXT_LINES = ['첨단산업을', '점령하는', '차이나쇼크 2.0'];

const textCanvas = document.createElement('canvas');
const tctx = textCanvas.getContext('2d');

function renderText() {
  textCanvas.width = W; textCanvas.height = H;
  tctx.clearRect(0, 0, W, H);
  // 텍스트 크기: 화면 너비의 ~8% (이전 12% 에서 축소)
  const fontSize = Math.round(W * 0.10);
  const lineHeight = fontSize * 1.2;
  const leftPad = Math.round(W * 0.08);
  // 세로 정중앙
  const totalTextH = lineHeight * TEXT_LINES.length;
  const startY = (H - totalTextH) / 2 + fontSize;

  tctx.fillStyle = '#fff';
  tctx.font = `900 ${fontSize}px Pretendard, sans-serif`;
  tctx.textBaseline = 'alphabetic';
  tctx.textAlign = 'left';
  let y = startY;
  for (const line of TEXT_LINES) {
    tctx.fillText(line, leftPad, y);
    y += lineHeight;
  }
}

// 합성 = 국기만
const compCanvas = document.createElement('canvas');
const cctx = compCanvas.getContext('2d');
function renderComp() {
  compCanvas.width = FLAG_W; compCanvas.height = FLAG_H;
  cctx.clearRect(0, 0, FLAG_W, FLAG_H);
  cctx.drawImage(flagDithered, 0, 0);
}

// ═══════════════════════════════════════════════════════════════
// 3. 펄럭임 + 마우스
// ═══════════════════════════════════════════════════════════════

const STRIPS = 40, SLICES = 24;
const FLAG_DIAG = -8 * Math.PI / 180;

const WAVES = [
  { amp:0, freq:0.08, spd:1.1, ph:0 },       // 실제 amp 는 draw 시 W 기반으로 계산
  { amp:0, freq:0.18, spd:1.8, ph:1.3 },
  { amp:0, freq:0.35, spd:2.5, ph:2.7 },
];
const NOISE = 8;
const bNoise = new Float32Array(STRIPS);
for (let i = 0; i < STRIPS; i++) bNoise[i] = (Math.random()-0.5)*2;

let mX = 0, mY = 0, mA = false;
canvas.addEventListener('pointermove', e => {
  mX = e.clientX * (W / window.innerWidth);
  mY = e.clientY * (H / window.innerHeight);
  mA = true;
});
canvas.addEventListener('pointerleave', () => mA = false);

// B: 클릭 찢기 — 클릭 위치에서 스트립이 좌우로 갈라짐
let tearX = -1;       // 찢기 x 위치 (캔버스 좌표). -1 = 비활성
let tearTime = 0;     // 찢기 시작 시간
let tearDuration = 2.5; // 찢기 지속 시간 (초)
let tearMaxGap = 0;   // 최대 벌어짐 (화면 비례)

canvas.addEventListener('pointerdown', e => {
  tearX = e.clientX * (W / window.innerWidth);
  tearTime = performance.now() / 1000;
  tearMaxGap = W * 0.08; // 화면 8% 만큼 벌어짐
});

function getTearOffset(stripCenterX, t) {
  if (tearX < 0) return 0;
  const elapsed = t - tearTime;
  if (elapsed > tearDuration) { tearX = -1; return 0; }
  // 열렸다 닫히는 곡선: 빠르게 열리고 천천히 닫힘
  const openPhase = Math.min(1, elapsed / 0.3); // 0.3초 만에 열림
  const closePhase = Math.max(0, (elapsed - 0.3) / (tearDuration - 0.3)); // 나머지 시간에 닫힘
  const gapAmount = tearMaxGap * openPhase * (1 - closePhase * closePhase);

  // 찢기 위치에서 거리에 따라 좌우로 밀림
  const dist = stripCenterX - tearX;
  const influence = Math.max(0, 1 - Math.abs(dist) / (W * 0.25));
  if (influence <= 0) return 0;
  // 왼쪽 스트립은 왼쪽으로, 오른쪽은 오른쪽으로
  const direction = dist < 0 ? -1 : 1;
  return direction * gapAmount * influence;
}

function calcDy(i, t, flagRW) {
  const baseAmp = flagRW * 0.055;
  let dy = 0;
  dy += Math.sin(i*0.08 + t*1.1) * baseAmp;
  dy += Math.sin(i*0.18 + t*1.8 + 1.3) * baseAmp * 0.5;
  dy += Math.sin(i*0.35 + t*2.5 + 2.7) * baseAmp * 0.22;
  dy += bNoise[i] * NOISE;

  // C: 마우스 바람 — 커서 근처 스트립이 크게 들춰짐
  if (mA) {
    const flagOX = W * 0.3;
    const sx = flagOX + (i/STRIPS)*flagRW;
    const dist = Math.abs(sx - mX);
    const radius = flagRW * 0.2; // 영향 반경
    const inf = Math.max(0, 1 - dist / radius);
    if (inf > 0) {
      // 강한 Y 변위 — 커서 근처 스트립이 위로 들림
      dy += inf * baseAmp * 1.8 * Math.sin(t * 4 + i * 0.5);
      // 추가: 커서 위/아래에 따라 방향
      const flagOY = (H - flagRW * (FLAG_H/FLAG_W)) / 2;
      const flagCY = flagOY + flagRW * (FLAG_H/FLAG_W) / 2;
      dy += inf * (mY < flagCY ? -1 : 1) * baseAmp * 0.6;
    }
  }
  return dy;
}

function calcSliceXOff(stripIdx, sliceIdx, t) {
  const y01 = sliceIdx / SLICES;
  let dx = 0;
  dx += Math.sin(y01 * Math.PI * 2.5 + t * 1.4 + stripIdx * 0.3) * 14;
  dx += Math.sin(y01 * Math.PI * 5 + t * 2.2 + stripIdx * 0.7) * 6;
  dx *= (0.6 + y01 * 0.8);
  return dx;
}

// ═══════════════════════════════════════════════════════════════
// 4. 렌더
// ═══════════════════════════════════════════════════════════════

function drawStrips(t) {
  // 국기가 화면의 ~65% 너비, 중앙보다 오른쪽으로 치우침
  const flagRW = W * 0.65;
  const flagRH = flagRW * (FLAG_H / FLAG_W);
  const flagOX = W * 0.3;  // 화면 30% 지점에서 시작 (오른쪽 치우침)
  const flagOY = (H - flagRH) / 2;

  const sW = flagRW / STRIPS;
  const srcW = FLAG_W / STRIPS;
  const sliceH = flagRH / SLICES;
  const srcSliceH = FLAG_H / SLICES;
  const GAP = sW * 0.3;
  const dW = sW - GAP;

  ctx.save();
  ctx.translate(W/2, H/2);
  ctx.rotate(FLAG_DIAG);
  ctx.translate(-W/2, -H/2);

  for (let i = 0; i < STRIPS; i++) {
    const dy = calcDy(i, t, flagRW);
    const baseDx = flagOX + i * sW;
    // B: 찢기 오프셋
    const tearOff = getTearOffset(baseDx + sW/2, t);

    for (let s = 0; s < SLICES; s++) {
      const y01 = s / SLICES;
      const sliceXOff = calcSliceXOff(i, s, t);
      const dx = baseDx + sliceXOff + tearOff;
      const sliceY = flagOY + dy + s * sliceH;

      // 하단 분해
      let extraFall = 0, extraAlpha = 1;
      if (y01 > 0.75) {
        const bp = (y01 - 0.75) / 0.25;
        extraFall = bp * (15 + Math.sin(t*3+i+s) * 12);
        extraAlpha = 1 - bp * 0.5;
      }

      ctx.globalAlpha = extraAlpha;
      ctx.drawImage(
        compCanvas,
        i * srcW, s * srcSliceH, srcW, srcSliceH,
        dx, sliceY + extraFall, dW, sliceH + 0.5
      );
      ctx.globalAlpha = 1;

      // 엣지 하이라이트
      if (Math.abs(sliceXOff) > 3) {
        const li = Math.min(0.3, Math.abs(sliceXOff) / 50);
        ctx.fillStyle = sliceXOff > 0
          ? `rgba(255,255,255,${li})`
          : `rgba(0,0,0,${li*0.4})`;
        ctx.fillRect(dx, sliceY + extraFall, 1, sliceH);
      }
    }
  }
  ctx.restore();
}

function drawTextDissolve(t) {
  if (!textHitmap || !flagMaskData) return;

  const flagRW = W * 0.65;
  const flagRH = flagRW * (FLAG_H / FLAG_W);
  const flagOX = W * 0.3;
  const flagOY = (H - flagRH) / 2;

  const sW = flagRW / STRIPS;
  const sliceH = flagRH / SLICES;
  const GAP = sW * 0.3;
  const dW = sW - GAP;

  ctx.save();
  for (let i = 0; i < STRIPS; i++) {
    const dy = calcDy(i, t, flagRW);
    const stripX = flagOX + i * sW;

    for (let s = 0; s < SLICES; s++) {
      const sliceXOff = calcSliceXOff(i, s, t);
      const flagSliceX = stripX + sliceXOff;
      const flagSliceY = flagOY + dy + s * sliceH;

      const cx = Math.round(flagSliceX + dW / 2);
      const cy = Math.round(flagSliceY + sliceH / 2);
      if (cx < 0 || cx >= W || cy < 0 || cy >= H) continue;

      // 텍스트가 있는지
      if (!textHitmap[cy * W + cx]) continue;
      // 국기가 실제로 이 위치를 덮고 있는지 (마스크 기반)
      if (!isFlagAt(cx, cy)) continue;

      const seed = i * 0.13 + s * 0.17;
      const extraDy = Math.sin(t * 3.5 + seed * 7) * 5;

      ctx.globalAlpha = 0.9;
      ctx.drawImage(textCanvas,
        cx - dW/2, cy - sliceH/2, dW, sliceH,
        cx - dW/2, cy - sliceH/2 + extraDy, dW, sliceH);

      ctx.globalAlpha = 0.4;
      ctx.drawImage(cyanTextCanvas,
        cx - dW/2, cy - sliceH/2, dW, sliceH,
        cx - dW/2 + 4, cy - sliceH/2 + extraDy - 3, dW, sliceH);

      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

function draw(t) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(textCanvas, 0, 0);
  drawStripsToMask(t);                 // 마스크 빌드 (오프스크린)
  drawStrips(t);                       // 국기
  drawTextDissolve(t);                 // 텍스트 변형 (국기 실제 겹침만)
}

function animate(now = 0) {
  requestAnimationFrame(animate);
  draw(now / 1000);
}

// 국기 마스크 캔버스 — 국기가 실제로 덮는 영역 판정용
const flagMaskCanvas = document.createElement('canvas');
const fmCtx = flagMaskCanvas.getContext('2d', { willReadFrequently: true });

function drawStripsToMask(t) {
  // 국기 스트립을 마스크 캔버스에 그림 (저해상도)
  const MASK_SCALE = 4;
  const mw = Math.ceil(W / MASK_SCALE);
  const mh = Math.ceil(H / MASK_SCALE);
  flagMaskCanvas.width = mw;
  flagMaskCanvas.height = mh;
  fmCtx.clearRect(0, 0, mw, mh);
  fmCtx.save();
  fmCtx.scale(1/MASK_SCALE, 1/MASK_SCALE);

  const flagRW = W * 0.65;
  const flagRH = flagRW * (FLAG_H / FLAG_W);
  const flagOX = W * 0.3;
  const flagOY = (H - flagRH) / 2;
  const sW = flagRW / STRIPS;
  const srcW = FLAG_W / STRIPS;
  const sliceH = flagRH / SLICES;
  const srcSliceH = FLAG_H / SLICES;
  const GAP = sW * 0.3;
  const dW = sW - GAP;

  fmCtx.translate(W/2, H/2);
  fmCtx.rotate(FLAG_DIAG);
  fmCtx.translate(-W/2, -H/2);

  // 단색으로 국기 영역만 칠함
  fmCtx.fillStyle = '#f00';
  for (let i = 0; i < STRIPS; i++) {
    const dy = calcDy(i, t, flagRW);
    const baseDx = flagOX + i * sW;
    const tearOff = getTearOffset(baseDx + sW/2, t);
    for (let s = 0; s < SLICES; s++) {
      const sliceXOff = calcSliceXOff(i, s, t);
      const dx = baseDx + sliceXOff + tearOff;
      const sliceY = flagOY + dy + s * sliceH;
      let extraFall = 0;
      const y01 = s / SLICES;
      if (y01 > 0.75) {
        const bp = (y01 - 0.75) / 0.25;
        extraFall = bp * (15 + Math.sin(t*3+i+s) * 12);
      }
      fmCtx.fillRect(dx, sliceY + extraFall, dW, sliceH + 0.5);
    }
  }
  fmCtx.restore();
  // 마스크 데이터 한 번에 읽기
  flagMaskW = flagMaskCanvas.width;
  flagMaskH = flagMaskCanvas.height;
  flagMaskData = fmCtx.getImageData(0, 0, flagMaskW, flagMaskH).data;
}

let flagMaskData = null;
let flagMaskW = 0, flagMaskH = 0;

function isFlagAt(x, y) {
  if (!flagMaskData) return false;
  const MASK_SCALE = 4;
  const mx = (x / MASK_SCALE) | 0;
  const my = (y / MASK_SCALE) | 0;
  if (mx < 0 || mx >= flagMaskW || my < 0 || my >= flagMaskH) return false;
  return flagMaskData[(my * flagMaskW + mx) * 4] > 100;
}
const cyanTextCanvas = document.createElement('canvas');
const cyanCtx = cyanTextCanvas.getContext('2d');

function renderCyanText() {
  cyanTextCanvas.width = W; cyanTextCanvas.height = H;
  cyanCtx.clearRect(0, 0, W, H);
  cyanCtx.fillStyle = '#00DDDD';
  cyanCtx.font = `900 ${Math.round(W * 0.10)}px Pretendard, sans-serif`;
  cyanCtx.textBaseline = 'alphabetic'; cyanCtx.textAlign = 'left';
  const fontSize = Math.round(W * 0.10);
  const lineHeight = fontSize * 1.2;
  const leftPad = Math.round(W * 0.08);
  const totalTextH = lineHeight * TEXT_LINES.length;
  const startY = (H - totalTextH) / 2 + fontSize;
  let y = startY;
  for (const l of TEXT_LINES) { cyanCtx.fillText(l, leftPad, y); y += lineHeight; }
}
let textHitmap = null;
function buildTextHitmap() {
  if (!W || !H) return;
  const data = tctx.getImageData(0, 0, W, H).data;
  textHitmap = new Uint8Array(W * H);
  let count = 0;
  for (let i = 0; i < W * H; i++) {
    if (data[i * 4 + 3] > 128) { textHitmap[i] = 1; count++; }
  }
  console.log('[hitmap] built, text pixels:', count, 'W:', W, 'H:', H);
}

// init
resize();
window.addEventListener('resize', () => { resize(); setTimeout(buildTextHitmap, 50); });
if (document.fonts?.ready) {
  document.fonts.ready.then(() => {
    renderText();
    renderCyanText();
    renderComp();
    setTimeout(buildTextHitmap, 50);
  });
} else {
  renderCyanText();
  setTimeout(buildTextHitmap, 500);
}

if (IS_THUMB) {
  requestAnimationFrame(() => draw(0.3));
} else {
  animate();
}
