// Day 11 — 차이나 쇼크 2.0 (v3)
// A4 1:1.414 아트보드 + 국기/텍스트 합성 텍스처를 세로 스트립 48개로 분할.
// 큰 셀(10px) 디더링으로 국기 형상을 유지하되 다색 픽셀 모자이크.
// 스트립-텍스트 교차 지점 글리치. 성능: 전부 오프스크린 프리렌더 + drawImage.

const IS_THUMB = new URLSearchParams(location.search).has('thumb');

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// A4 1:1.414
const W = canvas.width = 709;
const H = canvas.height = 1003;

// ═══════════════════════════════════════════════════════════════
// 1. 국기 디더링 텍스처 (offscreen) — 크게 그려서 셀이 선명
// ═══════════════════════════════════════════════════════════════

const FLAG_W = 900;
const FLAG_H = 600;
const CELL = 10; // 디더링 셀 크기

const flagCanvas = document.createElement('canvas');
flagCanvas.width = FLAG_W;
flagCanvas.height = FLAG_H;
const fctx = flagCanvas.getContext('2d');

function drawStar(c, cx, cy, radius, rotation, color) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = rotation + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? radius : radius * 0.381966;
    const x = cx + Math.cos(ang - Math.PI / 2) * r;
    const y = cy + Math.sin(ang - Math.PI / 2) * r;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
  c.fillStyle = color;
  c.fill();
}

// 베이스: 깨끗한 국기 먼저 그림
function buildBaseFlag() {
  fctx.fillStyle = '#EE1C25';
  fctx.fillRect(0, 0, FLAG_W, FLAG_H);

  const cell = FLAG_W / 30;
  const yellow = '#FFFF00';
  const bigR = cell * 3;
  const bigCX = cell * 5;
  const bigCY = cell * 5;
  drawStar(fctx, bigCX, bigCY, bigR, 0, yellow);

  const smallR = cell * 1;
  const smalls = [
    { cx: cell * 10, cy: cell * 2 },
    { cx: cell * 12, cy: cell * 4 },
    { cx: cell * 12, cy: cell * 7 },
    { cx: cell * 10, cy: cell * 9 },
  ];
  for (const s of smalls) {
    const angToBig = Math.atan2(bigCY - s.cy, bigCX - s.cx);
    drawStar(fctx, s.cx, s.cy, smallR, angToBig + Math.PI / 2, yellow);
  }
}
buildBaseFlag();

// 디더링: 10px 셀로 국기를 다시 그리되 각 셀 색을 살짝 변형
// 디더 팔레트 — 파스텔 포인트 (비비드 + 파스텔 섞임)
const RED_DITHER = [
  '#EE1C25', '#EE1C25', '#EE1C25', '#EE1C25', // 기본 빨강 (빈도 높음)
  '#F14158', '#D6152A', '#FF4A56', '#C40E20',
  '#FF6B80', '#E63E5C', // 핑크 포인트
  '#FF9A9A', // 연 pastel
];
const YELLOW_DITHER = [
  '#FFFF00', '#FFFF00', '#FFFF00',
  '#FFE63A', '#FFD83D',
  '#FFF68A', '#FFD100',
];

function ditherFlag() {
  // 원본 픽셀 데이터 읽고, 각 CELL 단위로 다수결 색 결정 후 팔레트 랜덤 tint
  const imgData = fctx.getImageData(0, 0, FLAG_W, FLAG_H);
  const src = imgData.data;

  // 새 캔버스에 디더링된 결과 그리기
  const dCanvas = document.createElement('canvas');
  dCanvas.width = FLAG_W;
  dCanvas.height = FLAG_H;
  const dctx = dCanvas.getContext('2d');

  for (let y = 0; y < FLAG_H; y += CELL) {
    for (let x = 0; x < FLAG_W; x += CELL) {
      // 이 셀 중심 픽셀 색 확인
      const cx = Math.min(FLAG_W - 1, x + CELL / 2);
      const cy = Math.min(FLAG_H - 1, y + CELL / 2);
      const idx = (cy * FLAG_W + cx) * 4;
      const r = src[idx], g = src[idx + 1], b = src[idx + 2];
      // 노랑 영역 (R+G > 400, B < 100) 인지
      const isYellow = r > 200 && g > 200 && b < 100;
      const palette = isYellow ? YELLOW_DITHER : RED_DITHER;
      const color = palette[Math.floor(Math.random() * palette.length)];
      dctx.fillStyle = color;
      dctx.fillRect(x, y, CELL, CELL);
    }
  }
  // 최종 flagCanvas 에 디더링 결과 복사
  fctx.clearRect(0, 0, FLAG_W, FLAG_H);
  fctx.drawImage(dCanvas, 0, 0);
}
ditherFlag();

// ═══════════════════════════════════════════════════════════════
// 2. 텍스트 합성 텍스처
// ═══════════════════════════════════════════════════════════════

const STRIPS = 48;
const FLAG_DIAG_ANGLE = -8 * Math.PI / 180;
const FLAG_RENDER_W = W * 1.45;
const FLAG_RENDER_H = FLAG_RENDER_W * (FLAG_H / FLAG_W);
const FLAG_OFFSET_X = (W - FLAG_RENDER_W) / 2;
const FLAG_OFFSET_Y = (H - FLAG_RENDER_H) / 2;

const TEXT_LINES = ['차이나', '쇼크', '2.0'];
const SUBTITLE = 'CHINA SHOCK 2.0';
const TEXT_SIZE = 170;
const TEXT_LINE_HEIGHT = 155;
const TEXT_X = 48;
const TEXT_Y_START = 200;

// 아트보드에 선명히 깔릴 텍스트 (국기 밑)
const textCanvas = document.createElement('canvas');
textCanvas.width = W;
textCanvas.height = H;
const tctx = textCanvas.getContext('2d');

function renderText() {
  tctx.clearRect(0, 0, W, H);
  tctx.fillStyle = '#000';
  tctx.font = `900 ${TEXT_SIZE}px Pretendard, sans-serif`;
  tctx.textBaseline = 'alphabetic';
  tctx.textAlign = 'left';
  let y = TEXT_Y_START;
  for (const line of TEXT_LINES) {
    tctx.fillText(line, TEXT_X, y);
    y += TEXT_LINE_HEIGHT;
  }
  // 서브타이틀
  tctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  tctx.font = `500 16px Pretendard, sans-serif`;
  tctx.fillText(SUBTITLE, TEXT_X, y - 40);
}

// 합성 텍스처 — flag 원본 좌표계에서 텍스트를 얹음
const compositeCanvas = document.createElement('canvas');
compositeCanvas.width = FLAG_W;
compositeCanvas.height = FLAG_H;
const cctx = compositeCanvas.getContext('2d');

function renderComposite() {
  // 합성이지만 텍스트는 제외 — 국기만 (텍스트는 아트보드에 선명히 깔릴 것)
  cctx.clearRect(0, 0, FLAG_W, FLAG_H);
  cctx.drawImage(flagCanvas, 0, 0);
}

renderText();
renderComposite();

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    renderText();
    renderComposite();
  });
}

// 텍스트 히트맵 — 글리치용
function isTextArea(artboardX, artboardY) {
  if (artboardX < TEXT_X - 10 || artboardX > TEXT_X + 540) return false;
  const yMin = TEXT_Y_START - TEXT_SIZE + 30;
  const yMax = TEXT_Y_START + TEXT_LINE_HEIGHT * 2 + 30;
  return artboardY > yMin && artboardY < yMax;
}

// ═══════════════════════════════════════════════════════════════
// 3. 펄럭임 / 마우스
// ═══════════════════════════════════════════════════════════════

const WAVE_CONFIGS = [
  { amp: 58, freq: 0.075, speed: 1.2, phase: 0 },
  { amp: 30, freq: 0.16,  speed: 1.9, phase: 1.3 },
  { amp: 14, freq: 0.32,  speed: 2.6, phase: 2.7 },
];
const NOISE_AMP = 8;
const baseNoise = new Float32Array(STRIPS);
for (let i = 0; i < STRIPS; i++) baseNoise[i] = (Math.random() - 0.5) * 2;

// 스트립별 개성 — 수평 shake / 세로 scale 변동
const stripShakeSeed = new Float32Array(STRIPS);
const stripScaleSeed = new Float32Array(STRIPS);
for (let i = 0; i < STRIPS; i++) {
  stripShakeSeed[i] = Math.random();
  stripScaleSeed[i] = Math.random();
}

let mouseX = 0, mouseY = 0;
let mouseActive = false;
canvas.addEventListener('pointermove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = ((e.clientX - rect.left) / rect.width) * W;
  mouseY = ((e.clientY - rect.top) / rect.height) * H;
  mouseActive = true;
});
canvas.addEventListener('pointerleave', () => { mouseActive = false; });

const stripDisplacement = new Float32Array(STRIPS);

function computeStripDisplacement(stripIdx, t) {
  let dy = 0;
  for (const w of WAVE_CONFIGS) {
    dy += Math.sin(stripIdx * w.freq + t * w.speed + w.phase) * w.amp;
  }
  dy += baseNoise[stripIdx] * NOISE_AMP;

  if (mouseActive) {
    const stripX = FLAG_OFFSET_X + (stripIdx / STRIPS) * FLAG_RENDER_W;
    const dist = Math.abs(stripX - mouseX);
    const infl = Math.max(0, 1 - dist / 300);
    if (infl > 0) {
      dy += Math.sin(stripIdx * 0.4 + t * 5.5) * 36 * infl;
    }
  }
  return dy;
}

// ═══════════════════════════════════════════════════════════════
// 4. 렌더
// ═══════════════════════════════════════════════════════════════

function drawFlagStrips(t) {
  const stripW = FLAG_RENDER_W / STRIPS;
  const srcStripW = FLAG_W / STRIPS;
  const GAP = 5.0; // 스트립 사이 넓은 틈 — 흩날리는 느낌
  const drawW = stripW - GAP; // 실제 그려지는 스트립 너비 (GAP 만큼 줄여서 사이가 벌어짐)

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(FLAG_DIAG_ANGLE);
  ctx.translate(-W / 2, -H / 2);

  for (let i = 0; i < STRIPS; i++) {
    const dy = computeStripDisplacement(i, t);
    stripDisplacement[i] = dy;

    // 스트립별 수평 shake (좌우 살짝 흔들) + 세로 scale (찢어진 종이처럼 높이 달라짐)
    const shakeAmt = Math.sin(t * 1.3 + stripShakeSeed[i] * Math.PI * 2) * 3;
    const scaleVar = 1 + (stripScaleSeed[i] - 0.5) * 0.08 + Math.sin(t * 0.8 + i * 0.3) * 0.04;

    const dx = FLAG_OFFSET_X + i * stripW + shakeAmt;
    const stripH = FLAG_RENDER_H * scaleVar;
    const dyTop = FLAG_OFFSET_Y + dy - (stripH - FLAG_RENDER_H) / 2;

    const stripCenterX = dx + stripW / 2;
    const stripCenterY = dyTop + stripH / 2;
    const crossesText = isTextArea(stripCenterX, stripCenterY);

    const prevDy = i > 0 ? stripDisplacement[i - 1] : dy;
    const delta = dy - prevDy;

    if (crossesText) {
      const splitAmt = 2 + Math.abs(Math.sin(t * 2 + i)) * 3;

      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = 'saturate(1.6) hue-rotate(-8deg)';
      ctx.drawImage(
        compositeCanvas,
        i * srcStripW, 0, srcStripW, FLAG_H,
        dx - splitAmt, dyTop, drawW, stripH
      );
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.globalCompositeOperation = 'screen';
      ctx.filter = 'saturate(1.3) hue-rotate(190deg)';
      ctx.drawImage(
        compositeCanvas,
        i * srcStripW, 0, srcStripW, FLAG_H,
        dx + splitAmt, dyTop, drawW, stripH
      );
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(
        compositeCanvas,
        i * srcStripW, 0, srcStripW, FLAG_H,
        dx, dyTop, drawW, stripH
      );
      ctx.restore();

      const glitchRoll = Math.sin(t * 3 + i * 0.9);
      if (glitchRoll > 0.7) {
        const fallAmt = 4 + glitchRoll * 14;
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.drawImage(
          compositeCanvas,
          i * srcStripW, 0, srcStripW, FLAG_H,
          dx + (Math.random() - 0.5) * 3, dyTop + fallAmt, drawW, stripH
        );
        ctx.restore();
      }
    } else {
      ctx.drawImage(
        compositeCanvas,
        i * srcStripW, 0, srcStripW, FLAG_H,
        dx, dyTop, drawW, stripH
      );
    }

    // 스트립 상/하단 페이드 — 날리는 느낌
    const fadeH = stripH * 0.1;
    // 상단 페이드
    const gradTop = ctx.createLinearGradient(0, dyTop, 0, dyTop + fadeH);
    gradTop.addColorStop(0, 'rgba(255,255,255,1)');
    gradTop.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradTop;
    ctx.fillRect(dx, dyTop, drawW, fadeH);
    // 하단 페이드
    const gradBot = ctx.createLinearGradient(0, dyTop + stripH - fadeH, 0, dyTop + stripH);
    gradBot.addColorStop(0, 'rgba(255,255,255,0)');
    gradBot.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = gradBot;
    ctx.fillRect(dx, dyTop + stripH - fadeH, drawW, fadeH);

    // 종이 말림 엣지 하이라이트/섀도우
    if (Math.abs(delta) > 1.5) {
      const lightIntensity = Math.min(0.4, Math.abs(delta) / 60);
      if (delta > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${lightIntensity})`;
        ctx.fillRect(dx, dyTop, 1.5, stripH);
      } else {
        ctx.fillStyle = `rgba(0, 0, 0, ${lightIntensity * 0.6})`;
        ctx.fillRect(dx, dyTop, 1.5, stripH);
      }
    }
  }
  ctx.restore();
}

function drawStripEdgeGlow() {
  const stripW = FLAG_RENDER_W / STRIPS;

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(FLAG_DIAG_ANGLE);
  ctx.translate(-W / 2, -H / 2);

  ctx.globalCompositeOperation = 'lighter';

  for (let i = 1; i < STRIPS; i++) {
    const dy1 = stripDisplacement[i - 1];
    const dy2 = stripDisplacement[i];
    const dy = (dy1 + dy2) / 2;
    const x = FLAG_OFFSET_X + i * stripW;
    const y0 = FLAG_OFFSET_Y + dy;
    const y1 = FLAG_OFFSET_Y + dy + FLAG_RENDER_H;
    const delta = Math.min(1, Math.abs(dy2 - dy1) / 14);
    if (delta < 0.1) continue;

    const grad = ctx.createLinearGradient(x, y0, x, y1);
    grad.addColorStop(0,   `rgba(255, 80, 80, ${0.15 * delta})`);
    grad.addColorStop(0.5, `rgba(255, 220, 50, ${0.45 * delta})`);
    grad.addColorStop(1,   `rgba(255, 80, 80, ${0.15 * delta})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.2 + delta * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

function drawScanlines() {
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#000';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  ctx.restore();
}

function drawVignette() {
  const g = ctx.createRadialGradient(W/2, H/2, W*0.3, W/2, H/2, W*0.7);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function draw(t) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  // 텍스트 선명히 깔림 (국기 밑)
  ctx.drawImage(textCanvas, 0, 0);
  // 국기 스트립이 위로 덮으며 흩날림
  drawFlagStrips(t);
  drawStripEdgeGlow();
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
