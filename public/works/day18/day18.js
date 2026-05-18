'use strict';

// ── 상수 ──
var MB_W=2912, MB_H=1632;
var SCREEN_X1=0.2548, SCREEN_X2=0.7445;
var SCREEN_Y1=0.1624, SCREEN_Y2=0.6869;

// ── DOM ──
var canvas   = document.getElementById('main');
var ctx      = canvas.getContext('2d');
var cursorEl = document.getElementById('hamster-cursor');
var hpBar    = document.getElementById('hp-bar');
var hpNum    = document.getElementById('hp-num');
var bubbleEl = document.getElementById('bubble');
var finalMsg = document.getElementById('final-msg');
var restartBtn = document.getElementById('restart-btn');

// ── 오프스크린 캔버스 (데미지 누적) ──
var dmgC = document.createElement('canvas');
var dmgX = dmgC.getContext('2d');

// ── 이미지 ──
var macImg = new Image(); macImg.src='macbook.png'; var macLoaded=false;
macImg.onload=function(){macLoaded=true;};

var crackImgs=[];
var crackImgsLoaded=0;
['JiksScreenBreak 배포용/깨진자국3.png','JiksScreenBreak 배포용/깨진자국4.png'].forEach(function(src){
  var img=new Image();
  img.onload=function(){crackImgsLoaded++;};
  img.onerror=function(){console.warn('failed to load:',src);};
  img.src=src;
  crackImgs.push(img);
});

// ── 크기 ──
var CW=0, CH=0;
var SR={x:0,y:0,w:0,h:0}; // 화면 영역 (screen rect)
var MB={x:0,y:0,w:0,h:0}; // 맥북 bounding box

function resize(){
  var vw=window.innerWidth, vh=window.innerHeight;
  var ratio=MB_W/MB_H, w,h;
  if(vw/vh>ratio){h=vh*0.88;w=h*ratio;}else{w=vw*0.88;h=w/ratio;}
  CW=Math.round(w); CH=Math.round(h);
  canvas.width=CW; canvas.height=CH;
  canvas.style.width=CW+'px'; canvas.style.height=CH+'px';
  SR.x=Math.round(CW*SCREEN_X1); SR.y=Math.round(CH*SCREEN_Y1);
  SR.w=Math.round(CW*(SCREEN_X2-SCREEN_X1));
  SR.h=Math.round(CH*(SCREEN_Y2-SCREEN_Y1));
  MB.x=Math.round(CW*0.055); MB.y=Math.round(CH*0.048);
  MB.w=Math.round(CW*0.854); MB.h=Math.round(CH*0.909);
  dmgC.width=CW; dmgC.height=CH;
}
resize();
window.addEventListener('resize',function(){resize();dmgX.clearRect(0,0,CW,CH);crackPts=[];redrawCracks();});

// ── 좌표: 클라이언트 → 캔버스 ──
function toCanvas(cx,cy){
  var r=canvas.getBoundingClientRect();
  return{x:(cx-r.left)*(CW/r.width), y:(cy-r.top)*(CH/r.height)};
}

// ── 유틸 ──
function rnd(a,b){return a+Math.random()*(b-a);}
function rndInt(a,b){return Math.floor(rnd(a,b+1));}

// ── 상태 ──
var hp=100, stage=0;
var isDown=false, tool='claw', flamePrev=null;
var BAYER=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
var MSGS={
  claw:['으드득!!','찍찍!!','발톱 어택!!'],
  bomb:['쾅!!','씨앗 폭탄!!','폭발이다!!'],
  flame:['불이야!!','화염방사!!','타버려!!'],
  fist:['주먹이다!!','햄찌 어퍼컷!!','쾅쾅쾅!!'],
};

// ── 화면 파손 효과 (damageCanvas에 누적) ──
var seedParts=[], flameParts=[];

// 깨진자국 스프라이트 → dmgC에 직접
// 깨진자국 스프라이트 → dmgC에 직접
function drawCrackSprite(x,y,sc){
  // 이미지 로드 안 됐어도 검은 원으로 대체 — 항상 뭔가 표시
  if(!crackImgsLoaded){
    dmgX.fillStyle='rgba(0,0,0,0.75)';
    dmgX.beginPath();dmgX.arc(x,y,Math.round(30*sc),0,Math.PI*2);dmgX.fill();
    // 방사형 균열선 스케치
    dmgX.strokeStyle='rgba(0,0,0,0.6)';dmgX.lineWidth=1.5;
    for(var k=0;k<8;k++){
      var a=k/8*Math.PI*2;
      dmgX.beginPath();dmgX.moveTo(x,y);dmgX.lineTo(x+Math.cos(a)*60*sc,y+Math.sin(a)*60*sc);dmgX.stroke();
    }
    return;
  }
  var img=crackImgs[rndInt(0,crackImgs.length-1)];
  var w=img.naturalWidth*sc, h=img.naturalHeight*sc;
  dmgX.save();
  dmgX.translate(x,y);
  dmgX.rotate(rnd(0,Math.PI*2));
  dmgX.globalAlpha=rnd(0.85,1.0);
  dmgX.drawImage(img,-w/2,-h/2,w,h);
  dmgX.restore();
  dmgX.globalAlpha=1;
}

// 발톱
function doClaw(x,y){
  drawCrackSprite(x,y,rnd(0.32,0.52));
  // 찢김선
  dmgX.save();
  var n=4,baseAng=rnd(0,Math.PI*2),len=rnd(40,75);
  for(var i=0;i<n;i++){
    var a=baseAng+(i/n)*Math.PI*2+rnd(-0.2,0.2);
    dmgX.strokeStyle='rgba(0,0,0,'+rnd(0.65,0.9)+')';
    dmgX.lineWidth=rnd(1.5,3.5); dmgX.lineCap='round';
    var ex=x+Math.cos(a)*len+rnd(-8,8), ey=y+Math.sin(a)*len+rnd(-8,8);
    dmgX.beginPath(); dmgX.moveTo(x,y); dmgX.lineTo(ex,ey); dmgX.stroke();
    // 하이라이트
    dmgX.strokeStyle='rgba(255,255,255,0.4)';dmgX.lineWidth=0.8;
    dmgX.beginPath(); dmgX.moveTo(x+1,y+1); dmgX.lineTo(ex+1,ey+1); dmgX.stroke();
  }
  dmgX.restore();
  addCrack(x,y,rnd(20,40),false);
  damage(rnd(4,7),'claw'); shakeScreen(6);
}

// 폭탄
function doBomb(x,y){
  drawCrackSprite(x,y,rnd(0.55,0.85));
  // 구멍
  var r=rnd(18,32);
  dmgX.fillStyle='rgba(0,0,0,0.92)';
  dmgX.beginPath(); dmgX.arc(x,y,r,0,Math.PI*2); dmgX.fill();
  // 그을음
  var g=dmgX.createRadialGradient(x,y,r,x,y,r*3);
  g.addColorStop(0,'rgba(0,0,0,0.6)'); g.addColorStop(1,'rgba(0,0,0,0)');
  dmgX.fillStyle=g; dmgX.beginPath(); dmgX.arc(x,y,r*3,0,Math.PI*2); dmgX.fill();
  // 씨앗 파편
  for(var i=0;i<rndInt(12,18);i++){
    var ang=(i/18)*Math.PI*2+rnd(-0.2,0.2);
    seedParts.push({x:x,y:y,vx:Math.cos(ang)*rnd(4,14),vy:Math.sin(ang)*rnd(4,14)-rnd(0,3),
      rot:rnd(0,Math.PI*2),rotV:rnd(-0.3,0.3),life:1,sz:rnd(3,8)});
  }
  addCrack(x,y,rnd(45,75),true);
  damage(rnd(9,15),'bomb'); shakeScreen(18); showBubble('bomb');
}

// 화염
function doFlame(x,y){
  if(!flamePrev){flamePrev={x,y};return;}
  var dist=Math.hypot(x-flamePrev.x,y-flamePrev.y);
  if(dist<3)return;
  var ang=Math.atan2(y-flamePrev.y,x-flamePrev.x), r=rnd(14,26);
  var steps=Math.max(1,Math.ceil(dist/4));
  for(var s=0;s<=steps;s++){
    var t=s/steps, mx=flamePrev.x+(x-flamePrev.x)*t, my=flamePrev.y+(y-flamePrev.y)*t;
    var pr=Math.ceil(r/6)+1;
    for(var py=-pr;py<=pr;py++)for(var px=-pr;px<=pr;px++){
      var wx=Math.round((mx+px*6)/6)*6, wy=Math.round((my+py*6)/6)*6;
      var d=Math.hypot(wx-mx,wy-my); if(d>r)continue;
      var dn=1-d/r, di=(wy/6|0)&3, dj=(wx/6|0)&3;
      if(dn<BAYER[di][dj]/16)continue;
      dmgX.fillStyle=dn>0.6?'rgba(5,3,0,'+rnd(0.7,0.95)+')':'rgba(30,15,0,'+rnd(0.25,0.55)+')';
      dmgX.fillRect(wx,wy,6,6);
    }
  }
  for(var i=0;i<4;i++){
    flameParts.push({x:x+rnd(-4,4),y:y+rnd(-4,4),
      vx:Math.cos(ang+rnd(-0.5,0.5))*rnd(1,5),
      vy:Math.sin(ang+rnd(-0.5,0.5))*rnd(1,5)-rnd(0.5,2),
      life:1,sz:rnd(6,18),hot:Math.random()>0.4});
  }
  damage(0.45,'flame');
  flamePrev={x,y};
}

// 주먹
function doFist(x,y){
  drawCrackSprite(x,y,rnd(0.45,0.7));
  // 함몰
  var r=rnd(20,38);
  var g=dmgX.createRadialGradient(x,y,0,x,y,r*1.6);
  g.addColorStop(0,'rgba(0,0,0,0.88)'); g.addColorStop(0.5,'rgba(0,0,0,0.4)'); g.addColorStop(1,'rgba(0,0,0,0)');
  dmgX.fillStyle=g; dmgX.beginPath(); dmgX.arc(x,y,r*1.6,0,Math.PI*2); dmgX.fill();
  addCrack(x,y,rnd(40,70),true);
  damage(rnd(13,19),'fist'); shakeScreen(24); showBubble('fist');
}

// ── 균열 시스템 ──
var crackPts=[], needRedraw=false;
var crackC=document.createElement('canvas');
var crackX=crackC.getContext('2d');

function addCrack(x,y,r,big){
  // bounding box 안으로 클램프
  x=Math.max(MB.x+4,Math.min(MB.x+MB.w-4,x));
  y=Math.max(MB.y+4,Math.min(MB.y+MB.h-4,y));
  r=Math.min(r, x-MB.x, MB.x+MB.w-x, y-MB.y, MB.y+MB.h-y, 65);
  if(r<6)return;
  var lines=[];
  var n=big?rndInt(8,14):rndInt(3,7);
  for(var i=0;i<n;i++) lines.push(buildSegs(x,y,rnd(0,Math.PI*2),rnd(r*0.5,r*1.1),big?3:2));
  crackPts.push({x,y,r,lines,big});
  needRedraw=true;
}

function buildSegs(sx,sy,ang,len,depth){
  var segs=[],x=sx,y=sy,a=ang,n=rndInt(3,5);
  for(var i=0;i<n;i++){
    var sl=len/n*rnd(0.6,1.4);
    var nx=Math.max(MB.x,Math.min(MB.x+MB.w, x+Math.cos(a)*sl+rnd(-4,4)));
    var ny=Math.max(MB.y,Math.min(MB.y+MB.h, y+Math.sin(a)*sl+rnd(-4,4)));
    segs.push({x1:x,y1:y,x2:nx,y2:ny});
    x=nx;y=ny;a+=rnd(-0.5,0.5);
    if(depth>1&&Math.random()<0.35) segs=segs.concat(buildSegs(nx,ny,a+rnd(-1.2,1.2),len*0.45,depth-1));
  }
  return segs;
}

function redrawCracks(){
  crackC.width=CW; crackC.height=CH;
  crackX.clearRect(0,0,CW,CH);
  crackPts.forEach(function(cp){
    cp.lines.forEach(function(segs){
      segs.forEach(function(s){
        crackX.strokeStyle='rgba(0,0,0,0.85)';
        crackX.lineWidth=cp.big?rnd(1,2.5):rnd(0.7,1.8);
        crackX.lineCap='round';
        crackX.beginPath();crackX.moveTo(s.x1,s.y1);crackX.lineTo(s.x2,s.y2);crackX.stroke();
        crackX.strokeStyle='rgba(255,255,255,0.2)';crackX.lineWidth=0.5;
        crackX.beginPath();crackX.moveTo(s.x1+1,s.y1+1);crackX.lineTo(s.x2+1,s.y2+1);crackX.stroke();
      });
    });
    var g=crackX.createRadialGradient(cp.x,cp.y,0,cp.x,cp.y,cp.r*0.25);
    g.addColorStop(0,'rgba(0,0,0,0.6)');g.addColorStop(1,'rgba(0,0,0,0)');
    crackX.fillStyle=g;crackX.beginPath();crackX.arc(cp.x,cp.y,cp.r*0.25,0,Math.PI*2);crackX.fill();
  });
  needRedraw=false;
}

// ── HP & 데미지 ──
function damage(v,tool_){
  if(hp<=0)return;
  hp=Math.max(0,hp-v);
  hpBar.style.width=hp+'%';
  hpNum.textContent=Math.round(hp);
  if(hp>60)hpBar.style.background='linear-gradient(90deg,#4caf50,#8bc34a)';
  else if(hp>30)hpBar.style.background='linear-gradient(90deg,#ff9800,#ffc107)';
  else hpBar.style.background='linear-gradient(90deg,#f44336,#e91e63)';
  var newStage=hp>75?0:hp>50?1:hp>30?2:hp>10?3:hp>0?4:5;
  if(newStage!==stage){stage=newStage;onStageChange(stage);}
  if(hp<=0)triggerDeath();
  if(tool_&&Math.random()<0.2)showBubble(tool_);
}

function onStageChange(s){
  // 베젤에 자동 깨진자국 스프라이트 추가
  var bezelPts=[
    {x:rnd(MB.x,SR.x),            y:rnd(MB.y,MB.y+MB.h)},      // 좌 베젤
    {x:rnd(SR.x+SR.w,MB.x+MB.w),  y:rnd(MB.y,MB.y+MB.h)},      // 우 베젤
    {x:rnd(MB.x,MB.x+MB.w),       y:rnd(MB.y,SR.y)},            // 상 베젤
    {x:rnd(MB.x,MB.x+MB.w),       y:rnd(SR.y+SR.h,MB.y+MB.h)}, // 하 베젤
  ];
  var count=s+2;
  for(var i=0;i<count;i++){
    var p=bezelPts[i%bezelPts.length];
    drawCrackSprite(p.x,p.y,rnd(0.3+s*0.08,0.6+s*0.1));
    addCrack(p.x,p.y,rnd(18+s*10,35+s*14),s>=3);
  }
  // LCD 줄 (화면 손상)
  if(s>=2){
    for(var j=0;j<s*2+2;j++){
      var ly=rnd(SR.y+5,SR.y+SR.h-5), lh=rnd(1,s>=3?4:2);
      dmgX.fillStyle='rgba(0,0,0,'+rnd(0.3,0.6)+')';
      dmgX.fillRect(SR.x,ly,SR.w,lh);
    }
  }
}

function triggerDeath(){
  for(var i=0;i<20;i++) addCrack(rnd(MB.x+10,MB.x+MB.w-10),rnd(MB.y+10,MB.y+MB.h-10),rnd(40,80),true);
  showBubble('fist'); bubbleEl.textContent='🐹 개박살!!';
  setTimeout(function(){finalMsg.classList.add('show');},1200);
}

function showBubble(tool_){
  var msgs=MSGS[tool_]||['찍찍!!'];
  bubbleEl.textContent=msgs[rndInt(0,msgs.length-1)];
  bubbleEl.classList.add('show');
  clearTimeout(showBubble._t);
  showBubble._t=setTimeout(function(){bubbleEl.classList.remove('show');},1500);
}

// ── 화면 흔들기 ──
var shakeAmt=0;
function shakeScreen(v){shakeAmt=Math.max(shakeAmt,v);}
function getShake(){
  if(shakeAmt<0.5)return{x:0,y:0};
  var s={x:rnd(-shakeAmt,shakeAmt),y:rnd(-shakeAmt,shakeAmt)};
  shakeAmt*=0.7; return s;
}

// ── 파티클 렌더 ──
function renderParticles(){
  // 씨앗
  seedParts=seedParts.filter(function(p){
    p.x+=p.vx;p.y+=p.vy;p.vy+=0.4;p.vx*=0.96;p.rot+=p.rotV;p.life-=0.025;
    if(p.life<=0)return false;
    dmgX.save();dmgX.globalAlpha=p.life;dmgX.translate(p.x,p.y);dmgX.rotate(p.rot);
    dmgX.fillStyle='#3a2200';dmgX.beginPath();dmgX.ellipse(0,0,p.sz*0.38,p.sz*0.68,0,0,Math.PI*2);dmgX.fill();
    dmgX.restore();dmgX.globalAlpha=1;
    return true;
  });
  // 화염
  flameParts=flameParts.filter(function(p){
    p.x+=p.vx;p.y+=p.vy;p.vy-=0.1;p.vx*=0.94;p.life-=0.05;
    if(p.life<=0)return false;
    var r=p.sz*p.life;
    var g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
    if(p.hot){g.addColorStop(0,'rgba(255,255,100,'+p.life+')');g.addColorStop(1,'rgba(255,80,0,0)');}
    else{g.addColorStop(0,'rgba(60,30,0,'+p.life+')');g.addColorStop(1,'rgba(0,0,0,0)');}
    ctx.save();
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
    ctx.restore();
    return true;
  });
}

// ── macOS 바탕화면 ──
var screenColors=['#4a7ec7','#7060b0','#903060','#300010','#000'];
function drawDesktop(s){
  var sx=SR.x,sy=SR.y,sw=SR.w,sh=SR.h;
  var col=screenColors[Math.min(s,4)];
  var grad=ctx.createLinearGradient(sx,sy,sx+sw,sy+sh);
  grad.addColorStop(0,col);grad.addColorStop(1,col);
  ctx.fillStyle=grad;ctx.fillRect(sx,sy,sw,sh);
  if(s>=5)return;
  // 메뉴바
  ctx.fillStyle='rgba(255,255,255,0.82)';ctx.fillRect(sx,sy,sw,sh*0.085);
  ctx.fillStyle='rgba(0,0,0,0.85)';
  var fs=Math.max(8,sw*0.026);
  ctx.font='bold '+fs+'px sans-serif';ctx.textBaseline='middle';
  ctx.fillText('🍎',sx+sw*0.025,sy+sh*0.043);
  ctx.font=(fs*0.8)+'px sans-serif';
  ['Finder','File','Edit','View'].forEach(function(m,i){ctx.fillText(m,sx+sw*(0.07+i*0.07),sy+sh*0.043);});
  // 독
  var dh=sh*0.12,dw=sw*0.38,dx=sx+(sw-dw)/2,dy=sy+sh-dh-sh*0.02;
  ctx.fillStyle='rgba(255,255,255,0.2)';
  ctx.beginPath();ctx.roundRect(dx,dy,dw,dh,dh*0.35);ctx.fill();
  ctx.font=(dh*0.65)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ['🔍','📁','🌐','✉️','🎵'].forEach(function(ic,i){ctx.fillText(ic,dx+dw/(6)*(i+1),dy+dh*0.5);});
  ctx.textAlign='left';ctx.textBaseline='alphabetic';
}

// ── 메인 렌더 ──
var shake={x:0,y:0};

function draw(){
  requestAnimationFrame(draw);
  renderParticles();
  if(needRedraw)redrawCracks();
  shake=getShake();

  ctx.clearRect(0,0,CW,CH);

  // shake 적용 레이어 (macbook, 화면, 균열)
  ctx.save();
  ctx.translate(shake.x, shake.y);

  // 1. 화면 (맥북 뒤, shake 포함)
  ctx.save();
  ctx.beginPath();ctx.rect(SR.x,SR.y,SR.w,SR.h);ctx.clip();
  drawDesktop(stage);
  ctx.restore();

  // 2. macbook.png
  if(macLoaded){
    var br=[1,0.98,0.94,0.88,0.76,0.55][Math.min(stage,5)];
    ctx.filter='brightness('+br+')';
    ctx.drawImage(macImg,0,0,CW,CH);
    ctx.filter='none';
  }

  // 3. 균열 레이어 (shake 포함 → macbook과 정렬)
  // clip을 translate 전 화면 좌표 기준으로: shake 역보정
  ctx.save();
  ctx.beginPath();
  ctx.rect(MB.x - shake.x, MB.y - shake.y, MB.w, MB.h);
  ctx.clip();
  ctx.drawImage(crackC, 0, 0);
  ctx.restore();

  ctx.restore(); // shake 복원

  // 4. 데미지 레이어 — shake 없이 (dmgC 좌표 = canvas 좌표)
  // clip 없이 전체 그리고, macbook.png 알파로 배경은 가려짐
  ctx.drawImage(dmgC, 0, 0);
}

// ── 재시작 ──
restartBtn.addEventListener('click',function(){
  hp=100;stage=0;crackPts=[];seedParts=[];flameParts=[];flamePrev=null;
  hpBar.style.width='100%';hpBar.style.background='linear-gradient(90deg,#4caf50,#8bc34a)';
  hpNum.textContent='100';
  finalMsg.classList.remove('show');bubbleEl.classList.remove('show');
  dmgX.clearRect(0,0,CW,CH);
  crackC.width=CW;crackC.height=CH;
  needRedraw=false;
});

// ── 툴 선택 ──
var toolBtns={claw:document.getElementById('btn-claw'),bomb:document.getElementById('btn-bomb'),flame:document.getElementById('btn-flame'),fist:document.getElementById('btn-fist')};
Object.keys(toolBtns).forEach(function(k){
  toolBtns[k].addEventListener('click',function(){
    tool=k;
    Object.keys(toolBtns).forEach(function(j){toolBtns[j].classList.toggle('selected',j===k);});
    flamePrev=null;
  });
  toolBtns[k].addEventListener('mousedown',function(e){e.stopPropagation();});
});
document.addEventListener('keydown',function(e){
  var k=e.key.toLowerCase();
  if(k==='q')toolBtns.claw.click();
  if(k==='w')toolBtns.bomb.click();
  if(k==='e')toolBtns.flame.click();
  if(k==='r')toolBtns.fist.click();
});

// ── 커서 ──
document.addEventListener('mousemove',function(e){
  cursorEl.style.left=e.clientX+'px';
  cursorEl.style.top=e.clientY+'px';
});

// ── 이벤트 ──
function getPos(e){var t=e.touches?e.touches[0]:e;return toCanvas(t.clientX,t.clientY);}
function act(x,y,click){
  if(hp<=0)return;
  if(tool==='claw'&&click)doClaw(x,y);
  else if(tool==='bomb'&&click)doBomb(x,y);
  else if(tool==='flame')doFlame(x,y);
  else if(tool==='fist'&&click)doFist(x,y);
}

canvas.addEventListener('mousedown',function(e){
  isDown=true;flamePrev=null;
  cursorEl.src='Hamster-punch.png';
  var p=getPos(e);act(p.x,p.y,true);
});
canvas.addEventListener('mousemove',function(e){
  if(!isDown)return;
  var p=getPos(e);act(p.x,p.y,false);
});
document.addEventListener('mouseup',function(){isDown=false;flamePrev=null;cursorEl.src='Hamster.png';});
canvas.addEventListener('touchstart',function(e){e.preventDefault();isDown=true;flamePrev=null;var p=getPos(e);act(p.x,p.y,true);},{passive:false});
canvas.addEventListener('touchmove',function(e){e.preventDefault();if(!isDown)return;var p=getPos(e);act(p.x,p.y,false);},{passive:false});
document.addEventListener('touchend',function(){isDown=false;flamePrev=null;});

draw();
