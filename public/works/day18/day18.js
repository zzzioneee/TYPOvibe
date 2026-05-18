'use strict';

var MB_W=2505,MB_H=1484;
var SCX1=0.2548,SCX2=0.7445,SCY1=0.1624,SCY2=0.6869;

var canvas=document.getElementById('main');
var ctx=canvas.getContext('2d');
var cursorEl=document.getElementById('hamster-cursor');
var hpBar=document.getElementById('hp-bar');
var hpNum=document.getElementById('hp-num');
var bubbleEl=document.getElementById('bubble');
var finalMsg=document.getElementById('final-msg');
var restartBtn=document.getElementById('restart-btn');

// 데미지 누적 캔버스 (타격 자국)
var dmgC=document.createElement('canvas');
var dmgX=dmgC.getContext('2d');

var macImg=new Image(); macImg.src='macbook-text.png'; var macLoaded=false;
macImg.onload=function(){macLoaded=true;};

var bgImg=null; var bgLoaded=false;

var CW=0,CH=0,SR={},MB={};
function resize(){
  var vw=window.innerWidth,vh=window.innerHeight,ratio=MB_W/MB_H,w,h;
  if(vw/vh>ratio){h=vh*0.72;w=h*ratio;}else{w=vw*0.72;h=w/ratio;}
  CW=Math.round(w);CH=Math.round(h);
  canvas.width=CW;canvas.height=CH;
  canvas.style.width=CW+'px';canvas.style.height=CH+'px';
  SR={x:Math.round(CW*SCX1)-1, y:Math.round(CH*SCY1)-1,
      w:Math.round(CW*(SCX2-SCX1))+2, h:Math.round(CH*(SCY2-SCY1))+2};
  MB={x:0, y:0, w:CW, h:CH}; // macbook-text.png는 전체 캔버스가 맥북
  dmgC.width=CW;dmgC.height=CH;
}
resize();
window.addEventListener('resize',function(){resize();fullReset();});

function toCv(cx,cy){var r=canvas.getBoundingClientRect();return{x:(cx-r.left)*(CW/r.width),y:(cy-r.top)*(CH/r.height)};}
function rnd(a,b){return a+Math.random()*(b-a);}
function rndI(a,b){return Math.floor(rnd(a,b+1));}
function clamp(v,mn,mx){return Math.max(mn,Math.min(mx,v));}

var hp=100,stage=0,isDown=false,tool='claw',flamePrev=null;
var shakeX=0,shakeY=0,shakeAmt=0;
var sparks=[];
var slashSegs=[]; // {x1,y1,x2,y2} 발톱 자국 선분

var MSGS={claw:['으드득!!','찢어버려!!'],bomb:['쾅!!','폭발이다!!'],
          flame:['불이야!!','타버려!!'],fist:['주먹이다!!','햄찌 어퍼컷!!']};

// ─── 타격 효과 (dmgC에 누적) ─────────────────
// 공통: 맥북 안에만 그리도록 dmgX에 clip 적용
function withMBClip(fn){
  dmgX.save();
  dmgX.beginPath();dmgX.rect(MB.x,MB.y,MB.w,MB.h);dmgX.clip();
  fn();
  dmgX.restore();
}

// 주먹/폭탄: 충격 구멍 (각진 다각형 + 방사형 균열선)
function stampImpact(cx,cy,r){
  withMBClip(function(){
    // 검정 구멍 — 더 크고 명확하게
    dmgX.fillStyle='#000';
    dmgX.beginPath();
    var n=rndI(6,8);
    for(var i=0;i<n;i++){
      var a=(i/n)*Math.PI*2+rnd(-0.2,0.2);
      var rv=r*rnd(0.7,1.0);
      if(i===0)dmgX.moveTo(cx+Math.cos(a)*rv,cy+Math.sin(a)*rv);
      else dmgX.lineTo(cx+Math.cos(a)*rv,cy+Math.sin(a)*rv);
    }
    dmgX.closePath();dmgX.fill();
    // 흰 테두리 (찢긴 금속 하이라이트)
    dmgX.strokeStyle='#fff';dmgX.lineWidth=2;dmgX.stroke();

    // 방사형 균열 — 굵고 적게 (4~6개)
    dmgX.strokeStyle='#000';dmgX.lineWidth=3;dmgX.lineCap='round';
    var nc=rndI(4,6);
    for(var j=0;j<nc;j++){
      var ca=rnd(0,Math.PI*2);
      var cl=r*rnd(1.2,1.8);
      var sx=cx+Math.cos(ca)*r*0.85;
      var sy=cy+Math.sin(ca)*r*0.85;
      // 꺾임 한 번
      var kx=sx+(Math.cos(ca+rnd(-0.4,0.4))*(cl-r)*0.5);
      var ky=sy+(Math.sin(ca+rnd(-0.4,0.4))*(cl-r)*0.5);
      var ex=cx+Math.cos(ca+rnd(-0.3,0.3))*cl;
      var ey=cy+Math.sin(ca+rnd(-0.3,0.3))*cl;
      dmgX.beginPath();dmgX.moveTo(sx,sy);dmgX.lineTo(kx,ky);dmgX.lineTo(ex,ey);dmgX.stroke();
    }
  });
}

// 발톱: 찢긴 틈새 (두꺼운 검정 선 + 양쪽 흰 테두리)
function addClawSeg(x1,y1,x2,y2){
  withMBClip(function(){
    dmgX.lineCap='round';
    // 검정 틈새
    dmgX.strokeStyle='#000';dmgX.lineWidth=rnd(4,8);
    dmgX.beginPath();dmgX.moveTo(x1,y1);dmgX.lineTo(x2,y2);dmgX.stroke();
    // 양쪽 흰 테두리
    dmgX.strokeStyle='rgba(255,255,255,0.75)';dmgX.lineWidth=1;
    var dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1;
    var nx=dy/len*3,ny=-dx/len*3;
    dmgX.beginPath();dmgX.moveTo(x1+nx,y1+ny);dmgX.lineTo(x2+nx,y2+ny);dmgX.stroke();
    dmgX.beginPath();dmgX.moveTo(x1-nx,y1-ny);dmgX.lineTo(x2-nx,y2-ny);dmgX.stroke();
  });
}

// 화염: 작은 검정 사각형 그을음
function addScorch(x,y){
  if(x<MB.x||x>MB.x+MB.w||y<MB.y||y>MB.y+MB.h)return;
  withMBClip(function(){
    dmgX.fillStyle='rgba(0,0,0,0.85)';
    var s=rndI(6,14);
    dmgX.fillRect(x-s/2,y-s/2,s,s);
  });
}

// ─── 툴 동작 ─────────────────────────────────
var prevClawPt=null;
function startClaw(x,y){prevClawPt={x,y};}
function moveClaw(x,y){
  if(!prevClawPt)return;
  addClawSeg(prevClawPt.x,prevClawPt.y,x,y);
  prevClawPt={x,y};
  damage(0.5,'claw');
}
function endClaw(){prevClawPt=null;}

function doBomb(x,y){
  stampImpact(x,y,rndI(40,65));
  for(var i=0;i<rndI(10,16);i++){
    var a=(i/16)*Math.PI*2+rnd(-0.2,0.2);
    sparks.push({x,y,vx:Math.cos(a)*rnd(4,12),vy:Math.sin(a)*rnd(4,12)-rnd(0,3),
      life:1,sz:rnd(2,6),col:'#3a2200',seed:true});
  }
  damage(rndI(10,16),'bomb');doShake(20);showBubble('bomb');
}

var flameAcc=0;
function doFlame(x,y,drag){
  if(!drag){flamePrev={x,y};flameAcc=0;return;}
  if(!flamePrev)return;
  flameAcc+=Math.hypot(x-flamePrev.x,y-flamePrev.y);
  if(flameAcc>8){
    addScorch(x,y);
    sparks.push({x,y,vx:rnd(-1,1),vy:rnd(-3,-0.5),life:1,sz:rndI(5,11),
      col:Math.random()<0.6?'#ff8800':'#ffee00',fire:true});
    flameAcc=0;
  }
  damage(0.35,'flame');flamePrev={x,y};
}

function doFist(x,y){
  stampImpact(x,y,rndI(45,70));
  for(var i=0;i<8;i++){
    var a=rnd(0,Math.PI*2);
    sparks.push({x,y,vx:Math.cos(a)*rnd(3,9),vy:Math.sin(a)*rnd(3,9)-1,
      life:1,sz:rnd(2,6),col:i%2===0?'#fff':'#ccaa88'});
  }
  damage(rndI(13,20),'fist');doShake(26);showBubble('fist');
}

// ─── HP ─────────────────────────────────────
function damage(v,t){
  if(hp<=0)return;
  hp=Math.max(0,hp-v);
  hpBar.style.width=hp+'%';hpNum.textContent=Math.round(hp);
  if(hp>60)hpBar.style.background='linear-gradient(90deg,#4caf50,#8bc34a)';
  else if(hp>30)hpBar.style.background='linear-gradient(90deg,#ff9800,#ffc107)';
  else hpBar.style.background='linear-gradient(90deg,#f44336,#e91e63)';
  var ns=hp>75?0:hp>50?1:hp>30?2:hp>10?3:hp>0?4:5;
  if(ns!==stage){stage=ns;autoBezel(stage);}
  if(hp<=0)triggerDeath();
  if(t&&Math.random()<0.22)showBubble(t);
}

function autoBezel(s){
  var zones=[
    function(){return{x:rnd(MB.x+8,SR.x-8),y:rnd(SR.y+10,SR.y+SR.h-10)};},
    function(){return{x:rnd(SR.x+SR.w+8,MB.x+MB.w-8),y:rnd(SR.y+10,SR.y+SR.h-10)};},
    function(){return{x:rnd(SR.x+20,SR.x+SR.w-20),y:rnd(MB.y+8,SR.y-8)};},
    function(){return{x:rnd(SR.x+20,SR.x+SR.w-20),y:rnd(SR.y+SR.h+8,MB.y+MB.h*0.78)};},
  ];
  for(var i=0;i<s+1;i++){
    var p=zones[i%zones.length]();
    stampImpact(p.x,p.y,rndI(22+s*6,38+s*10));
  }
}

function triggerDeath(){
  for(var i=0;i<12;i++)
    stampImpact(rnd(MB.x+20,MB.x+MB.w-20),rnd(MB.y+20,MB.y+MB.h*0.85),rndI(20,45));
  showBubble('fist');bubbleEl.textContent='🐹 개박살!!';
  setTimeout(function(){finalMsg.classList.add('show');},1200);
}

function showBubble(t){
  var m=MSGS[t]||['찍찍!!'];
  bubbleEl.textContent=m[rndI(0,m.length-1)];
  bubbleEl.classList.add('show');
  clearTimeout(showBubble._t);
  showBubble._t=setTimeout(function(){bubbleEl.classList.remove('show');},1500);
}
function doShake(v){shakeAmt=Math.max(shakeAmt,v);}
function updShake(){
  if(shakeAmt<0.5){shakeX=0;shakeY=0;shakeAmt=0;return;}
  shakeX=rnd(-shakeAmt,shakeAmt);shakeY=rnd(-shakeAmt,shakeAmt);shakeAmt*=0.72;
}

// ─── 화면 내용 ───────────────────────────────
function drawScreen(){
  // macbook-text.png에 화면 내용이 이미 포함됨 — 별도 그리기 없음
}

// ─── 렌더 루프 ───────────────────────────────
function draw(){
  requestAnimationFrame(draw);
  updShake();
  ctx.clearRect(0,0,CW,CH);

  // shake를 MB 좌표에 반영
  var sx=MB.x+shakeX, sy=MB.y+shakeY;

  // MB 절대 좌표로 clip (shake 없이)
  ctx.save();
  ctx.beginPath();
  ctx.rect(MB.x, MB.y, MB.w, MB.h);
  ctx.clip();

  // macbook.png (shake 적용)
  if(macLoaded){
    var br=[1,0.98,0.93,0.87,0.74,0.52][Math.min(stage,5)];
    ctx.filter='brightness('+br+')';
    ctx.drawImage(macImg, shakeX, shakeY, CW, CH);
    ctx.filter='none';
  }

  // 화면 내용 — macbook 위에 그려서 흰 화면 영역 덮음
  ctx.save();
  ctx.translate(shakeX,shakeY);
  ctx.beginPath();ctx.rect(SR.x,SR.y,SR.w,SR.h);ctx.clip();
  drawScreen();
  ctx.restore();

  // dmgC — shake 없이 (절대 좌표, MB clip 안에 있음)
  ctx.drawImage(dmgC, 0, 0);

  ctx.restore();

  // 파티클
  sparks=sparks.filter(function(p){
    p.x+=p.vx;p.y+=p.vy;
    if(p.seed){p.vy+=0.4;p.vx*=0.96;}
    else if(p.fire){p.vy+=0.03;}
    else{p.vy+=0.2;}
    p.life-=p.fire?0.04:0.06;
    if(p.life<=0)return false;
    ctx.globalAlpha=p.life;ctx.fillStyle=p.col;
    if(p.fire){
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(rnd(0,Math.PI));
      var s=p.sz*p.life;
      ctx.beginPath();ctx.moveTo(0,-s);ctx.lineTo(s*0.5,s*0.5);ctx.lineTo(-s*0.5,s*0.5);ctx.closePath();ctx.fill();
      ctx.restore();
    }else if(p.seed){
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.vx*0.2);
      ctx.fillRect(-p.sz*0.3,-p.sz*0.55,p.sz*0.6,p.sz*1.1);ctx.restore();
    }else{
      ctx.fillRect(p.x-p.sz*0.5,p.y-p.sz*0.5,p.sz,p.sz);
    }
    ctx.globalAlpha=1;return true;
  });
}

// ─── 재시작 ──────────────────────────────────
function fullReset(){
  hp=100;stage=0;sparks=[];flamePrev=null;prevClawPt=null;
  shakeX=0;shakeY=0;shakeAmt=0;flameAcc=0;
  hpBar.style.width='100%';hpBar.style.background='linear-gradient(90deg,#4caf50,#8bc34a)';
  hpNum.textContent='100';
  finalMsg.classList.remove('show');bubbleEl.classList.remove('show');
  dmgX.clearRect(0,0,CW,CH);
}
restartBtn.addEventListener('click',fullReset);

// ─── 툴 & 이벤트 ─────────────────────────────
var TB={claw:document.getElementById('btn-claw'),bomb:document.getElementById('btn-bomb'),
        flame:document.getElementById('btn-flame'),fist:document.getElementById('btn-fist')};
Object.keys(TB).forEach(function(k){
  TB[k].addEventListener('click',function(){
    tool=k;Object.keys(TB).forEach(function(j){TB[j].classList.toggle('selected',j===k);});
    flamePrev=null;prevClawPt=null;
  });
  TB[k].addEventListener('mousedown',function(e){e.stopPropagation();});
});
document.addEventListener('keydown',function(e){
  var k=e.key.toLowerCase();
  if(k==='q')TB.claw.click();if(k==='w')TB.bomb.click();
  if(k==='e')TB.flame.click();if(k==='r')TB.fist.click();
});
document.addEventListener('mousemove',function(e){cursorEl.style.left=e.clientX+'px';cursorEl.style.top=e.clientY+'px';});

function toC(e){var t=e.touches?e.touches[0]:e;return toCv(t.clientX,t.clientY);}
canvas.addEventListener('mousedown',function(e){
  if(hp<=0)return;isDown=true;flamePrev=null;cursorEl.src='Hamster-punch.png';
  var p=toC(e);
  if(tool==='claw')startClaw(p.x,p.y);
  else if(tool==='bomb')doBomb(p.x,p.y);
  else if(tool==='flame')doFlame(p.x,p.y,false);
  else if(tool==='fist')doFist(p.x,p.y);
});
canvas.addEventListener('mousemove',function(e){
  if(!isDown||hp<=0)return;var p=toC(e);
  if(tool==='claw')moveClaw(p.x,p.y);
  else if(tool==='flame')doFlame(p.x,p.y,true);
});
document.addEventListener('mouseup',function(){
  if(!isDown)return;isDown=false;flamePrev=null;cursorEl.src='Hamster.png';
  if(tool==='claw')endClaw();
});
canvas.addEventListener('touchstart',function(e){
  e.preventDefault();if(hp<=0)return;isDown=true;flamePrev=null;
  var p=toC(e);
  if(tool==='claw')startClaw(p.x,p.y);
  else if(tool==='bomb')doBomb(p.x,p.y);
  else if(tool==='flame')doFlame(p.x,p.y,false);
  else if(tool==='fist')doFist(p.x,p.y);
},{passive:false});
canvas.addEventListener('touchmove',function(e){
  e.preventDefault();if(!isDown||hp<=0)return;var p=toC(e);
  if(tool==='claw')moveClaw(p.x,p.y);
  else if(tool==='flame')doFlame(p.x,p.y,true);
},{passive:false});
document.addEventListener('touchend',function(){
  if(!isDown)return;isDown=false;flamePrev=null;
  if(tool==='claw')endClaw();
});

draw();
