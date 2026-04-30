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
  renderComp();
}

// ═══════════════════════════════════════════════════════════════
// 1. 국기
// ═══════════════════════════════════════════════════════════════

const FLAG_W = 900, FLAG_H = 600, CELL = 4;
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
  // 텍스트 크기: 화면 너비의 ~12%
  const fontSize = Math.round(W * 0.12);
  const lineHeight = fontSize * 1.15;
  const leftPad = Math.round(W * 0.08);
  // 세로 중앙 약간 위
  const totalTextH = lineHeight * TEXT_LINES.length;
  const startY = (H - totalTextH) / 2 + fontSize * 0.2;

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

function calcDy(i, t, flagRW) {
  // 진폭을 화면 크기 비례로
  const baseAmp = flagRW * 0.055;
  let dy = 0;
  dy += Math.sin(i*0.08 + t*1.1) * baseAmp;
  dy += Math.sin(i*0.18 + t*1.8 + 1.3) * baseAmp * 0.5;
  dy += Math.sin(i*0.35 + t*2.5 + 2.7) * baseAmp * 0.22;
  dy += bNoise[i] * NOISE;
  if (mA) {
    const flagOX = (W - flagRW) / 2;
    const sx = flagOX + (i/STRIPS)*flagRW;
    const inf = Math.max(0, 1 - Math.abs(sx - mX)/(W*0.2));
    if (inf > 0) dy += Math.sin(i*0.4 + t*5.5) * baseAmp * 0.65 * inf;
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
  // 국기가 화면의 ~130% 너비를 차지 (대각선이라 넉넉히)
  const flagRW = W * 1.35;
  const flagRH = flagRW * (FLAG_H / FLAG_W);
  const flagOX = (W - flagRW) / 2;
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

    for (let s = 0; s < SLICES; s++) {
      const y01 = s / SLICES;
      const sliceXOff = calcSliceXOff(i, s, t);
      const dx = baseDx + sliceXOff;
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

function draw(t) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(textCanvas, 0, 0);
  drawStrips(t);
}

function animate(now = 0) {
  requestAnimationFrame(animate);
  draw(now / 1000);
}

// init
resize();
window.addEventListener('resize', () => { resize(); });
if (document.fonts?.ready) document.fonts.ready.then(() => { renderText(); renderComp(); });

if (IS_THUMB) {
  requestAnimationFrame(() => draw(0.3));
} else {
  animate();
}
