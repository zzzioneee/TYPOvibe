// Day 11 — 차이나 쇼크 2.0 (v5)
// 레퍼런스 5장 반영: 심볼 디더링 + 시안 회로 + 스트립 파편 + 산란 도트

const IS_THUMB = new URLSearchParams(location.search).has('thumb');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width = 709;
const H = canvas.height = 1003;

// ═══════════════════════════════════════════════════════════════
// 1. 국기 — 심볼 디더링 (Image 2 + 5)
// ═══════════════════════════════════════════════════════════════

const FLAG_W = 900, FLAG_H = 600, CELL = 10;
const flagCanvas = document.createElement('canvas');
flagCanvas.width = FLAG_W; flagCanvas.height = FLAG_H;
const fctx = flagCanvas.getContext('2d');

// 깨끗한 국기 먼저
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

// 심볼 + 패턴 디더링
const RED_PAL = ['#EE1C25','#EE1C25','#EE1C25','#F14158','#D6152A','#FF4A56','#C40E20','#FF6B80','#FF9A9A','#E63E5C'];
const YEL_PAL = ['#FFFF00','#FFFF00','#FFE63A','#FFD83D','#FFF68A','#FFD100'];
const SYMBOLS = ['+', '×', '◇', '⊕', '■', '●', '✳'];
// 스트립별 패턴 종류 (0=심볼, 1=체커, 2=스트라이프)
const STRIPS = 48;
const stripPattern = new Uint8Array(STRIPS);
for (let i = 0; i < STRIPS; i++) stripPattern[i] = Math.floor(Math.random() * 3);

function ditherFlag() {
  const src = fctx.getImageData(0, 0, FLAG_W, FLAG_H).data;
  const d = document.createElement('canvas');
  d.width = FLAG_W; d.height = FLAG_H;
  const dc = d.getContext('2d');
  dc.font = `bold ${CELL-1}px monospace`;
  dc.textBaseline = 'middle'; dc.textAlign = 'center';

  const cols = Math.ceil(FLAG_W / CELL);
  for (let y = 0; y < FLAG_H; y += CELL) {
    for (let x = 0; x < FLAG_W; x += CELL) {
      const cx = Math.min(FLAG_W-1, x + CELL/2)|0;
      const cy = Math.min(FLAG_H-1, y + CELL/2)|0;
      const idx = (cy * FLAG_W + cx) * 4;
      const r = src[idx], g = src[idx+1], b = src[idx+2];
      const isYellow = r > 200 && g > 200 && b < 100;
      const pal = isYellow ? YEL_PAL : RED_PAL;
      const bg = pal[Math.floor(Math.random() * pal.length)];

      // 스트립 인덱스 (x 기준)
      const stripIdx = Math.floor((x / FLAG_W) * STRIPS);
      const pat = stripPattern[Math.min(STRIPS-1, stripIdx)];

      // 배경색
      dc.fillStyle = bg;
      dc.fillRect(x, y, CELL, CELL);

      // 패턴 오버레이
      const fgColor = isYellow ? '#CC9900' : '#8B0000';
      dc.fillStyle = fgColor;
      dc.strokeStyle = fgColor;
      dc.lineWidth = 0.8;

      if (pat === 0) {
        // 심볼 (Image 2)
        const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        dc.font = `bold ${CELL-2}px monospace`;
        dc.globalAlpha = 0.35;
        dc.fillText(sym, x + CELL/2, y + CELL/2);
        dc.globalAlpha = 1;
      } else if (pat === 1) {
        // 체커 (Image 5)
        if ((Math.floor(x/CELL) + Math.floor(y/CELL)) % 2 === 0) {
          dc.globalAlpha = 0.2;
          dc.fillRect(x+1, y+1, CELL-2, CELL-2);
          dc.globalAlpha = 1;
        }
      } else {
        // 수평 스트라이프 (Image 5)
        dc.globalAlpha = 0.2;
        dc.fillRect(x, y + CELL/2 - 1, CELL, 2);
        dc.globalAlpha = 1;
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
const FLAG_RW = W * 1.45;
const FLAG_RH = FLAG_RW * (FLAG_H / FLAG_W);
const FLAG_OX = (W - FLAG_RW) / 2;
const FLAG_OY = (H - FLAG_RH) / 2;

const TEXT_LINES = ['차이나', '쇼크', '2.0'];
const SUBTITLE = 'CHINA SHOCK 2.0';
const TS = 170, TLH = 155, TX = 48, TY0 = 200;

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
  tctx.fillStyle = 'rgba(0,0,0,0.8)';
  tctx.font = '500 16px Pretendard, sans-serif';
  tctx.fillText(SUBTITLE, TX, y - 40);
}

// 합성 = 국기만 (텍스트는 아트보드에 선명히 깔림)
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
  { amp:58, freq:0.075, spd:1.2, ph:0 },
  { amp:30, freq:0.16,  spd:1.9, ph:1.3 },
  { amp:14, freq:0.32,  spd:2.6, ph:2.7 },
];
const NOISE = 8;
const bNoise = new Float32Array(STRIPS);
const shakeS = new Float32Array(STRIPS);
const scaleS = new Float32Array(STRIPS);
for (let i = 0; i < STRIPS; i++) {
  bNoise[i] = (Math.random()-0.5)*2;
  shakeS[i] = Math.random();
  scaleS[i] = Math.random();
}

let mX = 0, mY = 0, mA = false;
canvas.addEventListener('pointermove', e => {
  const r = canvas.getBoundingClientRect();
  mX = ((e.clientX-r.left)/r.width)*W;
  mY = ((e.clientY-r.top)/r.height)*H;
  mA = true;
});
canvas.addEventListener('pointerleave', () => mA = false);

const sDy = new Float32Array(STRIPS);
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

// ═══════════════════════════════════════════════════════════════
// 4. 산란 컬러 도트 (Image 3) — 프리렌더
// ═══════════════════════════════════════════════════════════════

const DOT_COLORS = ['#0066FF','#FFDD00','#FF3344','#00DDAA','#FF66AA'];
const dots = [];
for (let i = 0; i < 80; i++) {
  dots.push({
    x: Math.random() * W,
    y: Math.random() * H,
    r: 1.5 + Math.random() * 3,
    c: DOT_COLORS[Math.floor(Math.random() * DOT_COLORS.length)],
    speed: 0.3 + Math.random() * 0.8,
    phase: Math.random() * Math.PI * 2,
  });
}

// ═══════════════════════════════════════════════════════════════
// 5. 렌더
// ═══════════════════════════════════════════════════════════════

function drawStrips(t) {
  const sW = FLAG_RW / STRIPS;
  const srcW = FLAG_W / STRIPS;
  const GAP = 5;
  const dW = sW - GAP;

  ctx.save();
  ctx.translate(W/2, H/2);
  ctx.rotate(FLAG_DIAG);
  ctx.translate(-W/2, -H/2);

  for (let i = 0; i < STRIPS; i++) {
    const dy = calcDy(i, t);
    sDy[i] = dy;

    const shake = Math.sin(t*1.3 + shakeS[i]*Math.PI*2) * 3;
    const sc = 1 + (scaleS[i]-0.5)*0.08 + Math.sin(t*0.8+i*0.3)*0.04;
    const dx = FLAG_OX + i*sW + shake;
    const sH = FLAG_RH * sc;
    const dyT = FLAG_OY + dy - (sH - FLAG_RH)/2;

    // 본체
    ctx.drawImage(compCanvas, i*srcW, 0, srcW, FLAG_H, dx, dyT, dW, sH);

    // 상하단 페이드
    const fH = sH * 0.1;
    const gT = ctx.createLinearGradient(0, dyT, 0, dyT+fH);
    gT.addColorStop(0,'rgba(255,255,255,1)'); gT.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle = gT; ctx.fillRect(dx, dyT, dW, fH);
    const gB = ctx.createLinearGradient(0, dyT+sH-fH, 0, dyT+sH);
    gB.addColorStop(0,'rgba(255,255,255,0)'); gB.addColorStop(1,'rgba(255,255,255,1)');
    ctx.fillStyle = gB; ctx.fillRect(dx, dyT+sH-fH, dW, fH);

    // 엣지 하이라이트/섀도우
    const prev = i > 0 ? sDy[i-1] : dy;
    const delta = dy - prev;
    if (Math.abs(delta) > 1.5) {
      const li = Math.min(0.4, Math.abs(delta)/60);
      ctx.fillStyle = delta > 0
        ? `rgba(255,255,255,${li})`
        : `rgba(0,0,0,${li*0.6})`;
      ctx.fillRect(dx, dyT, 1.5, sH);
    }

    // 하단 파편 분해 (Image 1) — 하단 20% 셀이 떨어져나감
    const fragZone = dyT + sH * 0.8;
    const fragCount = 3 + Math.floor(Math.random() * 2);
    for (let f = 0; f < fragCount; f++) {
      const fy = fragZone + Math.random() * sH * 0.2;
      const fx = dx + Math.random() * dW;
      const fs = 3 + Math.random() * 5;
      const fall = Math.sin(t * 2 + i + f) * 8 + 4;
      ctx.globalAlpha = 0.5;
      ctx.drawImage(compCanvas,
        i*srcW + Math.random()*srcW*0.5, FLAG_H*0.8, srcW*0.1, FLAG_H*0.05,
        fx, fy + fall, fs, fs
      );
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

function drawEdgeGlow() {
  const sW = FLAG_RW / STRIPS;
  ctx.save();
  ctx.translate(W/2, H/2); ctx.rotate(FLAG_DIAG); ctx.translate(-W/2, -H/2);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 1; i < STRIPS; i++) {
    const d1 = sDy[i-1], d2 = sDy[i];
    const d = (d1+d2)/2;
    const x = FLAG_OX + i*sW;
    const y0 = FLAG_OY + d, y1 = FLAG_OY + d + FLAG_RH;
    const delta = Math.min(1, Math.abs(d2-d1)/14);
    if (delta < 0.1) continue;
    const g = ctx.createLinearGradient(x, y0, x, y1);
    g.addColorStop(0, `rgba(255,80,80,${0.15*delta})`);
    g.addColorStop(0.5, `rgba(255,220,50,${0.45*delta})`);
    g.addColorStop(1, `rgba(255,80,80,${0.15*delta})`);
    ctx.strokeStyle = g; ctx.lineWidth = 1.2+delta*1.5;
    ctx.beginPath(); ctx.moveTo(x,y0); ctx.lineTo(x,y1); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

function drawCircuitOverlay(t) {
  // 시안 회로 라인 (Image 4)
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
  ctx.lineWidth = 0.8;
  // 대각선 회로 라인 여러 줄
  for (let i = 0; i < 12; i++) {
    const y0 = (i * H / 8) + Math.sin(t * 0.5 + i) * 30;
    const x0 = Math.sin(t * 0.3 + i * 1.7) * 100;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + W * 0.8, y0 + H * 0.3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawScanlines() {
  // 시안 스캔라인 (Image 4)
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#00E5FF';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  ctx.restore();
}

function drawScatteredDots(t) {
  // 산란 컬러 도트 (Image 3)
  ctx.save();
  for (const d of dots) {
    const x = d.x + Math.sin(t * d.speed + d.phase) * 8;
    const y = d.y + Math.cos(t * d.speed * 0.7 + d.phase) * 6;
    ctx.globalAlpha = 0.5 + Math.sin(t * 2 + d.phase) * 0.3;
    ctx.fillStyle = d.c;
    ctx.beginPath();
    ctx.arc(x, y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawVignette() {
  const g = ctx.createRadialGradient(W/2,H/2,W*0.3,W/2,H/2,W*0.7);
  g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,0.18)');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
}

function draw(t) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(textCanvas, 0, 0);   // 텍스트 (국기 밑)
  drawStrips(t);                       // 국기 스트립 (위에 덮음)
  drawEdgeGlow();                      // LED glow
  drawCircuitOverlay(t);               // 시안 회로 (Image 4)
  drawScatteredDots(t);                // 산란 도트 (Image 3)
  drawScanlines();                     // 시안 스캔라인
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
