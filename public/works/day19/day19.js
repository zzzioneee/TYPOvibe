// Day 19 v2 — 똑똑, 울산에 자리 있나요?
// Leaflet.js 지도 + Canvas overlay + 철새 이동경로

// ── Leaflet 지도 초기화 ───────────────────────────
// 울산 태화강 좌표
const TAEHWA = { lat: 35.548, lng: 129.317 };

const map = L.map('map', {
  center: [TAEHWA.lat, TAEHWA.lng],
  zoom: 2,
  zoomControl: false,
  attributionControl: false,
  minZoom: 2, maxZoom: 12,
});

// CartoDB Dark Matter — 완전한 다크 지도 (무료)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap © CARTO',
  subdomains: 'abcd',
  maxZoom: 19,
}).addTo(map);

// 태화강 목적지 마커 제거

// ── Canvas 오버레이 ───────────────────────────────
const cvs = document.getElementById('cvs');
const ctx = cvs.getContext('2d');

function resizeCvs() {
  cvs.width  = window.innerWidth;
  cvs.height = window.innerHeight;
}
resizeCvs();
window.addEventListener('resize', resizeCvs);

// 위경도 → 화면 픽셀
function latLngToXY(lat, lng) {
  const pt = map.latLngToContainerPoint(L.latLng(lat, lng));
  return { x: pt.x, y: pt.y };
}

// ── 철새 실제 출발지 (자연사 데이터 기반) ────────
// ── 대륙별 네온 컬러 ──────────────────────────────
const REGION_COLOR = {
  russia:    { h:180, s:100, l:55 },  // 네온 시안
  mongolia:  { h:270, s:100, l:65 },  // 네온 퍼플
  china:     { h:45,  s:100, l:55 },  // 네온 옐로우
  japan:     { h:320, s:100, l:65 },  // 네온 핑크
  kamchatka: { h:160, s:100, l:55 },  // 네온 그린
  oceania:   { h:25,  s:100, l:60 },  // 네온 오렌지
};

// ── 철새 실제 출발지 (동아시아 flyway 기반) ──────
const ORIGINS = [
  // 러시아 극동 / 시베리아
  { lat:51.5,lng:128.0,r:'russia' },{ lat:54.0,lng:124.0,r:'russia' },{ lat:58.0,lng:130.0,r:'russia' },
  { lat:56.0,lng:118.0,r:'russia' },{ lat:53.0,lng:140.0,r:'russia' },{ lat:48.0,lng:135.0,r:'russia' },
  { lat:60.0,lng:120.0,r:'russia' },{ lat:62.0,lng:129.0,r:'russia' },{ lat:55.0,lng:109.0,r:'russia' },
  { lat:52.0,lng:103.0,r:'russia' },{ lat:57.0,lng:94.0, r:'russia' },{ lat:65.0,lng:142.0,r:'russia' },
  { lat:50.0,lng:150.0,r:'russia' },{ lat:45.0,lng:132.0,r:'russia' },{ lat:68.0,lng:135.0,r:'russia' },

  // 몽골
  { lat:48.0,lng:106.0,r:'mongolia' },{ lat:50.0,lng:100.0,r:'mongolia' },{ lat:46.0,lng:115.0,r:'mongolia' },
  { lat:47.0,lng:92.0, r:'mongolia' },{ lat:44.0,lng:111.0,r:'mongolia' },{ lat:49.0,lng:88.0, r:'mongolia' },

  // 중국 동북부 / 만주
  { lat:44.0,lng:124.0,r:'china' },{ lat:42.0,lng:119.0,r:'china' },{ lat:46.0,lng:130.0,r:'china' },
  { lat:40.0,lng:116.5,r:'china' },{ lat:38.0,lng:114.0,r:'china' },{ lat:43.0,lng:108.0,r:'china' },
  { lat:41.0,lng:123.0,r:'china' },{ lat:39.0,lng:121.0,r:'china' },{ lat:36.0,lng:120.0,r:'china' },
  { lat:32.0,lng:118.8,r:'china' },{ lat:30.6,lng:114.3,r:'china' },{ lat:34.0,lng:117.0,r:'china' },
  { lat:28.0,lng:116.0,r:'china' },{ lat:31.0,lng:121.4,r:'china' },

  // 일본
  { lat:39.7,lng:140.1,r:'japan' },{ lat:43.1,lng:141.4,r:'japan' },{ lat:37.5,lng:137.0,r:'japan' },
  { lat:35.0,lng:136.0,r:'japan' },{ lat:41.0,lng:145.0,r:'japan' },

  // 캄차카 / 오호츠크해 / 알래스카 (태평양 횡단 느낌)
  { lat:53.0,lng:158.7,r:'kamchatka' },{ lat:56.0,lng:163.0,r:'kamchatka' },
  { lat:51.0,lng:153.0,r:'kamchatka' },{ lat:59.0,lng:150.0,r:'kamchatka' },
  { lat:62.0,lng:168.0,r:'kamchatka' },{ lat:64.0,lng:175.0,r:'kamchatka' },
  { lat:66.0,lng:-168.0,r:'kamchatka' },{ lat:64.5,lng:-158.0,r:'kamchatka' },
  { lat:61.0,lng:-150.0,r:'kamchatka' },{ lat:58.0,lng:-136.0,r:'kamchatka' },
  { lat:55.0,lng:-130.0,r:'kamchatka' },

  // 호주 / 뉴질랜드
  { lat:-27.5,lng:153.0,r:'oceania' },{ lat:-33.9,lng:151.2,r:'oceania' },
  { lat:-36.9,lng:174.8,r:'oceania' },{ lat:-37.8,lng:144.9,r:'oceania' },
  { lat:-25.0,lng:130.0,r:'oceania' },
];

// ── 파라미터 ─────────────────────────────────────
const PARAMS = { count:200, speed:1.0, birdSize:1.0, flock:3 };

// ── SVG 새 ───────────────────────────────────────
const BIRD_FILES=['noun-bird-13996.svg','noun-bird-2533760.svg','noun-bird-8046736.svg','noun-bird-8046737.svg','noun-bird-8046739.svg'];
const birdImgs=BIRD_FILES.map(f=>{const i=new Image();i.src=`./${f}`;return i;});
// 색상별 새 캐시 (birdIdx + sz + hsl 조합)
const birdCache={};
function getBird(idx, sz, col){
  const k=`${idx}_${sz}_${col.h}`;
  if(birdCache[k]) return birdCache[k];
  const img=birdImgs[idx%birdImgs.length];
  if(!img.complete||!img.naturalWidth) return null;
  const oc=document.createElement('canvas');oc.width=oc.height=sz;
  const c=oc.getContext('2d');
  c.drawImage(img,0,0,sz,sz);
  c.globalCompositeOperation='source-in';
  c.fillStyle=`hsl(${col.h},${col.s}%,${col.l+15}%)`;
  c.fillRect(0,0,sz,sz);
  return birdCache[k]=oc;
}

// ── 유틸 ─────────────────────────────────────────
function rnd(a,b){return a+Math.random()*(b-a);}

// CatmullRom 보간
function crPoint(pts,t){
  const n=pts.length-1;
  const seg=Math.min(Math.floor(t*n),n-1);
  const u=t*n-seg;
  const p0=pts[Math.max(0,seg-1)],p1=pts[seg],p2=pts[Math.min(n,seg+1)],p3=pts[Math.min(n,seg+2)];
  return {
    x:.5*((2*p1.x)+(-p0.x+p2.x)*u+(2*p0.x-5*p1.x+4*p2.x-p3.x)*u*u+(-p0.x+3*p1.x-3*p2.x+p3.x)*u*u*u),
    y:.5*((2*p1.y)+(-p0.y+p2.y)*u+(2*p0.y-5*p1.y+4*p2.y-p3.y)*u*u+(-p0.y+3*p1.y-3*p2.y+p3.y)*u*u*u),
  };
}
function crAngle(pts,t){
  const a=crPoint(pts,Math.max(0,t-.003)),b=crPoint(pts,Math.min(1,t+.003));
  return Math.atan2(b.y-a.y,b.x-a.x);
}

// ── 트랙 데이터 ───────────────────────────────────
let tracks=[];

function buildTrack(origin, idx) {
  const col = REGION_COLOR[origin.r] || REGION_COLOR.russia;
  const n = PARAMS.flock;
  // flock: 같은 경로 위에 n마리, t 간격으로 줄지어 이동
  const members = Array.from({length: n}, (_, k) => ({
    t: (rnd(0,1) + k / n * 0.15) % 1,
    scale: 0.7,
  }));
  return {
    origin, col, members,
    spd: rnd(.0003,.0008),
    birdIdx: idx%5,
    liftRatio:  rnd(.06,.18),
    curveRatio: rnd(.12,.38) * (Math.random()>.5?1:-1),
  };
}

function init(){
  const N=PARAMS.count;
  tracks=[];
  for(let i=0;i<N;i++){
    const origin = ORIGINS[i % ORIGINS.length];
    const jitteredOrigin = {
      ...origin,
      lat: origin.lat + rnd(-4, 4),
      lng: origin.lng + rnd(-6, 6),
    };
    tracks.push(buildTrack(jitteredOrigin, i));
  }
}
init();

// ── 경로 포인트 계산 (매 프레임, 지도 zoom에 따라 픽셀 바뀜) ──
function getPathPoints(track) {
  const s = latLngToXY(track.origin.lat, track.origin.lng);
  const d = latLngToXY(TAEHWA.lat, TAEHWA.lng);
  const dist = Math.hypot(d.x-s.x, d.y-s.y);
  const perp = Math.atan2(d.y-s.y, d.x-s.x) + Math.PI/2;
  // 고정된 비율 사용 (매 프레임 rnd() 호출 금지)
  const lift  = dist * track.liftRatio;
  const curve = track.curveRatio * dist;
  return [
    s,
    { x:s.x+(d.x-s.x)*.25+Math.cos(perp)*lift*.5,  y:s.y+(d.y-s.y)*.25+Math.sin(perp)*lift*.5 },
    { x:(s.x+d.x)/2+Math.cos(perp)*curve,            y:(s.y+d.y)/2+Math.sin(perp)*curve },
    { x:s.x+(d.x-s.x)*.75+Math.cos(perp)*lift*.25,  y:s.y+(d.y-s.y)*.75+Math.sin(perp)*lift*.25 },
    d,
  ];
}

// 경로 샘플 캐시 (지도 이동/줌 시 재계산)
let pathCache = new Map();
let lastMapState = '';

function getMapState() {
  const c=map.getCenter(), z=map.getZoom();
  return `${c.lat.toFixed(4)},${c.lng.toFixed(4)},${z}`;
}

function getSampledPath(track, idx) {
  const state = getMapState();
  const key = `${idx}_${state}`;
  if (pathCache.has(key)) return pathCache.get(key);
  const pts = getPathPoints(track);
  const S = 60;
  const sampled = Array.from({length:S+1},(_,k)=>crPoint(pts,k/S));
  // 너무 커지면 오래된 거 제거
  if(pathCache.size>500) pathCache.clear();
  pathCache.set(key, {pts, sampled});
  return {pts, sampled};
}

// ── 그리기 ───────────────────────────────────────
function drawPath(sampled, col) {
  const n=sampled.length;
  const zoom = map.getZoom();
  const lw = Math.max(0.3, (zoom - 2) * 0.18);
  const dashOn  = Math.max(2, zoom * 0.6);
  const dashOff = Math.max(3, zoom * 1.0);

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.lineWidth = lw;
  ctx.setLineDash([dashOn, dashOff]);
  for(let i=0;i<n-1;i++){
    const p = i/(n-1);
    const L = col.l + p*18;  // 출발: 어둡게 → 도착: 밝게
    ctx.strokeStyle = `hsl(${col.h},${col.s}%,${L}%)`;
    ctx.beginPath();
    ctx.moveTo(sampled[i].x, sampled[i].y);
    ctx.lineTo(sampled[i+1].x, sampled[i+1].y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

function drawBird(x,y,angle,scale,birdIdx,alpha,col){
  const zoom = map.getZoom();
  const zoomScale = Math.max(0.15, (zoom - 2) * 0.22);
  const sz=Math.round(32*scale*PARAMS.birdSize*zoomScale);
  if(sz<4) return;
  const bmp=getBird(birdIdx,sz,col);
  if(!bmp)return;
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.translate(x,y);ctx.rotate(angle);
  ctx.drawImage(bmp,-sz/2,-sz/2);
  ctx.restore();
}

function drawHub(elapsed){
  const {x,y}=latLngToXY(TAEHWA.lat, TAEHWA.lng);
  // 글로우
  const g=ctx.createRadialGradient(x,y,0,x,y,50);
  g.addColorStop(0,'rgba(125,232,200,.35)');
  g.addColorStop(.5,'rgba(80,180,160,.12)');
  g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,50,0,Math.PI*2);ctx.fill();
  // 펄스
  for(let k=0;k<3;k++){
    const ph=((elapsed*.5+k*.33)%1);
    const r=6+ph*45,a=.55*(1-ph);
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
    ctx.strokeStyle=`hsla(${175+k*60},85%,65%,${a})`;
    ctx.lineWidth=1.2;ctx.stroke();
  }
}

// ── 애니메이션 ────────────────────────────────────
let elapsed=0, last=performance.now();

function animate(now){
  requestAnimationFrame(animate);
  const dt=Math.min((now-last)/1000,.05); last=now; elapsed+=dt;

  ctx.clearRect(0,0,cvs.width,cvs.height);

  // 경로
  tracks.forEach((tr,i)=>{
    const {sampled}=getSampledPath(tr,i);
    drawPath(sampled, tr.col);
  });

  // 허브 제거

  // 새들 (flock: 경로당 여러 마리 줄지어 이동)
  tracks.forEach((tr,i)=>{
    const {pts}=getSampledPath(tr,i);
    tr.members.forEach(m=>{
      m.t+=tr.spd*PARAMS.speed;
      if(m.t>1) m.t=0;
      const pos=crPoint(pts,m.t);
      const ang=crAngle(pts,m.t);
      const fi=.04,fo=.06;
      let a=1;
      if(m.t<fi) a=m.t/fi;
      else if(m.t>1-fo) a=(1-m.t)/fo;
      drawBird(pos.x,pos.y,ang,m.scale,tr.birdIdx,a,tr.col);
    });
  });
}
requestAnimationFrame(animate);

// 지도 이동시 경로 캐시 클리어
map.on('move zoom', ()=>{ pathCache.clear(); });

// ── 컨트롤 패널 ───────────────────────────────────
function sl(id,lbl,fmt,cb){
  const el=document.getElementById(id),lb=document.getElementById(lbl);
  el.addEventListener('input',()=>{ lb.textContent=fmt(el.value); cb(parseFloat(el.value)); });
}
sl('sl-count','lbl-count',v=>`${v}`,    v=>{ PARAMS.count=Math.round(v); init(); });
sl('sl-speed','lbl-speed',v=>`${parseFloat(v).toFixed(1)}×`, v=>{ PARAMS.speed=v; });
sl('sl-size', 'lbl-size', v=>`${parseFloat(v).toFixed(1)}×`, v=>{ PARAMS.birdSize=v; });
sl('sl-flock','lbl-flock',v=>`${v}`,   v=>{ PARAMS.flock=Math.round(v); init(); });

// 초기 줌: 이미지 화면 기준
map.setZoom(3);
