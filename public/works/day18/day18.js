'use strict';
var IS_THUMB = new URLSearchParams(location.search).has('thumb');

// ── DOM ──
var screen      = document.getElementById('screen');
var hitLayer    = document.getElementById('hit-layer');
var destCanvas  = document.getElementById('destruction');
var crackCanvas = document.getElementById('cracks-canvas');
var smashedOv   = document.getElementById('smashed-overlay');
var cursor      = document.getElementById('hamster-cursor');
var hpBar       = document.getElementById('hp-bar');
var hpNum       = document.getElementById('hp-num');
var bubble      = document.getElementById('bubble');
var finalMsg    = document.getElementById('final-msg');
var restartBtn  = document.getElementById('restart-btn');

var dCtx = destCanvas.getContext('2d');
var cCtx = crackCanvas.getContext('2d');

// ── 캔버스 크기 동기화 ──
var SW, SH; // 화면 영역 크기
function syncSize() {
  var r = screen.getBoundingClientRect();
  SW = r.width; SH = r.height;
  destCanvas.width  = crackCanvas.width  = SW;
  destCanvas.height = crackCanvas.height = SH;
}
syncSize();
window.addEventListener('resize', function(){ syncSize(); redrawCracks(); });

// ── HP ──
var hp = 100;
var crackPoints = []; // {x,y,r,lines:[]} 균열 중심들
var MESSAGES = {
  claw:  ['으드득!!','찍찍!!','할퀴어준다!!','발톱 어택!!'],
  bomb:  ['쾅!!','씨드 어택!!','해바라기씨 투척!!','폭발이다!!'],
  flame: ['불이야!!','타버려!!','화염방사!!','불꽃 분노!!'],
  fist:  ['주먹이다!!','햄찌 어퍼컷!!','쾅쾅쾅!!','박살내준다!!'],
};

function damage(v, tool) {
  hp = Math.max(0, hp - v);
  var pct = hp;
  hpBar.style.width = pct + '%';
  hpNum.textContent = Math.round(pct);
  if (pct > 60) hpBar.style.background = 'linear-gradient(90deg,#4caf50,#8bc34a)';
  else if (pct > 30) hpBar.style.background = 'linear-gradient(90deg,#ff9800,#ffc107)';
  else hpBar.style.background = 'linear-gradient(90deg,#f44336,#e91e63)';
  smashedOv.style.opacity = (1 - pct/100) * 0.6;
  if (hp <= 0) triggerFinal();
  if (tool && Math.random() < 0.25) showBubble(tool);
}

function showBubble(tool) {
  var msgs = MESSAGES[tool] || ['찍찍!!'];
  bubble.textContent = msgs[Math.floor(Math.random()*msgs.length)];
  bubble.classList.add('show');
  clearTimeout(showBubble._t);
  showBubble._t = setTimeout(function(){ bubble.classList.remove('show'); }, 1600);
}

function triggerFinal() {
  // 화면 전체 박살 효과
  for (var i=0; i<12; i++) {
    addCrackPoint(rnd(SW*0.1,SW*0.9), rnd(SH*0.1,SH*0.9), rnd(30,80), true);
  }
  redrawCracks();
  smashedOv.style.opacity = 1;
  showBubble('fist');
  bubble.textContent = '🐹 개박살!!';
  setTimeout(function(){ finalMsg.classList.add('show'); }, 800);
}

restartBtn.addEventListener('click', function(){
  hp=100; crackPoints=[];
  hpBar.style.width='100%'; hpBar.style.background='linear-gradient(90deg,#4caf50,#8bc34a)';
  hpNum.textContent='100';
  smashedOv.style.opacity=0;
  finalMsg.classList.remove('show');
  dCtx.clearRect(0,0,SW,SH);
  cCtx.clearRect(0,0,SW,SH);
  flamePixels=[];
  bubble.classList.remove('show');
});

// ── 유틸 ──
function rnd(a,b){ return a + Math.random()*(b-a); }
function rndInt(a,b){ return Math.floor(rnd(a,b+1)); }

// ── 커서: 화면 좌표 → 캔버스 로컬 좌표 변환 ──
function toLocal(clientX, clientY) {
  var r = screen.getBoundingClientRect();
  return { x: clientX - r.left, y: clientY - r.top };
}

// ── 화면 흔들기 ──
var shakeAmt = 0;
function shake(v){ shakeAmt = Math.max(shakeAmt, v); }
function applyShake(){
  if(shakeAmt < 0.5){ screen.style.transform=''; shakeAmt=0; return; }
  var dx = rnd(-shakeAmt,shakeAmt), dy = rnd(-shakeAmt,shakeAmt);
  screen.style.transform = 'translate('+dx.toFixed(1)+'px,'+dy.toFixed(1)+'px)';
  shakeAmt *= 0.72;
}

// ══════════════════════════════════════════
// 🐾 발톱 — 클릭 시 발톱 자국 4줄 (방사형 긁힘)
// ══════════════════════════════════════════
var clawMarks = []; // {lines:[{x1,y1,x2,y2}], alpha, age}

function triggerClaw(x, y) {
  var ang = rnd(-Math.PI*0.15, Math.PI*0.15); // 살짝 기운 각도
  var len = rnd(40, 80);
  var spacing = 7;
  var lines = [];
  for (var i = -1; i <= 2; i++) {
    var ox = Math.cos(ang + Math.PI/2) * spacing * i;
    var oy = Math.sin(ang + Math.PI/2) * spacing * i;
    // 발톱은 약간 곡선처럼 보이게 끝을 벌림
    var curve = (i - 0.5) * 6;
    lines.push({
      x1: x + ox - Math.cos(ang)*len*0.3,
      y1: y + oy - Math.sin(ang)*len*0.3,
      x2: x + ox + Math.cos(ang)*len*0.7 + curve,
      y2: y + oy + Math.sin(ang)*len*0.7,
      w:  rnd(1.5, 3),
    });
  }
  clawMarks.push({ lines, alpha: 1, age: 0 });

  // 긁힘 파편 (피 같은 작은 점)
  for (var j=0; j<8; j++) {
    var px = x + rnd(-20,20), py = y + rnd(-20,20);
    dCtx.fillStyle = 'rgba(140,0,0,' + rnd(0.4,0.9) + ')';
    dCtx.beginPath();
    dCtx.arc(px, py, rnd(1,3), 0, Math.PI*2);
    dCtx.fill();
  }

  damage(rnd(3,6), 'claw');
  addCrackPoint(x, y, rnd(20,40));
  shake(rnd(4,8));
}

function renderClaw() {
  clawMarks.forEach(function(m){
    cCtx.lineCap = 'round';
    m.lines.forEach(function(l){
      cCtx.strokeStyle = 'rgba(60,0,0,'+m.alpha+')';
      cCtx.lineWidth = l.w;
      cCtx.beginPath();
      cCtx.moveTo(l.x1,l.y1);
      cCtx.lineTo(l.x2,l.y2);
      cCtx.stroke();
    });
  });
}

// ══════════════════════════════════════════
// 🌻 씨폭탄 — 클릭 시 방사형 씨앗 + 그을음
// ══════════════════════════════════════════
var seedParticles = [];
var scorchMarks   = []; // {x,y,r,alpha}

function triggerBomb(x, y) {
  var r = rnd(30, 60);
  scorchMarks.push({x,y,r,alpha:0.9});

  var count = rndInt(14,22);
  for(var i=0;i<count;i++){
    var ang = (i/count)*Math.PI*2 + rnd(-0.2,0.2);
    var spd = rnd(5,16);
    seedParticles.push({
      x,y,
      vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd - rnd(1,4),
      rot: rnd(0,Math.PI*2), rotV: rnd(-0.4,0.4),
      life:1, size:rnd(4,9),
    });
  }
  damage(rnd(8,14), 'bomb');
  addCrackPoint(x, y, rnd(35,65));
  shake(rnd(10,18));
  showBubble('bomb');
}

function renderBomb() {
  // 그을음
  scorchMarks.forEach(function(m){
    var g = dCtx.createRadialGradient(m.x,m.y,0,m.x,m.y,m.r);
    g.addColorStop(0,'rgba(0,0,0,'+m.alpha+')');
    g.addColorStop(0.5,'rgba(20,10,0,'+(m.alpha*0.5)+')');
    g.addColorStop(1,'rgba(0,0,0,0)');
    dCtx.fillStyle=g;
    dCtx.beginPath();
    dCtx.arc(m.x,m.y,m.r,0,Math.PI*2);
    dCtx.fill();
  });
  scorchMarks = [];

  // 씨앗
  seedParticles = seedParticles.filter(function(p){
    p.x+=p.vx; p.y+=p.vy; p.vy+=0.45; p.vx*=0.96;
    p.rot+=p.rotV; p.life-=0.025;
    if(p.life<=0) return false;
    dCtx.save();
    dCtx.globalAlpha = p.life;
    dCtx.translate(p.x,p.y); dCtx.rotate(p.rot);
    dCtx.fillStyle='#3a2200';
    dCtx.beginPath();
    dCtx.ellipse(0,0,p.size*0.38,p.size*0.68,0,0,Math.PI*2);
    dCtx.fill();
    dCtx.strokeStyle='rgba(255,255,255,0.4)';
    dCtx.lineWidth=0.8;
    dCtx.beginPath(); dCtx.moveTo(0,-p.size*0.5); dCtx.lineTo(0,p.size*0.5); dCtx.stroke();
    dCtx.restore();
    dCtx.globalAlpha=1;
    return true;
  });
}

// ══════════════════════════════════════════
// 🔥 화염 — 디더링 픽셀 스프레이 + 불꽃
// ══════════════════════════════════════════
var flamePixels    = []; // 누적 탄 자국 픽셀들 {x,y,s,a}
var flameParticles = [];
var flamePrev      = null;
var PIXEL_SIZE     = 6; // 디더링 픽셀 크기
var DITHER_PATTERN = [
  // 바이어 디더 4x4
  [ 0, 8, 2,10],
  [12, 4,14, 6],
  [ 3,11, 1, 9],
  [15, 7,13, 5],
];

function drawFlame(x, y) {
  if(!flamePrev){ flamePrev={x,y}; return; }
  var dist = Math.hypot(x-flamePrev.x, y-flamePrev.y);
  if(dist < 5){ return; }

  var ang = Math.atan2(y-flamePrev.y, x-flamePrev.x);

  // 디더 픽셀 스프레이 — 원형 범위 안에 계단형으로
  var radius = rnd(18, 32);
  var steps = Math.ceil(dist/4);
  for(var s=0;s<=steps;s++){
    var t = s/Math.max(steps,1);
    var cx = flamePrev.x + (x-flamePrev.x)*t;
    var cy = flamePrev.y + (y-flamePrev.y)*t;

    // 그리드 정렬 픽셀들 (스프레이 범위)
    var pr = Math.ceil(radius/PIXEL_SIZE);
    for(var py=-pr;py<=pr;py++){
      for(var px=-pr;px<=pr;px++){
        var wx = Math.round((cx + px*PIXEL_SIZE)/PIXEL_SIZE)*PIXEL_SIZE;
        var wy = Math.round((cy + py*PIXEL_SIZE)/PIXEL_SIZE)*PIXEL_SIZE;
        var d  = Math.hypot(wx-cx, wy-cy);
        if(d > radius) continue;

        // 바이어 디더: 가장자리에 가까울수록 성기게
        var density = 1 - d/radius;
        var di = ((wy/PIXEL_SIZE)|0) & 3;
        var dj = ((wx/PIXEL_SIZE)|0) & 3;
        var threshold = DITHER_PATTERN[di][dj] / 16;
        if(density < threshold) continue;

        // 색상: 중심=노란, 가장자리=검은 탄
        var hot = density > 0.6;
        flamePixels.push({
          x:wx, y:wy, s:PIXEL_SIZE,
          a: rnd(0.6,1.0),
          hot,
        });
      }
    }
  }

  // 불꽃 파티클
  for(var i=0;i<5;i++){
    var sp = rnd(-0.5,0.5);
    flameParticles.push({
      x: x+rnd(-6,6), y: y+rnd(-6,6),
      vx: Math.cos(ang+sp)*rnd(2,6),
      vy: Math.sin(ang+sp)*rnd(2,6) - rnd(1,3),
      life:1, size:rnd(8,20), hot:Math.random()>0.3,
    });
  }

  damage(0.4, 'flame');
  flamePrev = {x,y};
}

function renderFlame() {
  // 누적 픽셀 (탄 자국) — 한번 그리고 남김
  flamePixels.forEach(function(p){
    if(p.hot){
      dCtx.fillStyle='rgba(255,'+(rndInt(100,200))+',0,'+p.a+')';
    } else {
      dCtx.fillStyle='rgba(0,0,0,'+p.a+')';
    }
    dCtx.fillRect(p.x,p.y,p.s,p.s);
  });
  flamePixels=[];

  // 불꽃 파티클
  flameParticles = flameParticles.filter(function(p){
    p.x+=p.vx; p.y+=p.vy; p.vy-=0.12; p.vx*=0.94;
    p.life-=0.045;
    if(p.life<=0) return false;
    var r=p.size*p.life;
    var g=dCtx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
    if(p.hot){
      g.addColorStop(0,'rgba(255,255,100,'+p.life+')');
      g.addColorStop(0.5,'rgba(255,120,0,'+(p.life*0.8)+')');
      g.addColorStop(1,'rgba(0,0,0,0)');
    } else {
      g.addColorStop(0,'rgba(180,50,0,'+p.life+')');
      g.addColorStop(1,'rgba(0,0,0,0)');
    }
    dCtx.fillStyle=g;
    dCtx.beginPath(); dCtx.arc(p.x,p.y,r,0,Math.PI*2); dCtx.fill();
    return true;
  });
}

// ══════════════════════════════════════════
// 👊 주먹 — 클릭 시 방사형 균열 + 강진
// ══════════════════════════════════════════
function triggerFist(x, y) {
  addCrackPoint(x, y, rnd(50,90), false);
  redrawCracks();
  // 주먹 자국 원
  var g = dCtx.createRadialGradient(x,y,5,x,y,rnd(30,50));
  g.addColorStop(0,'rgba(0,0,0,0.7)');
  g.addColorStop(0.6,'rgba(0,0,0,0.3)');
  g.addColorStop(1,'rgba(0,0,0,0)');
  dCtx.fillStyle=g;
  dCtx.beginPath(); dCtx.arc(x,y,rnd(30,50),0,Math.PI*2); dCtx.fill();
  damage(rnd(12,18), 'fist');
  shake(rnd(18,28));
  showBubble('fist');
}

// ══════════════════════════════════════════
// 균열 시스템 — crackCanvas에 그림
// ══════════════════════════════════════════
function addCrackPoint(x, y, radius, isBig) {
  var numLines = isBig ? rndInt(10,16) : rndInt(4,8);
  var lines = [];
  for(var i=0;i<numLines;i++){
    var ang = rnd(0, Math.PI*2);
    var len = rnd(radius*0.5, radius*1.4);
    var segs = buildCrackSegs(x, y, ang, len, isBig ? 3 : 2);
    lines.push(segs);
  }
  crackPoints.push({x,y,radius,lines,isBig});
}

function buildCrackSegs(sx, sy, ang, len, depth) {
  var segs = [];
  var x=sx, y=sy, a=ang;
  var numSeg = rndInt(3,6);
  for(var i=0;i<numSeg;i++){
    var sl = len/numSeg * rnd(0.6,1.4);
    var nx = x + Math.cos(a)*sl + rnd(-3,3);
    var ny = y + Math.sin(a)*sl + rnd(-3,3);
    segs.push({x1:x,y1:y,x2:nx,y2:ny});
    x=nx; y=ny; a+=rnd(-0.5,0.5);
    if(depth>1 && Math.random()<0.35){
      var branch = buildCrackSegs(nx,ny,a+rnd(-1.2,1.2),len*0.45,depth-1);
      segs = segs.concat(branch);
    }
  }
  return segs;
}

function redrawCracks() {
  cCtx.clearRect(0,0,SW,SH);
  // 발톱 먼저
  renderClaw();
  // 균열
  crackPoints.forEach(function(cp){
    cp.lines.forEach(function(segs){
      segs.forEach(function(s){
        cCtx.strokeStyle = 'rgba(0,0,0,0.85)';
        cCtx.lineWidth = cp.isBig ? rnd(1,2.5) : rnd(0.8,1.8);
        cCtx.lineCap='round';
        cCtx.beginPath();
        cCtx.moveTo(s.x1,s.y1);
        cCtx.lineTo(s.x2,s.y2);
        cCtx.stroke();
      });
    });
    // 균열 중심 어두운 점
    var g=cCtx.createRadialGradient(cp.x,cp.y,0,cp.x,cp.y,cp.radius*0.3);
    g.addColorStop(0,'rgba(0,0,0,0.5)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    cCtx.fillStyle=g;
    cCtx.beginPath(); cCtx.arc(cp.x,cp.y,cp.radius*0.3,0,Math.PI*2); cCtx.fill();
  });
}

// ── 도구 선택 ──
var currentTool = 'claw';
var isDown = false;
var punchImg = new Image(); punchImg.src = 'Hamster-punch.png';
var normalImg = new Image(); normalImg.src = 'Hamster.png';

var toolBtns = {
  claw:  document.getElementById('btn-claw'),
  bomb:  document.getElementById('btn-bomb'),
  flame: document.getElementById('btn-flame'),
  fist:  document.getElementById('btn-fist'),
};
Object.keys(toolBtns).forEach(function(k){
  toolBtns[k].addEventListener('click', function(){ selectTool(k); });
  toolBtns[k].addEventListener('mousedown', function(e){ e.stopPropagation(); });
});
document.addEventListener('keydown', function(e){
  if(e.key==='q'||e.key==='Q') selectTool('claw');
  if(e.key==='w'||e.key==='W') selectTool('bomb');
  if(e.key==='e'||e.key==='E') selectTool('flame');
  if(e.key==='r'||e.key==='R') selectTool('fist');
});
function selectTool(name){
  currentTool=name;
  Object.keys(toolBtns).forEach(function(k){ toolBtns[k].classList.toggle('selected',k===name); });
  flamePrev=null;
}

// ── 커서 이동 ──
document.addEventListener('mousemove', function(e){
  cursor.style.left = e.clientX+'px';
  cursor.style.top  = e.clientY+'px';
});

// ── 히트레이어 이벤트 ──
function getLocalPos(e){
  var t = e.touches ? e.touches[0] : e;
  return toLocal(t.clientX, t.clientY);
}

hitLayer.addEventListener('mousedown', function(e){
  if(hp<=0) return;
  isDown=true;
  cursor.src = punchImg.src;
  var p = getLocalPos(e);
  flamePrev = null;
  handleAction(p.x, p.y, true);
});
hitLayer.addEventListener('mousemove', function(e){
  if(!isDown||hp<=0) return;
  var p = getLocalPos(e);
  handleAction(p.x, p.y, false);
});
document.addEventListener('mouseup', function(){
  isDown=false;
  flamePrev=null;
  cursor.src = normalImg.src;
});

hitLayer.addEventListener('touchstart', function(e){
  e.preventDefault();
  if(hp<=0) return;
  isDown=true;
  var p = getLocalPos(e);
  flamePrev=null;
  handleAction(p.x,p.y,true);
},{passive:false});
hitLayer.addEventListener('touchmove', function(e){
  e.preventDefault();
  if(!isDown||hp<=0) return;
  var p = getLocalPos(e);
  handleAction(p.x,p.y,false);
},{passive:false});
document.addEventListener('touchend', function(){ isDown=false; flamePrev=null; });

function handleAction(x, y, isClick){
  if(currentTool==='claw'  && isClick) triggerClaw(x,y);
  else if(currentTool==='bomb'  && isClick) triggerBomb(x,y);
  else if(currentTool==='flame')            drawFlame(x,y);
  else if(currentTool==='fist'  && isClick) triggerFist(x,y);
}

// ── 렌더 루프 ──
function loop(){
  requestAnimationFrame(loop);
  renderBomb();
  renderFlame();
  applyShake();
}
loop();
