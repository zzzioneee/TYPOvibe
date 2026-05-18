'use strict';
// ════════════════════════════════════════════
// Day 18 — 햄찌의 분노 (Canvas 통합 렌더링)
// ════════════════════════════════════════════

var IS_THUMB = new URLSearchParams(location.search).has('thumb');

// ── macbook.png 원본 크기 ──
var MB_W = 2912, MB_H = 1632;
// ── 화면 영역 비율 (macbook.png 기준) ──
var SCREEN_X1_PCT = 0.2548, SCREEN_X2_PCT = 0.7445;
var SCREEN_Y1_PCT = 0.1624, SCREEN_Y2_PCT = 0.6869;

// ── DOM ──
var canvas    = document.getElementById('main');
var ctx       = canvas.getContext('2d');
var cursorEl  = document.getElementById('hamster-cursor');
var hpBar     = document.getElementById('hp-bar');
var hpNum     = document.getElementById('hp-num');
var bubbleEl  = document.getElementById('bubble');
var finalMsg  = document.getElementById('final-msg');
var restartBtn= document.getElementById('restart-btn');

// ── 오프스크린 캔버스 (누적 레이어) ──
var damageCanvas = document.createElement('canvas'); // 탄자국/그을음/화염픽셀
var crackCanvas  = document.createElement('canvas'); // 균열
var dCtx = damageCanvas.getContext('2d');
var cCtx = crackCanvas.getContext('2d');

// ── 이미지 로드 ──
var macbookImg = new Image();
macbookImg.src = 'macbook.png';
var macbookLoaded = false;
macbookImg.onload = function(){ macbookLoaded = true; };

// ── 렌더 상태 ──
var canvasW = 0, canvasH = 0;
// macbook.png 가 canvas에 실제로 그려지는 영역
var mbRect = { x:0, y:0, w:0, h:0 };
// 화면 영역 (canvas 좌표)
var screenRect = { x:0, y:0, w:0, h:0 };

// ── 흔들기 ──
var shakeX = 0, shakeY = 0, shakeAmt = 0;

// ── HP / 데미지 ──
var hp = 100;
var damageStage = 0; // 0~5

// ── 파티클 ──
var seedParts  = [];
var flameParts = [];
var flamePixBuf = [];
var flamePrev  = null;

// ── 균열 데이터 ──
var crackPoints = [];
var needCrackRedraw = false;

// ── 블랙아웃 패치 (stage 3+) ──
var blackoutPatches = [];

// ── 글리치 라인 ──
var glitchLines = [];
var glitchTimer = 0;

// ── 화면 왜곡 폴리곤 캐시 ──
var cachedPoly = null;
var cachedPolyStage = -1;

// ── 화면 깜빡임 ──
var screenAlpha = 1.0;
var flickerActive = false;

// ── Bayer 4×4 디더 ──
var BAYER = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
var PIXEL_SIZE = 6;

// ── 유틸 ──
function rnd(a,b){ return a+Math.random()*(b-a); }
function rndInt(a,b){ return Math.floor(rnd(a,b+1)); }
function clamp(v,mn,mx){ return Math.max(mn,Math.min(mx,v)); }

// ── 메시지 ──
var MSGS = {
  claw:  ['으드득!!','찍찍!!','할퀴어준다!!','발톱 어택!!'],
  bomb:  ['쾅!!','씨드 어택!!','해바라기씨 투척!!','폭발이다!!'],
  flame: ['불이야!!','타버려!!','화염방사!!','불꽃 분노!!'],
  fist:  ['주먹이다!!','햄찌 어퍼컷!!','쾅쾅쾅!!','박살내준다!!'],
};

// ════════════════════════════════════════════
// 캔버스 & 좌표 계산
// ════════════════════════════════════════════
function resizeCanvas() {
  var vw = window.innerWidth;
  var vh = window.innerHeight;
  // macbook.png contain 방식 — 뷰포트의 90% 안에 맞춤
  var maxW = vw * 0.90;
  var maxH = vh * 0.90;
  var ratio = MB_W / MB_H;
  var w, h;
  if (maxW / maxH > ratio) {
    h = maxH; w = h * ratio;
  } else {
    w = maxW; h = w / ratio;
  }
  canvasW = Math.round(w);
  canvasH = Math.round(h);
  canvas.width  = canvasW;
  canvas.height = canvasH;
  canvas.style.width  = canvasW + 'px';
  canvas.style.height = canvasH + 'px';

  // macbook.png 렌더 영역 = 캔버스 전체
  mbRect.x = 0; mbRect.y = 0;
  mbRect.w = canvasW; mbRect.h = canvasH;

  // 화면 영역 계산
  screenRect.x = Math.round(canvasW * SCREEN_X1_PCT);
  screenRect.y = Math.round(canvasH * SCREEN_Y1_PCT);
  screenRect.w = Math.round(canvasW * (SCREEN_X2_PCT - SCREEN_X1_PCT));
  screenRect.h = Math.round(canvasH * (SCREEN_Y2_PCT - SCREEN_Y1_PCT));

  // 오프스크린 캔버스도 같은 크기
  damageCanvas.width  = crackCanvas.width  = canvasW;
  damageCanvas.height = crackCanvas.height = canvasH;

  needCrackRedraw = true;
}

window.addEventListener('resize', function(){
  resizeCanvas();
  cachedPoly = null; cachedPolyStage = -1;
  redrawCracks();
});
resizeCanvas();

// ════════════════════════════════════════════
// 좌표 변환: 캔버스 전체 → 화면 영역 내 로컬
// ════════════════════════════════════════════
function canvasToScreen(cx, cy) {
  return {
    x: cx - screenRect.x,
    y: cy - screenRect.y,
  };
}
function screenToCanvas(sx, sy) {
  return {
    x: sx + screenRect.x,
    y: sy + screenRect.y,
  };
}
// 클라이언트 좌표 → 캔버스 좌표
function clientToCanvas(cx, cy) {
  var r = canvas.getBoundingClientRect();
  var scaleX = canvasW / r.width;
  var scaleY = canvasH / r.height;
  return {
    x: (cx - r.left) * scaleX,
    y: (cy - r.top)  * scaleY,
  };
}
// 화면 영역 내부인지
function inScreen(cx, cy) {
  return cx >= screenRect.x && cx <= screenRect.x + screenRect.w &&
         cy >= screenRect.y && cy <= screenRect.y + screenRect.h;
}

// ════════════════════════════════════════════
// HP & 데미지 시스템
// ════════════════════════════════════════════
function damage(v, tool) {
  if (hp <= 0) return;
  hp = Math.max(0, hp - v);
  var pct = hp;
  hpBar.style.width = pct + '%';
  hpNum.textContent = Math.round(pct);
  if (pct > 60) hpBar.style.background = 'linear-gradient(90deg,#4caf50,#8bc34a)';
  else if (pct > 30) hpBar.style.background = 'linear-gradient(90deg,#ff9800,#ffc107)';
  else hpBar.style.background = 'linear-gradient(90deg,#f44336,#e91e63)';

  updateDamageStage();
  if (hp <= 0) triggerDeath();
  if (tool && Math.random() < 0.22) showBubble(tool);
}

function updateDamageStage() {
  var prev = damageStage;
  if      (hp > 75) damageStage = 0;
  else if (hp > 50) damageStage = 1;
  else if (hp > 30) damageStage = 2;
  else if (hp > 10) damageStage = 3;
  else if (hp > 0)  damageStage = 4;
  else              damageStage = 5;

  if (damageStage !== prev) {
    onStageChange(prev, damageStage);
  }
}

function onStageChange(prev, next) {
  // 자동 균열 추가
  if (next >= 1) autoScreenCrack(next);

  // stage 2+: LCD 손상 줄 생성
  if (next >= 2) generateLCDLines(next);

  // stage 3+: 블랙아웃 패치
  if (next >= 3) generateBlackoutPatches(next);

  // stage 2+: 화면 깜빡임
  if (next >= 2) startFlicker();
}

function autoScreenCrack(level) {
  var count = level * 3 + 2;
  for (var i = 0; i < count; i++) {
    var cx = rnd(screenRect.x + screenRect.w*0.05, screenRect.x + screenRect.w*0.95);
    var cy = rnd(screenRect.y + screenRect.h*0.05, screenRect.y + screenRect.h*0.95);
    addCrackPoint(cx, cy, rnd(20 + level*10, 45 + level*15), level >= 3);
  }
}

function generateLCDLines(stage) {
  // LCD 손상 가로줄을 damageCanvas에 그림
  var count = (stage - 1) * 3 + rndInt(2,4);
  for (var i = 0; i < count; i++) {
    var y = rnd(screenRect.y + 5, screenRect.y + screenRect.h - 5);
    var h = rnd(1, stage >= 3 ? 4 : 2);
    var alpha = rnd(0.3, 0.7);
    dCtx.fillStyle = stage >= 3
      ? 'rgba(0,0,0,' + alpha + ')'
      : 'rgba(50,0,80,' + alpha + ')';
    dCtx.fillRect(screenRect.x, y, screenRect.w, h);
  }
}

function generateBlackoutPatches(stage) {
  // 랜덤 블랙아웃 사각형 생성
  var count = (stage - 2) * 2 + rndInt(1,3);
  for (var i = 0; i < count; i++) {
    var pw = rnd(screenRect.w * 0.05, screenRect.w * 0.3);
    var ph = rnd(screenRect.h * 0.03, screenRect.h * 0.2);
    var px = rnd(screenRect.x, screenRect.x + screenRect.w - pw);
    var py = rnd(screenRect.y, screenRect.y + screenRect.h - ph);
    blackoutPatches.push({ x:px, y:py, w:pw, h:ph,
      alpha: rnd(0.7, 1.0),
      flicker: stage >= 4 ? Math.random() < 0.4 : false });
  }
}

// ── 화면 깜빡임 ──
var flickerTimer = null;
function startFlicker() {
  if (flickerActive) return;
  flickerActive = true;
  doFlicker();
}
function doFlicker() {
  if (!flickerActive) return;
  var intensity = damageStage >= 4 ? 0.2 : 0.5;
  screenAlpha = rnd(intensity, 1.0);
  var delay = damageStage >= 4 ? rnd(50, 150) : rnd(80, 300);
  flickerTimer = setTimeout(function(){
    screenAlpha = 1.0;
    setTimeout(function(){
      if (damageStage >= 2 && hp > 0) {
        // 주기적 깜빡임 (낮은 확률)
        if (Math.random() < 0.15 + (5 - damageStage) * 0.05) doFlicker();
        else flickerActive = false;
      } else if (damageStage >= 2) {
        doFlicker();
      } else {
        flickerActive = false;
      }
    }, rnd(200, 800));
  }, delay);
}

// ── 글리치 ──
function updateGlitch() {
  glitchTimer--;
  if (damageStage < 3) { glitchLines = []; return; }
  if (glitchTimer <= 0) {
    glitchTimer = rndInt(10, 40);
    glitchLines = [];
    if (Math.random() < 0.5) {
      var count = rndInt(1, 5);
      for (var i = 0; i < count; i++) {
        glitchLines.push({
          y: rnd(screenRect.y, screenRect.y + screenRect.h),
          h: rnd(2, 8),
          shift: rnd(-20, 20),
          alpha: rnd(0.4, 0.9),
          color: Math.random() < 0.5 ? [0,255,100] : [255,50,200],
        });
      }
    }
  }
}

// ── 사망 ──
function triggerDeath() {
  for (var i = 0; i < 24; i++) {
    var cx = rnd(screenRect.x + screenRect.w*0.03, screenRect.x + screenRect.w*0.97);
    var cy = rnd(screenRect.y + screenRect.h*0.03, screenRect.y + screenRect.h*0.97);
    addCrackPoint(cx, cy, rnd(40, 110), true);
  }
  // 전면 블랙아웃
  blackoutPatches.push({
    x: screenRect.x, y: screenRect.y,
    w: screenRect.w, h: screenRect.h,
    alpha: 0, flicker: false, growing: true,
  });
  bubbleEl.textContent = '🐹 개박살!!';
  bubbleEl.classList.add('show');
  setTimeout(function(){
    finalMsg.classList.add('show');
  }, 1400);
}

// ── 말풍선 ──
function showBubble(tool) {
  var msgs = (MSGS[tool]) ? MSGS[tool] : ['찍찍!!'];
  bubbleEl.textContent = msgs[rndInt(0, msgs.length-1)];
  bubbleEl.classList.add('show');
  clearTimeout(showBubble._t);
  showBubble._t = setTimeout(function(){ bubbleEl.classList.remove('show'); }, 1600);
}

// ── 재시작 ──
restartBtn.addEventListener('click', function(){
  hp = 100; damageStage = 0;
  crackPoints = []; seedParts = []; flameParts = [];
  flamePixBuf = []; flamePrev = null;
  blackoutPatches = []; glitchLines = []; glitchTimer = 0;
  flickerActive = false; screenAlpha = 1.0;
  shakeX = 0; shakeY = 0; shakeAmt = 0;
  cachedPoly = null; cachedPolyStage = -1;
  hpBar.style.width = '100%';
  hpBar.style.background = 'linear-gradient(90deg,#4caf50,#8bc34a)';
  hpNum.textContent = '100';
  finalMsg.classList.remove('show');
  bubbleEl.classList.remove('show');
  dCtx.clearRect(0, 0, canvasW, canvasH);
  cCtx.clearRect(0, 0, canvasW, canvasH);
});

// ════════════════════════════════════════════
// 균열 시스템
// ════════════════════════════════════════════
function addCrackPoint(cx, cy, radius, isBig) {
  var numLines = isBig ? rndInt(10,18) : rndInt(4,9);
  var lines = [];
  for (var i = 0; i < numLines; i++) {
    var ang = rnd(0, Math.PI*2);
    var len = rnd(radius*0.5, radius*1.5);
    lines.push(buildCrackSegs(cx, cy, ang, len, isBig ? 3 : 2));
  }
  crackPoints.push({ x:cx, y:cy, radius:radius, lines:lines, isBig:isBig });
  needCrackRedraw = true;
}

function buildCrackSegs(sx, sy, ang, len, depth) {
  var segs = []; var x = sx, y = sy, a = ang;
  var n = rndInt(3,6);
  for (var i = 0; i < n; i++) {
    var sl = len / n * rnd(0.55, 1.45);
    var nx = x + Math.cos(a)*sl + rnd(-3,3);
    var ny = y + Math.sin(a)*sl + rnd(-3,3);
    segs.push({ x1:x, y1:y, x2:nx, y2:ny });
    x = nx; y = ny; a += rnd(-0.55, 0.55);
    if (depth > 1 && Math.random() < 0.38) {
      segs = segs.concat(buildCrackSegs(nx, ny, a+rnd(-1.3,1.3), len*0.45, depth-1));
    }
  }
  return segs;
}

function redrawCracks() {
  cCtx.clearRect(0, 0, canvasW, canvasH);
  crackPoints.forEach(function(cp) {
    // 균열 중심 어두운 원
    var g = cCtx.createRadialGradient(cp.x, cp.y, 0, cp.x, cp.y, cp.radius*0.3);
    g.addColorStop(0, 'rgba(0,0,0,0.65)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    cCtx.fillStyle = g;
    cCtx.beginPath();
    cCtx.arc(cp.x, cp.y, cp.radius*0.3, 0, Math.PI*2);
    cCtx.fill();
    // 균열 선
    cp.lines.forEach(function(segs) {
      segs.forEach(function(s) {
        cCtx.strokeStyle = 'rgba(0,0,0,0.88)';
        cCtx.lineWidth = cp.isBig ? rnd(1, 2.5) : rnd(0.7, 1.8);
        cCtx.lineCap = 'round';
        cCtx.beginPath();
        cCtx.moveTo(s.x1, s.y1);
        cCtx.lineTo(s.x2, s.y2);
        cCtx.stroke();
        // 흰 하이라이트 옆 선
        cCtx.strokeStyle = 'rgba(255,255,255,0.25)';
        cCtx.lineWidth = 0.5;
        cCtx.beginPath();
        cCtx.moveTo(s.x1+1, s.y1+1);
        cCtx.lineTo(s.x2+1, s.y2+1);
        cCtx.stroke();
      });
    });
  });
  needCrackRedraw = false;
}

// ════════════════════════════════════════════
// 도구: 🐾 발톱
// ════════════════════════════════════════════
function triggerClaw(cx, cy) {
  var baseAng = rnd(Math.PI*0.35, Math.PI*0.65);
  var len = rnd(40, 80);
  var spacing = 9;

  cCtx.save();
  cCtx.lineCap = 'round';
  for (var i = 0; i < 4; i++) {
    var off = (i - 1.5) * spacing;
    var ox = Math.cos(baseAng + Math.PI/2) * off;
    var oy = Math.sin(baseAng + Math.PI/2) * off;
    var flare = (i - 1.5) * 5;
    var ex = cx + ox + Math.cos(baseAng)*len + Math.cos(baseAng+Math.PI/2)*flare;
    var ey = cy + oy + Math.sin(baseAng)*len + Math.sin(baseAng+Math.PI/2)*flare;
    var sx = cx + ox - Math.cos(baseAng)*len*0.18;
    var sy = cy + oy - Math.sin(baseAng)*len*0.18;

    var grad = cCtx.createLinearGradient(sx, sy, ex, ey);
    grad.addColorStop(0, 'rgba(80,0,0,0.95)');
    grad.addColorStop(0.5, 'rgba(130,20,0,0.75)');
    grad.addColorStop(1, 'rgba(80,0,0,0.15)');
    cCtx.strokeStyle = grad;
    cCtx.lineWidth = rnd(1.5, 2.8);
    cCtx.beginPath(); cCtx.moveTo(sx,sy); cCtx.lineTo(ex,ey); cCtx.stroke();
  }
  cCtx.restore();

  // 피 파편
  for (var j = 0; j < 10; j++) {
    var px = cx + rnd(-18, 18), py = cy + rnd(-12, 22);
    dCtx.fillStyle = 'rgba(160,0,0,' + rnd(0.4,0.9) + ')';
    dCtx.beginPath();
    dCtx.arc(px, py, rnd(1, 3), 0, Math.PI*2);
    dCtx.fill();
  }

  addCrackPoint(cx, cy, rnd(18, 38), false);
  damage(rnd(4, 7), 'claw');
  shake(rnd(5, 10));
}

// ════════════════════════════════════════════
// 도구: 🌻 씨폭탄
// ════════════════════════════════════════════
function triggerBomb(cx, cy) {
  var r = rnd(28, 52);
  var g = dCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, 'rgba(0,0,0,0.92)');
  g.addColorStop(0.5, 'rgba(15,8,0,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  dCtx.fillStyle = g;
  dCtx.beginPath(); dCtx.arc(cx, cy, r, 0, Math.PI*2); dCtx.fill();

  var count = rndInt(14, 22);
  for (var i = 0; i < count; i++) {
    var ang = (i/count)*Math.PI*2 + rnd(-0.2, 0.2);
    var spd = rnd(5, 16);
    seedParts.push({
      x:cx, y:cy,
      vx: Math.cos(ang)*spd,
      vy: Math.sin(ang)*spd - rnd(1,4),
      rot: rnd(0, Math.PI*2), rotV: rnd(-0.4, 0.4),
      life: 1, size: rnd(3.5, 8),
    });
  }
  addCrackPoint(cx, cy, rnd(38, 65), false);
  damage(rnd(9, 15), 'bomb');
  shake(rnd(12, 20));
  showBubble('bomb');
}

function renderBomb() {
  seedParts = seedParts.filter(function(p) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.45; p.vx *= 0.96;
    p.rot += p.rotV; p.life -= 0.025;
    if (p.life <= 0) return false;
    dCtx.save();
    dCtx.globalAlpha = p.life;
    dCtx.translate(p.x, p.y); dCtx.rotate(p.rot);
    dCtx.fillStyle = '#3a2200';
    dCtx.beginPath();
    dCtx.ellipse(0, 0, p.size*0.38, p.size*0.68, 0, 0, Math.PI*2);
    dCtx.fill();
    dCtx.strokeStyle = 'rgba(255,255,255,0.4)'; dCtx.lineWidth = 0.8;
    dCtx.beginPath(); dCtx.moveTo(0,-p.size*0.5); dCtx.lineTo(0,p.size*0.5); dCtx.stroke();
    dCtx.restore();
    dCtx.globalAlpha = 1;
    return true;
  });
}

// ════════════════════════════════════════════
// 도구: 🔥 화염
// ════════════════════════════════════════════
function drawFlame(cx, cy) {
  if (!flamePrev) { flamePrev = {x:cx, y:cy}; return; }
  var dist = Math.hypot(cx - flamePrev.x, cy - flamePrev.y);
  if (dist < 3) return;

  var ang = Math.atan2(cy - flamePrev.y, cx - flamePrev.x);
  var radius = rnd(18, 32);
  var steps = Math.max(1, Math.ceil(dist / 4));

  for (var s = 0; s <= steps; s++) {
    var t = s / steps;
    var mx = flamePrev.x + (cx - flamePrev.x)*t;
    var my = flamePrev.y + (cy - flamePrev.y)*t;
    var pr = Math.ceil(radius / PIXEL_SIZE) + 1;
    for (var py = -pr; py <= pr; py++) {
      for (var px = -pr; px <= pr; px++) {
        var wx = Math.round((mx + px*PIXEL_SIZE) / PIXEL_SIZE) * PIXEL_SIZE;
        var wy = Math.round((my + py*PIXEL_SIZE) / PIXEL_SIZE) * PIXEL_SIZE;
        var d = Math.hypot(wx - mx, wy - my);
        if (d > radius) continue;
        var density = 1 - d/radius;
        var di = ((wy/PIXEL_SIZE)|0) & 3;
        var dj = ((wx/PIXEL_SIZE)|0) & 3;
        if (density < BAYER[di][dj]/16) continue;
        flamePixBuf.push({ x:wx, y:wy, s:PIXEL_SIZE, hot:density>0.55, a:rnd(0.55,1.0) });
      }
    }
  }

  for (var i = 0; i < 5; i++) {
    var sp = rnd(-0.5, 0.5);
    flameParts.push({
      x: cx+rnd(-5,5), y: cy+rnd(-5,5),
      vx: Math.cos(ang+sp)*rnd(2,6),
      vy: Math.sin(ang+sp)*rnd(2,6) - rnd(1,3),
      life: 1, size: rnd(8,22), hot: Math.random() > 0.35,
    });
  }
  damage(0.5, 'flame');
  flamePrev = {x:cx, y:cy};
}

function renderFlame() {
  flamePixBuf.forEach(function(p) {
    dCtx.fillStyle = p.hot
      ? 'rgba(255,' + rndInt(80,180) + ',0,' + p.a + ')'
      : 'rgba(0,0,0,' + p.a + ')';
    dCtx.fillRect(p.x, p.y, p.s, p.s);
  });
  flamePixBuf = [];

  flameParts = flameParts.filter(function(p) {
    p.x += p.vx; p.y += p.vy; p.vy -= 0.12; p.vx *= 0.94; p.life -= 0.045;
    if (p.life <= 0) return false;
    var r = p.size * p.life;
    var g = dCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    if (p.hot) {
      g.addColorStop(0, 'rgba(255,255,100,' + p.life + ')');
      g.addColorStop(0.5, 'rgba(255,120,0,' + (p.life*0.8) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      g.addColorStop(0, 'rgba(180,50,0,' + p.life + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
    }
    dCtx.fillStyle = g;
    dCtx.beginPath(); dCtx.arc(p.x, p.y, r, 0, Math.PI*2); dCtx.fill();
    return true;
  });
}

// ════════════════════════════════════════════
// 도구: 👊 주먹
// ════════════════════════════════════════════
function triggerFist(cx, cy) {
  var r = rnd(32, 52);
  var g = dCtx.createRadialGradient(cx, cy, 4, cx, cy, r);
  g.addColorStop(0, 'rgba(0,0,0,0.75)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.3)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  dCtx.fillStyle = g;
  dCtx.beginPath(); dCtx.arc(cx, cy, r, 0, Math.PI*2); dCtx.fill();

  addCrackPoint(cx, cy, rnd(55, 95), true);
  damage(rnd(13, 19), 'fist');
  shake(rnd(18, 28));
  showBubble('fist');
}

// ════════════════════════════════════════════
// 화면 내부 렌더링 (macOS 바탕화면)
// ════════════════════════════════════════════
function buildScreenPoly(stage) {
  // 화면 영역 클리핑 폴리곤 — stage에 따라 찌그러짐 (한 번만 생성)
  var sx = screenRect.x, sy = screenRect.y;
  var sw = screenRect.w, sh = screenRect.h;

  if (stage <= 1) {
    return [
      {x:sx, y:sy},
      {x:sx+sw, y:sy},
      {x:sx+sw, y:sy+sh},
      {x:sx, y:sy+sh},
    ];
  }
  var d = sw * 0.012 * (stage - 1);
  return [
    {x:sx + rnd(-d, d),   y:sy + rnd(-d*0.5, d*0.5)},
    {x:sx+sw + rnd(-d,d), y:sy + rnd(-d, d)},
    {x:sx+sw + rnd(-d*0.5, d*0.5), y:sy+sh + rnd(-d, d)},
    {x:sx + rnd(-d*0.5, d*0.5),    y:sy+sh + rnd(-d, d*0.5)},
  ];
}

function getScreenDistortPoly(stage) {
  // stage가 바뀌거나 resize 후에만 재생성
  if (cachedPolyStage !== stage || cachedPoly === null) {
    cachedPoly = buildScreenPoly(stage);
    cachedPolyStage = stage;
  }
  return cachedPoly;
}

// 화면 폴리곤 클리핑 적용
function clipToScreenPoly(ctx2d, poly) {
  ctx2d.beginPath();
  ctx2d.moveTo(poly[0].x, poly[0].y);
  for (var i = 1; i < poly.length; i++) ctx2d.lineTo(poly[i].x, poly[i].y);
  ctx2d.closePath();
  ctx2d.clip();
}

function drawDesktop(ctx2d, stage) {
  var sx = screenRect.x, sy = screenRect.y;
  var sw = screenRect.w, sh = screenRect.h;

  // 바탕화면 배경 그라디언트 (stage별 색 변화)
  var grad;
  if (stage <= 1) {
    grad = ctx2d.createLinearGradient(sx, sy, sx+sw, sy+sh);
    grad.addColorStop(0, '#4a7ec7');
    grad.addColorStop(0.5, '#3567b8');
    grad.addColorStop(1, '#2a56a0');
  } else if (stage === 2) {
    grad = ctx2d.createLinearGradient(sx, sy, sx+sw, sy+sh);
    grad.addColorStop(0, '#7060b0');
    grad.addColorStop(0.5, '#6050a8');
    grad.addColorStop(1, '#5040a0');
  } else if (stage === 3) {
    grad = ctx2d.createLinearGradient(sx, sy, sx+sw, sy+sh);
    grad.addColorStop(0, '#903060');
    grad.addColorStop(0.5, '#802878');
    grad.addColorStop(1, '#601870');
  } else {
    grad = ctx2d.createLinearGradient(sx, sy, sx+sw, sy+sh);
    grad.addColorStop(0, '#300010');
    grad.addColorStop(1, '#100020');
  }
  ctx2d.fillStyle = grad;
  ctx2d.fillRect(sx, sy, sw, sh);

  if (stage >= 5) return; // 완전 블랙

  var alpha = screenAlpha;
  ctx2d.globalAlpha = alpha;

  // 메뉴바
  var mh = sh * 0.085;
  ctx2d.fillStyle = 'rgba(255,255,255,0.82)';
  ctx2d.fillRect(sx, sy, sw, mh);
  ctx2d.fillStyle = 'rgba(0,0,0,0.85)';
  var fs = Math.max(8, sw * 0.028);
  ctx2d.font = 'bold ' + fs + 'px sans-serif';
  ctx2d.textBaseline = 'middle';
  var my = sy + mh/2;
  ctx2d.fillText('🍎', sx + sw*0.03, my);
  ctx2d.font = (fs*0.8) + 'px sans-serif';
  ['Finder','File','Edit','View','Go','Window','Help'].forEach(function(m, i) {
    ctx2d.fillText(m, sx + sw*(0.07 + i*0.07), my);
  });

  // 데스크탑 아이콘 (오른쪽)
  var iconSize = sw * 0.065;
  var icons = [
    {icon:'🗂️', label:'작업물', tx:0.88, ty:0.22},
    {icon:'🗑️', label:'휴지통', tx:0.88, ty:0.45},
  ];
  icons.forEach(function(ic) {
    var ix = sx + sw*ic.tx, iy = sy + sh*ic.ty;
    ctx2d.font = iconSize + 'px sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    ctx2d.fillText(ic.icon, ix, iy);
    ctx2d.font = 'bold ' + Math.max(7, sw*0.022) + 'px sans-serif';
    ctx2d.fillStyle = '#fff';
    ctx2d.shadowColor = 'rgba(0,0,0,0.9)';
    ctx2d.shadowBlur = 4;
    ctx2d.fillText(ic.label, ix, iy + iconSize*0.75);
    ctx2d.shadowBlur = 0;
    ctx2d.fillStyle = 'rgba(0,0,0,0.85)';
    ctx2d.textAlign = 'left';
    ctx2d.textBaseline = 'alphabetic';
  });

  // 독
  var dockH = sh * 0.13;
  var dockW = sw * 0.4;
  var dockX = sx + (sw - dockW)/2;
  var dockY = sy + sh - dockH - sh*0.02;
  var dockGrad = ctx2d.createLinearGradient(dockX, dockY, dockX, dockY+dockH);
  dockGrad.addColorStop(0, 'rgba(255,255,255,0.28)');
  dockGrad.addColorStop(1, 'rgba(255,255,255,0.10)');
  ctx2d.fillStyle = dockGrad;
  ctx2d.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx2d.lineWidth = 1;
  ctx2d.beginPath();
  ctx2d.roundRect(dockX, dockY, dockW, dockH, dockH*0.35);
  ctx2d.fill(); ctx2d.stroke();

  var dockIcons = ['🔍','📁','🌐','✉️','🎵'];
  var dIconSize = dockH * 0.72;
  var spacing = dockW / (dockIcons.length + 1);
  ctx2d.font = dIconSize + 'px sans-serif';
  ctx2d.textAlign = 'center';
  ctx2d.textBaseline = 'middle';
  dockIcons.forEach(function(ic, i) {
    ctx2d.fillText(ic, dockX + spacing*(i+1), dockY + dockH*0.5);
  });
  ctx2d.textAlign = 'left';
  ctx2d.textBaseline = 'alphabetic';

  ctx2d.globalAlpha = 1;
}

// ════════════════════════════════════════════
// 흔들기
// ════════════════════════════════════════════
function shake(v) { shakeAmt = Math.max(shakeAmt, v); }
function updateShake() {
  if (shakeAmt < 0.4) { shakeX = 0; shakeY = 0; shakeAmt = 0; return; }
  shakeX = rnd(-shakeAmt, shakeAmt);
  shakeY = rnd(-shakeAmt, shakeAmt);
  shakeAmt *= 0.72;
}

// ════════════════════════════════════════════
// 메인 렌더 루프
// ════════════════════════════════════════════
function drawFrame() {
  // 글리치 업데이트
  updateGlitch();

  // 균열 캔버스 필요 시 재드로우
  if (needCrackRedraw) redrawCracks();

  // 흔들기 업데이트
  updateShake();

  // 블랙아웃 패치 growing 처리
  blackoutPatches.forEach(function(p) {
    if (p.growing) p.alpha = Math.min(1, p.alpha + 0.012);
  });

  // 클리어
  ctx.clearRect(0, 0, canvasW, canvasH);

  // 흔들기 translate
  ctx.save();
  ctx.translate(shakeX, shakeY);

  // ── 1. macbook.png 그리기 ──
  if (macbookLoaded) {
    var brightness = [1, 0.97, 0.93, 0.88, 0.78, 0.55][damageStage];
    ctx.filter = 'brightness(' + brightness + ')';
    ctx.drawImage(macbookImg, mbRect.x, mbRect.y, mbRect.w, mbRect.h);
    ctx.filter = 'none';
  } else {
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(mbRect.x, mbRect.y, mbRect.w, mbRect.h);
  }

  // ── 2. 화면 영역: macOS 바탕화면 ──
  // 왜곡 폴리곤 클리핑
  ctx.save();
  var poly = getScreenDistortPoly(damageStage);
  clipToScreenPoly(ctx, poly);
  drawDesktop(ctx, damageStage);
  ctx.restore();

  // ── 3. 데미지 레이어 (탄자국/그을음/화염픽셀) — 화면 영역 클리핑 ──
  ctx.save();
  // 화면 클리핑 + 약간 바깥도 허용 (베젤 쪽 효과)
  ctx.beginPath();
  ctx.rect(
    screenRect.x - screenRect.w*0.03,
    screenRect.y - screenRect.h*0.03,
    screenRect.w * 1.06,
    screenRect.h * 1.06
  );
  ctx.clip();
  ctx.drawImage(damageCanvas, 0, 0);
  ctx.restore();

  // ── 4. 균열 레이어 — 화면 영역 + 베젤 일부 ──
  ctx.save();
  if (damageStage <= 2) {
    // 초기엔 화면 안에만
    ctx.beginPath();
    ctx.rect(screenRect.x, screenRect.y, screenRect.w, screenRect.h);
    ctx.clip();
  }
  // stage 3+는 전체에 균열 표시
  ctx.drawImage(crackCanvas, 0, 0);
  ctx.restore();

  // ── 5. 블랙아웃 패치 ──
  blackoutPatches.forEach(function(p) {
    var a = p.flicker && Math.random() < 0.15 ? rnd(0.3, 0.7) : p.alpha;
    ctx.fillStyle = 'rgba(0,0,0,' + a + ')';
    ctx.fillRect(p.x, p.y, p.w, p.h);
  });

  // ── 6. 글리치 라인 ──
  glitchLines.forEach(function(gl) {
    ctx.save();
    ctx.globalAlpha = gl.alpha;
    // 소스 영역을 옆으로 shift해서 그림
    if (gl.shift !== 0 && macbookLoaded) {
      var srcX = screenRect.x;
      var srcY = gl.y - screenRect.y;
      if (srcY >= 0 && srcY < screenRect.h) {
        try {
          var imgData = ctx.getImageData(srcX, gl.y, screenRect.w, gl.h);
          ctx.putImageData(imgData, srcX + gl.shift, gl.y);
        } catch(e) {}
      }
    }
    ctx.fillStyle = 'rgba(' + gl.color[0] + ',' + gl.color[1] + ',' + gl.color[2] + ',' + gl.alpha + ')';
    ctx.fillRect(screenRect.x, gl.y, screenRect.w, gl.h * 0.4);
    ctx.restore();
  });

  // ── 7. 데미지 오버레이 (화면 전체 어두워짐) ──
  if (damageStage >= 1) {
    var ovAlpha = Math.pow(1 - hp/100, 1.6) * 0.7;
    ctx.save();
    ctx.beginPath();
    ctx.rect(screenRect.x, screenRect.y, screenRect.w, screenRect.h);
    ctx.clip();
    // 비네팅 효과
    var vg = ctx.createRadialGradient(
      screenRect.x + screenRect.w/2, screenRect.y + screenRect.h/2, screenRect.w*0.1,
      screenRect.x + screenRect.w/2, screenRect.y + screenRect.h/2, screenRect.w*0.7
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,' + ovAlpha + ')');
    ctx.fillStyle = vg;
    ctx.fillRect(screenRect.x, screenRect.y, screenRect.w, screenRect.h);
    ctx.restore();
  }

  // ── 8. stage 4+: 노이즈 오버레이 ──
  if (damageStage >= 4 && Math.random() < 0.6) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(screenRect.x, screenRect.y, screenRect.w, screenRect.h);
    ctx.clip();
    for (var ni = 0; ni < 80; ni++) {
      var nx = rnd(screenRect.x, screenRect.x + screenRect.w);
      var ny = rnd(screenRect.y, screenRect.y + screenRect.h);
      var nw = rnd(1, 4), nh = rnd(1, 3);
      ctx.fillStyle = Math.random() < 0.5
        ? 'rgba(255,255,255,' + rnd(0.1,0.5) + ')'
        : 'rgba(0,0,0,' + rnd(0.1,0.4) + ')';
      ctx.fillRect(nx, ny, nw, nh);
    }
    ctx.restore();
  }

  ctx.restore(); // 흔들기 복원
}

// ════════════════════════════════════════════
// 파티클 렌더 (오프스크린에 그림)
// ════════════════════════════════════════════
function renderParticles() {
  renderBomb();
  renderFlame();
}

// ════════════════════════════════════════════
// 메인 루프
// ════════════════════════════════════════════
function loop() {
  requestAnimationFrame(loop);
  renderParticles();
  drawFrame();
}

// ════════════════════════════════════════════
// 도구 선택
// ════════════════════════════════════════════
var currentTool = 'claw';
var isDown = false;

var toolBtns = {
  claw:  document.getElementById('btn-claw'),
  bomb:  document.getElementById('btn-bomb'),
  flame: document.getElementById('btn-flame'),
  fist:  document.getElementById('btn-fist'),
};
Object.keys(toolBtns).forEach(function(k) {
  toolBtns[k].addEventListener('click', function() { selectTool(k); });
  toolBtns[k].addEventListener('mousedown', function(e) { e.stopPropagation(); });
});
document.addEventListener('keydown', function(e) {
  if (e.key.toLowerCase() === 'q') selectTool('claw');
  if (e.key.toLowerCase() === 'w') selectTool('bomb');
  if (e.key.toLowerCase() === 'e') selectTool('flame');
  if (e.key.toLowerCase() === 'r') selectTool('fist');
});
function selectTool(name) {
  currentTool = name;
  Object.keys(toolBtns).forEach(function(k) {
    toolBtns[k].classList.toggle('selected', k === name);
  });
  flamePrev = null;
}

// ════════════════════════════════════════════
// 커서
// ════════════════════════════════════════════
document.addEventListener('mousemove', function(e) {
  cursorEl.style.left = e.clientX + 'px';
  cursorEl.style.top  = e.clientY + 'px';
});

// ════════════════════════════════════════════
// 캔버스 이벤트
// ════════════════════════════════════════════
function getCanvasPos(e) {
  var t = e.touches ? e.touches[0] : e;
  return clientToCanvas(t.clientX, t.clientY);
}

function handleAction(cx, cy, isClick) {
  if (currentTool === 'claw'  && isClick) triggerClaw(cx, cy);
  else if (currentTool === 'bomb'  && isClick) triggerBomb(cx, cy);
  else if (currentTool === 'flame')             drawFlame(cx, cy);
  else if (currentTool === 'fist'  && isClick) triggerFist(cx, cy);
}

canvas.addEventListener('mousedown', function(e) {
  if (hp <= 0) return;
  isDown = true; flamePrev = null;
  cursorEl.src = 'Hamster-punch.png';
  var p = getCanvasPos(e);
  handleAction(p.x, p.y, true);
});
canvas.addEventListener('mousemove', function(e) {
  if (!isDown || hp <= 0) return;
  var p = getCanvasPos(e);
  handleAction(p.x, p.y, false);
});
document.addEventListener('mouseup', function() {
  isDown = false; flamePrev = null;
  cursorEl.src = 'Hamster.png';
});

canvas.addEventListener('touchstart', function(e) {
  e.preventDefault();
  if (hp <= 0) return;
  isDown = true; flamePrev = null;
  var p = getCanvasPos(e);
  handleAction(p.x, p.y, true);
}, { passive: false });
canvas.addEventListener('touchmove', function(e) {
  e.preventDefault();
  if (!isDown || hp <= 0) return;
  var p = getCanvasPos(e);
  handleAction(p.x, p.y, false);
}, { passive: false });
document.addEventListener('touchend', function() {
  isDown = false; flamePrev = null;
});

// ── 시작 ──
loop();
