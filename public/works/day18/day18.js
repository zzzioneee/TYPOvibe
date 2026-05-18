'use strict';

// ── 맥북 원본 비율 ──
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

// ── 오프스크린: macbook 픽셀 데이터 보관 ──
var mbC=document.createElement('canvas'); var mbX=mbC.getContext('2d',{willReadFrequently:true});
// 스탬프 누적 레이어 (검정 구멍, 흰 테두리)
var stC=document.createElement('canvas'); var stX=stC.getContext('2d');

// ── 이미지 로드 ──
var macImg=new Image(); macImg.src='macbook.png'; var macLoaded=false;
macImg.onload=function(){
  macLoaded=true;
  mbC.width=stC.width=CW; mbC.height=stC.height=CH;
  mbX.drawImage(macImg,0,0,CW,CH);
};

// ── 크기 ──
var CW=0,CH=0;
var SR={x:0,y:0,w:0,h:0};  // 화면 영역
var MB={x:0,y:0,w:0,h:0};  // 맥북 bounding box

function resize(){
  var vw=window.innerWidth,vh=window.innerHeight;
  var ratio=MB_W/MB_H,w,h;
  if(vw/vh>ratio){h=vh*0.88;w=h*ratio;}else{w=vw*0.88;h=w/ratio;}
  CW=Math.round(w); CH=Math.round(h);
  canvas.width=CW; canvas.height=CH;
  canvas.style.width=CW+'px'; canvas.style.height=CH+'px';
  SR.x=Math.round(CW*SCREEN_X1); SR.y=Math.round(CH*SCREEN_Y1);
  SR.w=Math.round(CW*(SCREEN_X2-SCREEN_X1));
  SR.h=Math.round(CH*(SCREEN_Y2-SCREEN_Y1));
  MB.x=Math.round(CW*0.055); MB.y=Math.round(CH*0.048);
  MB.w=Math.round(CW*0.854); MB.h=Math.round(CH*0.909);
  mbC.width=stC.width=CW; mbC.height=stC.height=CH;
  if(macLoaded) mbX.drawImage(macImg,0,0,CW,CH);
}
resize();
window.addEventListener('resize',function(){resize();fullReset();});

function toCanvas(cx,cy){
  var r=canvas.getBoundingClientRect();
  return{x:(cx-r.left)*(CW/r.width),y:(cy-r.top)*(CH/r.height)};
}
function rnd(a,b){return a+Math.random()*(b-a);}
function rndInt(a,b){return Math.floor(rnd(a,b+1));}

// ── 상태 ──
var hp=100, stage=0;
var isDown=false, tool='claw', flamePrev=null;
var shakeX=0, shakeY=0, shakeAmt=0;
var sparkParts=[];
var slashPath=null;

var MSGS={
  claw: ['으드득!!','찢어버려!!','발톱 어택!!'],
  bomb: ['쾅!!','폭발이다!!','씨앗 폭탄!!'],
  flame:['불이야!!','화염방사!!','타버려!!'],
  fist: ['주먹이다!!','햄찌 어퍼컷!!','쾅쾅쾅!!'],
};

// ══════════════════════════════════════
// 핵심 1: Radial Displacement (주먹/폭탄)
// 타격 중심에서 픽셀을 바깥으로 밀어내고, 빈 중심을 각진 다각형 구멍으로 채움
// ══════════════════════════════════════
function radialDisplace(cx,cy,radius,pushDist){
  if(!macLoaded) return;
  cx=Math.round(cx); cy=Math.round(cy);
  var r=Math.round(radius);
  var pd=Math.round(pushDist);
  var x0=Math.max(0,cx-r-pd-2), y0=Math.max(0,cy-r-pd-2);
  var x1=Math.min(CW,cx+r+pd+2), y1=Math.min(CH,cy+r+pd+2);
  var w=x1-x0, h=y1-y0;
  if(w<=0||h<=0) return;

  var src=mbX.getImageData(x0,y0,w,h);
  var dst=mbX.createImageData(w,h);
  var sd=src.data, dd=dst.data;

  // 빈 공간으로 초기화 (검정)
  for(var i=0;i<dd.length;i+=4){dd[i]=0;dd[i+1]=0;dd[i+2]=0;dd[i+3]=255;}

  for(var py=0;py<h;py++){
    for(var px=0;px<w;px++){
      var wx=x0+px, wy=y0+py;
      var dx=wx-cx, dy=wy-cy;
      var dist=Math.sqrt(dx*dx+dy*dy);
      if(dist===0||dist>r) {
        // 반경 밖은 그대로 복사
        var si=(py*w+px)*4;
        dd[si]=sd[si]; dd[si+1]=sd[si+1]; dd[si+2]=sd[si+2]; dd[si+3]=sd[si+3];
        continue;
      }
      // 반경 안: 중심에서 바깥 방향으로 pushDist만큼 밀어냄
      var nx=dx/dist, ny=dy/dist;
      var srcX=Math.round(wx-nx*pd);
      var srcY=Math.round(wy-ny*pd);
      var spx=srcX-x0, spy=srcY-y0;
      if(spx>=0&&spx<w&&spy>=0&&spy<h){
        var si2=(spy*w+spx)*4;
        var di=(py*w+px)*4;
        dd[di]=sd[si2]; dd[di+1]=sd[si2+1]; dd[di+2]=sd[si2+2]; dd[di+3]=sd[si2+3];
      }
    }
  }
  mbX.putImageData(dst,x0,y0);

  // 빈 중심 = 각진 다각형 구멍
  stampAngledHole(cx,cy,Math.round(radius*0.55));
}

// 각진 다각형 구멍 (그라디언트 없음, 단색)
function stampAngledHole(cx,cy,r){
  var n=rndInt(6,9);
  stX.save();
  stX.beginPath();
  for(var i=0;i<n;i++){
    var a=(i/n)*Math.PI*2 + rnd(-0.25,0.25);
    var rv=r*rnd(0.7,1.0);
    var px=cx+Math.cos(a)*rv, py=cy+Math.sin(a)*rv;
    if(i===0)stX.moveTo(px,py);else stX.lineTo(px,py);
  }
  stX.closePath();
  stX.fillStyle='#000000';
  stX.fill();
  // 날카로운 흰색 테두리 1px
  stX.strokeStyle='#ffffff';
  stX.lineWidth=1;
  stX.stroke();
  stX.restore();
}

// ══════════════════════════════════════
// 핵심 2: 발톱 Linear Displacement
// 드래그 경로 법선 방향으로 픽셀을 최소 20~30px 양옆으로 쪼갬
// 틈새 = 순수 블랙
// ══════════════════════════════════════
function applySlashDisplace(path){
  if(!macLoaded||path.length<2) return;

  var SHIFT=rndInt(22,32); // 20~30px 이상
  var HALF_W=3; // 경로 양옆 처리 폭

  // 전체 캔버스 ImageData 읽기 (성능상 전체 한번)
  var imgData=mbX.getImageData(0,0,CW,CH);
  var data=imgData.data;

  for(var pi=1;pi<path.length;pi++){
    var p0=path[pi-1],p1=path[pi];
    var dx=p1.x-p0.x,dy=p1.y-p0.y;
    var len=Math.sqrt(dx*dx+dy*dy);
    if(len<1) continue;
    var nx=dy/len, ny=-dx/len; // 법선 (수직)

    var steps=Math.ceil(len*2);
    for(var s=0;s<=steps;s++){
      var t=s/steps;
      var cx=Math.round(p0.x+dx*t);
      var cy=Math.round(p0.y+dy*t);

      for(var w=-HALF_W;w<=HALF_W;w++){
        var px=cx+Math.round(nx*w);
        var py=cy+Math.round(ny*w);
        if(px<0||px>=CW||py<0||py>=CH) continue;

        // 오른쪽 픽셀 → SHIFT만큼 오른쪽으로
        // 왼쪽 픽셀 → SHIFT만큼 왼쪽으로
        for(var side=-1;side<=1;side+=2){
          var destX=px+Math.round(nx*side*SHIFT);
          var destY=py+Math.round(ny*side*SHIFT);
          if(destX<0||destX>=CW||destY<0||destY>=CH) continue;
          var si=(py*CW+px)*4;
          var di=(destY*CW+destX)*4;
          data[di]  =data[si];
          data[di+1]=data[si+1];
          data[di+2]=data[si+2];
          data[di+3]=data[si+3];
        }
        // 원래 위치 = 순수 블랙
        var bi=(py*CW+px)*4;
        data[bi]=0;data[bi+1]=0;data[bi+2]=0;data[bi+3]=255;
      }
    }
  }
  mbX.putImageData(imgData,0,0);

  // 스파크 파티클
  for(var i=0;i<path.length;i+=4){
    var sp=path[i];
    for(var j=0;j<3;j++){
      sparkParts.push({x:sp.x+rnd(-6,6),y:sp.y+rnd(-6,6),
        vx:rnd(-3,3),vy:rnd(-4,0),life:1,sz:rnd(2,4),
        col:Math.random()<0.5?'#ffffff':'#ffcc00'});
    }
  }
}

// ══════════════════════════════════════
// 툴 동작
// ══════════════════════════════════════

// 발톱: 드래그 경로 수집 → mouseup에서 displacement 적용
function startClaw(x,y){ slashPath=[{x,y}]; }
function moveClaw(x,y){ if(slashPath) slashPath.push({x,y}); damage(0.5,'claw'); }
function endClaw(){
  if(slashPath&&slashPath.length>=2) applySlashDisplace(slashPath);
  slashPath=null;
}

// 폭탄: radialDisplace + 구멍
function doBomb(x,y){
  var r=rndInt(28,48);
  radialDisplace(x,y,r,rndInt(12,18));
  // 씨앗 파편
  for(var i=0;i<rndInt(10,16);i++){
    var a=(i/16)*Math.PI*2+rnd(-0.2,0.2);
    sparkParts.push({x,y,vx:Math.cos(a)*rnd(4,12),vy:Math.sin(a)*rnd(4,12)-rnd(0,3),
      life:1,sz:rnd(3,7),col:'#3a2200',seed:true});
  }
  damage(rnd(10,16),'bomb');
  doShake(20);
  showBubble('bomb');
}

// 화염: 그을음 = 각진 단색 사각형 패치
var flameAcc=0;
function doFlame(x,y,isDrag){
  if(!isDrag){flamePrev={x,y};flameAcc=0;return;}
  if(!flamePrev)return;
  flameAcc+=Math.hypot(x-flamePrev.x,y-flamePrev.y);
  if(flameAcc>10){
    // 단색 그을음 패치 (원 없음, 불규칙 다각형)
    stX.save();
    stX.fillStyle='rgba(8,5,0,0.88)';
    var sz=rndInt(12,22);
    stX.beginPath();
    for(var i=0;i<6;i++){
      var a=(i/6)*Math.PI*2+rnd(-0.3,0.3);
      var rv=sz*rnd(0.6,1.0);
      var px=x+Math.cos(a)*rv,py=y+Math.sin(a)*rv;
      if(i===0)stX.moveTo(px,py);else stX.lineTo(px,py);
    }
    stX.closePath();stX.fill();stX.restore();
    // 불꽃 파티클
    sparkParts.push({x,y,vx:rnd(-1.5,1.5),vy:rnd(-3.5,-0.5),
      life:1,sz:rnd(6,14),col:Math.random()<0.6?'#ff8800':'#ffdd00',fire:true});
    flameAcc=0;
  }
  damage(0.4,'flame');
  flamePrev={x,y};
}

// 주먹: radialDisplace (더 큰 반경)
function doFist(x,y){
  var r=rndInt(30,50);
  radialDisplace(x,y,r,rndInt(14,20));
  // 충격 파티클
  for(var i=0;i<8;i++){
    var a=rnd(0,Math.PI*2);
    sparkParts.push({x,y,vx:Math.cos(a)*rnd(3,9),vy:Math.sin(a)*rnd(3,9)-1,
      life:1,sz:rnd(3,7),col:i%2===0?'#ffffff':'#ccaa88'});
  }
  damage(rnd(13,20),'fist');
  doShake(26);
  showBubble('fist');
}

// ══════════════════════════════════════
// HP & 데미지
// ══════════════════════════════════════
function damage(v,t){
  if(hp<=0) return;
  hp=Math.max(0,hp-v);
  hpBar.style.width=hp+'%';
  hpNum.textContent=Math.round(hp);
  if(hp>60) hpBar.style.background='linear-gradient(90deg,#4caf50,#8bc34a)';
  else if(hp>30) hpBar.style.background='linear-gradient(90deg,#ff9800,#ffc107)';
  else hpBar.style.background='linear-gradient(90deg,#f44336,#e91e63)';
  var ns=hp>75?0:hp>50?1:hp>30?2:hp>10?3:hp>0?4:5;
  if(ns!==stage){stage=ns;autoBezelDamage(stage);}
  if(hp<=0) triggerDeath();
  if(t&&Math.random()<0.22) showBubble(t);
}

// HP 단계별 베젤 자동 데미지
function autoBezelDamage(s){
  // 베젤 4구역에 radialDisplace + stampAngledHole
  var zones=[
    function(){return{x:rnd(MB.x+10,SR.x-10),      y:rnd(SR.y+10,SR.y+SR.h-10)};},  // 좌
    function(){return{x:rnd(SR.x+SR.w+10,MB.x+MB.w-10),y:rnd(SR.y+10,SR.y+SR.h-10)};},// 우
    function(){return{x:rnd(SR.x+10,SR.x+SR.w-10), y:rnd(MB.y+10,SR.y-10)};},         // 상
    function(){return{x:rnd(SR.x+10,SR.x+SR.w-10), y:rnd(SR.y+SR.h+10,MB.y+MB.h*0.78)};}, // 하
  ];
  for(var i=0;i<s+1;i++){
    var p=zones[i%zones.length]();
    var r=rndInt(14+s*5,26+s*8);
    radialDisplace(p.x,p.y,r,rndInt(8+s*2,14+s*3));
  }
}

function triggerDeath(){
  for(var i=0;i<12;i++){
    var x=rnd(MB.x+20,MB.x+MB.w-20);
    var y=rnd(MB.y+20,MB.y+MB.h*0.85);
    radialDisplace(x,y,rndInt(20,45),rndInt(12,20));
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

function doShake(v){shakeAmt=Math.max(shakeAmt,v);}
function updateShake(){
  if(shakeAmt<0.5){shakeX=0;shakeY=0;shakeAmt=0;return;}
  shakeX=rnd(-shakeAmt,shakeAmt);
  shakeY=rnd(-shakeAmt,shakeAmt);
  shakeAmt*=0.72;
}

// ══════════════════════════════════════
// macOS 바탕화면 (단색, 그라디언트 없음)
// ══════════════════════════════════════
var screenColors=['#3d6bb5','#5a4a9a','#7a2555','#200010','#000000'];
function drawDesktop(){
  var sx=SR.x,sy=SR.y,sw=SR.w,sh=SR.h;
  ctx.fillStyle=screenColors[Math.min(stage,4)];
  ctx.fillRect(sx,sy,sw,sh);
  if(stage>=5) return;
  // 메뉴바
  ctx.fillStyle='rgba(255,255,255,0.88)';
  ctx.fillRect(sx,sy,sw,Math.round(sh*0.085));
  var fs=Math.max(8,Math.round(sw*0.024));
  ctx.fillStyle='#000';
  ctx.font='bold '+fs+'px sans-serif';ctx.textBaseline='middle';
  ctx.fillText('🍎',sx+Math.round(sw*0.022),sy+Math.round(sh*0.043));
  ctx.font=(Math.round(fs*0.8))+'px sans-serif';
  ['Finder','File','Edit','View'].forEach(function(m,i){
    ctx.fillText(m,sx+Math.round(sw*(0.065+i*0.065)),sy+Math.round(sh*0.043));
  });
  // 독 (단색 사각형)
  var dh=Math.round(sh*0.10),dw=Math.round(sw*0.34);
  var dx=sx+Math.round((sw-dw)/2),dy=sy+sh-dh-Math.round(sh*0.015);
  ctx.fillStyle='rgba(255,255,255,0.15)';
  ctx.fillRect(dx,dy,dw,dh);
  ctx.font=Math.round(dh*0.6)+'px sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ['🔍','📁','🌐','✉️','🎵'].forEach(function(ic,i){
    ctx.fillText(ic,dx+Math.round(dw/6*(i+1)),dy+Math.round(dh*0.5));
  });
  ctx.textAlign='left';ctx.textBaseline='alphabetic';
}

// ══════════════════════════════════════
// 렌더 루프 — 지시한 순서 엄수
// ══════════════════════════════════════
function draw(){
  requestAnimationFrame(draw);
  updateShake();

  ctx.clearRect(0,0,CW,CH);

  // [지시 순서 엄수]
  ctx.save();
  // 2. 맥북 고정 좌표 클리핑 (shake 전)
  ctx.beginPath();
  ctx.rect(MB.x,MB.y,MB.w,MB.h);
  // 3. 마스크 가두기
  ctx.clip();
  // 4. shake 적용
  ctx.translate(shakeX,shakeY);

  // 5-A. 화면 (macbook 뒤)
  ctx.save();
  ctx.beginPath();
  ctx.rect(SR.x,SR.y,SR.w,SR.h);
  ctx.clip();
  drawDesktop();
  ctx.restore();

  // 5-B. macbook (displacement 적용된 mbC)
  if(macLoaded){
    var br=[1,0.98,0.94,0.88,0.76,0.55][Math.min(stage,5)];
    ctx.filter='brightness('+br+')';
    ctx.drawImage(mbC,0,0);
    ctx.filter='none';
  }

  // 5-C. 스탬프 레이어 (각진 구멍, 그을음)
  ctx.drawImage(stC,0,0);

  // 6. 복원
  ctx.restore();

  // 파티클 (클리핑 밖 — 맥북 위에서 자연스럽게)
  sparkParts=sparkParts.filter(function(p){
    p.x+=p.vx; p.y+=p.vy;
    if(p.seed){p.vy+=0.4;p.vx*=0.96;}
    else if(p.fire){p.vy+=0.03;p.vx*=0.98;}
    else{p.vy+=0.18;}
    p.life-=p.fire?0.04:0.055;
    if(p.life<=0) return false;
    ctx.globalAlpha=p.life;
    ctx.fillStyle=p.col;
    if(p.fire){
      // 불꽃: 작은 단색 삼각형
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(rnd(0,Math.PI*2));
      var s=p.sz*p.life;
      ctx.beginPath();ctx.moveTo(0,-s);ctx.lineTo(s*0.6,s*0.6);ctx.lineTo(-s*0.6,s*0.6);ctx.closePath();
      ctx.fill();ctx.restore();
    } else if(p.seed){
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.vx*0.3);
      ctx.fillRect(-p.sz*0.35,-p.sz*0.6,p.sz*0.7,p.sz*1.2);
      ctx.restore();
    } else {
      ctx.fillRect(p.x-p.sz*0.5,p.y-p.sz*0.5,p.sz,p.sz);
    }
    ctx.globalAlpha=1;
    return true;
  });
}

// ── 재시작 ──
function fullReset(){
  hp=100;stage=0;sparkParts=[];flamePrev=null;slashPath=null;
  shakeX=0;shakeY=0;shakeAmt=0;flameAcc=0;
  hpBar.style.width='100%';
  hpBar.style.background='linear-gradient(90deg,#4caf50,#8bc34a)';
  hpNum.textContent='100';
  finalMsg.classList.remove('show');
  bubbleEl.classList.remove('show');
  stX.clearRect(0,0,CW,CH);
  if(macLoaded){mbX.clearRect(0,0,CW,CH);mbX.drawImage(macImg,0,0,CW,CH);}
}
restartBtn.addEventListener('click',fullReset);

// ── 툴 선택 ──
var toolBtns={
  claw:document.getElementById('btn-claw'),
  bomb:document.getElementById('btn-bomb'),
  flame:document.getElementById('btn-flame'),
  fist:document.getElementById('btn-fist'),
};
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
function toC(e){var t=e.touches?e.touches[0]:e;return toCanvas(t.clientX,t.clientY);}

canvas.addEventListener('mousedown',function(e){
  if(hp<=0)return;
  isDown=true;flamePrev=null;
  cursorEl.src='Hamster-punch.png';
  var p=toC(e);
  if(tool==='claw')startClaw(p.x,p.y);
  else if(tool==='bomb')doBomb(p.x,p.y);
  else if(tool==='flame')doFlame(p.x,p.y,false);
  else if(tool==='fist')doFist(p.x,p.y);
});
canvas.addEventListener('mousemove',function(e){
  if(!isDown||hp<=0)return;
  var p=toC(e);
  if(tool==='claw')moveClaw(p.x,p.y);
  else if(tool==='flame')doFlame(p.x,p.y,true);
});
document.addEventListener('mouseup',function(){
  if(!isDown)return;
  isDown=false;flamePrev=null;
  cursorEl.src='Hamster.png';
  if(tool==='claw')endClaw();
});
canvas.addEventListener('touchstart',function(e){
  e.preventDefault();if(hp<=0)return;
  isDown=true;flamePrev=null;
  var p=toC(e);
  if(tool==='claw')startClaw(p.x,p.y);
  else if(tool==='bomb')doBomb(p.x,p.y);
  else if(tool==='flame')doFlame(p.x,p.y,false);
  else if(tool==='fist')doFist(p.x,p.y);
},{passive:false});
canvas.addEventListener('touchmove',function(e){
  e.preventDefault();if(!isDown||hp<=0)return;
  var p=toC(e);
  if(tool==='claw')moveClaw(p.x,p.y);
  else if(tool==='flame')doFlame(p.x,p.y,true);
},{passive:false});
document.addEventListener('touchend',function(){
  if(!isDown)return;
  isDown=false;flamePrev=null;
  if(tool==='claw')endClaw();
});

draw();
