'use strict';
var IS_THUMB = new URLSearchParams(location.search).has('thumb');

// ── DOM ──
var screenEl    = document.getElementById('screen');
var hitLayer    = document.getElementById('hit-layer');
var destCanvas  = document.getElementById('destruction');
var crackCanvas = document.getElementById('cracks-canvas');
var damageOv    = document.getElementById('damage-overlay');
var screenDead  = document.getElementById('screen-dead');
var cursorEl    = document.getElementById('hamster-cursor');
var hpBar       = document.getElementById('hp-bar');
var hpNum       = document.getElementById('hp-num');
var bubbleEl    = document.getElementById('bubble');
var finalMsg    = document.getElementById('final-msg');
var restartBtn  = document.getElementById('restart-btn');
var macbookWrap = document.getElementById('macbook-wrap');

var dCtx = destCanvas.getContext('2d');
var cCtx = crackCanvas.getContext('2d');

// ── 캔버스 크기 ──
var SW = 0, SH = 0;
function syncSize() {
  var r = screenEl.getBoundingClientRect();
  SW = Math.round(r.width);
  SH = Math.round(r.height);
  destCanvas.width  = crackCanvas.width  = SW;
  destCanvas.height = crackCanvas.height = SH;
}
syncSize();
window.addEventListener('resize', function(){ syncSize(); redrawCracks(); });

// ── 상태 ──
var hp = 100;
var crackPoints  = [];
var clawMarks    = [];
var seedParts    = [];
var flameParts   = [];
var flamePixBuf  = []; // 매 프레임 flush
var flamePrev    = null;
var shakeAmt     = 0;

var PIXEL_SIZE   = 5;
// Bayer 4×4 디더 매트릭스
var BAYER = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];

var MSGS = {
  claw:  ['으드득!!','찍찍!!','할퀴어준다!!','발톱 어택!!'],
  bomb:  ['쾅!!','씨드 어택!!','해바라기씨 투척!!','폭발이다!!'],
  flame: ['불이야!!','타버려!!','화염방사!!','불꽃 분노!!'],
  fist:  ['주먹이다!!','햄찌 어퍼컷!!','쾅쾅쾅!!','박살내준다!!'],
};

// ── 유틸 ──
function rnd(a,b){ return a+Math.random()*(b-a); }
function rndInt(a,b){ return Math.floor(rnd(a,b+1)); }

// ── 커서 좌표 → 화면 로컬 좌표 ──
function toLocal(cx,cy){
  var r = screenEl.getBoundingClientRect();
  return {x:cx-r.left, y:cy-r.top};
}

// ── 화면 흔들기 ──
function shake(v){ shakeAmt = Math.max(shakeAmt, v); }
function applyShake(){
  if(shakeAmt<0.4){ macbookWrap.style.transform=''; shakeAmt=0; return; }
  var dx=rnd(-shakeAmt,shakeAmt), dy=rnd(-shakeAmt,shakeAmt);
  macbookWrap.style.transform='translate('+dx.toFixed(1)+'px,'+dy.toFixed(1)+'px)';
  shakeAmt*=0.72;
}

// ── HP & 데미지 ──
// 손상 단계: 0=정상, 1=약손상(~75), 2=중손상(~50), 3=심손상(~25), 4=붕괴(~10), 5=사망(0)
var damageStage = 0;

// 맥북 이미지 단계별 변형
var STAGE_TRANSFORMS = [
  // stage 0: 정상
  { img: 'none', screen: 'linear-gradient(160deg,#4a7ec7 0%,#3567b8 50%,#2a56a0 100%)' },
  // stage 1: 약손상 — 살짝 기울기
  { img: 'rotate(-0.8deg) skewX(0.5deg)', screen: 'linear-gradient(160deg,#5a7ec0 0%,#4060aa 50%,#3050a0 100%)' },
  // stage 2: 중손상 — 더 기울고 찌그러짐
  { img: 'rotate(-2deg) skewX(1.5deg) scaleY(0.97)', screen: 'linear-gradient(160deg,#7060b0 0%,#6050a8 50%,#5040a0 100%)' },
  // stage 3: 심손상 — 크게 뒤틀림
  { img: 'rotate(-4deg) skewX(3deg) skewY(-1deg) scaleY(0.94)', screen: 'linear-gradient(160deg,#903060 0%,#802878 50%,#601870 100%)' },
  // stage 4: 붕괴 — 심하게 변형
  { img: 'rotate(-7deg) skewX(5deg) skewY(-2deg) scaleY(0.88) scaleX(0.97)', screen: 'linear-gradient(160deg,#400010 0%,#300020 50%,#200030 100%)' },
  // stage 5: 사망
  { img: 'rotate(-10deg) skewX(8deg) skewY(-3deg) scaleY(0.80) scaleX(0.93)', screen: '#000' },
];

function updateDamageStage() {
  var newStage;
  if      (hp > 75) newStage = 0;
  else if (hp > 50) newStage = 1;
  else if (hp > 25) newStage = 2;
  else if (hp > 10) newStage = 3;
  else if (hp > 0)  newStage = 4;
  else              newStage = 5;

  if (newStage !== damageStage) {
    damageStage = newStage;
    applyDamageStage();
    if (newStage > 0) autoScreenCrack(newStage);
  }
}

function applyDamageStage() {
  var s = STAGE_TRANSFORMS[damageStage];
  var macImg = document.getElementById('macbook-img');

  // 맥북 이미지 변형
  macImg.style.transition = 'transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94), filter 0.3s';
  if (s.img === 'none') {
    macImg.style.transform = '';
    macImg.style.filter = '';
  } else {
    macImg.style.transform = s.img;
    // 손상 단계별 필터 추가
    var blur   = [0, 0, 0.3, 0.6, 1.0, 1.5][damageStage];
    var bright = [1, 0.97, 0.93, 0.88, 0.75, 0.5][damageStage];
    macImg.style.filter = 'blur('+blur+'px) brightness('+bright+')';
  }

  // 화면 배경색 변화
  screenEl.style.transition = 'background 0.5s';
  screenEl.style.background = s.screen;

  // 화면 깜빡임 효과 (stage 2 이상)
  if (damageStage >= 2) {
    screenFlicker();
  }
}

var flickerTimer = null;
function screenFlicker() {
  clearTimeout(flickerTimer);
  var times = damageStage >= 4 ? 6 : 3;
  var interval = 80;
  var count = 0;
  function doFlicker() {
    if (count++ >= times * 2) return;
    screenEl.style.opacity = (count % 2 === 0) ? '1' : String(0.3 + Math.random() * 0.4);
    flickerTimer = setTimeout(doFlicker, interval + Math.random() * 60);
  }
  doFlicker();
}

function damage(v, tool){
  if(hp<=0) return;
  hp = Math.max(0, hp-v);
  var pct = hp;
  hpBar.style.width = pct+'%';
  hpNum.textContent = Math.round(pct);
  if(pct>60) hpBar.style.background='linear-gradient(90deg,#4caf50,#8bc34a)';
  else if(pct>30) hpBar.style.background='linear-gradient(90deg,#ff9800,#ffc107)';
  else hpBar.style.background='linear-gradient(90deg,#f44336,#e91e63)';

  // 화면 손상 오버레이
  damageOv.style.opacity = Math.pow(1-pct/100, 1.8) * 0.9;

  updateDamageStage();

  if(hp<=0) triggerDeath();
  if(tool && Math.random()<0.22) showBubble(tool);
}

function autoScreenCrack(level){
  var count = level * 2 + 2;
  for(var i=0;i<count;i++){
    var x=rnd(SW*0.08,SW*0.92), y=rnd(SH*0.08,SH*0.92);
    addCrackPoint(x,y,rnd(25+level*12,50+level*18),level>=3);
  }
  redrawCracks();
}

function triggerDeath(){
  // 화면 전체 균열 + 꺼짐
  for(var i=0;i<20;i++){
    addCrackPoint(rnd(SW*0.05,SW*0.95),rnd(SH*0.05,SH*0.95),rnd(40,110),true);
  }
  redrawCracks();
  setTimeout(function(){
    screenDead.style.opacity='0.95';
  }, 600);
  // 맥북 최종 변형 적용
  applyDamageStage();
  bubbleEl.textContent='🐹 개박살!!';
  bubbleEl.classList.add('show');
  setTimeout(function(){ finalMsg.classList.add('show'); }, 1400);
}

function showBubble(tool){
  var msgs = (typeof tool==='string' && MSGS[tool]) ? MSGS[tool] : ['찍찍!!'];
  bubbleEl.textContent = msgs[rndInt(0,msgs.length-1)];
  bubbleEl.classList.add('show');
  clearTimeout(showBubble._t);
  showBubble._t = setTimeout(function(){ bubbleEl.classList.remove('show'); }, 1600);
}

restartBtn.addEventListener('click', function(){
  hp=100; damageStage=0; crackPoints=[]; clawMarks=[]; seedParts=[]; flameParts=[]; flamePixBuf=[]; flamePrev=null;
  hpBar.style.width='100%';
  hpBar.style.background='linear-gradient(90deg,#4caf50,#8bc34a)';
  hpNum.textContent='100';
  damageOv.style.opacity='0';
  screenDead.style.opacity='0';
  screenEl.style.opacity='1';
  finalMsg.classList.remove('show');
  bubbleEl.classList.remove('show');
  dCtx.clearRect(0,0,SW,SH);
  cCtx.clearRect(0,0,SW,SH);
  macbookWrap.style.transform='';
  // 맥북 이미지 초기화
  var macImg = document.getElementById('macbook-img');
  macImg.style.transform=''; macImg.style.filter='';
  screenEl.style.background='linear-gradient(160deg,#4a7ec7 0%,#3567b8 50%,#2a56a0 100%)';
});

// ══════════════════════════════
// 🐾 발톱 — 클릭 시 4줄 방사형
// ══════════════════════════════
function triggerClaw(x, y){
  // 살짝 기울어진 각도 (위에서 아래로 긁는 느낌)
  var baseAng = rnd(Math.PI*0.35, Math.PI*0.65);
  var len = rnd(45,85);
  var spacing = 8;

  cCtx.save();
  cCtx.lineCap='round';
  for(var i=0;i<4;i++){
    var off = (i-1.5)*spacing;
    var ox = Math.cos(baseAng+Math.PI/2)*off;
    var oy = Math.sin(baseAng+Math.PI/2)*off;
    // 끝으로 갈수록 살짝 벌어짐 (발톱 특유의 퍼짐)
    var flare = (i-1.5)*4;
    var ex = x + ox + Math.cos(baseAng)*len + Math.cos(baseAng+Math.PI/2)*flare;
    var ey = y + oy + Math.sin(baseAng)*len + Math.sin(baseAng+Math.PI/2)*flare;
    var sx = x + ox - Math.cos(baseAng)*len*0.2;
    var sy = y + oy - Math.sin(baseAng)*len*0.2;

    // 긁힘 선 (진함 → 연해짐)
    var grad = cCtx.createLinearGradient(sx,sy,ex,ey);
    grad.addColorStop(0,'rgba(80,0,0,0.9)');
    grad.addColorStop(0.5,'rgba(120,20,0,0.7)');
    grad.addColorStop(1,'rgba(80,0,0,0.2)');
    cCtx.strokeStyle=grad;
    cCtx.lineWidth = rnd(1.5,2.8);
    cCtx.beginPath(); cCtx.moveTo(sx,sy); cCtx.lineTo(ex,ey); cCtx.stroke();
  }
  cCtx.restore();

  // 파편 (피 같은 점)
  for(var j=0;j<10;j++){
    var px=x+rnd(-18,18), py=y+rnd(-14,20);
    dCtx.fillStyle='rgba(160,0,0,'+rnd(0.4,0.9)+')';
    dCtx.beginPath(); dCtx.arc(px,py,rnd(1,3.5),0,Math.PI*2); dCtx.fill();
  }

  damage(rnd(4,7),'claw');
  addCrackPoint(x,y,rnd(18,38));
  shake(rnd(5,10));
}

// ══════════════════════════════
// 🌻 씨폭탄 — 클릭 시 폭발
// ══════════════════════════════
function triggerBomb(x,y){
  var r=rnd(28,55);
  // 그을음
  var g=dCtx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,'rgba(0,0,0,0.92)');
  g.addColorStop(0.5,'rgba(15,8,0,0.55)');
  g.addColorStop(1,'rgba(0,0,0,0)');
  dCtx.fillStyle=g; dCtx.beginPath(); dCtx.arc(x,y,r,0,Math.PI*2); dCtx.fill();

  var count=rndInt(14,22);
  for(var i=0;i<count;i++){
    var ang=(i/count)*Math.PI*2+rnd(-0.2,0.2);
    var spd=rnd(5,16);
    seedParts.push({
      x,y,
      vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd-rnd(1,4),
      rot:rnd(0,Math.PI*2), rotV:rnd(-0.4,0.4),
      life:1, size:rnd(3.5,8),
    });
  }
  damage(rnd(9,15),'bomb');
  addCrackPoint(x,y,rnd(38,68));
  shake(rnd(12,20));
  showBubble('bomb');
}

function renderBomb(){
  seedParts=seedParts.filter(function(p){
    p.x+=p.vx; p.y+=p.vy; p.vy+=0.45; p.vx*=0.96;
    p.rot+=p.rotV; p.life-=0.025;
    if(p.life<=0) return false;
    dCtx.save();
    dCtx.globalAlpha=p.life;
    dCtx.translate(p.x,p.y); dCtx.rotate(p.rot);
    dCtx.fillStyle='#3a2200';
    dCtx.beginPath(); dCtx.ellipse(0,0,p.size*0.38,p.size*0.68,0,0,Math.PI*2); dCtx.fill();
    dCtx.strokeStyle='rgba(255,255,255,0.4)'; dCtx.lineWidth=0.8;
    dCtx.beginPath(); dCtx.moveTo(0,-p.size*0.5); dCtx.lineTo(0,p.size*0.5); dCtx.stroke();
    dCtx.restore(); dCtx.globalAlpha=1;
    return true;
  });
}

// ══════════════════════════════
// 🔥 화염 — 디더 스프레이
// ══════════════════════════════
function drawFlame(x,y){
  if(!flamePrev){ flamePrev={x,y}; return; }
  var dist=Math.hypot(x-flamePrev.x,y-flamePrev.y);
  if(dist<4){ return; }

  var ang=Math.atan2(y-flamePrev.y,x-flamePrev.x);
  var radius=rnd(20,34);
  var steps=Math.max(1,Math.ceil(dist/5));

  for(var s=0;s<=steps;s++){
    var t=s/steps;
    var cx=flamePrev.x+(x-flamePrev.x)*t;
    var cy=flamePrev.y+(y-flamePrev.y)*t;
    var pr=Math.ceil(radius/PIXEL_SIZE)+1;

    for(var py=-pr;py<=pr;py++){
      for(var px=-pr;px<=pr;px++){
        var wx=Math.round((cx+px*PIXEL_SIZE)/PIXEL_SIZE)*PIXEL_SIZE;
        var wy=Math.round((cy+py*PIXEL_SIZE)/PIXEL_SIZE)*PIXEL_SIZE;
        var d=Math.hypot(wx-cx,wy-cy);
        if(d>radius) continue;

        var density=1-d/radius;
        var di=((wy/PIXEL_SIZE)|0)&3;
        var dj=((wx/PIXEL_SIZE)|0)&3;
        if(density < BAYER[di][dj]/16) continue;

        flamePixBuf.push({x:wx,y:wy,s:PIXEL_SIZE,
          hot:density>0.55, a:rnd(0.55,1.0)});
      }
    }
  }

  // 불꽃 파티클
  for(var i=0;i<5;i++){
    var sp=rnd(-0.5,0.5);
    flameParts.push({
      x:x+rnd(-5,5), y:y+rnd(-5,5),
      vx:Math.cos(ang+sp)*rnd(2,6),
      vy:Math.sin(ang+sp)*rnd(2,6)-rnd(1,3),
      life:1, size:rnd(8,22), hot:Math.random()>0.35,
    });
  }

  damage(0.5,'flame');
  flamePrev={x,y};
}

function renderFlame(){
  // 디더 픽셀 flush
  flamePixBuf.forEach(function(p){
    dCtx.fillStyle = p.hot
      ? 'rgba(255,'+rndInt(80,180)+',0,'+p.a+')'
      : 'rgba(0,0,0,'+p.a+')';
    dCtx.fillRect(p.x,p.y,p.s,p.s);
  });
  flamePixBuf=[];

  // 불꽃
  flameParts=flameParts.filter(function(p){
    p.x+=p.vx; p.y+=p.vy; p.vy-=0.12; p.vx*=0.94; p.life-=0.045;
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

// ══════════════════════════════
// 👊 주먹 — 방사형 균열 + 강진
// ══════════════════════════════
function triggerFist(x,y){
  // 주먹 자국
  var g=dCtx.createRadialGradient(x,y,4,x,y,rnd(32,52));
  g.addColorStop(0,'rgba(0,0,0,0.75)');
  g.addColorStop(0.6,'rgba(0,0,0,0.3)');
  g.addColorStop(1,'rgba(0,0,0,0)');
  dCtx.fillStyle=g;
  dCtx.beginPath(); dCtx.arc(x,y,rnd(32,52),0,Math.PI*2); dCtx.fill();

  addCrackPoint(x,y,rnd(55,95),false);
  redrawCracks();
  damage(rnd(13,19),'fist');
  shake(rnd(18,28));
  showBubble('fist');
}

// ══════════════════════════════
// 균열 시스템
// ══════════════════════════════
function addCrackPoint(x,y,radius,isBig){
  var numLines=isBig?rndInt(10,18):rndInt(4,9);
  var lines=[];
  for(var i=0;i<numLines;i++){
    var ang=rnd(0,Math.PI*2);
    var len=rnd(radius*0.5,radius*1.5);
    lines.push(buildCrackSegs(x,y,ang,len,isBig?3:2));
  }
  crackPoints.push({x,y,radius,lines,isBig});
}

function buildCrackSegs(sx,sy,ang,len,depth){
  var segs=[]; var x=sx,y=sy,a=ang;
  var n=rndInt(3,6);
  for(var i=0;i<n;i++){
    var sl=len/n*rnd(0.55,1.45);
    var nx=x+Math.cos(a)*sl+rnd(-4,4);
    var ny=y+Math.sin(a)*sl+rnd(-4,4);
    segs.push({x1:x,y1:y,x2:nx,y2:ny});
    x=nx; y=ny; a+=rnd(-0.55,0.55);
    if(depth>1&&Math.random()<0.38){
      segs=segs.concat(buildCrackSegs(nx,ny,a+rnd(-1.3,1.3),len*0.45,depth-1));
    }
  }
  return segs;
}

function redrawCracks(){
  cCtx.clearRect(0,0,SW,SH);
  // 발톱은 별도 (이미 cCtx에 직접 그려짐, redraw 시 재그림 없음)
  crackPoints.forEach(function(cp){
    cp.lines.forEach(function(segs){
      segs.forEach(function(s){
        cCtx.strokeStyle='rgba(0,0,0,0.88)';
        cCtx.lineWidth=cp.isBig?rnd(1,2.5):rnd(0.8,1.8);
        cCtx.lineCap='round';
        cCtx.beginPath(); cCtx.moveTo(s.x1,s.y1); cCtx.lineTo(s.x2,s.y2); cCtx.stroke();
      });
    });
    // 균열 중심 어두운 원
    var g=cCtx.createRadialGradient(cp.x,cp.y,0,cp.x,cp.y,cp.radius*0.28);
    g.addColorStop(0,'rgba(0,0,0,0.6)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    cCtx.fillStyle=g;
    cCtx.beginPath(); cCtx.arc(cp.x,cp.y,cp.radius*0.28,0,Math.PI*2); cCtx.fill();
  });
}

// ── 도구 선택 ──
var currentTool='claw';
var isDown=false;
var punchSrc='Hamster-punch.png';
var normalSrc='Hamster.png';

var toolBtns={
  claw:  document.getElementById('btn-claw'),
  bomb:  document.getElementById('btn-bomb'),
  flame: document.getElementById('btn-flame'),
  fist:  document.getElementById('btn-fist'),
};
Object.keys(toolBtns).forEach(function(k){
  toolBtns[k].addEventListener('click',function(){ selectTool(k); });
  toolBtns[k].addEventListener('mousedown',function(e){ e.stopPropagation(); });
});
document.addEventListener('keydown',function(e){
  var k=e.key.toLowerCase();
  if(k==='q') selectTool('claw');
  if(k==='w') selectTool('bomb');
  if(k==='e') selectTool('flame');
  if(k==='r') selectTool('fist');
});
function selectTool(name){
  currentTool=name;
  Object.keys(toolBtns).forEach(function(k){
    toolBtns[k].classList.toggle('selected',k===name);
  });
  flamePrev=null;
}

// ── 커서 ──
document.addEventListener('mousemove',function(e){
  cursorEl.style.left=e.clientX+'px';
  cursorEl.style.top=e.clientY+'px';
});

// ── 히트레이어 이벤트 ──
function getLocal(e){
  var t=e.touches?e.touches[0]:e;
  return toLocal(t.clientX,t.clientY);
}

hitLayer.addEventListener('mousedown',function(e){
  if(hp<=0) return;
  isDown=true; flamePrev=null;
  cursorEl.src=punchSrc;
  var p=getLocal(e); handleAction(p.x,p.y,true);
});
hitLayer.addEventListener('mousemove',function(e){
  if(!isDown||hp<=0) return;
  var p=getLocal(e); handleAction(p.x,p.y,false);
});
document.addEventListener('mouseup',function(){
  isDown=false; flamePrev=null; cursorEl.src=normalSrc;
});

hitLayer.addEventListener('touchstart',function(e){
  e.preventDefault(); if(hp<=0) return;
  isDown=true; flamePrev=null;
  var p=getLocal(e); handleAction(p.x,p.y,true);
},{passive:false});
hitLayer.addEventListener('touchmove',function(e){
  e.preventDefault(); if(!isDown||hp<=0) return;
  var p=getLocal(e); handleAction(p.x,p.y,false);
},{passive:false});
document.addEventListener('touchend',function(){ isDown=false; flamePrev=null; });

function handleAction(x,y,isClick){
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
