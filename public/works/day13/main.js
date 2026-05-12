import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── 슬라이더 ─────────────────────────────────────────────────────────────────
const slSpeed = document.getElementById('sl-speed');
const slDance = document.getElementById('sl-dance');
const slRoar  = document.getElementById('sl-roar');
[['speed',slSpeed],['dance',slDance],['roar',slRoar]].forEach(([k,sl])=>{
  sl.addEventListener('input',()=>{ document.getElementById('val-'+k).textContent=sl.value; });
});
const prm = ()=>({ speed:slSpeed.value/100, dance:slDance.value/100, roar:slRoar.value/100 });

// ─── 색상 ─────────────────────────────────────────────────────────────────────
const C = { BG:0x0d0d0d, NUGGET:0xc47820, NUGGET_DARK:0x8a4e14,
            FRIES:0xf0c038, FRIES_TIP:0xd49010, KETCHUP:0xcc2200 };

// ─── 렌더러 / 씬 / 카메라 ────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas:document.getElementById('c'), antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(C.BG);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(C.BG, 0.028);

const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
camera.position.set(0, 2.5, 9.2);
camera.lookAt(0, 1.2, 0);

// ─── 조명 ─────────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xfff0d0, 0.45));
const sun = new THREE.DirectionalLight(0xfff8e8, 3.0);
sun.position.set(4, 12, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.near=0.5; sun.shadow.camera.far=50;
sun.shadow.camera.left=sun.shadow.camera.bottom=-10;
sun.shadow.camera.right=sun.shadow.camera.top=10;
scene.add(sun);
const fill = new THREE.DirectionalLight(0x7090ff, 0.5);
fill.position.set(-4,3,-3);
scene.add(fill);
// 아래에서 올라오는 따뜻한 반사광 — 튀김 기름 느낌
const bounce = new THREE.DirectionalLight(0xff9933, 0.3);
bounce.position.set(0, -3, 2);
scene.add(bounce);

// ─── 바닥 ─────────────────────────────────────────────────────────────────────
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(80,20),
  new THREE.MeshStandardMaterial({color:0x181818,roughness:0.95})
);
floor.rotation.x = -Math.PI/2;
floor.receiveShadow = true;
scene.add(floor);

// ─── 재질 ─────────────────────────────────────────────────────────────────────
const mN  = new THREE.MeshStandardMaterial({color:C.NUGGET, roughness:0.55, metalness:0.08});
const mN2 = new THREE.MeshStandardMaterial({color:C.NUGGET_DARK, roughness:0.65});
const mF  = new THREE.MeshStandardMaterial({color:C.FRIES,       roughness:0.68});
const mF2 = new THREE.MeshStandardMaterial({color:C.FRIES_TIP,   roughness:0.78});
const mK  = new THREE.MeshStandardMaterial({color:C.KETCHUP,     roughness:0.55});

// ─── 헬퍼: 너겟 모양 ─────────────────────────────────────────────────────────
// 가로로 납작한 직사각형 너겟 — BoxGeometry 기반, 모서리만 살짝 깎음
// w=가로, h=세로(높이), d=두께(앞뒤)
// ─── 헬퍼: 너겟 모양 ─────────────────────────────────────────────────────────
// RoundedBoxGeometry: 진짜 둥근 네모, 얇게, 비정형 노이즈
function makeNuggetMesh(w, h, d, seed=0) {
  const thickness = Math.min(d, h * 0.65);
  const radius = Math.min(w, h) * 0.22;
  const g = new RoundedBoxGeometry(w, h, thickness, 20, radius);
  const pos = g.attributes.position;
  const s = seed * 2.7;
  for (let i=0; i<pos.count; i++) {
    const x=pos.getX(i), y=pos.getY(i), z=pos.getZ(i);
    const big =
      0.09 * Math.sin(x*1.6+1.3+s) * Math.cos(y*1.4+0.7+s) +
      0.07 * Math.sin(z*1.9+2.0+s) * Math.cos(x*1.7+0.4+s) +
      0.06 * Math.sin(y*2.1+z*1.5+s) * Math.cos(x*1.8+1.2+s);
    const mid =
      0.04 * Math.sin(x*3.8+1.1+s) * Math.cos(z*3.2+2.3+s) +
      0.03 * Math.sin(y*4.2+0.8+s) * Math.cos(x*3.6+1.5+s);
    const fine = 0.015 * Math.sin(x*7.1+y*5.3+s) * Math.cos(z*6.8+1.9+s);
    const n = big + mid + fine;
    pos.setXYZ(i, x+n*0.9, y+n, z+n*0.75);
  }
  // toNonIndexed 제거 — RoundedBoxGeometry는 이미 non-indexed
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mN);
  m.castShadow = true;
  return m;
}

// ─── 헬퍼: 감자튀김 스틱 ─────────────────────────────────────────────────────
// pivot = 하단 중심, 위로 자람
// RoundedBox + 노이즈로 비정형 직사각형
function makeFry(len, w=0.26, d=0.22) {
  const radius = Math.min(w, d) * 0.25; // 살짝만 둥글게
  const g = new RoundedBoxGeometry(w, len, d, 4, radius);
  const pos = g.attributes.position;
  for (let i=0; i<pos.count; i++) {
    const x=pos.getX(i), y=pos.getY(i), z=pos.getZ(i);
    // 노이즈: 길이 방향(y)은 작게, 단면(x,z)은 살짝
    const n = 0.018*(Math.sin(x*8.2+y*3.1+1.4)*Math.cos(z*6.5+0.8)+Math.sin(y*5.3+0.6)*0.5);
    pos.setXYZ(i, x+n*0.6, y+n*0.3, z+n*0.6);
  }
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, mF);
  mesh.position.y = len/2; // pivot 하단
  mesh.castShadow = true;
  const grp = new THREE.Group();
  grp.add(mesh);
  return grp;
}

// ─── 너겟 공룡 ───────────────────────────────────────────────────────────────
// 모든 파츠를 root 하나의 좌표계 안에서 관리
// 다리만 별도로 scene에 추가 (IK 때문에)
//
// 좌표 기준:
//   root.position.y = 몸통 중심 높이
//   몸통 중심 = (0,0,0) 로컬
//   다리 엉덩이 = 몸통 하단 (-0.5y) + 좌우 (±0.5z) + 앞뒤 (±0.55x)
//   다리 길이 = 0.72 → 발이 root.y - 0.5 - 0.72 = 0 이 되려면 root.y = 1.22

class NuggetDino {
  constructor() {
    this.root = new THREE.Group();
    scene.add(this.root);

    // ── 몸통 그룹 ──
    this.bodyGrp = new THREE.Group();
    this.root.add(this.bodyGrp);

    // 몸통: 너겟 2개를 x축으로 나란히 — 앞(가슴) + 뒤(엉덩이)
    // dino4처럼 옆에서 봤을 때 너겟 2개가 이어진 공룡 체형
    const bodyDefs = [
      { x:  0.45, y:  0.08, w:1.10, h:1.00, d:0.55, seed:0 },
      { x: -0.55, y: -0.05, w:1.05, h:0.88, d:0.52, seed:1 },
    ];
    bodyDefs.forEach(({x,y,w,h,d,seed})=>{
      const m = makeNuggetMesh(w,h,d,seed);
      m.position.set(x,y,0);
      this.bodyGrp.add(m);
    });

    // 케첩 없음

    // ── 목 + 머리 ──
    this.headGrp = new THREE.Group();
    this.headGrp.position.set(0.88, 0.05, 0);
    this.bodyGrp.add(this.headGrp);

    // 목: headGrp x=0이 몸통 표면. 목 박스를 x=0에서 시작
    const neckLen = 0.42;
    const neck = new THREE.Mesh(new THREE.BoxGeometry(neckLen, 0.20, 0.24), mF);
    neck.position.set(neckLen/2, 0, 0);
    neck.castShadow = true;
    this.headGrp.add(neck);

    // 머리: 둥근 오각형 너겟 — 모든 꼭짓점을 quadraticCurveTo로 둥글게
    const headX = neckLen + 0.05;
    const headDepth = 0.42;

    const hTop   =  0.26;
    const hBot   = -0.20;
    const hNose  =  0.58;
    const hNoseY = -0.04;
    const r = 0.10; // 꼭짓점 라운드 반경

    // 오각형 꼭짓점 5개
    const pts = [
      [0,            hBot],           // 0: 뒤 아래
      [0,            hTop],           // 1: 뒤 위
      [hNose * 0.55, hTop * 1.15],    // 2: 정수리
      [hNose,        hNoseY],         // 3: 코끝
      [hNose * 0.6,  hBot * 0.85],    // 4: 아래턱 앞
    ];

    // 각 꼭짓점에서 r만큼 앞뒤 엣지 방향으로 물러난 점을 lineTo,
    // 꼭짓점 자체를 control point로 quadraticCurveTo → 둥근 모서리
    function roundedPoly(shape, verts, radius) {
      const n = verts.length;
      for (let i = 0; i < n; i++) {
        const prev = verts[(i - 1 + n) % n];
        const curr = verts[i];
        const next = verts[(i + 1) % n];
        // curr → next 방향 단위벡터
        const dx0 = curr[0] - prev[0], dy0 = curr[1] - prev[1];
        const l0 = Math.sqrt(dx0*dx0 + dy0*dy0) || 1;
        const dx1 = next[0] - curr[0], dy1 = next[1] - curr[1];
        const l1 = Math.sqrt(dx1*dx1 + dy1*dy1) || 1;
        const r0 = Math.min(radius, l0 * 0.45);
        const r1 = Math.min(radius, l1 * 0.45);
        // 꼭짓점 진입점 (이전 엣지에서 r0 남긴 지점)
        const ax = curr[0] - dx0/l0 * r0;
        const ay = curr[1] - dy0/l0 * r0;
        // 꼭짓점 탈출점 (다음 엣지로 r1 나간 지점)
        const bx = curr[0] + dx1/l1 * r1;
        const by = curr[1] + dy1/l1 * r1;
        if (i === 0) shape.moveTo(ax, ay);
        else shape.lineTo(ax, ay);
        shape.quadraticCurveTo(curr[0], curr[1], bx, by);
      }
      shape.closePath();
    }

    const headShape = new THREE.Shape();
    roundedPoly(headShape, pts, r);

    const extrudeSettings = {
      depth: headDepth,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      bevelSegments: 6,
    };
    const headGeo = new THREE.ExtrudeGeometry(headShape, extrudeSettings);
    headGeo.translate(0, 0, -headDepth / 2);

    // 너겟 노이즈
    const headPos = headGeo.attributes.position;
    for (let i = 0; i < headPos.count; i++) {
      const x = headPos.getX(i), y = headPos.getY(i), z = headPos.getZ(i);
      const bump =
        0.08 * Math.sin(x * 2.2 + 2.1) * Math.cos(y * 1.9 + 1.7) +
        0.05 * Math.sin(z * 2.9 + 0.9) * Math.cos(x * 2.4 + 2.4) +
        0.03 * Math.sin(y * 4.1 + z * 2.3 + 1.2) * Math.cos(x * 3.2 + 0.8);
      headPos.setXYZ(i, x + bump, y + bump * 0.8, z + bump * 0.6);
    }
    headGeo.computeVertexNormals();

    const headMesh = new THREE.Mesh(headGeo, mN);
    headMesh.castShadow = true;
    headMesh.position.set(headX, 0, 0);
    this.headGrp.add(headMesh);

    // 눈
    const eyeX = headX + hNose * 0.48;
    const eyeY = hTop * 0.72;
    [[eyeX, eyeY,  headDepth * 0.42],
     [eyeX, eyeY, -headDepth * 0.42]].forEach(([x,y,z])=>{
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.055,6,5), mN2);
      e.position.set(x, y, z);
      this.headGrp.add(e);
    });

    // 머리 뿔 없음

    // ── 꼬리: 긴 감자튀김 2개 러프하게 ──
    this.tailGrp = new THREE.Group();
    this.tailGrp.position.set(0, 0, 0); // 꼬리 감자튀김이 직접 bodyGrp 좌표 사용
    this.bodyGrp.add(this.tailGrp);

    // 꼬리: 위로 살짝 기울어진 긴 감자튀김들
    const tailSurfaceY = -0.05 + 0.10;
    // 꼬리: 수평으로 누운 감자튀김 2개, 엉덩이쪽 벌어지고 끝 모아짐
    // makeFry: Group, pivot=하단(y=0), rz=-PI/2 → -x 방향으로 뻗음
    // 위쪽: y 높게 시작, rz에 -기울기 → 끝이 아래로 모아짐
    // 아래쪽: y 낮게 시작, rz에 +기울기 → 끝이 위로 모아짐
    const tailX = -0.86;
    const tailY = tailSurfaceY;
    // rz=PI/2 → -x 방향으로 뻗음 (확인됨)
    // < 모양: 위쪽 rz=PI/2+기울기(끝 아래), 아래쪽 rz=PI/2-기울기(끝 위)
    [
      { dy:  0.10, len:1.05, w:0.22, rz: Math.PI/2 + 0.16 },
      { dy: -0.10, len:0.92, w:0.20, rz: Math.PI/2 - 0.16 },
    ].forEach(({ dy, len, w, rz }) => {
      const f = makeFry(len, w, w*0.78);
      f.position.set(tailX, tailY + dy, 0);
      f.rotation.z = rz;
      this.tailGrp.add(f);
    });

    // ── 등 뿔 ──
    // 등 라인(몸통 위쪽 곡선)에 맞춰 꽂힘
    // 몸통이 타원형이므로 x에 따라 y가 달라짐 (포물선)
    // 몸통 반높이 = 0.52, x범위 = ±0.75
    // ── 등 뿔: 스테고사우루스/트리케라톱스 스타일 ──
    // 중앙이 가장 높고 앞뒤로 낮아지는 아치형
    // 얼기설기 — 각도 제각각, 개수 많게
    // ── 등 뿔: 막 꽂은 것처럼 불규칙하게, 14개 ──
    // ── 등 뿔: 8개 ──
    [
      { x:-0.75, z: 0.05,  len:0.42, rx: 0.15, rz: 0.55 },
      { x:-0.50, z:-0.20,  len:0.72, rx:-0.45, rz: 0.28 },
      { x:-0.25, z: 0.18,  len:1.08, rx:-0.28, rz: 0.08 },
      { x:-0.05, z:-0.08,  len:1.17, rx: 0.12, rz: 0.03 },
      { x: 0.15, z: 0.22,  len:1.02, rx:-0.20, rz:-0.10 },
      { x: 0.35, z:-0.12,  len:0.78, rx: 0.32, rz:-0.28 },
      { x: 0.55, z: 0.15,  len:0.52, rx:-0.38, rz:-0.48 },
      { x: 0.75, z:-0.05,  len:0.30, rx: 0.10, rz:-0.65 },
    ].forEach(({ x, z, len, rx, rz }) => {
      const isFront = x > 0;
      // 몸통 표면 y에서 len*0.5 빼서 절반이 몸통 안에 묻힘
      const surfaceY = (isFront ? 0.08 : -0.05) + 0.42;
      const f = makeFry(len, 0.20, 0.17);
      f.position.set(x, surfaceY - len * 0.15, z);
      f.rotation.x = rx;
      f.rotation.z = rz;
      this.bodyGrp.add(f);
    });

    // ── 다리 4개 ──
    // 엉덩이 로컬 위치 (bodyGrp 기준)
    // 앞다리: 앞 너겟(x=0.45) 아래, 뒷다리: 뒤 너겟(x=-0.55) 아래
    this.LEG_LEN = 0.72;
    this.hipLocal = [
      new THREE.Vector3( 0.55, -0.10,  0.45),
      new THREE.Vector3( 0.55, -0.10, -0.45),
      new THREE.Vector3(-0.65, -0.08,  0.45),
      new THREE.Vector3(-0.65, -0.08, -0.45),
    ];

    // 대각선 교대: 오른앞(0)+왼뒤(3) / 왼앞(1)+오른뒤(2)
    this.legPhases = [0.0, 0.5, 0.5, 0.0];

    // 다리 메시 — bodyGrp에 붙임
    this.legGrps = this.hipLocal.map((hip)=>{
      const grp = new THREE.Group();
      grp.position.copy(hip);
      const legGeo = new RoundedBoxGeometry(0.26, this.LEG_LEN, 0.22, 4, 0.055);
      const legPos = legGeo.attributes.position;
      for (let i=0; i<legPos.count; i++) {
        const x=legPos.getX(i), y=legPos.getY(i), z=legPos.getZ(i);
        const n = 0.015*(Math.sin(x*7.8+y*2.9+1.1)*Math.cos(z*6.1+0.7));
        legPos.setXYZ(i, x+n*0.5, y+n*0.2, z+n*0.5);
      }
      legGeo.computeVertexNormals();
      const fry = new THREE.Mesh(legGeo, mF);
      fry.position.y = -this.LEG_LEN/2;
      fry.castShadow = true;
      grp.add(fry);
      this.bodyGrp.add(grp);
      return grp;
    });

    this.x = -11;
    this.baseY = 0.72 - (-0.10); // = 0.82
    this.walkT = 0;
    this.danceT = 0;

    // 뒷발 끝 추적용 더미 오브젝트 (뒷다리 2,3의 발끝)
    // legGrps[2] 기준: grp.position = hipLocal[2], fry.position.y = -LEG_LEN/2
    // 발끝 로컬 y = -LEG_LEN (grp 기준)
    this.backFootMarker = new THREE.Object3D();
    this.backFootMarker.position.set(0, -this.LEG_LEN, 0);
    this.legGrps[2].add(this.backFootMarker);
  }

  update(dt) {
    const pm = prm();
    const speed = pm.speed * 3.5;
    const dance = pm.dance;   // 0~1: 댄스 강도
    const roar  = pm.roar;    // 0~1: 포효 강도
    const freq  = 1.0 + pm.speed * 2.5;

    // 이동 없음 — 제자리 걸음
    this.walkT += dt * freq;
    this.danceT += dt * (2.5 + dance * 4.0);

    // ── DANCE ──
    // 몸통 위아래 바운스 + 좌우 롤 + 엉덩이 흔들기
    // 슬라이더 낮으면 살짝, 높으면 격하게
    const danceBouncAmp = dance * 0.28;
    const danceRollAmp  = dance * 0.18;
    const danceHipAmp   = dance * 0.22;

    const danceBounce = Math.abs(Math.sin(this.danceT * Math.PI)) * danceBouncAmp;
    const danceRoll   = Math.sin(this.danceT * Math.PI * 2) * danceRollAmp;
    const danceHip    = Math.sin(this.danceT * Math.PI * 2 + 0.8) * danceHipAmp;

    // ── ROAR ──
    const MAX_ROAR_ANGLE = Math.PI * 0.38;
    const roarAngle    = roar * MAX_ROAR_ANGLE;
    const roarHeadLift = roar * 0.28;
    const roarTremor   = roar > 0.05
      ? Math.sin(this.walkT * Math.PI * 8) * roar * 0.018
      : 0;

    // 걷기/댄스 바운스
    const walkBounce = Math.abs(Math.sin(this.walkT * Math.PI)) * 0.03 * pm.speed;

    // bodyGrp 회전 먼저 적용
    this.bodyGrp.rotation.z = roarAngle;
    this.bodyGrp.rotation.y = danceHip;
    this.bodyGrp.rotation.x = 0;

    // root.y 세팅 (lerp로 부드럽게)
    const targetY = this.baseY + danceBounce + walkBounce;
    this.root.position.y += (targetY - this.root.position.y) * 0.15;
    this.root.position.x = 0;

    if (roar > 0.001) {
      scene.updateMatrixWorld(true);
      const footWorld = new THREE.Vector3();
      this.backFootMarker.getWorldPosition(footWorld);
      if (footWorld.y < 0) {
        this.root.position.y -= footWorld.y;
      }
    }

    // 꼬리 — roar 중엔 rotation.z 건드리지 않음 (분리 방지)
    const walkRoll = Math.sin(this.walkT * Math.PI * 2) * 0.015 * pm.speed;
    this.root.rotation.z = walkRoll + danceRoll + roarTremor;

    const tailWalk  = Math.sin(this.walkT * Math.PI) * 0.16 * Math.max(pm.speed, 0.2);
    const tailDance = Math.sin(this.danceT * Math.PI * 2) * dance * 0.25;
    this.tailGrp.rotation.y = tailWalk + tailDance;
    this.tailGrp.rotation.z = 0;

    // 머리
    const headNod   = Math.sin(this.walkT * Math.PI * 2) * 0.025 * pm.speed;
    const headDance = Math.sin(this.danceT * Math.PI * 2 + 1.2) * dance * 0.08;
    this.headGrp.rotation.z = headNod + headDance + roarHeadLift;

    // ── 다리 ──
    const swingAmp     = 0.30 * pm.speed + 0.04;
    const danceKneeAmp = dance * 0.20;

    this.legPhases.forEach((phase, i) => {
      const walkSwing  = Math.sin((this.walkT  + phase) * Math.PI * 2) * swingAmp;
      const danceSwing = Math.sin((this.danceT + phase) * Math.PI * 2) * danceKneeAmp;
      const isFrontLeg = i < 2;

      if (isFrontLeg) {
        // 앞다리: bodyGrp 기울기 상쇄(-roarAngle) + 추가로 앞/위로 뻗기(+roarAngle*0.6)
        // 합산: -roarAngle + roarAngle*0.6 = -roarAngle*0.4 → 앞쪽으로 올라감
        this.legGrps[i].rotation.z = walkSwing + danceSwing + roarAngle * 0.8;
      } else {
        // 뒷다리: bodyGrp 기울기 정확히 상쇄 → 월드 기준 수직
        this.legGrps[i].rotation.z = walkSwing + danceSwing - roarAngle;
      }
      this.legGrps[i].position.y = this.hipLocal[i].y;
    });
  }
}

// ─── 카메라 고정 ──────────────────────────────────────────────────────────────
camera.lookAt(0, 1.2, 0);

// ─── OrbitControls ────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.2, 0);   // 공룡 중심 바라보기
controls.enableDamping = true;     // 부드러운 관성
controls.dampingFactor = 0.08;
controls.minDistance = 4;          // 너무 가까이 못 오게
controls.maxDistance = 25;
controls.maxPolarAngle = Math.PI * 0.85; // 바닥 아래로 못 내려가게
controls.update();

// ─── 리사이즈 ─────────────────────────────────────────────────────────────────
function onResize() {
  const w=window.innerWidth, h=window.innerHeight;
  renderer.setSize(w,h);
  camera.aspect=w/h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
onResize();

// ─── 루프 ─────────────────────────────────────────────────────────────────────
const dino = new NuggetDino();
let last = 0;
function animate(t) {
  requestAnimationFrame(animate);
  const dt = Math.min((t-last)/1000, 0.05);
  last = t;
  dino.update(dt);
  controls.update();
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
