// Day 11 — 차이나 쇼크 2.0 (v6)
// Image 1 최대 반영: S-curve 스트립 + 넓은 GAP + 하단 분해 + 텍스트 선명히 보임

const IS_THUMB = new URLSearchParams(location.search).has('thumb');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width = 709;
const H = canvas.height = 1003;

// ═══════════════════════════════════════════════════════════════
// 1. 국기 디더링 텍스처
// ═══════════════════════════════════════════════════════════════

const FLAG_W = 900, FLAG_H = 600, CELL = 10;
const flagCanvas = document.createElement('canvas');
flagCanvas.width = FLAG_W; flagCanvas.height = FLAG_H;
const fctx = flagCanvas.getContext('2d');

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
  fctx.fillStyle = '#EE1C25'; fctx.fillRect(0, 0, FLAG_W, FLAG_H);
  const u = FLAG_W / 30;
  drawStar(fctx, u*5, u*5, u*3, 0, '#FFFF00');
  [[10,2],[12,4],[12,7],[10,9]].forEach(([sx,sy]) => {
    const a = Math.atan2(u*5 - u*sy, u*5 - u*sx);
    drawStar(fctx, u*sx, u*sy, u, a + Math.PI/2, '#FFFF00');
  });
}
buildBaseFlag();

const RED_PAL = ['#EE1C25','#EE1C25','#EE1C25','#F14158','#D6152A','#FF4A56','#C40E20','#FF6B80','#FF9A9A','#E63E5C'];
const YEL_PAL = ['#FFFF00','#FFFF00','#FFE63A','#FFD83D','#FFF68A','#FFD100'];
const SYMBOLS = ['+','×','◇','⊕','■','●','✳'];
const STRIPS = 40; // 48→40 (더 넓은 스트립)
const stripPattern = new Uint8Array(STRIPS);
for (let i = 0; i < STRIPS; i++) stripPattern[i] = Math.floor(Math.random() * 3);

function ditherFlag() {
  const src = fctx.getImageData(0, 0, FLAG_W, FLAG_H).data;
  const d = document.createElement('canvas');
  d.width = FLAG_W; d.height = FLAG_H;
  const dc = d.getContext('2d');
  dc.textBaseline = 'middle'; dc.textAlign = 'center';

  for (let y = 0; y < FLAG_H; y += CELL) {
    for (let x = 0; x < FLAG_W; x += CELL) {
      const cx = Math.min(FLAG_W-1, x + CELL/2)|0;
      const cy = Math.min(FLAG_H-1, y + CELL/2)|0;
      const idx = (cy * FLAG_W + cx) * 4;
      const r = src[idx], g = src[idx+1], b = src[idx+2];
      const isY = r > 200 && g > 200 && b < 100;
      const pal = isY ? YEL_PAL : RED_PAL;
      const bg = pal[Math.floor(Math.random() * pal.length)];
      const stripIdx = Math.floor((x / FLAG_W) * STRIPS);
      const pat = stripPattern[Math.min(STRIPS-1, stripIdx)];

      dc.fillStyle = bg;
      dc.fillRect(x, y, CELL, CELL);

      const fg = isY ? '#CC9900' : '#8B0000';
      dc.fillStyle = fg; dc.strokeStyle = fg; dc.lineWidth = 0.8;

      if (pat === 0) {
        dc.font = `bold ${CELL-2}px monospace`;
        dc.globalAlpha = 0.35;
        dc.fillText(SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)], x+CELL/2, y+CELL/2);
        dc.globalAlpha = 1;
      } else if (pat === 1) {
        if ((Math.floor(x/CELL)+Math.floor(y/CELL))%2===0) {
          dc.globalAlpha = 0.2; dc.fillRect(x+1,y+1,CELL-2,CELL-2); dc.globalAlpha = 1;
        }
      } else {
        dc.globalAlpha = 0.2; dc.fillRect(x, y+CELL/2-1, CELL, 2); dc.globalAlpha = 1;
      }
    }
  }
  fctx.clearRect(0, 0, FLAG_W, FLAG_H);
  fctx.drawImage(d, 0, 0);
}
ditherFlag();

// ═══════════════════════════════════════════════════════════════
// 2. 텍스트 + 합성
// ═══════════════════════════════════════════════════════════════

const FLAG_DIAG = -8 * Math.PI / 180;
const FLAG_RW = W * 1.5;
const FLAG_RH = FLAG_RW * (FLAG_H / FLAG_W);
const FLAG_OX = (W - FLAG_RW) / 2;
const FLAG_OY = (H - FLAG_RH) / 2;

const TEXT_LINES = ['차이나', '쇼크', '2.0'];
const TS = 210, TLH = 190, TX = 40, TY0 = 220;

const textCanvas = document.createElement('canvas');
textCanvas.width = W; textCanvas.height = H;
const tctx = textCanvas.getContext('2d');
function renderText() {
  tctx.clearRect(0, 0, W, H);
  tctx.fillStyle = '#000';
  tctx.font = `900 ${TS}px Pretendard, sans-serif`;
  tctx.textBaseline = 'alphabetic'; tctx.textAlign = 'left';
  let y = TY0;
  for (const l of TEXT_LINES) { tctx.fillText(l, TX, y); y += TLH; }
}

const compCanvas = document.createElement('canvas');
compCanvas.width = FLAG_W; compCanvas.height = FLAG_H;
const cctx = compCanvas.getContext('2d');
function renderComp() {
  cctx.clearRect(0, 0, FLAG_W, FLAG_H);
  cctx.drawImage(flagCanvas, 0, 0);
}

renderText(); renderComp();
if (document.fonts?.ready) document.fonts.ready.then(() => { renderText(); renderComp(); });

// ═══════════════════════════════════════════════════════════════
// 3. 펄럭임 + 마우스
// ═══════════════════════════════════════════════════════════════

const WAVES = [
  { amp:55, freq:0.08, spd:1.1, ph:0 },
  { amp:28, freq:0.18, spd:1.8, ph:1.3 },
  { amp:12, freq:0.35, spd:2.5, ph:2.7 },
];
const NOISE = 8;
const bNoise = new Float32Array(STRIPS);
for (let i = 0; i < STRIPS; i++) bNoise[i] = (Math.random()-0.5)*2;

let mX = 0, mY = 0, mA = false;
canvas.addEventListener('pointermove', e => {
  const r = canvas.getBoundingClientRect();
  mX = ((e.clientX-r.left)/r.width)*W;
  mY = ((e.clientY-r.top)/r.height)*H;
  mA = true;
});
canvas.addEventListener('pointerleave', () => mA = false);

// 스트립별 Y 변위 (전체 스트립 이동)
function calcDy(i, t) {
  let dy = 0;
  for (const w of WAVES) dy += Math.sin(i*w.freq + t*w.spd + w.ph) * w.amp;
  dy += bNoise[i] * NOISE;
  if (mA) {
    const sx = FLAG_OX + (i/STRIPS)*FLAG_RW;
    const inf = Math.max(0, 1 - Math.abs(sx - mX)/300);
    if (inf > 0) dy += Math.sin(i*0.4 + t*5.5) * 36 * inf;
  }
  return dy;
}

// S-curve: 스트립 내부 슬라이스별 X 오프셋 (가로 방향 곡선)
const SLICES_PER_STRIP = 24; // 각 스트립을 세로 24조각으로 나눠 S-curve
function calcSliceXOffset(stripIdx, sliceIdx, t) {
  // 여러 사인파 합성 → S-curve
  const y01 = sliceIdx / SLICES_PER_STRIP; // 0~1 (위→아래)
  let dx = 0;
  dx += Math.sin(y01 * Math.PI * 2.5 + t * 1.4 + stripIdx * 0.3) * 14;
  dx += Math.sin(y01 * Math.PI * 5 + t * 2.2 + stripIdx * 0.7) * 6;
  // 하단으로 갈수록 진폭 증가 (하단 분해 강화)
  dx *= (0.6 + y01 * 0.8);
  return dx;
}

// ═══════════════════════════════════════════════════════════════
// 4-A. 국기가 덮은 영역의 텍스트 글리치
// 국기 스트립이 지나간 자리의 텍스트만 RGB split + 색 반전 + 미세 왜곡
// ═══════════════════════════════════════════════════════════════

function drawTextGlitchUnderFlag(t) {
  const sW = FLAG_RW / STRIPS;
  const GAP = sW * 0.35;
  const dW = sW - GAP;
  const sliceH = FLAG_RH / SLICES_PER_STRIP;

  ctx.save();
  ctx.translate(W/2, H/2);
  ctx.rotate(FLAG_DIAG);
  ctx.translate(-W/2, -H/2);

  for (let i = 0; i < STRIPS; i++) {
    const dy = calcDy(i, t);
    const baseDx = FLAG_OX + i * sW;

    for (let s = 0; s < SLICES_PER_STRIP; s++) {
      const sliceXOff = calcSliceXOffset(i, s, t);
      const dx = baseDx + sliceXOff;
      const sliceY = FLAG_OY + dy + s * sliceH;

      // 이 슬라이스가 아트보드 안에 있는지 대략 체크
      if (dx + dW < 0 || dx > W || sliceY + sliceH < 0 || sliceY > H) continue;

      // 아트보드 좌표계에서 이 슬라이스 영역의 텍스트를 crop
      // (회전 좌표계 안이므로 textCanvas 의 원본 좌표와 직접 매핑은 근사)
      const artX = dx;
      const artY = sliceY;

      // RGB split — 빨강 채널 좌로, 시안 채널 우로
      const splitAmt = 2 + Math.sin(t * 3 + i * 0.5 + s * 0.3) * 2;

      // 빨강 tint
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = '#FF3333';
      ctx.fillRect(artX - splitAmt, artY, dW, sliceH);
      ctx.restore();

      // 시안 tint (반대쪽)
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = '#00FFFF';
      ctx.fillRect(artX + splitAmt, artY, dW, sliceH);
      ctx.restore();
    }
  }
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
// 4-B. 국기 스트립 렌더
// ═══════════════════════════════════════════════════════════════

function drawStrips(t) {
  const sW = FLAG_RW / STRIPS;
  const srcW = FLAG_W / STRIPS;
  const GAP = sW * 0.35; // 스트립 너비의 35% 를 틈으로 — 넓은 간격
  const dW = sW - GAP;
  const sliceH = FLAG_RH / SLICES_PER_STRIP;
  const srcSliceH = FLAG_H / SLICES_PER_STRIP;

  ctx.save();
  ctx.translate(W/2, H/2);
  ctx.rotate(FLAG_DIAG);
  ctx.translate(-W/2, -H/2);

  for (let i = 0; i < STRIPS; i++) {
    const dy = calcDy(i, t);
    const baseDx = FLAG_OX + i * sW;
    const baseY = FLAG_OY + dy;

    // 하단 분해 강도 (0~1, 하단 25% 에서 점점 강해짐)
    for (let s = 0; s < SLICES_PER_STRIP; s++) {
      const y01 = s / SLICES_PER_STRIP;
      const sliceXOff = calcSliceXOffset(i, s, t);
      const dx = baseDx + sliceXOff;
      const sliceY = baseY + s * sliceH;

      // 하단 분해: y01 > 0.75 이면 슬라이스가 점점 떨어져나감
      let extraFall = 0;
      let extraAlpha = 1;
      if (y01 > 0.75) {
        const breakProgress = (y01 - 0.75) / 0.25; // 0~1
        extraFall = breakProgress * (15 + Math.sin(t * 3 + i + s) * 12);
        extraAlpha = 1 - breakProgress * 0.6;
        // 일부 슬라이스는 완전히 떨어져나감
        if (Math.sin(t * 2 + i * 1.3 + s * 0.7) > 0.5) {
          extraFall += breakProgress * 20;
          extraAlpha *= 0.5;
        }
      }

      ctx.globalAlpha = extraAlpha;
      ctx.drawImage(
        compCanvas,
        i * srcW, s * srcSliceH, srcW, srcSliceH,
        dx, sliceY + extraFall, dW, sliceH + 0.5
      );
      ctx.globalAlpha = 1;

      // 엣지 하이라이트 (종이 두께감)
      if (s === 0 || Math.abs(sliceXOff) > 3) {
        const li = Math.min(0.35, Math.abs(sliceXOff) / 40);
        ctx.fillStyle = sliceXOff > 0
          ? `rgba(255,255,255,${li})`
          : `rgba(0,0,0,${li * 0.5})`;
        ctx.fillRect(dx, sliceY + extraFall, 1.2, sliceH);
      }
    }
  }
  ctx.restore();
}

function drawEdgeGlow(t) {
  const sW = FLAG_RW / STRIPS;
  ctx.save();
  ctx.translate(W/2, H/2); ctx.rotate(FLAG_DIAG); ctx.translate(-W/2, -H/2);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 1; i < STRIPS; i++) {
    const x = FLAG_OX + i * sW;
    // 간단한 glow — 스트립 경계에 옅은 빨강-옐로
    ctx.strokeStyle = 'rgba(255, 180, 50, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, FLAG_OY - 60);
    ctx.lineTo(x, FLAG_OY + FLAG_RH + 60);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

function drawCircuitOverlay(t) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.10)';
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 10; i++) {
    const y0 = (i * H / 7) + Math.sin(t * 0.5 + i) * 25;
    const x0 = Math.sin(t * 0.3 + i * 1.7) * 80;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + W * 0.8, y0 + H * 0.25);
    ctx.stroke();
  }
  ctx.restore();
}

function drawScanlines() {
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#00E5FF';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  ctx.restore();
}

function drawScatteredDots(t) {
  ctx.save();
  const DOT_COLORS = ['#0066FF','#FFDD00','#FF3344','#00DDAA','#FF66AA'];
  for (let i = 0; i < 60; i++) {
    const seed = i * 7.31;
    const x = (Math.sin(seed) * 0.5 + 0.5) * W + Math.sin(t * 0.5 + seed) * 8;
    const y = (Math.cos(seed * 1.3) * 0.5 + 0.5) * H + Math.cos(t * 0.4 + seed) * 6;
    const r = 1.5 + (seed % 3);
    ctx.globalAlpha = 0.4 + Math.sin(t * 2 + seed) * 0.25;
    ctx.fillStyle = DOT_COLORS[i % DOT_COLORS.length];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawVignette() {
  const g = ctx.createRadialGradient(W/2,H/2,W*0.3,W/2,H/2,W*0.7);
  g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,0.15)');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
}

function draw(t) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  // 1. 텍스트 고정 (움직이지 않음)
  ctx.drawImage(textCanvas, 0, 0);

  // 2. 국기 스트립 (위에 덮음)
  drawStrips(t);

  // 3. 국기가 덮은 영역의 텍스트만 글리치 — 텍스트를 다시 그리되 국기 마스크 안에서만
  drawTextGlitchUnderFlag(t);

  drawEdgeGlow(t);
  drawCircuitOverlay(t);
  drawScatteredDots(t);
  drawScanlines();
  drawVignette();
}

function animate(now = 0) {
  requestAnimationFrame(animate);
  draw(now / 1000);
}

if (IS_THUMB) {
  requestAnimationFrame(() => draw(0.3));
} else {
  animate();
}
