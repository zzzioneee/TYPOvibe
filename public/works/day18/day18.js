'use strict';

var MB_W=2912,MB_H=1632;
var SCX1=0.2548,SCX2=0.7445,SCY1=0.1624,SCY2=0.6869;

var canvas=document.getElementById('main');
var ctx=canvas.getContext('2d');
var cursorEl=document.getElementById('hamster-cursor');
var hpBar=document.getElementById('hp-bar');
var hpNum=document.getElementById('hp-num');
var bubbleEl=document.getElementById('bubble');
var finalMsg=document.getElementById('final-msg');
var restartBtn=document.getElementById('restart-btn');

// offscreen: macbook 픽셀 (displacement 소스)
var mbC=document.createElement('canvas');
var mbX=mbC.getContext('2d',{willReadFrequently:true});
// offscreen: 스탬프 누적 (구멍, 그을음)
var stC=document.createElement('canvas');
var stX=stC.getContext('2d');

var macImg=new Image(); macImg.src='macbook.png'; var macLoaded=false;
macImg.onload=function(){ macLoaded=true; initMb(); };

var CW=0,CH=0,SR={},MB={};
function initMb(){
  mbC.width=stC.width=CW; mbC.height=stC.height=CH;
  mbX.clearRect(0,0,CW,CH);
  mbX.drawImage(macImg,0,0,CW,CH);
  stX.clearRect(0,0,CW,CH);
}

function resize(){
  var vw=window.innerWidth,vh=window.innerHeight,ratio=MB_W/MB_H,w,h;
  if(vw/vh>ratio){h=vh*0.88;w=h*ratio;}else{w=vw*0.88;h=w/ratio;}
  CW=Math.round(w);CH=Math.round(h);
  canvas.width=CW;canvas.height=CH;
  canvas.style.width=CW+'px';canvas.style.height=CH+'px';
  SR={x:Math.round(CW*SCX1),y:Math.round(CH*SCY1),
      w:Math.round(CW*(SCX2-SCX1)),h:Math.round(CH*(SCY2-SCY1))};
  MB={x:Math.round(CW*0.055),y:Math.round(CH*0.048),
      w:Math.round(CW*0.854),h:Math.round(CH*0.909)};
  if(macLoaded)initMb();
}
resize();
window.addEventListener('resize',function(){resize();fullReset();});

function toCv(cx,cy){var r=canvas.getBoundingClientRect();return{x:(cx-r.left)*(CW/r.width),y:(cy-r.top)*(CH/r.height)};}
function rnd(a,b){return a+Math.random()*(b-a);}
function rndI(a,b){return Math.floor(rnd(a,b+1));}
// 맥북 바디 범위 안인지
function inMB(x,y){return x>=MB.x&&x<=MB.x+MB.w&&y>=MB.y&&y<=MB.y+MB.h;}

var hp=100,stage=0,isDown=false,tool='claw',flamePrev=null;
var shakeX=0,shakeY=0,shakeAmt=0;
var sparks=[];
var slashPath=null;
var MSGS={claw:['으드득!!','찢어버려!!'],bomb:['쾅!!','폭발이다!!'],
          flame:['불이야!!','타버려!!'],fist:['주먹이다!!','햄찌 어퍼컷!!']};

// ════════════════════════════════════════
// 핵심A: Radial Pixel Displacement
// src/dst를 분리해서 번짐 없이 정확히 밀어냄
// ════════════════════════════════════════
function radialDisplace(cx,cy,radius,pushDist){
  if(!macLoaded)return;
  cx=Math.round(cx);cy=Math.round(cy);
  var r=radius,pd=pushDist;
  var x0=Math.max(MB.x,cx-r-pd-2),y0=Math.max(MB.y,cy-r-pd-2);
  var x1=Math.min(MB.x+MB.w,cx+r+pd+2),y1=Math.min(MB.y+MB.h,cy+r+pd+2);
  if(x1<=x0||y1<=y0)return;
  var w=x1-x0,h=y1-y0;

  // src 읽기
  var src=mbX.getImageData(x0,y0,w,h);
  var sd=src.data;
  // dst는 별도 버퍼
  var dst=new Uint8ClampedArray(sd.length);
  // 기본: src 그대로 복사
  dst.set(sd);

  for(var py=0;py<h;py++){
    for(var px=0;px<w;px++){
      var wx=x0+px,wy=y0+py;
      var dx=wx-cx,dy=wy-cy;
      var dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<1||dist>r)continue;
      // 중심에서 바깥 방향으로 pd만큼 밀어낼 목적지 계산
      var nx=dx/dist,ny=dy/dist;
      var destX=Math.round(wx+nx*pd),destY=Math.round(wy+ny*pd);
      var dpx=destX-x0,dpy=destY-y0;
      if(dpx<0||dpx>=w||dpy<0||dpy>=h)continue;
      var si=(py*w+px)*4;
      var di=(dpy*w+dpx)*4;
      dst[di]=sd[si];dst[di+1]=sd[si+1];dst[di+2]=sd[si+2];dst[di+3]=sd[si+3];
      // 원래 자리 검정 (텅 빈 자리)
      dst[py*w*4+px*4]=0;dst[py*w*4+px*4+1]=0;dst[py*w*4+px*4+2]=0;dst[py*w*4+px*4+3]=255;
    }
  }
  mbX.putImageData(new ImageData(dst,w,h),x0,y0);
  // 구멍 스탬프
  sharpHole(cx,cy,Math.round(radius*0.5));
}

// 날카로운 각진 구멍 (stC에 그림, 그라디언트/원 없음)
function sharpHole(cx,cy,r){
  var n=rndI(6,8);
  stX.save();
  stX.beginPath();
  for(var i=0;i<n;i++){
    var a=(i/n)*Math.PI*2+rnd(-0.3,0.3);
    var rv=r*rnd(0.65,1.0);
    var px=cx+Math.cos(a)*rv,py=cy+Math.sin(a)*rv;
    if(i===0)stX.moveTo(px,py);else stX.lineTo(px,py);
  }
  stX.closePath();
  stX.fillStyle='#000000';
  stX.fill();
  // 흰색 날카로운 테두리 1px (금속 찢김 하이라이트)
  stX.strokeStyle='#ffffff';
  stX.lineWidth=1.2;
  stX.stroke();
  // 내부 어두운 그림자 (그라디언트 없음, 단색 삼각형들로 표현)
  for(var j=0;j<3;j++){
    var a2=rnd(0,Math.PI*2);
    stX.fillStyle='rgba(60,50,40,0.6)';
    stX.beginPath();
    stX.moveTo(cx,cy);
    stX.lineTo(cx+Math.cos(a2)*r*0.6,cy+Math.sin(a2)*r*0.6);
    stX.lineTo(cx+Math.cos(a2+0.8)*r*0.4,cy+Math.sin(a2+0.8)*r*0.4);
    stX.closePath();stX.fill();
  }
  stX.restore();
}

// ════════════════════════════════════════
// 핵심B: Linear Slash Displacement
// 드래그 경로 법선으로 20~30px 양옆 쪼개기
// 틈새 = 순수 블랙, src/dst 분리
// ════════════════════════════════════════
function applySlash(path){
  if(!macLoaded||path.length<2)return;
  var SHIFT=rndI(22,32);
  var HW=2; // 경로 반폭

  var imgData=mbX.getImageData(0,0,CW,CH);
  var src=new Uint8ClampedArray(imgData.data); // 원본 복사
  var dst=imgData.data; // 결과에 직접 쓰기

  for(var pi=1;pi<path.length;pi++){
    var p0=path[pi-1],p1=path[pi];
    var dx=p1.x-p0.x,dy=p1.y-p0.y;
    var len=Math.sqrt(dx*dx+dy*dy);
    if(len<1)continue;
    var nx=dy/len,ny=-dx/len; // 법선

    var steps=Math.ceil(len*2);
    for(var s=0;s<=steps;s++){
      var t=s/steps;
      var cx=Math.round(p0.x+dx*t),cy=Math.round(p0.y+dy*t);
      if(!inMB(cx,cy))continue;

      for(var w=-HW;w<=HW;w++){
        var px=cx+Math.round(nx*w),py=cy+Math.round(ny*w);
        if(px<0||px>=CW||py<0||py>=CH)continue;

        // 법선 양방향으로 SHIFT만큼 이동
        for(var side=-1;side<=1;side+=2){
          var destX=px+Math.round(nx*side*SHIFT);
          var destY=py+Math.round(ny*side*SHIFT);
          if(destX<0||destX>=CW||destY<0||destY>=CH)continue;
          var si=(py*CW+px)*4;
          var di=(destY*CW+destX)*4;
          // src(원본)에서 읽어서 dst에 쓰기
          dst[di]=src[si];dst[di+1]=src[si+1];dst[di+2]=src[si+2];dst[di+3]=src[si+3];
        }
        // 원래 자리 = 순수 블랙
        var bi=(py*CW+px)*4;
        dst[bi]=0;dst[bi+1]=0;dst[bi+2]=0;dst[bi+3]=255;
      }
    }
  }
  mbX.putImageData(imgData,0,0);

  // 스파크
  for(var i=0;i<path.length;i+=3){
    var sp=path[i];
    if(!inMB(sp.x,sp.y))continue;
    for(var j=0;j<4;j++){
      sparks.push({x:sp.x+rnd(-5,5),y:sp.y+rnd(-5,5),
        vx:rnd(-2.5,2.5),vy:rnd(-3.5,0.5),life:1,sz:rnd(1.5,3.5),
        col:Math.random()<0.5?'#ffffff':'#ffcc00'});
    }
  }
}

// 그을음 (단색 각진 패치, stC에)
function scorch(x,y,sz){
  if(!inMB(x,y))return;
  stX.save();
  stX.fillStyle='rgba(5,4,2,0.9)';
  stX.beginPath();
  var n=rndI(5,7);
  for(var i=0;i<n;i++){
    var a=(i/n)*Math.PI*2+rnd(-0.4,0.4);
    var rv=sz*rnd(0.55,1.0);
    var px=x+Math.cos(a)*rv,py=y+Math.sin(a)*rv;
    if(i===0)stX.moveTo(px,py);else stX.lineTo(px,py);
  }
  stX.closePath();stX.fill();
  stX.restore();
}

// ════════════════════════════════════════
// 툴 동작
// ════════════════════════════════════════
function startClaw(x,y){if(inMB(x,y))slashPath=[{x,y}];}
function moveClaw(x,y){if(slashPath&&inMB(x,y)){slashPath.push({x,y});damage(0.5,'claw');}}
function endClaw(){if(slashPath&&slashPath.length>=2)applySlash(slashPath);slashPath=null;}

function doBomb(x,y){
  if(!inMB(x,y))return;
  radialDisplace(x,y,40,15);
  scorch(x,y,rndI(28,45));
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
  if(flameAcc>8&&inMB(x,y)){
    scorch(x,y,rndI(10,18));
    sparks.push({x,y,vx:rnd(-1,1),vy:rnd(-3,-0.5),life:1,sz:rndI(6,12),
      col:Math.random()<0.6?'#ff8800':'#ffee00',fire:true});
    flameAcc=0;
  }
  damage(0.35,'flame');flamePrev={x,y};
}

function doFist(x,y){
  if(!inMB(x,y))return;
  radialDisplace(x,y,42,16);
  for(var i=0;i<6;i++){
    var a=rnd(0,Math.PI*2);
    sparks.push({x,y,vx:Math.cos(a)*rnd(3,8),vy:Math.sin(a)*rnd(3,8)-1,
      life:1,sz:rnd(2,6),col:i%2===0?'#ffffff':'#ccaa88'});
  }
  damage(rndI(13,20),'fist');doShake(26);showBubble('fist');
}

// ════════════════════════════════════════
// HP & 데미지
// ════════════════════════════════════════
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
    var r=rndI(14+s*4,24+s*7);
    radialDisplace(p.x,p.y,r,rndI(8+s*2,13+s*3));
  }
}

function triggerDeath(){
  for(var i=0;i<10;i++){
    radialDisplace(rnd(MB.x+20,MB.x+MB.w-20),rnd(MB.y+20,MB.y+MB.h*0.85),rndI(20,42),rndI(12,20));
  }
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

// ════════════════════════════════════════
// 화면 내용
// ════════════════════════════════════════
var SCL=['#3d6bb5','#5a4a9a','#7a2555','#200010','#000000'];
function drawScreen(){
  ctx.fillStyle=SCL[Math.min(stage,4)];
  ctx.fillRect(SR.x,SR.y,SR.w,SR.h);
  if(stage>=5)return;
  ctx.fillStyle='rgba(255,255,255,0.88)';ctx.fillRect(SR.x,SR.y,SR.w,Math.round(SR.h*0.085));
  var fs=Math.max(8,Math.round(SR.w*0.024));
  ctx.fillStyle='#000';ctx.font='bold '+fs+'px sans-serif';ctx.textBaseline='middle';
  ctx.fillText('🍎',SR.x+Math.round(SR.w*0.022),SR.y+Math.round(SR.h*0.043));
  ctx.font=Math.round(fs*0.8)+'px sans-serif';
  ['Finder','File','Edit','View'].forEach(function(m,i){ctx.fillText(m,SR.x+Math.round(SR.w*(0.065+i*0.065)),SR.y+Math.round(SR.h*0.043));});
  var dh=Math.round(SR.h*0.10),dw=Math.round(SR.w*0.34);
  var dx=SR.x+Math.round((SR.w-dw)/2),dy=SR.y+SR.h-dh-Math.round(SR.h*0.015);
  ctx.fillStyle='rgba(255,255,255,0.15)';ctx.fillRect(dx,dy,dw,dh);
  ctx.font=Math.round(dh*0.6)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ['🔍','📁','🌐','✉️','🎵'].forEach(function(ic,i){ctx.fillText(ic,dx+Math.round(dw/6*(i+1)),dy+Math.round(dh*0.5));});
  ctx.textAlign='left';ctx.textBaseline='alphabetic';
}

// ════════════════════════════════════════
// 렌더 루프 — 클리핑 순서 엄수
// ════════════════════════════════════════
function draw(){
  requestAnimationFrame(draw);
  updShake();
  ctx.clearRect(0,0,CW,CH);

  // [필수 순서] save → clip(MB고정) → translate(shake) → draw → restore
  ctx.save();
  ctx.beginPath();ctx.rect(MB.x,MB.y,MB.w,MB.h);  // 맥북 고정 좌표 클립
  ctx.clip();
  ctx.translate(shakeX,shakeY);                     // shake는 클립 안에서

  // 화면 내용 (macbook 뒤)
  ctx.save();
  ctx.beginPath();ctx.rect(SR.x,SR.y,SR.w,SR.h);ctx.clip();
  drawScreen();ctx.restore();

  // macbook (displacement 적용)
  if(macLoaded){
    var br=[1,0.98,0.93,0.87,0.74,0.52][Math.min(stage,5)];
    ctx.filter='brightness('+br+')';
    ctx.drawImage(mbC,0,0);
    ctx.filter='none';
  }
  // 스탬프 레이어 (구멍, 그을음)
  ctx.drawImage(stC,0,0);

  ctx.restore(); // ← 여기서 restore, 이 뒤 파티클은 클립 밖

  // 파티클 (맥북 밖에도 날아갈 수 있음)
  sparks=sparks.filter(function(p){
    p.x+=p.vx;p.y+=p.vy;
    if(p.seed){p.vy+=0.4;p.vx*=0.96;}
    else if(p.fire){p.vy+=0.03;}
    else{p.vy+=0.2;}
    p.life-=p.fire?0.04:0.06;
    if(p.life<=0)return false;
    ctx.globalAlpha=p.life;
    ctx.fillStyle=p.col;
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
    ctx.globalAlpha=1;
    return true;
  });
}

// ════════════════════════════════════════
// 재시작 & 툴 & 이벤트
// ════════════════════════════════════════
function fullReset(){
  hp=100;stage=0;sparks=[];flamePrev=null;slashPath=null;
  shakeX=0;shakeY=0;shakeAmt=0;flameAcc=0;
  hpBar.style.width='100%';hpBar.style.background='linear-gradient(90deg,#4caf50,#8bc34a)';
  hpNum.textContent='100';
  finalMsg.classList.remove('show');bubbleEl.classList.remove('show');
  if(macLoaded)initMb();
}
restartBtn.addEventListener('click',fullReset);

var TB={claw:document.getElementById('btn-claw'),bomb:document.getElementById('btn-bomb'),
        flame:document.getElementById('btn-flame'),fist:document.getElementById('btn-fist')};
Object.keys(TB).forEach(function(k){
  TB[k].addEventListener('click',function(){
    tool=k;Object.keys(TB).forEach(function(j){TB[j].classList.toggle('selected',j===k);});
    flamePrev=null;
  });
  TB[k].addEventListener('mousedown',function(e){e.stopPropagation();});
});
document.addEventListener('keydown',function(e){
  var k=e.key.toLowerCase();
  if(k==='q')TB.claw.click();if(k==='w')TB.bomb.click();
  if(k==='e')TB.flame.click();if(k==='r')TB.fist.click();
});

document.addEventListener('mousemove',function(e){
  cursorEl.style.left=e.clientX+'px';cursorEl.style.top=e.clientY+'px';
});

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
