'use strict';
var IS_THUMB = new URLSearchParams(location.search).has('thumb');

// macbook.png 원본 크기
var MB_W = 2912, MB_H = 1632;
// 화면 영역 비율
var SCREEN_X1_PCT = 0.2548, SCREEN_X2_PCT = 0.7445;
var SCREEN_Y1_PCT = 0.1624, SCREEN_Y2_PCT = 0.6869;

// DOM
var canvas    = document.getElementById('main');
var ctx       = canvas.getContext('2d');
var cursorEl  = document.getElementById('hamster-cursor');
var hpBar     = document.getElementById('hp-bar');
var hpNum     = document.getElementById('hp-num');
var bubbleEl  = document.getElementById('bubble');
var finalMsg  = document.getElementById('final-msg');
var restartBtn= document.getElementById('restart-btn');

// 오프스크린 캔버스
var damageCanvas = document.createElement('canvas');
var crackCanvas  = document.createElement('canvas');
var dCtx = damageCanvas.getContext('2d');
var cCtx = crackCanvas.getContext('2d');

// 이미지
var macbookImg = new Image();
macbookImg.src = 'macbook.png';
var macbookLoaded = false;
macbookImg.onload = function(){ macbookLoaded = true; };

// 캔버스 크기
var canvasW = 0, canvasH = 0;
var mbRect = {x:0,y:0,w:0,h:0};
var screenRect = {x:0,y:0,w:0,h:0};

// 상태
var hp = 100, damageStage = 0;
var shakeX=0, shakeY=0, shakeAmt=0;
var seedParts=[], flameParts=[], flamePixBuf=[], flamePrev=null;
var crackPoints=[], needCrackRedraw=false;
var blackoutPatches=[], glitchLines=[], glitchTimer=0;
var cachedPoly=null, cachedPolyStage=-1;
var screenAlpha=1.0, flickerActive=false;
var BAYER=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
var PIXEL_SIZE=6;
var MSGS={
  claw:['으드득!!','찍찍!!','할퀴어준다!!','발톱 어택!!'],
  bomb:['쾅!!','씨드 어택!!','해바라기씨 투척!!','폭발이다!!'],
  flame:['불이야!!','타버려!!','화염방사!!','불꽃 분노!!'],
  fist:['주먹이다!!','햄찌 어퍼컷!!','쾅쾅쾅!!','박살내준다!!'],
};

function rnd(a,b){return a+Math.random()*(b-a);}
function rndInt(a,b){return Math.floor(rnd(a,b+1));}

// 캔버스 크기 계산
function resizeCanvas(){
  var vw=window.innerWidth, vh=window.innerHeight;
  var maxW=vw*0.88, maxH=vh*0.88;
  var ratio=MB_W/MB_H, w,h;
  if(maxW/maxH>ratio){h=maxH;w=h*ratio;}else{w=maxW;h=w/ratio;}
  canvasW=Math.round(w); canvasH=Math.round(h);
  canvas.width=canvasW; canvas.height=canvasH;
  canvas.style.width=canvasW+'px'; canvas.style.height=canvasH+'px';
  mbRect.x=0;mbRect.y=0;mbRect.w=canvasW;mbRect.h=canvasH;
  screenRect.x=Math.round(canvasW*SCREEN_X1_PCT);
  screenRect.y=Math.round(canvasH*SCREEN_Y1_PCT);
  screenRect.w=Math.round(canvasW*(SCREEN_X2_PCT-SCREEN_X1_PCT));
  screenRect.h=Math.round(canvasH*(SCREEN_Y2_PCT-SCREEN_Y1_PCT));
  damageCanvas.width=crackCanvas.width=canvasW;
  damageCanvas.height=crackCanvas.height=canvasH;
  needCrackRedraw=true; cachedPoly=null; cachedPolyStage=-1;
}
window.addEventListener('resize',function(){resizeCanvas();redrawCracks();});
resizeCanvas();

// 좌표 변환
function clientToCanvas(cx,cy){
  var r=canvas.getBoundingClientRect();
  return{x:(cx-r.left)*(canvasW/r.width),y:(cy-r.top)*(canvasH/r.height)};
}

// HP & 데미지
function damage(v,tool){
  if(hp<=0)return;
  hp=Math.max(0,hp-v);
  hpBar.style.width=hp+'%';
  hpNum.textContent=Math.round(hp);
  if(hp>60)hpBar.style.background='linear-gradient(90deg,#4caf50,#8bc34a)';
  else if(hp>30)hpBar.style.background='linear-gradient(90deg,#ff9800,#ffc107)';
  else hpBar.style.background='linear-gradient(90deg,#f44336,#e91e63)';
  updateDamageStage();
  if(hp<=0)triggerDeath();
  if(tool&&Math.random()<0.22)showBubble(tool);
}

function updateDamageStage(){
  var prev=damageStage;
  if(hp>75)damageStage=0;
  else if(hp>50)damageStage=1;
  else if(hp>30)damageStage=2;
  else if(hp>10)damageStage=3;
  else if(hp>0) damageStage=4;
  else          damageStage=5;
  if(damageStage!==prev)onStageChange(prev,damageStage);
}

function onStageChange(prev,next){
  autoScreenCrack(next);
  if(next>=2)generateLCDLines(next);
  if(next>=3)generateBlackoutPatches(next);
  if(next>=2)startFlicker();
  cachedPoly=null; cachedPolyStage=-1;
  updateFragmentTargets(next); // 조각 변형 목표 업데이트
  polyDistortCache={};
}

function autoScreenCrack(level){
  var count=level*3+2;
  for(var i=0;i<count;i++){
    var cx,cy;
    if(level>=3 && i%3===0){
      // 베젤/바디 영역에도 균열
      cx=rnd(canvasW*0.05,canvasW*0.95);
      cy=rnd(canvasH*0.02,canvasH*0.92);
    } else {
      cx=rnd(screenRect.x+screenRect.w*0.03,screenRect.x+screenRect.w*0.97);
      cy=rnd(screenRect.y+screenRect.h*0.03,screenRect.y+screenRect.h*0.97);
    }
    addCrackPoint(cx,cy,rnd(20+level*12,50+level*18),level>=3);
  }
  // stage 2+: 화면 경계(베젤)에도 균열 방사
  if(level>=2){
    var edges=[
      {x:screenRect.x,y:rnd(screenRect.y,screenRect.y+screenRect.h)},
      {x:screenRect.x+screenRect.w,y:rnd(screenRect.y,screenRect.y+screenRect.h)},
      {x:rnd(screenRect.x,screenRect.x+screenRect.w),y:screenRect.y},
      {x:rnd(screenRect.x,screenRect.x+screenRect.w),y:screenRect.y+screenRect.h},
    ];
    for(var j=0;j<level-1;j++){
      var e=edges[j%edges.length];
      addCrackPoint(e.x,e.y,rnd(40+level*15,80+level*20),level>=3);
    }
  }
}

function generateLCDLines(stage){
  var count=(stage-1)*3+rndInt(2,4);
  for(var i=0;i<count;i++){
    var y=rnd(screenRect.y+5,screenRect.y+screenRect.h-5);
    var h=rnd(1,stage>=3?4:2);
    dCtx.fillStyle=stage>=3?'rgba(0,0,0,'+rnd(0.35,0.7)+')':'rgba(50,0,80,'+rnd(0.25,0.55)+')';
    dCtx.fillRect(screenRect.x,y,screenRect.w,h);
  }
}

function generateBlackoutPatches(stage){
  var count=(stage-2)*2+rndInt(1,3);
  for(var i=0;i<count;i++){
    var pw=rnd(screenRect.w*0.05,screenRect.w*0.28);
    var ph=rnd(screenRect.h*0.03,screenRect.h*0.18);
    var px=rnd(screenRect.x,screenRect.x+screenRect.w-pw);
    var py=rnd(screenRect.y,screenRect.y+screenRect.h-ph);
    blackoutPatches.push({x:px,y:py,w:pw,h:ph,alpha:rnd(0.7,1.0),flicker:stage>=4&&Math.random()<0.4});
  }
}

var flickerTimer=null;
function startFlicker(){
  if(flickerActive)return;
  flickerActive=true; doFlicker();
}
function doFlicker(){
  if(!flickerActive)return;
  screenAlpha=rnd(damageStage>=4?0.15:0.45,1.0);
  flickerTimer=setTimeout(function(){
    screenAlpha=1.0;
    setTimeout(function(){
      if(damageStage>=2&&hp>0){
        if(Math.random()<0.15)doFlicker(); else flickerActive=false;
      }else if(damageStage>=2){doFlicker();}
      else{flickerActive=false;}
    },rnd(200,800));
  },rnd(60,180));
}

function updateGlitch(){
  glitchTimer--;
  if(damageStage<3){glitchLines=[];return;}
  if(glitchTimer<=0){
    glitchTimer=rndInt(8,35);
    glitchLines=[];
    if(Math.random()<0.5){
      var count=rndInt(1,5);
      for(var i=0;i<count;i++){
        glitchLines.push({
          y:rnd(screenRect.y,screenRect.y+screenRect.h),
          h:rnd(2,8),shift:rnd(-20,20),alpha:rnd(0.4,0.9),
          color:Math.random()<0.5?[0,255,100]:[255,50,200],
        });
      }
    }
  }
}

function triggerDeath(){
  for(var i=0;i<24;i++){
    addCrackPoint(
      rnd(screenRect.x+screenRect.w*0.03,screenRect.x+screenRect.w*0.97),
      rnd(screenRect.y+screenRect.h*0.03,screenRect.y+screenRect.h*0.97),
      rnd(40,110),true
    );
  }
  blackoutPatches.push({x:screenRect.x,y:screenRect.y,w:screenRect.w,h:screenRect.h,alpha:0,flicker:false,growing:true});
  bubbleEl.textContent='🐹 개박살!!';
  bubbleEl.classList.add('show');
  setTimeout(function(){finalMsg.classList.add('show');},1400);
}

function showBubble(tool){
  var msgs=MSGS[tool]||['찍찍!!'];
  bubbleEl.textContent=msgs[rndInt(0,msgs.length-1)];
  bubbleEl.classList.add('show');
  clearTimeout(showBubble._t);
  showBubble._t=setTimeout(function(){bubbleEl.classList.remove('show');},1600);
}

restartBtn.addEventListener('click',function(){
  hp=100;damageStage=0;crackPoints=[];seedParts=[];flameParts=[];
  flamePixBuf=[];flamePrev=null;blackoutPatches=[];glitchLines=[];
  glitchTimer=0;flickerActive=false;screenAlpha=1.0;
  shakeX=0;shakeY=0;shakeAmt=0;cachedPoly=null;cachedPolyStage=-1;
  hpBar.style.width='100%';hpBar.style.background='linear-gradient(90deg,#4caf50,#8bc34a)';
  hpNum.textContent='100';
  finalMsg.classList.remove('show');bubbleEl.classList.remove('show');
  dCtx.clearRect(0,0,canvasW,canvasH);cCtx.clearRect(0,0,canvasW,canvasH);
  needCrackRedraw=false;
  initFragments(); updateFragmentTargets(0);
});

// 균열
function addCrackPoint(cx,cy,radius,isBig){
  var n=isBig?rndInt(10,18):rndInt(4,9);
  var lines=[];
  for(var i=0;i<n;i++){
    var ang=rnd(0,Math.PI*2);
    lines.push(buildCrackSegs(cx,cy,ang,rnd(radius*0.5,radius*1.5),isBig?3:2));
  }
  crackPoints.push({x:cx,y:cy,radius:radius,lines:lines,isBig:isBig});
  needCrackRedraw=true;
}
function buildCrackSegs(sx,sy,ang,len,depth){
  var segs=[],x=sx,y=sy,a=ang,n=rndInt(3,6);
  for(var i=0;i<n;i++){
    var sl=len/n*rnd(0.55,1.45);
    var nx=x+Math.cos(a)*sl+rnd(-3,3),ny=y+Math.sin(a)*sl+rnd(-3,3);
    segs.push({x1:x,y1:y,x2:nx,y2:ny});
    x=nx;y=ny;a+=rnd(-0.55,0.55);
    if(depth>1&&Math.random()<0.38)segs=segs.concat(buildCrackSegs(nx,ny,a+rnd(-1.3,1.3),len*0.45,depth-1));
  }
  return segs;
}
function redrawCracks(){
  cCtx.clearRect(0,0,canvasW,canvasH);
  // 균열 전체를 맥북 바디 안으로 클리핑
  cCtx.save();
  cCtx.beginPath();
  cCtx.rect(canvasW*0.055, canvasH*0.048, canvasW*0.854, canvasH*0.909);
  cCtx.clip();
  crackPoints.forEach(function(cp){
    var g=cCtx.createRadialGradient(cp.x,cp.y,0,cp.x,cp.y,cp.radius*0.28);
    g.addColorStop(0,'rgba(0,0,0,0.65)');g.addColorStop(1,'rgba(0,0,0,0)');
    cCtx.fillStyle=g;cCtx.beginPath();cCtx.arc(cp.x,cp.y,cp.radius*0.28,0,Math.PI*2);cCtx.fill();
    cp.lines.forEach(function(segs){
      segs.forEach(function(s){
        cCtx.strokeStyle='rgba(0,0,0,0.88)';
        cCtx.lineWidth=cp.isBig?rnd(1,2.5):rnd(0.7,1.8);
        cCtx.lineCap='round';
        cCtx.beginPath();cCtx.moveTo(s.x1,s.y1);cCtx.lineTo(s.x2,s.y2);cCtx.stroke();
        cCtx.strokeStyle='rgba(255,255,255,0.22)';cCtx.lineWidth=0.5;
        cCtx.beginPath();cCtx.moveTo(s.x1+1,s.y1+1);cCtx.lineTo(s.x2+1,s.y2+1);cCtx.stroke();
      });
    });
    var g2=cCtx.createRadialGradient(cp.x,cp.y,0,cp.x,cp.y,cp.radius*0.28);
    g2.addColorStop(0,'rgba(0,0,0,0.65)');g2.addColorStop(1,'rgba(0,0,0,0)');
    cCtx.fillStyle=g2;cCtx.beginPath();cCtx.arc(cp.x,cp.y,cp.radius*0.28,0,Math.PI*2);cCtx.fill();
  });
  cCtx.restore();
  needCrackRedraw=false;
}

// 베젤/프레임 데미지 — 타격점 주변에 직접 그림 (damageCanvas)
function drawBezelDamage(cx, cy, type){
  var isInScreen = (cx >= screenRect.x && cx <= screenRect.x+screenRect.w &&
                    cy >= screenRect.y && cy <= screenRect.y+screenRect.h);

  // 화면 안 타격이면 베젤 바깥 쪽으로 효과 퍼트림
  // 화면 밖(베젤) 타격이면 그 자리에 효과
  var bx = cx, by = cy;

  if(type==='claw'){
    // 베젤 긁힘 — 타격점 주변 밝은 금속 스크래치
    for(var i=0;i<6;i++){
      var ang=rnd(0,Math.PI*2), len=rnd(20,55);
      dCtx.save();
      dCtx.translate(bx,by); dCtx.rotate(ang);
      var sg=dCtx.createLinearGradient(0,0,len,0);
      sg.addColorStop(0,'rgba(255,255,255,0.8)');
      sg.addColorStop(0.3,'rgba(200,200,200,0.5)');
      sg.addColorStop(1,'rgba(100,100,100,0)');
      dCtx.strokeStyle=sg; dCtx.lineWidth=rnd(0.8,2.5); dCtx.lineCap='round';
      dCtx.beginPath(); dCtx.moveTo(0,0); dCtx.lineTo(len+rnd(-5,5),rnd(-4,4)); dCtx.stroke();
      // 어두운 그림자 바로 아래
      dCtx.strokeStyle='rgba(0,0,0,0.5)'; dCtx.lineWidth=rnd(0.5,1.5);
      dCtx.beginPath(); dCtx.moveTo(0,1.5); dCtx.lineTo(len,rnd(2,5)); dCtx.stroke();
      dCtx.restore();
    }
  } else if(type==='bomb'){
    // 베젤 찌그러짐 — 타격점 주변 금속 변형
    var cr=rnd(18,32);
    // 찌그러진 원형 — 불규칙 다각형
    dCtx.save();
    dCtx.beginPath();
    var pts=12;
    for(var j=0;j<pts;j++){
      var a=(j/pts)*Math.PI*2;
      var r2=cr*(0.6+Math.sin(j*2.3+1.5)*0.4+rnd(-0.1,0.1));
      if(j===0) dCtx.moveTo(bx+Math.cos(a)*r2,by+Math.sin(a)*r2);
      else dCtx.lineTo(bx+Math.cos(a)*r2,by+Math.sin(a)*r2);
    }
    dCtx.closePath();
    var rg=dCtx.createRadialGradient(bx,by,0,bx,by,cr);
    rg.addColorStop(0,'rgba(0,0,0,0.95)');
    rg.addColorStop(0.6,'rgba(40,35,30,0.7)');
    rg.addColorStop(1,'rgba(0,0,0,0)');
    dCtx.fillStyle=rg; dCtx.fill();
    // 테두리 금속 하이라이트
    dCtx.strokeStyle='rgba(180,180,180,0.6)'; dCtx.lineWidth=2;
    dCtx.stroke();
    dCtx.restore();
  } else if(type==='fist'){
    // 베젤 함몰 — 타격점 중심 어두운 dent
    var dr=rnd(14,26);
    var dg=dCtx.createRadialGradient(bx,by,0,bx,by,dr*2);
    dg.addColorStop(0,'rgba(0,0,0,0.88)');
    dg.addColorStop(0.4,'rgba(20,18,15,0.55)');
    dg.addColorStop(1,'rgba(0,0,0,0)');
    dCtx.fillStyle=dg;
    dCtx.beginPath(); dCtx.arc(bx,by,dr*2,0,Math.PI*2); dCtx.fill();
    // 주름 하이라이트
    for(var k=0;k<5;k++){
      var ha=rnd(0,Math.PI*2), hl=rnd(dr,dr*1.8);
      dCtx.strokeStyle='rgba(220,220,220,'+rnd(0.3,0.6)+')';
      dCtx.lineWidth=rnd(0.8,2);
      dCtx.beginPath();
      dCtx.moveTo(bx+Math.cos(ha)*dr*0.4,by+Math.sin(ha)*dr*0.4);
      dCtx.lineTo(bx+Math.cos(ha)*hl,by+Math.sin(ha)*hl);
      dCtx.stroke();
    }
  }
}

// 발톱: 타격점 중심 방사형 찢김 + 벌어진 틈
function triggerClaw(cx,cy){
  var numRips = 4;
  var baseAng = rnd(0, Math.PI*2);
  var ripLen  = rnd(55, 95);

  // 찢김선은 맥북 바디 안에만
  dCtx.save();
  dCtx.beginPath();
  dCtx.rect(canvasW*0.055, canvasH*0.048, canvasW*0.854, canvasH*0.909);
  dCtx.clip();

  for(var i=0;i<numRips;i++){
    var ang = baseAng + (i/numRips)*Math.PI*2 + rnd(-0.25,0.25);
    var segs = rndInt(4,7);
    var x=cx,y=cy,a=ang;
    for(var s=0;s<segs;s++){
      var sl = ripLen/segs * rnd(0.6,1.4);
      var nx2 = x+Math.cos(a)*sl+rnd(-5,5);
      var ny2 = y+Math.sin(a)*sl+rnd(-5,5);
      var w = rnd(2,5)*(1-s/segs)+1;
      dCtx.strokeStyle='rgba(0,0,0,'+rnd(0.7,1.0)+')';
      dCtx.lineWidth=w; dCtx.lineCap='round';
      dCtx.beginPath(); dCtx.moveTo(x,y); dCtx.lineTo(nx2,ny2); dCtx.stroke();
      if(s<segs-1 && Math.random()<0.5){
        var side=w*2.5;
        var pa=a+Math.PI/2;
        dCtx.fillStyle='rgba(0,0,0,0.85)';
        dCtx.beginPath();
        dCtx.moveTo(nx2,ny2);
        dCtx.lineTo(nx2+Math.cos(pa)*side,ny2+Math.sin(pa)*side);
        dCtx.lineTo(nx2+Math.cos(a)*side*0.5,ny2+Math.sin(a)*side*0.5);
        dCtx.closePath(); dCtx.fill();
      }
      x=nx2; y=ny2; a+=rnd(-0.4,0.4);
    }
  }
  // 타격 중심 구멍
  dCtx.fillStyle='rgba(0,0,0,0.9)';
  dCtx.beginPath(); dCtx.arc(cx,cy,rnd(6,12),0,Math.PI*2); dCtx.fill();
  // 하이라이트
  for(var j=0;j<6;j++){
    var ha=rnd(0,Math.PI*2), hl=rnd(10,40);
    dCtx.strokeStyle='rgba(255,255,255,'+rnd(0.3,0.6)+')';
    dCtx.lineWidth=rnd(0.5,1.5);
    dCtx.beginPath(); dCtx.moveTo(cx,cy); dCtx.lineTo(cx+Math.cos(ha)*hl,cy+Math.sin(ha)*hl); dCtx.stroke();
  }
  dCtx.restore();

  drawBezelDamage(cx,cy,'claw');
  addCrackPoint(cx,cy,rnd(25,45),false);
  damage(rnd(4,7),'claw'); shake(rnd(5,9));
}
// 폭탄: 구멍 + 주변 금속 조각 튀어나오는 느낌
function triggerBomb(cx,cy){
  var holeR = rnd(20,38);
  // 구멍 (완전 검은 원)
  dCtx.fillStyle='#000';
  dCtx.beginPath(); dCtx.arc(cx,cy,holeR,0,Math.PI*2); dCtx.fill();

  // 구멍 테두리 — 찌그러진 금속 (밝은 반원 조각들)
  var edgePieces = rndInt(10,16);
  for(var i=0;i<edgePieces;i++){
    var ang=(i/edgePieces)*Math.PI*2+rnd(-0.2,0.2);
    var er=holeR+rnd(3,14);
    var pw=rnd(6,18), pd=rnd(4,10);
    dCtx.save();
    dCtx.translate(cx+Math.cos(ang)*er, cy+Math.sin(ang)*er);
    dCtx.rotate(ang+Math.PI/2+rnd(-0.5,0.5));
    // 금속 조각 — 밝은 회색에서 어두운 그라디언트
    var mg=dCtx.createLinearGradient(-pw/2,0,pw/2,pd);
    mg.addColorStop(0,'rgba(200,200,200,0.9)');
    mg.addColorStop(0.4,'rgba(140,140,140,0.8)');
    mg.addColorStop(1,'rgba(30,30,30,0.7)');
    dCtx.fillStyle=mg;
    dCtx.beginPath();
    dCtx.moveTo(-pw/2,0);
    dCtx.lineTo(pw/2,0);
    dCtx.lineTo(pw/2*0.6,pd);
    dCtx.lineTo(-pw/2*0.6,pd);
    dCtx.closePath(); dCtx.fill();
    dCtx.restore();
  }

  // 그을음 퍼짐
  var sg=dCtx.createRadialGradient(cx,cy,holeR,cx,cy,holeR*3.5);
  sg.addColorStop(0,'rgba(0,0,0,0.7)');
  sg.addColorStop(0.5,'rgba(10,5,0,0.3)');
  sg.addColorStop(1,'rgba(0,0,0,0)');
  dCtx.fillStyle=sg;
  dCtx.beginPath(); dCtx.arc(cx,cy,holeR*3.5,0,Math.PI*2); dCtx.fill();

  // 씨앗 파편
  var count=rndInt(12,20);
  for(var j=0;j<count;j++){
    var ba=(j/count)*Math.PI*2+rnd(-0.2,0.2), spd=rnd(5,16);
    seedParts.push({x:cx,y:cy,vx:Math.cos(ba)*spd,vy:Math.sin(ba)*spd-rnd(1,4),rot:rnd(0,Math.PI*2),rotV:rnd(-0.4,0.4),life:1,size:rnd(3.5,8)});
  }
  drawBezelDamage(cx,cy,'bomb');
  addCrackPoint(cx,cy,rnd(55,90),true);
  damage(rnd(10,16),'bomb'); shake(rnd(14,22)); showBubble('bomb');
}
function renderBomb(){
  seedParts=seedParts.filter(function(p){
    p.x+=p.vx;p.y+=p.vy;p.vy+=0.45;p.vx*=0.96;p.rot+=p.rotV;p.life-=0.025;
    if(p.life<=0)return false;
    dCtx.save();dCtx.globalAlpha=p.life;dCtx.translate(p.x,p.y);dCtx.rotate(p.rot);
    dCtx.fillStyle='#3a2200';dCtx.beginPath();dCtx.ellipse(0,0,p.size*0.38,p.size*0.68,0,0,Math.PI*2);dCtx.fill();
    dCtx.strokeStyle='rgba(255,255,255,0.4)';dCtx.lineWidth=0.8;dCtx.beginPath();dCtx.moveTo(0,-p.size*0.5);dCtx.lineTo(0,p.size*0.5);dCtx.stroke();
    dCtx.restore();dCtx.globalAlpha=1;return true;
  });
}

// 화염: 그을음 + 녹아내리는 드립 효과
function drawFlame(cx,cy){
  if(!flamePrev){flamePrev={x:cx,y:cy};return;}
  var dist=Math.hypot(cx-flamePrev.x,cy-flamePrev.y);
  if(dist<3)return;
  var ang=Math.atan2(cy-flamePrev.y,cx-flamePrev.x);

  // 그을음 스프레이 (디더 픽셀)
  var radius=rnd(16,28);
  var steps=Math.max(1,Math.ceil(dist/4));
  for(var s=0;s<=steps;s++){
    var t=s/steps,mx=flamePrev.x+(cx-flamePrev.x)*t,my=flamePrev.y+(cy-flamePrev.y)*t;
    var pr=Math.ceil(radius/PIXEL_SIZE)+1;
    for(var py=-pr;py<=pr;py++){for(var px=-pr;px<=pr;px++){
      var wx=Math.round((mx+px*PIXEL_SIZE)/PIXEL_SIZE)*PIXEL_SIZE;
      var wy=Math.round((my+py*PIXEL_SIZE)/PIXEL_SIZE)*PIXEL_SIZE;
      var d=Math.hypot(wx-mx,wy-my);if(d>radius)continue;
      var density=1-d/radius;
      var di=((wy/PIXEL_SIZE)|0)&3,dj=((wx/PIXEL_SIZE)|0)&3;
      if(density<BAYER[di][dj]/16)continue;
      // 중심은 어두운 그을음, 가장자리는 그을린 갈색
      if(density>0.6){
        dCtx.fillStyle='rgba(5,3,0,'+rnd(0.7,0.95)+')';
      } else {
        dCtx.fillStyle='rgba(30,15,0,'+rnd(0.3,0.6)+')';
      }
      dCtx.fillRect(wx,wy,PIXEL_SIZE,PIXEL_SIZE);
    }}
  }

  // 녹아내리는 드립 — 불꽃 경로 아래로 방울 생성
  if(Math.random()<0.25){
    flameParts.push({
      x:cx+rnd(-8,8), y:cy,
      vx:rnd(-0.5,0.5), vy:rnd(1.5,3.5), // 아래로만
      life:1, size:rnd(4,10), drip:true,
    });
  }

  // 불꽃 파티클 (진행 방향)
  for(var i=0;i<3;i++){
    var sp=rnd(-0.5,0.5);
    flameParts.push({
      x:cx+rnd(-4,4), y:cy+rnd(-4,4),
      vx:Math.cos(ang+sp)*rnd(1,4),
      vy:Math.sin(ang+sp)*rnd(1,4)-rnd(0.5,2),
      life:1, size:rnd(6,16), hot:Math.random()>0.4, drip:false,
    });
  }
  damage(0.45,'flame');flamePrev={x:cx,y:cy};
}
function renderFlame(){
  flamePixBuf.forEach(function(p){
    dCtx.fillStyle=p.hot?'rgba(255,'+rndInt(80,180)+',0,'+p.a+')':'rgba(0,0,0,'+p.a+')';
    dCtx.fillRect(p.x,p.y,p.s,p.s);
  });
  flamePixBuf=[];

  flameParts=flameParts.filter(function(p){
    p.x+=p.vx; p.y+=p.vy; p.life-=0.045;
    if(p.drip){
      // 드립: 아래로 흘러내리며 점점 좁아짐
      p.vy+=0.08;
      if(p.life<=0) return false;
      dCtx.fillStyle='rgba(0,0,0,'+p.life*0.85+')';
      var w=p.size*p.life;
      dCtx.beginPath();
      dCtx.ellipse(p.x,p.y,w*0.3,w*0.55,0,0,Math.PI*2);
      dCtx.fill();
      return true;
    }
    p.vx*=0.94; p.vy-=0.08;
    if(p.life<=0) return false;
    var r=p.size*p.life;
    var g=dCtx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
    if(p.hot){
      g.addColorStop(0,'rgba(255,255,100,'+p.life+')');
      g.addColorStop(0.5,'rgba(255,120,0,'+(p.life*0.8)+')');
      g.addColorStop(1,'rgba(0,0,0,0)');
    } else {
      g.addColorStop(0,'rgba(60,30,0,'+p.life+')');
      g.addColorStop(1,'rgba(0,0,0,0)');
    }
    dCtx.fillStyle=g;
    dCtx.beginPath(); dCtx.arc(p.x,p.y,r,0,Math.PI*2); dCtx.fill();
    return true;
  });
}

// 주먹: 함몰 dent + 베젤 찌그러짐
function triggerFist(cx,cy){
  var dentR = rnd(22,38);
  // 함몰 원 — 어두운 중심 + 주변 찌그러짐
  var dg=dCtx.createRadialGradient(cx,cy,0,cx,cy,dentR);
  dg.addColorStop(0,'rgba(0,0,0,0.9)');
  dg.addColorStop(0.5,'rgba(30,25,20,0.6)');
  dg.addColorStop(1,'rgba(0,0,0,0)');
  dCtx.fillStyle=dg;
  dCtx.beginPath(); dCtx.arc(cx,cy,dentR*1.5,0,Math.PI*2); dCtx.fill();

  // 베젤 찌그러짐 — 타격점에서 방사형으로 짧은 금속 주름선
  var numDents = rndInt(8,14);
  for(var i=0;i<numDents;i++){
    var ang=rnd(0,Math.PI*2);
    var dr=dentR+rnd(4,18);
    var dl=rnd(8,25);
    // 주름선: 밝은 하이라이트 + 어두운 그림자
    dCtx.save();
    dCtx.translate(cx+Math.cos(ang)*dr, cy+Math.sin(ang)*dr);
    dCtx.rotate(ang);
    dCtx.strokeStyle='rgba(255,255,255,'+rnd(0.3,0.6)+')';
    dCtx.lineWidth=rnd(1,2.5);
    dCtx.beginPath(); dCtx.moveTo(-dl*0.3,0); dCtx.lineTo(dl*0.7,rnd(-3,3)); dCtx.stroke();
    dCtx.strokeStyle='rgba(0,0,0,'+rnd(0.4,0.7)+')';
    dCtx.lineWidth=rnd(0.8,2);
    dCtx.beginPath(); dCtx.moveTo(-dl*0.3,rnd(1,3)); dCtx.lineTo(dl*0.7,rnd(2,5)); dCtx.stroke();
    dCtx.restore();
  }

  drawBezelDamage(cx,cy,'fist');
  addCrackPoint(cx,cy,rnd(40,70),false);
  damage(rnd(13,19),'fist'); shake(rnd(18,28)); showBubble('fist');
}

// ── fragment 시스템 완전 제거, macbook.png 통째로 그리기 ──
function drawMacbook(){
  if(!macbookLoaded) return;
  var br=[1,0.98,0.95,0.90,0.80,0.60][Math.min(damageStage,5)];
  ctx.filter='brightness('+br+')';
  ctx.save();
  ctx.translate(shakeX, shakeY);
  ctx.drawImage(macbookImg, 0, 0, canvasW, canvasH);
  ctx.restore();
  ctx.filter='none';
}
// stub — fragment 시스템 제거됨
function initFragments(){}
function updateFragments(){}
function updateFragmentTargets(){}

// 흔들기
function shake(v){shakeAmt=Math.max(shakeAmt,v);}
function updateShake(){
  if(shakeAmt<0.4){shakeX=0;shakeY=0;shakeAmt=0;return;}
  shakeX=rnd(-shakeAmt,shakeAmt);shakeY=rnd(-shakeAmt,shakeAmt);shakeAmt*=0.72;
}

// 화면 폴리곤 (stage별 찌그러짐 — 고정값으로 생성, 매 프레임 rnd 호출 없음)
var polyDistortCache = {};
function getScreenPoly(stage){
  if(polyDistortCache[stage])return polyDistortCache[stage];
  var sx=screenRect.x,sy=screenRect.y,sw=screenRect.w,sh=screenRect.h;
  var d=sw*0.013*(stage-1);
  if(stage<=1){
    polyDistortCache[stage]=[{x:sx,y:sy},{x:sx+sw,y:sy},{x:sx+sw,y:sy+sh},{x:sx,y:sy+sh}];
  }else{
    // 고정 오프셋 (랜덤이 아닌 stage별 고정 값)
    var offs=[[0,0],[d*0.6,-d*0.4],[d*0.3,d*0.8],[-d*0.4,d*0.5]];
    polyDistortCache[stage]=[
      {x:sx+offs[0][0],y:sy+offs[0][1]},
      {x:sx+sw+offs[1][0],y:sy+offs[1][1]},
      {x:sx+sw+offs[2][0],y:sy+sh+offs[2][1]},
      {x:sx+offs[3][0],y:sy+sh+offs[3][1]},
    ];
  }
  return polyDistortCache[stage];
}
// resize 시 캐시 클리어
window.addEventListener('resize',function(){polyDistortCache={};});

// 화면 내용 그리기
function drawDesktop(ctx2d,stage){
  var sx=screenRect.x,sy=screenRect.y,sw=screenRect.w,sh=screenRect.h;
  var grad;
  if(stage<=1){
    grad=ctx2d.createLinearGradient(sx,sy,sx+sw,sy+sh);
    grad.addColorStop(0,'#4a7ec7');grad.addColorStop(0.5,'#3567b8');grad.addColorStop(1,'#2a56a0');
  }else if(stage===2){
    grad=ctx2d.createLinearGradient(sx,sy,sx+sw,sy+sh);
    grad.addColorStop(0,'#7060b0');grad.addColorStop(0.5,'#6050a8');grad.addColorStop(1,'#5040a0');
  }else if(stage===3){
    grad=ctx2d.createLinearGradient(sx,sy,sx+sw,sy+sh);
    grad.addColorStop(0,'#903060');grad.addColorStop(0.5,'#802878');grad.addColorStop(1,'#601870');
  }else{
    grad=ctx2d.createLinearGradient(sx,sy,sx+sw,sy+sh);
    grad.addColorStop(0,'#300010');grad.addColorStop(1,'#100020');
  }
  ctx2d.fillStyle=grad;
  ctx2d.fillRect(sx,sy,sw,sh);
  if(stage>=5)return;
  ctx2d.globalAlpha=screenAlpha;
  // 메뉴바
  var mh=sh*0.085;
  ctx2d.fillStyle='rgba(255,255,255,0.82)';ctx2d.fillRect(sx,sy,sw,mh);
  ctx2d.fillStyle='rgba(0,0,0,0.85)';
  var fs=Math.max(8,sw*0.026);
  ctx2d.font='bold '+fs+'px sans-serif';ctx2d.textBaseline='middle';
  var my=sy+mh/2;
  ctx2d.fillText('🍎',sx+sw*0.025,my);
  ctx2d.font=(fs*0.8)+'px sans-serif';
  ['Finder','File','Edit','View','Go','Window'].forEach(function(m,i){ctx2d.fillText(m,sx+sw*(0.065+i*0.065),my);});
  // 아이콘
  var iconSize=sw*0.06;
  [{icon:'🗂️',label:'작업물',tx:0.88,ty:0.22},{icon:'🗑️',label:'휴지통',tx:0.88,ty:0.45}].forEach(function(ic){
    var ix=sx+sw*ic.tx,iy=sy+sh*ic.ty;
    ctx2d.font=iconSize+'px sans-serif';ctx2d.textAlign='center';ctx2d.textBaseline='middle';ctx2d.fillText(ic.icon,ix,iy);
    ctx2d.font='bold '+Math.max(7,sw*0.02)+'px sans-serif';ctx2d.fillStyle='#fff';
    ctx2d.shadowColor='rgba(0,0,0,0.9)';ctx2d.shadowBlur=4;
    ctx2d.fillText(ic.label,ix,iy+iconSize*0.75);
    ctx2d.shadowBlur=0;ctx2d.fillStyle='rgba(0,0,0,0.85)';ctx2d.textAlign='left';ctx2d.textBaseline='alphabetic';
  });
  // 독
  var dockH=sh*0.12,dockW=sw*0.38;
  var dockX=sx+(sw-dockW)/2,dockY=sy+sh-dockH-sh*0.02;
  var dg=ctx2d.createLinearGradient(dockX,dockY,dockX,dockY+dockH);
  dg.addColorStop(0,'rgba(255,255,255,0.28)');dg.addColorStop(1,'rgba(255,255,255,0.08)');
  ctx2d.fillStyle=dg;ctx2d.strokeStyle='rgba(255,255,255,0.3)';ctx2d.lineWidth=1;
  ctx2d.beginPath();ctx2d.roundRect(dockX,dockY,dockW,dockH,dockH*0.35);ctx2d.fill();ctx2d.stroke();
  var dicons=['🔍','📁','🌐','✉️','🎵'],dsp=dockW/(dicons.length+1);
  ctx2d.font=(dockH*0.68)+'px sans-serif';ctx2d.textAlign='center';ctx2d.textBaseline='middle';
  dicons.forEach(function(ic,i){ctx2d.fillText(ic,dockX+dsp*(i+1),dockY+dockH*0.5);});
  ctx2d.textAlign='left';ctx2d.textBaseline='alphabetic';
  ctx2d.globalAlpha=1;
}

// 메인 렌더 프레임
function drawFrame(){
  updateGlitch();
  if(needCrackRedraw)redrawCracks();
  updateShake();
  updateFragments(); // 조각 lerp 업데이트
  blackoutPatches.forEach(function(p){if(p.growing)p.alpha=Math.min(1,p.alpha+0.012);});

  ctx.clearRect(0,0,canvasW,canvasH);
  // shakeX/Y는 drawMacbook 내부에서 조각별로 적용
  ctx.save();

  // 1. macbook.png (조각 분할 렌더)
  drawMacbook();

  // 2. 화면 영역: macOS 바탕화면 (폴리곤 클리핑)
  ctx.save();
  ctx.translate(shakeX, shakeY);
  var poly=getScreenPoly(damageStage);
  ctx.beginPath();
  ctx.moveTo(poly[0].x,poly[0].y);
  for(var i=1;i<poly.length;i++)ctx.lineTo(poly[i].x,poly[i].y);
  ctx.closePath();ctx.clip();
  drawDesktop(ctx,damageStage);
  ctx.restore();

  // 3. 데미지 레이어 — 맥북 바디 영역으로 클리핑
  var mbX = canvasW*0.055, mbY = canvasH*0.048;
  var mbW = canvasW*0.854, mbH = canvasH*0.909;
  ctx.save();
  ctx.translate(shakeX, shakeY);
  ctx.beginPath(); ctx.rect(mbX, mbY, mbW, mbH); ctx.clip();
  ctx.drawImage(damageCanvas,0,0);
  ctx.restore();

  // 4. 균열 레이어 — 맥북 바디 영역으로 클리핑
  ctx.save();
  ctx.translate(shakeX, shakeY);
  ctx.beginPath(); ctx.rect(mbX, mbY, mbW, mbH); ctx.clip();
  ctx.drawImage(crackCanvas,0,0);
  ctx.restore();

  // 5. 블랙아웃 패치
  ctx.save();ctx.translate(shakeX,shakeY);
  blackoutPatches.forEach(function(p){
    var a=p.flicker&&Math.random()<0.15?rnd(0.3,0.7):p.alpha;
    ctx.fillStyle='rgba(0,0,0,'+a+')';ctx.fillRect(p.x,p.y,p.w,p.h);
  });
  ctx.restore();

  // 6. 글리치 라인
  ctx.save();ctx.translate(shakeX,shakeY);
  glitchLines.forEach(function(gl){
    ctx.globalAlpha=gl.alpha;
    ctx.fillStyle='rgba('+gl.color[0]+','+gl.color[1]+','+gl.color[2]+','+gl.alpha+')';
    ctx.fillRect(screenRect.x+gl.shift,gl.y,screenRect.w,gl.h*0.4);
  });
  ctx.globalAlpha=1;
  ctx.restore();

  // 7. 비네팅 오버레이
  if(damageStage>=1){
    ctx.save();ctx.translate(shakeX,shakeY);
    var ovA=Math.pow(1-hp/100,1.6)*0.7;
    ctx.beginPath();ctx.rect(screenRect.x,screenRect.y,screenRect.w,screenRect.h);ctx.clip();
    var vg=ctx.createRadialGradient(
      screenRect.x+screenRect.w/2,screenRect.y+screenRect.h/2,screenRect.w*0.1,
      screenRect.x+screenRect.w/2,screenRect.y+screenRect.h/2,screenRect.w*0.7
    );
    vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,'+ovA+')');
    ctx.fillStyle=vg;ctx.fillRect(screenRect.x,screenRect.y,screenRect.w,screenRect.h);
    ctx.restore();
  }

  // 8. 노이즈 (stage 4+)
  if(damageStage>=4&&Math.random()<0.6){
    ctx.save();ctx.translate(shakeX,shakeY);
    ctx.beginPath();ctx.rect(screenRect.x,screenRect.y,screenRect.w,screenRect.h);ctx.clip();
    for(var ni=0;ni<80;ni++){
      ctx.fillStyle=Math.random()<0.5?'rgba(255,255,255,'+rnd(0.1,0.5)+')':'rgba(0,0,0,'+rnd(0.1,0.4)+')';
      ctx.fillRect(rnd(screenRect.x,screenRect.x+screenRect.w),rnd(screenRect.y,screenRect.y+screenRect.h),rnd(1,4),rnd(1,3));
    }
    ctx.restore();
  }

  ctx.restore();
}

// 도구 선택
var currentTool='claw',isDown=false;
var toolBtns={claw:document.getElementById('btn-claw'),bomb:document.getElementById('btn-bomb'),flame:document.getElementById('btn-flame'),fist:document.getElementById('btn-fist')};
Object.keys(toolBtns).forEach(function(k){
  toolBtns[k].addEventListener('click',function(){selectTool(k);});
  toolBtns[k].addEventListener('mousedown',function(e){e.stopPropagation();});
});
document.addEventListener('keydown',function(e){
  var k=e.key.toLowerCase();
  if(k==='q')selectTool('claw');if(k==='w')selectTool('bomb');
  if(k==='e')selectTool('flame');if(k==='r')selectTool('fist');
});
function selectTool(n){
  currentTool=n;
  Object.keys(toolBtns).forEach(function(k){toolBtns[k].classList.toggle('selected',k===n);});
  flamePrev=null;
}

// 커서
document.addEventListener('mousemove',function(e){cursorEl.style.left=e.clientX+'px';cursorEl.style.top=e.clientY+'px';});

// 이벤트
function getCP(e){var t=e.touches?e.touches[0]:e;return clientToCanvas(t.clientX,t.clientY);}
function handleAction(cx,cy,isClick){
  if(currentTool==='claw'&&isClick)triggerClaw(cx,cy);
  else if(currentTool==='bomb'&&isClick)triggerBomb(cx,cy);
  else if(currentTool==='flame')drawFlame(cx,cy);
  else if(currentTool==='fist'&&isClick)triggerFist(cx,cy);
}
canvas.addEventListener('mousedown',function(e){if(hp<=0)return;isDown=true;flamePrev=null;cursorEl.src='Hamster-punch.png';var p=getCP(e);handleAction(p.x,p.y,true);});
canvas.addEventListener('mousemove',function(e){if(!isDown||hp<=0)return;var p=getCP(e);handleAction(p.x,p.y,false);});
document.addEventListener('mouseup',function(){isDown=false;flamePrev=null;cursorEl.src='Hamster.png';});
canvas.addEventListener('touchstart',function(e){e.preventDefault();if(hp<=0)return;isDown=true;flamePrev=null;var p=getCP(e);handleAction(p.x,p.y,true);},{passive:false});
canvas.addEventListener('touchmove',function(e){e.preventDefault();if(!isDown||hp<=0)return;var p=getCP(e);handleAction(p.x,p.y,false);},{passive:false});
document.addEventListener('touchend',function(){isDown=false;flamePrev=null;});

// 루프
function loop(){requestAnimationFrame(loop);renderBomb();renderFlame();drawFrame();}
loop();
