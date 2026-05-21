// Day 20 — 절창 / 구병모
// 조판 형태를 드로잉으로 재해석 — 단락 실루엣 외곽선 + 공백/부호 구멍

// ── 왼쪽 페이지 텍스트 ───────────────────────────────
const TEXT_LEFT = `⠀⠀사람들의 스투디올로 같은 것 말입니다. 부지를 둘러싼 담장의 높이와 두께로 인해 지나가는 사람은 이 안에서 누가 무엇을 하는지 결코 들여다볼 수 없을 터였는데, 교외의 살짝 외진 사유지여서 누군가가 목적 없이 지나다닐 만한 위치도 아니었지요. 전화 너머 관리인이 불러주는 대로 내비게이션에 주소를 찍고 온 나는, 풍채가 그토록 눈에 띄는 건물을 외곽 도로에서부터 포착하고도 정작 정문에 닿는 진입로를 찾지 못해 코앞에서 몇 번이나 턴을 했는지 모릅니다. 담장이며 건물 형태에 이르기까지, 적지 않은 경호 인력을 거느리는 기업 총수 내지 정치인이나 연예인의 별장이 이런 느낌일까 싶었는데, 좀더 시대를 거슬러올라가면 서양식으로 매너하우스라는 꼭 들어맞는 명칭이 있겠네요.

⠀⠀저만치 앞 넝쿨무늬가 돋을새김된 쌍여닫이 현관문을 향해 나아갈 줄 알았으나 관리인이 건물 외곽의 왼쪽 벽을 끼고 돌기에 지금 건 본채고 후원에 별채라도 있나 싶어 잠자코 따라갔는데, 뒤뜰에 닿기 전 문득 쇠붙이 냄새가 코끝을 잡아 비틀었습니다. 그와 함께 들려오는 말소리는 자음과 모음이 분별 없이 허공에 던져져 우연한 음절을 이룬 무언가이자 웃음과 신음이 서로의 경계를 망각한 분요紛繞의 소리에 가까웠기에, 정체 모를 부흥회에서 강렬한 종교적 경험에 탐닉하는 이의 방언처럼 들리기도 했습니다.`;

// ── 오른쪽 페이지 텍스트 ─────────────────────────────
const TEXT = `⠀⠀내장을 강타하는 생존 본능을 느끼며 내가 지금 어디로 가고
있는지 묻기 직전, 관리인이 멈춰 서더니 입을 열었습니다.
⠀⠀“대표님, 여기 면접 보러 오셨습니다만.”
⠀⠀“그래? 지금 몇시였지.”

⠀⠀관리인의 거대한 등이 시야를 가리고 있었으므로 나는 나의 보
스가 될 사람의 목소리만을 들을 수 있었습니다.
⠀⠀“오래 걸리실 것 같으면, 응접실로 안내할까요.”
⠀⠀“아니, 거의 다 끝났어.”

⠀⠀그가 말하는 동안에도 흐느낌과 욕설 사이 그 어딘가에서 반
향의 상대를 찾지 못한 소리는 여전히 들려왔고, 그렇다면 저
뜨락에서 대관절 몇 명이 무얼 하고 있으며 거의 다 끝난 건
또 뭐란 말인지 굳이 유추하고 싶지 않았습니다. 관리인의 소
개를 더는 기다리지 않고 도망가는 게 나으려나 망설이기 시작
한 내 눈에 핏빛 잔디가 펼쳐진 건 그때였습니다.

⠀⠀나는 풀과 나무의 생태니 종류에 대해 무지하지만 세상에는
…… 처음 돋아날 때부터 검붉은 잔디도 존재하겠지요. 지구상
모든 잔디가 초록이라는 법은 없겠지요, 신이시여. 관리인이
옆으로 한 발 비켜서자 비로소 그 모습이 드러난 대표라는 이
가 나를 보고 말하기를,
⠀⠀“기다리게 해서 미안합니다.”

⠀⠀첼로의 C현에 활을 댄 듯한 음성이 평화로운 템포로 귓바퀴`;

// ── 설정 ─────────────────────────────────────────────
const CFG = {
  font:        "'Noto Serif KR', Georgia, serif",
  fontSize:    15,
  lineHeight:  1.95,
  colRatio:    0.46,
  marginLeft:  0.27,
  marginTop:   0.07,
  pad:         2,       // 외곽선 텍스트 여유
  jAmp:        2.2,     // 손떨림 진폭
  jFreq:       6,       // 선 분할 세그먼트 수
  strokeW:     1.4,
  strokeColor: '#1a1008',
  bgColor:     '#f5f0e8',
  textColor:   '#1a1008',
  holeR:       3.5,     // 공백/부호 구멍 반지름
};

// ── 배경 이미지 로드 ─────────────────────────────────
const bgImg = new Image();
bgImg.src = './openbook.png';

const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
let W, H, dpr;
let bookX = 0, bookY = 0, bookW = 0, bookH = 0; // 전역으로 관리
let fontReady = false; // 폰트 로드 완료 플래그

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width  = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);
  if (fontReady) render();
}
window.addEventListener('resize', resize);

// ── 삐뚤빼뚤 선: 시작→끝을 n 세그먼트로 나눠 각각 흔들기 ──
function wobblyLine(x1, y1, x2, y2, n) {
  n = n || CFG.jFreq;
  ctx.moveTo(x1 + rnd(), y1 + rnd());
  for (let i = 1; i <= n; i++) {
    const t  = i / n;
    const tx = x1 + (x2 - x1) * t + rnd();
    const ty = y1 + (y2 - y1) * t + rnd();
    ctx.lineTo(tx, ty);
  }
}
function rnd(amp) { return (Math.random() - 0.5) * 2 * (amp || CFG.jAmp); }

// ── 텍스트 → 행 구조 파싱 ────────────────────────────
function layoutLines(text, colW) {
  const paras = text.split(/\n\n+/);
  const result = [];
  for (let pi = 0; pi < paras.length; pi++) {
    const raw    = paras[pi];
    const hasIndent = (raw.startsWith('  ') || raw.startsWith('\t') || raw.startsWith('⠀'));
    const indentPx = hasIndent ? Math.round(CFG.fontSize * 2) : 0;
    // 브레이유 공백(⠀) 포함 들여쓰기 문자를 줄 시작에서 제거
    const lines  = raw.trim().replace(/^[⠀]+/gm, '').split('\n');

    for (let li = 0; li < lines.length; li++) {
      const line = lines[li].trim();
      if (!line) continue;
      // 첫 줄만 들여쓰기, 나머지는 0
      const indent = (li === 0) ? indentPx : 0;
      const availW = colW - indent;
      let cur = '';
      let firstChunk = true;
      for (const ch of line) {
        if (ctx.measureText(cur + ch).width > availW && cur) {
          result.push({ text: cur, indent: firstChunk ? indent : 0, paraEnd: false });
          firstChunk = false;
          cur = ch;
        } else { cur += ch; }
      }
      if (cur) result.push({ text: cur, indent: firstChunk ? indent : 0, paraEnd: li === lines.length - 1 });
    }
  }
  return result;
}

// ── 단락 전체 외곽선 (들여쓰기 = 왼쪽 파임, 모서리 둥글게) ─
function drawParaOutline(lines) {
  if (!lines.length) return;
  const p = CFG.pad;
  const cr = 14; // 모서리 곡률 (크게)

  // 각 행의 bounding — top/bottom에 노이즈 추가로 행마다 높낮이 다르게
  const R = lines.map(ln => ({
    l: ln.x - p + rnd(2),
    r: ln.x + ln.w + p + rnd(2),
    t: ln.y - ln.h * 0.72 + rnd(3),
    b: ln.y + ln.h * 0.12 + rnd(3),
  }));
  const n = R.length;

  ctx.save();
  ctx.strokeStyle = CFG.strokeColor;
  ctx.lineWidth   = CFG.strokeW;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.beginPath();

  // 꼭짓점에서 둥근 모서리를 만드는 헬퍼
  // 직전점→꼭짓점→다음점 방향으로 quadratic bezier
  function roundCorner(px, py, cx, cy, nx, ny, r) {
    // 꼭짓점으로 오는 방향 단위벡터
    const d1x = cx - px, d1y = cy - py;
    const l1  = Math.hypot(d1x, d1y) || 1;
    // 꼭짓점에서 나가는 방향 단위벡터
    const d2x = nx - cx, d2y = ny - cy;
    const l2  = Math.hypot(d2x, d2y) || 1;
    const t   = Math.min(r, l1 * 0.5, l2 * 0.5);
    const ax  = cx - (d1x / l1) * t + rnd(1.5);
    const ay  = cy - (d1y / l1) * t + rnd(1.5);
    const bx  = cx + (d2x / l2) * t + rnd(1.5);
    const by  = cy + (d2y / l2) * t + rnd(1.5);
    ctx.lineTo(ax, ay);
    ctx.quadraticCurveTo(cx + rnd(1), cy + rnd(1), bx, by);
  }

  // 외곽선을 폴리라인 꼭짓점 배열로 먼저 계산
  const pts = [];

  // 상단 왼 → 오
  pts.push([R[0].l, R[0].t]);
  pts.push([R[0].r, R[0].t]);

  // 오른쪽 내려가기
  for (let i = 0; i < n; i++) {
    const c = R[i], nx = R[i + 1];
    pts.push([c.r, c.b]);
    if (nx && Math.abs(nx.r - c.r) > 1) {
      pts.push([nx.r, c.b]);
    }
  }

  // 하단 오 → 왼
  pts.push([R[n-1].l, R[n-1].b]);

  // 왼쪽 올라가기
  for (let i = n - 1; i >= 0; i--) {
    const c = R[i], pv = R[i - 1];
    pts.push([c.l, c.t]);
    if (pv && Math.abs(pv.l - c.l) > 1) {
      pts.push([pv.l, c.t]);
    }
  }

  // 폴리라인을 둥근 모서리 + 손떨림으로 그리기
  // 꼭짓점 사이 직선 구간도 wobblyLine으로 흔들기
  ctx.moveTo(pts[0][0] + rnd(), pts[0][1] + rnd());
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur  = pts[i];
    const next = pts[(i + 1) % pts.length];

    // 꼭짓점으로 오는 방향
    const d1x = cur[0] - prev[0], d1y = cur[1] - prev[1];
    const l1  = Math.hypot(d1x, d1y) || 1;
    const d2x = next[0] - cur[0],  d2y = next[1] - cur[1];
    const l2  = Math.hypot(d2x, d2y) || 1;
    const t   = Math.min(cr, l1 * 0.45, l2 * 0.45);

    // 꼭짓점 진입점
    const ax = cur[0] - (d1x / l1) * t;
    const ay = cur[1] - (d1y / l1) * t;
    // 꼭짓점 진출점
    const bx = cur[0] + (d2x / l2) * t;
    const by = cur[1] + (d2y / l2) * t;

    // prev → ax 구간: wobblyLine으로 흔들기
    const seg = Math.max(2, Math.round(l1 / 40));
    for (let s = 1; s <= seg; s++) {
      const tt = s / seg;
      const wx = prev[0] + (ax - prev[0]) * tt + rnd(0.8);
      const wy = prev[1] + (ay - prev[1]) * tt + rnd(0.8);
      ctx.lineTo(wx, wy);
    }

    // 모서리 곡선: ax → (꼭짓점) → bx
    ctx.quadraticCurveTo(cur[0] + rnd(0.6), cur[1] + rnd(0.6), bx + rnd(0.5), by + rnd(0.5));
  }

  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

// ── 공백/부호 위치에 구멍(불규칙 유기적 형태) ──
function drawHoles(lines) {
  ctx.save();
  ctx.strokeStyle = CFG.strokeColor;
  ctx.lineWidth   = CFG.strokeW * 0.9;

  for (const ln of lines) {
    const text = ln.text;
    let   curX = ln.x;
    for (let ci = 0; ci < text.length; ci++) {
      const ch = text[ci];
      const cw = ctx.measureText(ch).width;
      const isGap = ch === ',' || ch === '.' ||
                    ch === '!' || ch === '?' || ch === '·' ||
                    ch === '…' || ch === '、' || ch === '。';
      if (isGap) {
        const cx = curX + cw / 2;
        const cy = ln.y - ln.h * 0.38;
        const rw = ln.h * 0.28 + Math.random() * 3; // 가로 반지름 (줄임)
        const rh = ln.h * 0.48 + Math.random() * 4; // 세로 반지름
        // 불규칙 폴리곤: 8개 점을 극좌표로 배치, quadratic 곡선으로 연결
        const pts = 8;
        const points = [];
        for (let k = 0; k < pts; k++) {
          const angle = (k / pts) * Math.PI * 2;
          const r = 0.7 + Math.random() * 0.6;
          points.push([
            cx + Math.cos(angle) * rw * r + rnd(1.2),
            cy + Math.sin(angle) * rh * r + rnd(1.2),
          ]);
        }
        ctx.beginPath();
        ctx.moveTo(
          (points[pts-1][0] + points[0][0]) / 2,
          (points[pts-1][1] + points[0][1]) / 2
        );
        for (let k = 0; k < pts; k++) {
          const cur  = points[k];
          const next = points[(k + 1) % pts];
          const mx   = (cur[0] + next[0]) / 2;
          const my   = (cur[1] + next[1]) / 2;
          ctx.quadraticCurveTo(cur[0], cur[1], mx, my);
        }
        ctx.closePath();
        ctx.stroke();
      }
      curX += cw;
    }
  }
  ctx.restore();
}

// ── 한 페이지: 텍스트 렌더 + 단락 데이터 수집 ────────
function renderTextAndCollect(text, baseX, colW, startY) {
  const lineH = Math.round(CFG.fontSize * CFG.lineHeight);
  let curY = startY || Math.round(H * CFG.marginTop) + CFG.fontSize;

  ctx.font         = `${CFG.fontSize}px ${CFG.font}`;
  ctx.fillStyle    = CFG.textColor;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'alphabetic';

  const allLines = layoutLines(text, colW);
  const lineData = [];

  for (const ln of allLines) {
    const x  = baseX + ln.indent;
    const tw = ctx.measureText(ln.text).width;
    ctx.fillText(ln.text, x, curY);
    lineData.push({ x, y: curY, w: tw, h: lineH, text: ln.text, paraEnd: ln.paraEnd });
    curY += lineH;
    if (ln.paraEnd) curY += lineH * 0.5;
    if (curY > H * 0.95) break;
  }

  // 단락 단위로 묶어서 반환
  const paras = [];
  let para = [];
  for (let i = 0; i < lineData.length; i++) {
    para.push(lineData[i]);
    if (lineData[i].paraEnd || i === lineData.length - 1) {
      paras.push([...para]);
      para = [];
    }
  }
  return { paras, lastY: curY, maxRight: Math.max(...lineData.map(l => l.x + l.w)) };
}

// ── 애니메이션 상태 ───────────────────────────────────
let animQueue   = [];  // 단락 배열 큐 [{lines, holes}]
let animIdx     = 0;   // 현재 드로잉 중인 단락 인덱스
let animPts     = [];  // 현재 단락의 외곽선 좌표 배열
let animHoles   = [];  // 현재 단락의 구멍 데이터
let animPos     = 0;   // 현재 진행된 점 인덱스
let animHoleIdx    = 0;   // 구멍 진행 인덱스
let animHoleProgress = 0; // 현재 구멍 그리기 진행도 (0~1)
let holeTimer      = 0;   // 구멍 간 딜레이 타이머 (별도)
const HOLE_SPEED   = 0.05; // 프레임당 구멍 진행도 증가량
const ANIM_SPEED = 1;    // 프레임당 그릴 점 수 (낮을수록 느림)
const PARA_DELAY = 150;  // 단락 간 딜레이 (ms)
const ANIM_START_DELAY = 500; // 진입 후 애니메이션 시작 딜레이 (ms)
let paraTimer   = 0;
let lastTime    = 0;
let animRunning = false;

// ── 외곽선 좌표 배열 생성 (drawParaOutline의 좌표 버전) ─
function buildOutlinePts(lines) {
  const p  = CFG.pad;
  const cr = 14;
  const R  = lines.map(ln => ({
    l: ln.x - p + rnd(2),
    r: ln.x + ln.w + p + rnd(2),
    t: ln.y - ln.h * 0.72 + rnd(3),
    b: ln.y + ln.h * 0.12 + rnd(3),
  }));
  const n = R.length;

  const corners = [];
  corners.push([R[0].l, R[0].t]);
  corners.push([R[0].r, R[0].t]);
  for (let i = 0; i < n; i++) {
    const c = R[i], nx = R[i + 1];
    corners.push([c.r, c.b]);
    if (nx && Math.abs(nx.r - c.r) > 1) corners.push([nx.r, c.b]);
  }
  corners.push([R[n-1].l, R[n-1].b]);
  for (let i = n - 1; i >= 0; i--) {
    const c = R[i], pv = R[i - 1];
    corners.push([c.l, c.t]);
    if (pv && Math.abs(pv.l - c.l) > 1) corners.push([pv.l, c.t]);
  }

  // 코너 배열 → 실제 드로잉 점 배열 (손떨림 포함)
  const pts = [];
  const addPt = (x, y) => pts.push([x + rnd(), y + rnd()]);

  addPt(corners[0][0], corners[0][1]);
  for (let i = 1; i < corners.length; i++) {
    const prev = corners[i - 1];
    const cur  = corners[i];
    const next = corners[(i + 1) % corners.length];
    const d1x = cur[0]-prev[0], d1y = cur[1]-prev[1];
    const l1  = Math.hypot(d1x,d1y)||1;
    const d2x = next[0]-cur[0],  d2y = next[1]-cur[1];
    const l2  = Math.hypot(d2x,d2y)||1;
    const t   = Math.min(cr, l1*0.45, l2*0.45);
    const ax  = cur[0]-(d1x/l1)*t, ay = cur[1]-(d1y/l1)*t;
    const bx  = cur[0]+(d2x/l2)*t, by = cur[1]+(d2y/l2)*t;

    const seg = Math.max(2, Math.round(l1/40));
    for (let s = 1; s <= seg; s++) {
      const tt = s/seg;
      addPt(prev[0]+(ax-prev[0])*tt + rnd(0.8), prev[1]+(ay-prev[1])*tt + rnd(0.8));
    }
    // quadratic bezier 중간점 샘플링
    for (let s = 1; s <= 3; s++) {
      const tt = s/3;
      const qx = (1-tt)*(1-tt)*ax + 2*(1-tt)*tt*(cur[0]+rnd(0.5)) + tt*tt*bx;
      const qy = (1-tt)*(1-tt)*ay + 2*(1-tt)*tt*(cur[1]+rnd(0.5)) + tt*tt*by;
      addPt(qx + rnd(0.5), qy + rnd(0.5));
    }
  }
  // 닫기
  addPt(corners[0][0]+rnd(), corners[0][1]+rnd());
  return pts;
}

// ── 구멍 데이터 수집 ──────────────────────────────────
function buildHolesData(lines) {
  const holes = [];
  ctx.font = `${CFG.fontSize}px ${CFG.font}`;
  for (const ln of lines) {
    let curX = ln.x;
    for (const ch of ln.text) {
      const cw = ctx.measureText(ch).width;
      const isGap = ',.!?·…、。'.includes(ch);
      if (isGap) {
        const cx = curX + cw/2;
        const cy = ln.y - ln.h*0.38;
        const rw = ln.h*0.28 + Math.random()*3;
        const rh = ln.h*0.48 + Math.random()*4;
        const pts = 8;
        const points = [];
        for (let k = 0; k < pts; k++) {
          const angle = (k/pts)*Math.PI*2;
          const r = 0.7+Math.random()*0.6;
          points.push([cx+Math.cos(angle)*rw*r+rnd(1.2), cy+Math.sin(angle)*rh*r+rnd(1.2)]);
        }
        holes.push(points);
      }
      curX += cw;
    }
  }
  return holes;
}

// ── 애니메이션 루프 ───────────────────────────────────
function animStep(now) {
  if (!animRunning) return;
  requestAnimationFrame(animStep);

  const dt = now - lastTime; lastTime = now;

  // 현재 단락 외곽선 이어서 그리기
  if (animIdx < animQueue.length) {
    const { pts, holes } = animQueue[animIdx];

    if (animPos < pts.length) {
      // 외곽선 드로잉 — 매 프레임 새 path, moveTo로 이어 그리기
      ctx.save();
      ctx.strokeStyle = CFG.strokeColor;
      ctx.lineWidth   = CFG.strokeW;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.beginPath();

      const start = animPos === 0 ? 0 : animPos - 1;
      ctx.moveTo(pts[start][0], pts[start][1]);
      const end = Math.min(pts.length, animPos + ANIM_SPEED);
      for (let i = (animPos === 0 ? 1 : animPos); i < end; i++) {
        ctx.lineTo(pts[i][0], pts[i][1]);
      }
      ctx.stroke();
      ctx.restore();

      animPos = end;

    } else if (animHoleIdx < holes.length) {
      // 구멍: 불규칙 폴리곤을 점 순서대로 그려나가는 애니메이션
      const points = holes[animHoleIdx];
      const pts8   = points.length;

      animHoleProgress = Math.min(1, animHoleProgress + HOLE_SPEED);
      const drawCount = Math.ceil(animHoleProgress * pts8);

      ctx.save();
      ctx.strokeStyle = CFG.strokeColor;
      ctx.lineWidth   = CFG.strokeW * 0.9;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      const startPt = [(points[pts8-1][0]+points[0][0])/2, (points[pts8-1][1]+points[0][1])/2];
      ctx.moveTo(startPt[0], startPt[1]);
      for (let k = 0; k < drawCount; k++) {
        const c  = points[k];
        const nx = points[(k+1) % pts8];
        const mx = (c[0]+nx[0])/2, my = (c[1]+nx[1])/2;
        ctx.quadraticCurveTo(c[0], c[1], mx, my);
      }
      ctx.stroke();
      ctx.restore();

      if (animHoleProgress >= 1) {
        animHoleProgress = 0;
        holeTimer += dt;
        if (holeTimer >= 15) {
          holeTimer = 0;
          animHoleIdx++;
        }
      }

    } else {
      // 다음 단락으로
      paraTimer += dt;
      if (paraTimer >= PARA_DELAY) {
        paraTimer = 0;
        animIdx++;
        animPos     = 0;
        animHoleIdx = 0;
      }
    }
  } else {
    animRunning = false;
    // 루프 재시작 비활성화 (폰트 문제 디버깅용)
    // setTimeout(() => { ... }, 2000);
  }
}

// ── 메인 렌더 ─────────────────────────────────────────
function render() {
  animRunning = false;
  ctx.clearRect(0, 0, W, H);

  // 검정 배경
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, W, H);

  // openbook.png — contain으로 중앙 배치
  bookX = 0; bookY = 0; bookW = W; bookH = H;
  if (bgImg.complete && bgImg.naturalWidth) {
    const iw = bgImg.naturalWidth, ih = bgImg.naturalHeight;
    const scale = Math.min(W / iw, H / ih) * 1.1;
    bookW = iw * scale;
    bookH = ih * scale;
    bookX = (W - bookW) / 2;
    bookY = (H - bookH) / 2; // 중앙 정렬
    ctx.drawImage(bgImg, bookX, bookY, bookW, bookH);
  }

  // 책 페이지 영역 계산 (5120×3584 기준)
  // 좌우 외곽 여백 ~5%, 가운데 접힘 ~2.5%
  const pageMarginX   = bookW * 0.05;
  const spineCenterX  = bookX + bookW * 0.5;
  const spineGap      = bookW * 0.022;
  const pageMarginTop = bookH * 0.12;

  const leftPageX  = bookX + pageMarginX;
  const leftPageW  = spineCenterX - spineGap - leftPageX;
  const rightPageX = spineCenterX + spineGap;
  const rightPageW = (bookX + bookW - pageMarginX) - rightPageX;

  // 양쪽 동일 너비 (작은 쪽 기준)
  const pageContentW = Math.min(leftPageW, rightPageW);
  const innerPad     = pageContentW * 0.06;
  const textColW     = pageContentW - innerPad * 2;
  const leftX        = leftPageX  + (leftPageW  - textColW) / 2;
  const rightX       = rightPageX + (rightPageW - textColW) / 2;
  const topY         = bookY + pageMarginTop;

  // 가운데 구분선
  ctx.save();
  ctx.strokeStyle = 'rgba(60,40,20,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W/2, H*0.04);
  ctx.lineTo(W/2, H*0.96);
  ctx.stroke();
  ctx.restore();

  // 텍스트 렌더 + 단락 데이터 수집
  // 직접 CSS px 고정값 (비율 계산 포기, 직접 좌표 지정)
  const leftStartX = 467;
  const leftStartY = 206;
  const leftColW   = Math.round(bookW * 0.26);
  const rightColW  = Math.round(bookW * 0.26);
  const leftResult  = renderTextAndCollect(TEXT_LEFT, leftStartX, leftColW, leftStartY + CFG.fontSize);
  const rightStartX = bookX + bookW * 0.56;
  const rightStartY = 206;
  const rightResult = renderTextAndCollect(TEXT, rightStartX, rightColW, rightStartY + CFG.fontSize);
  const rightParas   = rightResult.paras;
  const leftParas    = leftResult.paras;
  const leftLastY    = leftResult.lastY;
  const rightLastY   = rightResult.lastY;
  const rightMaxRight = rightResult.maxRight;

  // 애니메이션 큐: 왼쪽 전체 → 오른쪽 전체
  animQueue = [
    ...leftParas.map(lines => ({ pts: buildOutlinePts(lines), holes: buildHolesData(lines) })),
    ...rightParas.map(lines => ({ pts: buildOutlinePts(lines), holes: buildHolesData(lines) })),
  ];
  animIdx          = 0;
  animPos          = 0;
  animHoleIdx      = 0;
  animHoleProgress = 0;
  paraTimer        = 0;
  holeTimer        = 0;
  lastTime    = performance.now();
  animRunning = false; // 아직 시작 안 함
  // 0.5초 후 애니메이션 시작
  setTimeout(() => {
    animRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(animStep);
  }, ANIM_START_DELAY);

  // 페이지 번호 — bookX/bookW 기준 (CSS px)
  ctx.font      = `${CFG.fontSize - 2}px ${CFG.font}`;
  ctx.fillStyle = '#1a1008';

  ctx.textAlign = 'left';
  ctx.fillText('20', 467, 894);

  ctx.textAlign = 'right';
  ctx.fillText('절창  21', 1523, 894);
}

canvas.addEventListener('click', (e) => {
  if (!fontReady) return;
  // bookX/W는 Canvas 픽셀, e.clientX는 CSS px → dpr로 나눠서 같은 단위로
  const rx = ((e.clientX - bookX / dpr) / (bookW / dpr)).toFixed(4);
  const ry = ((e.clientY - bookY / dpr) / (bookH / dpr)).toFixed(4);
  console.log(`클릭: css(${e.clientX}, ${e.clientY}) → book비율(${rx}, ${ry})`);
  render();
});
canvas.addEventListener('touchend', render);

document.fonts.ready.then(() => {
  document.fonts.load(`400 ${CFG.fontSize}px 'Noto Serif KR'`).then(() => {
    fontReady = true;
    // 이미지도 로드 완료 확인 후 렌더
    const doRender = () => {
      // 폰트가 실제로 사용 가능한지 한 번 더 확인
      document.fonts.load(`400 ${CFG.fontSize}px 'Noto Serif KR'`).then(() => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth; H = window.innerHeight;
        canvas.width  = W * dpr; canvas.height = H * dpr;
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        ctx.scale(dpr, dpr);
        render();
      });
    };
    if (bgImg.complete && bgImg.naturalWidth) {
      doRender();
    } else {
      bgImg.onload = () => doRender();
    }
  }).catch(() => {
    fontReady = true;
    if (bgImg.complete && bgImg.naturalWidth) {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width  = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.scale(dpr, dpr);
      render();
    } else {
      bgImg.onload = () => { dpr = Math.min(window.devicePixelRatio || 1, 2); W = window.innerWidth; H = window.innerHeight; canvas.width = W*dpr; canvas.height = H*dpr; canvas.style.width=W+'px'; canvas.style.height=H+'px'; ctx.scale(dpr,dpr); render(); };
    }
  });
});
