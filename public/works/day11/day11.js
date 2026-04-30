// Day 11 — 차이나 쇼크 2.0 (v7)
// 흰 배경 + 고정 텍스트 + 국기 S-curve 스트립.
// 국기가 텍스트를 덮는 영역에서 텍스트 획이 다색 타일로 분해됨.
// 꾸밈 요소 없음 (순수 흰 배경).

const IS_THUMB = new URLSearchParams(location.search).has('thumb');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width = 709;
const H = canvas.height = 1003;

// ═══════════════════════════════════════════════════════════════
// 1. 국기 — 선명한 디더링
// ═══════════════════════════════════════════════════════════════

const FLAG_W = 900, FLAG_H = 600, CELL = 4;
const flagClean = document.createElement('canvas');   // 원본 깨끗한 국기
flagClean.width = FLAG_W; flagClean.height = FLAG_H;
const fcCtx = flagClean.getContext('2d');

const flagDithered = document.createElement('canvas'); // 디더링된 국기
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

// 선명한 디더링 — 원색 위주, 탁한 색 제거
const RED_PAL = ['#EE1C25','#EE1C25','#EE1C25','#EE1C25','#FF2233','#DD1122','#FF4455','#CC0011'];
const YEL_PAL = ['#FFDE00','#FFDE00','#FFDE00','#FFE833','#FFD000'];
// 텍스트 분해용 파스텔 팔레트 (Image 1 의 핑크/민트/옐로/라벤더)
const PASTEL_PAL = ['#FFB3C6','#A8E6CF','#FFE66D','#C3B1E1','#B5EAD7','#FFDAC1','#FF9AA2','#E2F0CB','#B5B9FF','#FFFFFF'];

const STRIPS = 40;
const SLICES = 24;

function ditherFlag() {
  const src = fcCtx.getImageData(0, 0, FLAG_W, FLAG_H).data;
  const d = document.createElement('canvas');
  d.width = FLAG_W; d.height = FLAG_H;
  const dc = d.getContext('2d');

  for (let y = 0; y < FLAG_H; y += CELL) {
    for (let x = 0; x < FLAG_W; x += CELL) {
      const cx = Math.min(FLAG_W-1, x + CELL/2)|0;
      const cy = Math.min(FLAG_H-1, y + CELL/2)|0;
      const idx = (cy * FLAG_W + cx) * 4;
      const r = src[idx], g = src[idx+1], b = src[idx+2];
      const isY = r > 200 && g > 180 && b < 100;
      const pal = isY ? YEL_PAL : RED_PAL;
      dc.fillStyle = pal[Math.floor(Math.random() * pal.length)];
      dc.fillRect(x, y, CELL, CELL);
    }
  }
  fdCtx.clearRect(0, 0, FLAG_W, FLAG_H);
  fdCtx.drawImage(d, 0, 0);
}
ditherFlag();

// ═══════════════════════════════════════════════════════════════
// 2. 텍스트 (고정)
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

// 텍스트 히트맵 — 어느 픽셀이 텍스트 획인지 (alpha > 128)
let textHitmap = null; // Uint8Array, W*H, 1=텍스트, 0=배경

function buildTextHitmap() {
  const data = tctx.getImageData(0, 0, W, H).data;
  textHitmap = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    textHitmap[i] = data[i * 4 + 3] > 128 ? 1 : 0;
  }
}

renderText();
if (document.fonts?.ready) {
  document.fonts.ready.then(() => {
    renderText();
    buildTextHitmap();
  });
} else {
  buildTextHitmap();
}

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

// 텍스트 분해 타일 캔버스 — 국기가 텍스트 획을 덮을 때 사용할 파스텔 타일 텍스처
const tileCanvas = document.createElement('canvas');
tileCanvas.width = W; tileCanvas.height = H;
const tilectx = tileCanvas.getContext('2d');
function buildTileTexture() {
  for (let y = 0; y < H; y += CELL) {
    for (let x = 0; x < W; x += CELL) {
      tilectx.fillStyle = PASTEL_PAL[Math.floor(Math.random() * PASTEL_PAL.length)];
      tilectx.fillRect(x, y, CELL, CELL);
    }
  }
}
buildTileTexture();

function drawStrips(t) {
  const sW = FLAG_RW / STRIPS;
  const srcW = FLAG_W / STRIPS;
  const sliceH = FLAG_RH / SLICES;
  const srcSliceH = FLAG_H / SLICES;
  const DITHER_RADIUS = 250;

  ctx.save();
  ctx.translate(W/2, H/2);
  ctx.rotate(FLAG_DIAG);
  ctx.translate(-W/2, -H/2);

  // 1단계: 통짜 국기 먼저 그림 (기본 상태)
  ctx.drawImage(flagClean, FLAG_OX, FLAG_OY, FLAG_RW, FLAG_RH);

  // 마우스 비활성이면 통짜만 보여주고 끝
  if (!mA) {
    ctx.restore();
    return;
  }

  // 2단계: 마우스 근처만 스트립으로 분해 오버레이
  // 먼저 통짜 국기 영역을 마우스 근처만 지움 (흰색으로 덮어서 스트립이 보이게)
  for (let i = 0; i < STRIPS; i++) {
    const dy = calcDy(i, t);
    const baseDx = FLAG_OX + i * sW;

    for (let s = 0; s < SLICES; s++) {
      const y01 = s / SLICES;
      const sliceXOff = calcSliceXOff(i, s, t);

      // 이 슬라이스의 화면 위치
      const sliceCX = baseDx + sliceXOff + sW/2;
      const sliceCY = FLAG_OY + dy + s * sliceH + sliceH/2;
      const mouseDist = Math.hypot(sliceCX - mX, sliceCY - mY);

      // 마우스 반경 밖이면 스킵 (통짜 국기가 이미 그려져 있음)
      if (mouseDist > DITHER_RADIUS) continue;

      const breakAmount = Math.max(0, 1 - mouseDist / DITHER_RADIUS); // 0~1 (가까울수록 1)
      const GAP = sW * 0.35 * breakAmount; // 가까울수록 틈 벌어짐
      const dW = sW - GAP;

      const dx = baseDx + sliceXOff * breakAmount; // 가까울수록 S-curve 적용
      const sliceY = FLAG_OY + dy * breakAmount + s * sliceH; // 가까울수록 Y 변위 적용

      // 하단 분해 (마우스 근처에서만)
      let extraFall = 0, extraAlpha = 1;
      if (y01 > 0.75 && breakAmount > 0.3) {
        const bp = (y01 - 0.75) / 0.25;
        extraFall = bp * (15 + Math.sin(t*3+i+s) * 12) * breakAmount;
        extraAlpha = 1 - bp * 0.6 * breakAmount;
      }

      // 통짜 국기 위에 흰색으로 원래 위치 지우기
      const origX = FLAG_OX + i * sW;
      const origY = FLAG_OY + s * sliceH;
      ctx.fillStyle = '#fff';
      ctx.fillRect(origX, origY, sW, sliceH);

      ctx.globalAlpha = extraAlpha;

      // clean 국기 (스트립 위치로 이동)
      ctx.drawImage(
        flagClean,
        i * srcW, s * srcSliceH, srcW, srcSliceH,
        dx, sliceY + extraFall, dW, sliceH + 0.5
      );

      // dithered 오버레이 (가까울수록 강하게)
      if (breakAmount > 0.2) {
        ctx.globalAlpha = extraAlpha * (breakAmount - 0.2) / 0.8;
        ctx.drawImage(
          flagDithered,
          i * srcW, s * srcSliceH, srcW, srcSliceH,
          dx, sliceY + extraFall, dW, sliceH + 0.5
        );
      }

      ctx.globalAlpha = 1;

      // 텍스트 분해 (마우스 근처 + 텍스트 획 위)
      if (breakAmount > 0.4 && textHitmap) {
        const checkX = Math.round(dx + dW/2);
        const checkY = Math.round(sliceY + extraFall + sliceH/2);
        if (checkX >= 0 && checkX < W && checkY >= 0 && checkY < H) {
          if (textHitmap[checkY * W + checkX]) {
            ctx.globalAlpha = breakAmount * 0.8;
            ctx.drawImage(
              tileCanvas,
              checkX - dW/2, checkY - sliceH/2, dW, sliceH,
              dx, sliceY + extraFall, dW, sliceH + 0.5
            );
            ctx.globalAlpha = 1;
          }
        }
      }

      // 엣지 하이라이트
      if (breakAmount > 0.3 && Math.abs(sliceXOff * breakAmount) > 2) {
        const li = Math.min(0.3, Math.abs(sliceXOff * breakAmount) / 50);
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
  // 순수 흰 배경
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  // 텍스트 고정 (움직이지 않음)
  ctx.drawImage(textCanvas, 0, 0);

  // 국기 스트립 (위에 덮음 + 텍스트 분해)
  drawStrips(t);
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
