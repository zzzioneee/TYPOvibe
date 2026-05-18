'use strict';

// ── 맥북 비율 ──
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
var restartBtn=document.getElementById('restart-btn');

// ── 오프스크린 캔버스들 ──
// mbCanvas: macbook.png 픽셀 데이터 보관 (displacement 소스)
var mbCanvas=document.createElement('canvas');
var mbCtx=mbCanvas.getContext('2d');
// dispCanvas: displacement 결과 (변형된 맥북)
var dispCanvas=document.createElement('canvas');
var dispCtx=dispCanvas.getContext('2d');
// stampCanvas: 스탬프 누적 레이어
var stampCanvas=document.createElement('canvas');
var stampCtx=stampCanvas.getContext('2d');

// ── 이미지 ──
var macImg=new Image(); macImg.src='macbook.png'; var macLoaded=false;
macImg.onload=function(){
  macLoaded=true;
  mbCanvas.width=dispCanvas.width=CW;
  mbCanvas.height=dispCanvas.height=CH;
  mbCtx.drawImage(macImg,0,0,CW,CH);
  dispCtx.drawImage(macImg,0,0,CW,CH);
};

// ── 크기 ──
var CW=0,CH=0;
var SR={x:0,y:0,w:0,h:0};
var MB={x:0,y:0,w:0,h:0};

function resize(){
  var vw=window.innerWidth,vh=window.innerHeight;
  var ratio=MB_W/MB_H,w,h;
  if(vw/vh>ratio){h=vh*0.88;w=h*ratio;}else{w=vw*0.88;h=w/ratio;}
  CW=Math.round(w);CH=Math.round(h);
  canvas.width=CW;canvas.height=CH;
  canvas.style.width=CW+'px';canvas.style.height=CH+'px';
  SR.x=Math.round(CW*SCREEN_X1);SR.y=Math.round(CH*SCREEN_Y1);
  SR.w=Math.round(CW*(SCREEN_X2-SCREEN_X1));
  SR.h=Math.round(CH*(SCREEN_Y2-SCREEN_Y1));
  MB.x=Math.round(CW*0.055);MB.y=Math.round(CH*0.048);
  MB.w=Math.round(CW*0.854);MB.h=Math.round(CH*0.909);
  stampCanvas.width=CW;stampCanvas.height=CH;
  mbCanvas.width=dispCanvas.width=CW;
  mbCanvas.height=dispCanvas.height=CH;
  if(macLoaded){
    mbCtx.drawImage(macImg,0,0,CW,CH);
    dispCtx.drawImage(macImg,0,0,CW,CH);
  }
}
resize();
window.addEventListener('resize',function(){resize();reset();});

function toCanvas(cx,cy){
  var r=canvas.getBoundingClientRect();
  return{x:(cx-r.left)*(CW/r.width),y:(cy-r.top)*(CH/r.height)};
}
function rnd(a,b){return a+Math.random()*(b-a);}
function rndInt(a,b){return Math.floor(rnd(a,b+1));}

// ── 상태 ──
var hp=100,stage=0;
var isDown=false,tool='claw',flamePrev=null;
var shakeAmt=0;
var sparkParts=[];
var MSGS={
  claw: ['으드득!!','찍찍!!','발톱 어택!!'],
  bomb: ['쾅!!','폭발이다!!','씨앗 폭탄!!'],
  flame:['불이야!!','화염방사!!','타버려!!'],
  fist: ['주먹이다!!','햄찌 어퍼컷!!','쾅쾅쾅!!'],
};

// ══════════════════════════════════════
// 데미지 스탬프 함수들 (선 그리기 없음)
// ══════════════════════════════════════

// 입체적 구멍 스탬프 (주먹/폭탄용)
// cx,cy = 중심, r = 반경
function stampHole(cx,cy,r){
  var c=stampCtx;
  // 1. 검은 구멍 본체
  c.save();
  var hole=c.createRadialGradient(cx-r*0.25,cy-r*0.25,r*0.05, cx,cy,r);
  hole.addColorStop(0,'rgba(0,0,0,0.95)');
  hole.addColorStop(0.6,'rgba(10,5,0,0.9)');
  hole.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=hole;
  c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();

  // 2. 상단 하이라이트 (빛이 위에서 오는 것처럼)
  var hi=c.createRadialGradient(cx-r*0.3,cy-r*0.4,0, cx-r*0.3,cy-r*0.3,r*0.7);
  hi.addColorStop(0,'rgba(255,255,255,0.18)');
  hi.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=hi;
  c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();

  // 3. 외곽 테두리 — 부서진 금속 느낌
  var ring=c.createRadialGradient(cx,cy,r*0.75, cx,cy,r*1.15);
  ring.addColorStop(0,'rgba(180,160,140,0)');
  ring.addColorStop(0.4,'rgba(200,180,160,0.55)');
  ring.addColorStop(0.7,'rgba(80,60,50,0.5)');
  ring.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=ring;
  c.beginPath();c.arc(cx,cy,r*1.15,0,Math.PI*2);c.fill();

  // 4. 불규칙 가장자리 (균열 없이 울퉁불퉁한 테두리)
  c.fillStyle='rgba(0,0,0,0.7)';
  var nPts=rndInt(8,14);
  c.beginPath();
  for(var i=0;i<nPts;i++){
    var a=(i/nPts)*Math.PI*2;
    var rv=r*(0.85+Math.random()*0.35);
    var px=cx+Math.cos(a)*rv, py=cy+Math.sin(a)*rv;
    if(i===0)c.moveTo(px,py);else c.lineTo(px,py);
  }
  c.closePath();
  c.globalCompositeOperation='destination-out';
  c.fill();
  c.globalCompositeOperation='source-over';
  c.restore();
}

// 함몰(dent) 스탬프 (주먹으로 눌린 효과)
function stampDent(cx,cy,r){
  var c=stampCtx;
  c.save();
  // 어두운 함몰 원
  var dent=c.createRadialGradient(cx,cy,0, cx,cy,r*1.2);
  dent.addColorStop(0,'rgba(0,0,0,0.75)');
  dent.addColorStop(0.5,'rgba(20,15,10,0.45)');
  dent.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=dent;
  c.beginPath();c.arc(cx,cy,r*1.2,0,Math.PI*2);c.fill();

  // 상단 좌측 하이라이트
  var hi=c.createRadialGradient(cx-r*0.35,cy-r*0.4,0, cx-r*0.2,cy-r*0.3,r*0.8);
  hi.addColorStop(0,'rgba(255,255,255,0.22)');
  hi.addColorStop(0.5,'rgba(255,255,255,0.08)');
  hi.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=hi;
  c.beginPath();c.arc(cx,cy,r*1.2,0,Math.PI*2);c.fill();

  // 하단 그림자
  var sh=c.createRadialGradient(cx+r*0.2,cy+r*0.3,0, cx+r*0.1,cy+r*0.2,r*0.9);
  sh.addColorStop(0,'rgba(0,0,0,0.4)');
  sh.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=sh;
  c.beginPath();c.arc(cx,cy,r*1.2,0,Math.PI*2);c.fill();

  // 금속 rim 반원
  var rim=c.createLinearGradient(cx-r,cy-r*0.5,cx+r,cy+r);
  rim.addColorStop(0,'rgba(220,210,200,0.4)');
  rim.addColorStop(0.4,'rgba(150,130,110,0.3)');
  rim.addColorStop(1,'rgba(20,15,10,0.2)');
  c.fillStyle=rim;
  c.beginPath();c.arc(cx,cy,r*0.3,0,Math.PI*2);c.fill();
  c.restore();
}

// 불 그을음 스탬프 (화염용)
function stampScorch(cx,cy,r){
  var c=stampCtx;
  c.save();
  var scorch=c.createRadialGradient(cx,cy,0,cx,cy,r);
  scorch.addColorStop(0,'rgba(5,3,0,0.92)');
  scorch.addColorStop(0.4,'rgba(15,8,0,0.65)');
  scorch.addColorStop(0.75,'rgba(30,15,0,0.35)');
  scorch.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=scorch;
  c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();

  // 가장자리 orange glow (불탄 테두리)
  var glow=c.createRadialGradient(cx,cy,r*0.5,cx,cy,r*0.95);
  glow.addColorStop(0,'rgba(0,0,0,0)');
  glow.addColorStop(0.7,'rgba(80,30,0,0.3)');
  glow.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=glow;
  c.beginPath();c.arc(cx,cy,r*0.95,0,Math.PI*2);c.fill();
  c.restore();
}

// ══════════════════════════════════════
// 픽셀 Displacement (발톱/전기톱)
// ══════════════════════════════════════
// 드래그 경로를 저장해서 나중에 한번에 displacement 적용
var slashPaths=[]; // [{x,y}] 배열들
var currentSlash=null;

function startSlash(x,y){
  currentSlash=[{x,y}];
}
function addSlash(x,y){
  if(!currentSlash)return;
  currentSlash.push({x,y});
}
function endSlash(){
  if(!currentSlash||currentSlash.length<2){currentSlash=null;return;}
  applyDisplacement(currentSlash);
  currentSlash=null;
}

function applyDisplacement(path){
  if(!macLoaded||path.length<2)return;
  // mbCanvas에서 ImageData 읽기
  var imgData=mbCtx.getImageData(0,0,CW,CH);
  var data=imgData.data;
  var W=CW,H=CH;
  // 경로 각 세그먼트에 displacement 적용
  for(var pi=1;pi<path.length;pi++){
    var p0=path[pi-1],p1=path[pi];
    var dx=p1.x-p0.x,dy=p1.y-p0.y;
    var len=Math.hypot(dx,dy);
    if(len<1)continue;
    var nx=dy/len,ny=-dx/len; // 법선 벡터 (수직)
    var SHIFT=rndInt(6,12); // 밀어낼 픽셀 수
    var WIDTH=rndInt(2,5);  // 경로 두께

    // 경로를 따라 샘플링
    var steps=Math.ceil(len);
    for(var s=0;s<=steps;s++){
      var t=s/steps;
      var cx=Math.round(p0.x+dx*t);
      var cy=Math.round(p0.y+dy*t);
      // 법선 방향으로 WIDTH 범위 내 픽셀 처리
      for(var w=-WIDTH;w<=WIDTH;w++){
        var px=cx+Math.round(nx*w);
        var py=cy+Math.round(ny*w);
        if(px<0||px>=W||py<0||py>=H)continue;
        // 오른쪽 픽셀을 SHIFT만큼 오른쪽으로, 왼쪽 픽셀을 왼쪽으로
        var side=w>=0?1:-1;
        var destX=px+Math.round(nx*side*SHIFT);
        var destY=py+Math.round(ny*side*SHIFT);
        if(destX<0||destX>=W||destY<0||destY>=H)continue;
        var srcIdx=(py*W+px)*4;
        var dstIdx=(destY*W+destX)*4;
        data[dstIdx]  =data[srcIdx];
        data[dstIdx+1]=data[srcIdx+1];
        data[dstIdx+2]=data[srcIdx+2];
        data[dstIdx+3]=data[srcIdx+3];
        // 원래 위치 검게 (틈새)
        data[srcIdx]=0;data[srcIdx+1]=0;data[srcIdx+2]=0;data[srcIdx+3]=220;
      }
    }
  }
  // 변형된 데이터를 dispCanvas에 반영
  dispCtx.putImageData(imgData,0,0);
  // mbCanvas도 업데이트 (누적)
  mbCtx.putImageData(imgData,0,0);

  // 스파크 이펙트
  for(var i=0;i<path.length;i+=3){
    var sp=path[i];
    for(var j=0;j<4;j++){
      sparkParts.push({
        x:sp.x+rnd(-8,8),y:sp.y+rnd(-8,8),
        vx:rnd(-3,3),vy:rnd(-4,0),
        life:1,sz:rnd(2,5),
        col:Math.random()<0.5?'#ffdd44':'#ff8800',
      });
    }
  }
}

// ══════════════════════════════════════
// 툴 동작
// ══════════════════════════════════════
function doClaw(x,y,isDrag){
  if(!isDrag){
    startSlash(x,y);
    stampDent(x,y,rnd(20,35));
  } else {
    addSlash(x,y);
  }
  damage(isDrag?0.6:rnd(3,5),'claw');
  if(!isDrag)shake(8);
}

function doClawEnd(){
  endSlash();
}

function doBomb(x,y){
  var r=rnd(28,52);
  stampHole(x,y,r);
  // 씨앗 파편 파티클
  for(var i=0;i<rndInt(12,18);i++){
    var ang=(i/18)*Math.PI*2+rnd(-0.2,0.2);
    sparkParts.push({
      x,y,vx:Math.cos(ang)*rnd(4,12),vy:Math.sin(ang)*rnd(4,12)-rnd(0,4),
      life:1,sz:rnd(3,8),col:'#3a2200',seed:true,
    });
  }
  damage(rnd(10,16),'bomb');
  shake(20);
  showBubble('bomb');
}

var flameAcc=0; // 화염 누적 거리
function doFlame(x,y,isDrag){
  if(!isDrag){flamePrev={x,y};flameAcc=0;return;}
  if(!flamePrev)return;
  var dist=Math.hypot(x-flamePrev.x,y-flamePrev.y);
  flameAcc+=dist;
  // 일정 거리마다 그을음 스탬프
  if(flameAcc>12){
    stampScorch(x,y,rnd(16,28));
    flameAcc=0;
    // 불꽃 파티클
    sparkParts.push({
      x,y,vx:rnd(-2,2),vy:rnd(-4,-1),
      life:1,sz:rnd(8,20),col:Math.random()<0.5?'#ffee00':'#ff6600',fire:true,
    });
  }
  damage(0.4,'flame');
  flamePrev={x,y};
}

function doFist(x,y){
  var r=rnd(24,42);
  stampDent(x,y,r);
  stampHole(x,y,r*0.55); // 중심에 작은 구멍
  // 충격파 파티클
  for(var i=0;i<6;i++){
    var ang=rnd(0,Math.PI*2);
    sparkParts.push({
      x,y,vx:Math.cos(ang)*rnd(3,8),vy:Math.sin(ang)*rnd(3,8)-2,
      life:1,sz:rnd(4,9),col:'#ccb090',
    });
  }
  damage(rnd(13,20),'fist');
  shake(26);
  showBubble('fist');
}

// ══════════════════════════════════════
// HP & 데미지
// ══════════════════════════════════════
function damage(v,t){
  if(hp<=0)return;
  hp=Math.max(0,hp-v);
  hpBar.style.width=hp+'%';
  hpNum.textContent=Math.round(hp);
  if(hp>60)hpBar.style.background='linear-gradient(90deg,#4caf50,#8bc34a)';
  else if(hp>30)hpBar.style.background='linear-gradient(90deg,#ff9800,#ffc107)';
  else hpBar.style.background='linear-gradient(90deg,#f44336,#e91e63)';
  var ns=hp>75?0:hp>50?1:hp>30?2:hp>10?3:hp>0?4:5;
  if(ns!==stage){stage=ns;autoBezelDamage(stage);}
  if(hp<=0)triggerDeath();
  if(t&&Math.random()<0.2)showBubble(t);
}

// HP 단계별 베젤 자동 데미지
function autoBezelDamage(s){
  var pts=[
    {x:rnd(MB.x+5,SR.x-5),                y:rnd(SR.y,SR.y+SR.h)},
    {x:rnd(SR.x+SR.w+5,MB.x+MB.w-5),      y:rnd(SR.y,SR.y+SR.h)},
    {x:rnd(MB.x+MB.w*0.2,MB.x+MB.w*0.8),  y:rnd(MB.y+5,SR.y-5)},
    {x:rnd(MB.x+MB.w*0.1,MB.x+MB.w*0.9),  y:rnd(SR.y+SR.h+5,MB.y+MB.h*0.75)},
  ];
  for(var i=0;i<s+1;i++){
    var p=pts[i%pts.length];
    var r=rnd(12+s*6,25+s*10);
    if(i%2===0) stampHole(p.x,p.y,r);
    else        stampDent(p.x,p.y,r*1.3);
  }
}

function triggerDeath(){
  for(var i=0;i<10;i++){
    var x=rnd(MB.x+20,MB.x+MB.w-20),y=rnd(MB.y+20,MB.y+MB.h-20);
    stampHole(x,y,rnd(20,50));
  }
  showBubble('fist'); bubbleEl.textContent='🐹 개박살!!';
  setTimeout(function(){finalMsg.classList.add('show');},1200);
}

function showBubble(t){
  var m=MSGS[t]||['찍찍!!'];
  bubbleEl.textContent=m[rndInt(0,m.length-1)];
  bubbleEl.classList.add('show');
  clearTimeout(showBubble._t);
  showBubble._t=setTimeout(function(){bubbleEl.classList.remove('show');},1500);
}

function shake(v){shakeAmt=Math.max(shakeAmt,v);}
function getShake(){
  if(shakeAmt<0.5)return{x:0,y:0};
  var s={x:rnd(-shakeAmt,shakeAmt),y:rnd(-shakeAmt,shakeAmt)};
  shakeAmt*=0.7;return s;
}

// ══════════════════════════════════════
// 맥OS 바탕화면
// ══════════════════════════════════════
var screenColors=['#4a7ec7','#7060b0','#903060','#300010','#050005'];
function drawDesktop(){
  var sx=SR.x,sy=SR.y,sw=SR.w,sh=SR.h;
  var col=screenColors[Math.min(stage,4)];
  ctx.fillStyle=col;ctx.fillRect(sx,sy,sw,sh);
  if(stage>=5)return;
  // 메뉴바
  ctx.fillStyle='rgba(255,255,255,0.85)';ctx.fillRect(sx,sy,sw,sh*0.085);
  var fs=Math.max(8,sw*0.024);
  ctx.fillStyle='rgba(0,0,0,0.85)';
  ctx.font='bold '+fs+'px sans-serif';ctx.textBaseline='middle';
  ctx.fillText('🍎',sx+sw*0.022,sy+sh*0.043);
  ctx.font=(fs*0.8)+'px sans-serif';
  ['Finder','File','Edit','View'].forEach(function(m,i){ctx.fillText(m,sx+sw*(0.065+i*0.065),sy+sh*0.043);});
  // 독
  var dh=sh*0.11,dw=sw*0.36,dx=sx+(sw-dw)/2,dy=sy+sh-dh-sh*0.015;
  ctx.fillStyle='rgba(255,255,255,0.18)';
  ctx.beginPath();ctx.roundRect(dx,dy,dw,dh,dh*0.35);ctx.fill();
  ctx.font=(dh*0.65)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ['🔍','📁','🌐','✉️','🎵'].forEach(function(ic,i){ctx.fillText(ic,dx+dw/6*(i+1),dy+dh*0.5);});
  ctx.textAlign='left';ctx.textBaseline='alphabetic';
}

// ══════════════════════════════════════
// 렌더 루프
// ══════════════════════════════════════
function draw(){
  requestAnimationFrame(draw);
  var sh=getShake();
  ctx.clearRect(0,0,CW,CH);
  ctx.save();
  ctx.translate(sh.x,sh.y);

  // 1. 화면 (맥북 뒤)
  ctx.save();
  ctx.beginPath();ctx.rect(SR.x,SR.y,SR.w,SR.h);ctx.clip();
  drawDesktop();
  ctx.restore();

  // 2. macbook.png (변형된 버전 = dispCanvas)
  if(macLoaded){
    var br=[1,0.98,0.94,0.88,0.76,0.55][Math.min(stage,5)];
    ctx.filter='brightness('+br+')';
    ctx.drawImage(dispCanvas,0,0);
    ctx.filter='none';
  }

  // 3. 스탬프 레이어 (구멍/함몰 누적) — macbook 위에
  ctx.drawImage(stampCanvas,0,0);

  ctx.restore();

  // 4. 파티클 (shake 없이)
  sparkParts=sparkParts.filter(function(p){
    p.x+=p.vx;p.y+=p.vy;
    if(p.seed){p.vy+=0.4;p.vx*=0.96;}
    else if(p.fire){p.vy+=0.05;p.vx*=0.98;}
    else{p.vy+=0.15;}
    p.life-=p.fire?0.04:0.05;
    if(p.life<=0)return false;
    ctx.globalAlpha=p.life;
    if(p.fire){
      var g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.sz*p.life);
      g.addColorStop(0,p.col);g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;
    } else {
      ctx.fillStyle=p.col;
    }
    ctx.beginPath();
    if(p.seed)ctx.ellipse(p.x,p.y,p.sz*0.35,p.sz*0.6,p.vx*0.3,0,Math.PI*2);
    else ctx.arc(p.x,p.y,p.sz*p.life*0.5,0,Math.PI*2);
    ctx.fill();
    ctx.globalAlpha=1;
    return true;
  });
}

// ── 재시작 ──
function reset(){
  hp=100;stage=0;sparkParts=[];flamePrev=null;currentSlash=null;shakeAmt=0;
  hpBar.style.width='100%';hpBar.style.background='linear-gradient(90deg,#4caf50,#8bc34a)';
  hpNum.textContent='100';
  finalMsg.classList.remove('show');bubbleEl.classList.remove('show');
  stampCtx.clearRect(0,0,CW,CH);
  if(macLoaded){
    mbCtx.clearRect(0,0,CW,CH);mbCtx.drawImage(macImg,0,0,CW,CH);
    dispCtx.clearRect(0,0,CW,CH);dispCtx.drawImage(macImg,0,0,CW,CH);
  }
}
restartBtn.addEventListener('click',reset);

// ── 툴 선택 ──
var toolBtns={claw:document.getElementById('btn-claw'),bomb:document.getElementById('btn-bomb'),
  flame:document.getElementById('btn-flame'),fist:document.getElementById('btn-fist')};
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
  cursorEl.style.left=e.clientX+'px';cursorEl.style.top=e.clientY+'px';
});

// ── 이벤트 ──
function toC(e){var t=e.touches?e.touches[0]:e;return toCanvas(t.clientX,t.clientY);}
function act(x,y,isClick){
  if(hp<=0)return;
  if(tool==='claw') doClaw(x,y,!isClick);
  else if(tool==='bomb'&&isClick) doBomb(x,y);
  else if(tool==='flame') doFlame(x,y,!isClick);
  else if(tool==='fist'&&isClick) doFist(x,y);
}

canvas.addEventListener('mousedown',function(e){
  isDown=true;flamePrev=null;
  cursorEl.src='Hamster-punch.png';
  var p=toC(e);act(p.x,p.y,true);
});
canvas.addEventListener('mousemove',function(e){
  if(!isDown)return;var p=toC(e);act(p.x,p.y,false);
});
document.addEventListener('mouseup',function(){
  isDown=false;flamePrev=null;
  if(tool==='claw')doClawEnd();
  cursorEl.src='Hamster.png';
});
canvas.addEventListener('touchstart',function(e){
  e.preventDefault();isDown=true;flamePrev=null;var p=toC(e);act(p.x,p.y,true);
},{passive:false});
canvas.addEventListener('touchmove',function(e){
  e.preventDefault();if(!isDown)return;var p=toC(e);act(p.x,p.y,false);
},{passive:false});
document.addEventListener('touchend',function(){
  isDown=false;flamePrev=null;
  if(tool==='claw')doClawEnd();
});

draw();
