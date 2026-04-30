// Day 11 — 차이나 쇼크 2.0
// 오성홍기가 100개 세로 스트립으로 분해되어 사인파로 펄럭이고,
// 같은 변위가 뒤에 있는 텍스트("차이나/쇼크/2.0")에도 적용되어 함께 휘어짐.
// 스트립 경계 LED glow + 가로 스캔라인 + 마우스 파동 인터랙션.

const IS_THUMB = new URLSearchParams(location.search).has('thumb');

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 내부 해상도 고정 (day5 와 동일 규격 3:4)
const W = canvas.width = 709;
const H = canvas.height = 946;

// ═══════════════════════════════════════════════════════════════
// 오성홍기 원본 캔버스 (offscreen) — 비율 3:2
// ═══════════════════════════════════════════════════════════════

const FLAG_W = 900;
const FLAG_H = 600;
const flagCanvas = document.createElement('canvas');
flagCanvas.width = FLAG_W;
flagCanvas.height = FLAG_H;
const fctx = flagCanvas.getContext('2d');

function drawStar(cx, cy, radius, rotation, color) {
  // 5-pointed star
  fctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = rotation + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? radius : radius * 0.381966; // golden ratio 기반 내부 반지름
    const x = cx + Math.cos(ang - Math.PI / 2) * r;
    const y = cy + Math.sin(ang - Math.PI / 2) * r;
    if (i === 0) fctx.moveTo(x, y);
    else fctx.lineTo(x, y);
  }
  fctx.closePath();
  fctx.fillStyle = color;
  fctx.fill();
}

function buildFlag() {
  // 배경 빨강
  fctx.fillStyle = '#EE1C25';
  fctx.fillRect(0, 0, FLAG_W, FLAG_H);

  // 오성홍기 공식 규격: flag 3:2, 좌상단에 별 배치
  // flag 를 30×20 그리드로 보면:
  //   대별: 중심 (5, 5), 반지름 3
  //   소별1: 중심 (10, 2), 반지름 1
  //   소별2: 중심 (12, 4), 반지름 1
  //   소별3: 중심 (12, 7), 반지름 1
  //   소별4: 중심 (10, 9), 반지름 1
  const cell = FLAG_W / 30;
  const yellow = '#FFFF00';

  const bigR = cell * 3;
  const bigCX = cell * 5;
  const bigCY = cell * 5;
  drawStar(bigCX, bigCY, bigR, 0, yellow);

  // 소별 4개 — 대별 중심을 향해 회전
  const smallR = cell * 1;
  const smalls = [
    { cx: cell * 10, cy: cell * 2 },
    { cx: cell * 12, cy: cell * 4 },
    { cx: cell * 12, cy: cell * 7 },
    { cx: cell * 10, cy: cell * 9 },
  ];
  for (const s of smalls) {
    // 각 소별은 한 꼭지점이 대별 중심을 향하도록
    const angToBig = Math.atan2(bigCY - s.cy, bigCX - s.cx);
    // 기본 별은 "위쪽 꼭지점"이 12시 방향. 대별을 향하려면 rotation = angToBig + π/2
    const rot = angToBig + Math.PI / 2;
    drawStar(s.cx, s.cy, smallR, rot, yellow);
  }
}
buildFlag();

// ═══════════════════════════════════════════════════════════════
// 펄럭임 파라미터
// ═══════════════════════════════════════════════════════════════

const STRIPS = 100;           // 국기 세로 스트립 개수
const FLAG_DIAG_ANGLE = -8 * Math.PI / 180; // 국기 대각선 기울기 (위로 -8도)
// 아트보드 기준 국기 렌더 위치/크기
// 국기는 아트보드를 전부 가려야 하므로 대각선 가려도 커버되도록 큼직하게
const FLAG_RENDER_W = W * 1.4;  // 아트보드 가로 대비 1.4배
const FLAG_RENDER_H = FLAG_RENDER_W * (FLAG_H / FLAG_W); // 3:2 비율 유지
const FLAG_OFFSET_X = (W - FLAG_RENDER_W) / 2;
const FLAG_OFFSET_Y = (H - FLAG_RENDER_H) / 2;

// Sine wave 펄럭임
const WAVE_CONFIGS = [
  { amp: 22, freq: 0.035, speed: 1.4,  phase: 0 },
  { amp: 12, freq: 0.08,  speed: 2.1,  phase: 1.3 },
  { amp:  6, freq: 0.14,  speed: 2.8,  phase: 2.7 },
];
const NOISE_AMP = 4; // 각 스트립별 랜덤 오프셋

// 스트립별 베이스 노이즈 (한 번만 계산)
const baseNoise = new Float32Array(STRIPS);
for (let i = 0; i < STRIPS; i++) {
  baseNoise[i] = (Math.random() - 0.5) * 2;
}

// ═══════════════════════════════════════════════════════════════
// 텍스트 설정
// ═══════════════════════════════════════════════════════════════

const TEXT_LINES = ['차이나', '쇼크', '2.0'];
const TEXT_SIZE = 170;        // px (709 wide 아트보드 기준)
const TEXT_LINE_HEIGHT = 150; // 줄 간격
const TEXT_X = 48;            // 좌 패딩
const TEXT_Y_START = 160;     // 첫 줄 baseline

// 텍스트를 미리 오프스크린 canvas 에 렌더 (변위 적용용)
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
}
renderText();

// Pretendard 웹폰트 로드 후 재렌더
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => renderText());
}

// ═══════════════════════════════════════════════════════════════
// 마우스 인터랙션
// ═══════════════════════════════════════════════════════════════

let mouseX = 0, mouseY = 0;
let mouseActive = false;
canvas.addEventListener('pointermove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = ((e.clientX - rect.left) / rect.width) * W;
  mouseY = ((e.clientY - rect.top) / rect.height) * H;
  mouseActive = true;
});
canvas.addEventListener('pointerleave', () => { mouseActive = false; });

// ═══════════════════════════════════════════════════════════════
// 메인 루프
// ═══════════════════════════════════════════════════════════════

// 스트립별 현재 변위값 저장 — 텍스트 렌더 시 재사용
const stripDisplacement = new Float32Array(STRIPS);

function computeStripDisplacement(stripIdx, t) {
  // stripIdx 0~STRIPS-1
  let dy = 0;
  for (const w of WAVE_CONFIGS) {
    dy += Math.sin(stripIdx * w.freq + t * w.speed + w.phase) * w.amp;
  }
  dy += baseNoise[stripIdx] * NOISE_AMP;

  // 마우스 영향 — 커서 근처에 추가 파장
  if (mouseActive) {
    const stripX = FLAG_OFFSET_X + (stripIdx / STRIPS) * FLAG_RENDER_W;
    // flag 대각선 변환 전 근사 — stripX 중심 기준 mouse 거리
    const dist = Math.abs(stripX - mouseX);
    const infl = Math.max(0, 1 - dist / 250); // 250px 반경
    if (infl > 0) {
      dy += Math.sin(stripIdx * 0.3 + t * 6) * 24 * infl;
    }
  }

  return dy;
}

function drawFlagStrips(t) {
  // 국기를 대각선으로 회전시킨 좌표계에서 100개 스트립으로 분할
  const stripW = FLAG_RENDER_W / STRIPS;
  const srcStripW = FLAG_W / STRIPS;

  ctx.save();
  // 아트보드 중심을 기준으로 대각선 회전
  ctx.translate(W / 2, H / 2);
  ctx.rotate(FLAG_DIAG_ANGLE);
  ctx.translate(-W / 2, -H / 2);

  for (let i = 0; i < STRIPS; i++) {
    const dy = computeStripDisplacement(i, t);
    stripDisplacement[i] = dy;

    const dx = FLAG_OFFSET_X + i * stripW;
    const dyTop = FLAG_OFFSET_Y + dy;

    // 원본 flag canvas 에서 해당 strip 복사
    ctx.drawImage(
      flagCanvas,
      i * srcStripW, 0, srcStripW, FLAG_H,
      dx, dyTop, stripW + 0.8, FLAG_RENDER_H
    );
  }
  ctx.restore();
}

function drawStripEdgeGlow(t) {
  // 스트립 경계에 빨강→노랑 그라데이션 LED glow
  const stripW = FLAG_RENDER_W / STRIPS;

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(FLAG_DIAG_ANGLE);
  ctx.translate(-W / 2, -H / 2);

  ctx.globalCompositeOperation = 'lighter'; // additive blend

  for (let i = 1; i < STRIPS; i++) {
    const dy1 = stripDisplacement[i - 1];
    const dy2 = stripDisplacement[i];
    const dy = (dy1 + dy2) / 2;

    const x = FLAG_OFFSET_X + i * stripW;
    const y0 = FLAG_OFFSET_Y + dy;
    const y1 = FLAG_OFFSET_Y + dy + FLAG_RENDER_H;

    // 변위 차이에 비례한 glow 강도
    const delta = Math.min(1, Math.abs(dy2 - dy1) / 8);
    if (delta < 0.05) continue;

    const grad = ctx.createLinearGradient(x, y0, x, y1);
    grad.addColorStop(0,    `rgba(255, 50, 50, ${0.2 * delta})`);
    grad.addColorStop(0.5,  `rgba(255, 220, 50, ${0.55 * delta})`);
    grad.addColorStop(1,    `rgba(255, 50, 50, ${0.2 * delta})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.4 + delta * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

function drawText(t) {
  // 텍스트를 스트립별 변위값으로 휘어서 렌더
  // 기법: textCanvas 를 세로 띠로 잘라서 각 x 위치에 해당하는 strip 의 dy 를 적용
  // 텍스트 영역이 실제로는 아트보드 전체에 고르게 퍼지진 않지만
  // flag 가 대각선이라 계산 단순화: textCanvas 의 x 좌표를 flag 스트립 인덱스로 매핑

  const sliceW = 4; // 4px 띠로 잘라 변위 적용 (100 스트립보다 세분화)

  for (let sx = 0; sx < W; sx += sliceW) {
    // 이 sliceX 가 어느 flag strip 에 해당하는지
    // sliceX → flag 좌표계 회전 역변환
    const cx = sx + sliceW / 2;
    // 아트보드 중심 기준 대각선 역회전
    const dxFromCenter = cx - W / 2;
    // flag stripIdx: flag 좌표계에서 stripW 간격
    // 단순화: flag 가 아트보드 전체를 덮고 대각선이 작으니 x 직접 매핑
    const flagX = (sx - FLAG_OFFSET_X) / FLAG_RENDER_W; // 0~1
    const stripIdx = Math.max(0, Math.min(STRIPS - 1, Math.floor(flagX * STRIPS)));
    const dy = stripDisplacement[stripIdx] * 0.7; // 텍스트는 70% 로 약하게 (국기보다 덜 휨)

    ctx.drawImage(
      textCanvas,
      sx, 0, sliceW, H,
      sx, dy, sliceW, H
    );
  }
}

function drawScanlines() {
  // 가로 스캔라인 오버레이 — 2px 주기
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#000';
  for (let y = 0; y < H; y += 3) {
    ctx.fillRect(0, y, W, 1);
  }
  ctx.restore();
}

function drawVignette() {
  // 약한 비네트 — 가장자리 어둡게
  const g = ctx.createRadialGradient(W/2, H/2, W*0.3, W/2, H/2, W*0.7);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

let lastTime = 0;
function animate(now = 0) {
  requestAnimationFrame(animate);
  const t = now / 1000;

  // 아트보드 배경 (흰색 유지 — 텍스트가 검정이라 대비)
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  // 1. 텍스트 (먼저 — 국기보다 뒤에)
  drawText(t);

  // 2. 국기 스트립 (텍스트 위로 덮음)
  drawFlagStrips(t);

  // 3. 스트립 경계 LED glow
  drawStripEdgeGlow(t);

  // 4. 스캔라인 오버레이
  drawScanlines();

  // 5. 비네트
  drawVignette();
}

// 썸네일 모드: 1프레임만 그리고 정적 표시
if (IS_THUMB) {
  // 초기 프레임 한 번만
  requestAnimationFrame(() => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    drawText(0);
    drawFlagStrips(0.3);
    drawStripEdgeGlow(0.3);
    drawScanlines();
    drawVignette();
  });
} else {
  animate();
}
