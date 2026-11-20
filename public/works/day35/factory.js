// 포장지 공장: 내가 만든 무늬 하나가 사방 연속 무늬가 되어 롤에서 끝없이 찍혀 나온다.
// 다 만든 종이로 상자를 감싸면 선물 더미에 쌓인다.
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

const THUMB = new URLSearchParams(location.search).has('thumb')
if (THUMB) document.documentElement.classList.add('thumb')

// ── 무늬: 지우고 다시 칠할 수 있게 획 목록으로 들고 있는다 (좌표는 0~1) ──
const state = { ops: [], repeat: 'grid', scale: 1, brush: 'pen', size: 7, pen: '#1fa35b', bg: '#f4f1ea' }
const BRUSHES = [
  ['pen', '펜'], ['ink', '붓'], ['glow', '빛번짐'],
  ['hatch', '빗금'], ['dots', '망점'], ['spray', '스프레이'],
]

function rng(seed) { let s = (seed % 2147483646) + 1; return () => (s = s * 16807 % 2147483647) / 2147483647 }
function hexRgb(h) { return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) }
function shade(h, k) { // k>0 밝게, k<0 어둡게
  const c = hexRgb(h).map((v) => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)))
  return `rgb(${c.join(',')})`
}
function tracePath(g, pts, S) {
  g.beginPath()
  pts.forEach((p, i) => (i ? g.lineTo(p[0] * S, p[1] * S) : g.moveTo(p[0] * S, p[1] * S)))
  if (pts.length === 1) g.lineTo(pts[0][0] * S + .1, pts[0][1] * S)
}
function layer(S) { const c = document.createElement('canvas'); c.width = c.height = S; return [c, c.getContext('2d')] }
// 획 모양 그대로의 가림막: 빗금·망점을 이 안에만 남긴다
function strokeMask(op, S, k = 1) {
  const [c, g] = layer(S)
  g.lineCap = g.lineJoin = 'round'; g.lineWidth = op.w * S * k; g.strokeStyle = '#000'
  tracePath(g, op.pts, S); g.stroke()
  return c
}

const DRAW = {
  // 펜: 고른 굵기의 선
  pen(g, op, S) {
    g.lineCap = g.lineJoin = 'round'; g.lineWidth = op.w * S; g.strokeStyle = op.c
    tracePath(g, op.pts, S); g.stroke()
  },
  // 붓: 빨리 그으면 가늘고, 천천히 그으면 굵다
  ink(g, op, S) {
    g.fillStyle = op.c
    const p = op.pts
    for (let i = 0; i < p.length; i++) {
      const a = p[Math.max(0, i - 1)], b = p[i]
      const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * S / 1.5))
      for (let s = 0; s < steps; s++) {
        const t = s / steps, f = a[2] + (b[2] - a[2]) * t
        g.beginPath(); g.arc((a[0] + (b[0] - a[0]) * t) * S, (a[1] + (b[1] - a[1]) * t) * S, op.w * S * f * .55, 0, Math.PI * 2); g.fill()
      }
    }
  },
  // 빛번짐: 옅은 빛무리 위에 밝은 면, 가는 진한 테두리
  glow(g, op, S) {
    g.lineCap = g.lineJoin = 'round'
    g.save(); g.filter = `blur(${(op.w * S * .7).toFixed(1)}px)`
    g.lineWidth = op.w * S * 2.1; g.strokeStyle = shade(op.c, .62); g.globalAlpha = .85
    tracePath(g, op.pts, S); g.stroke(); g.restore()
    g.lineWidth = op.w * S * 1.12; g.strokeStyle = shade(op.c, -.35); tracePath(g, op.pts, S); g.stroke()
    g.lineWidth = op.w * S * .92; g.strokeStyle = shade(op.c, .18); tracePath(g, op.pts, S); g.stroke()
  },
  // 빗금: 획 안을 판화처럼 결 있는 줄로 채운다
  hatch(g, op, S) {
    const [c, h] = layer(S), r = rng(op.seed)
    const sp = Math.max(2.2, op.w * S * .2), ang = op.ang
    h.save(); h.translate(S / 2, S / 2); h.rotate(ang); h.fillStyle = op.c
    for (let x = -S; x < S; x += sp) {
      // 줄마다 굵기와 끊김이 조금씩 달라 인쇄 결이 생긴다
      let y = -S
      while (y < S) { const len = sp * (6 + r() * 30); h.fillRect(x, y, sp * (.38 + r() * .14), len); y += len + sp * r() * 1.4 }
    }
    h.restore()
    h.globalCompositeOperation = 'destination-in'; h.drawImage(strokeMask(op, S), 0, 0)
    g.drawImage(c, 0, 0)
  },
  // 망점: 획 안을 기울어진 점 격자로 채운다. 가장자리로 갈수록 점이 작아진다
  dots(g, op, S) {
    const [c, h] = layer(S)
    const sp = Math.max(3, op.w * S * .26)
    const core = strokeMask(op, S, .55).getContext('2d').getImageData(0, 0, S, S).data
    h.save(); h.translate(S / 2, S / 2); h.rotate(Math.PI / 4); h.fillStyle = op.c
    for (let y = -S; y < S; y += sp) for (let x = -S; x < S; x += sp) {
      const wx = S / 2 + (x - y) * Math.SQRT1_2, wy = S / 2 + (x + y) * Math.SQRT1_2
      const ix = wx | 0, iy = wy | 0
      const inCore = ix >= 0 && iy >= 0 && ix < S && iy < S && core[(iy * S + ix) * 4 + 3] > 0
      const rad = sp * (inCore ? .42 : .26)
      h.beginPath(); h.arc(x, y, rad, 0, Math.PI * 2); h.fill()
    }
    h.restore()
    h.globalCompositeOperation = 'destination-in'; h.drawImage(strokeMask(op, S), 0, 0)
    g.drawImage(c, 0, 0)
  },
  // 스프레이: 지나간 자리에 고운 점이 뿌옇게 쌓인다
  spray(g, op, S) {
    const r = rng(op.seed), p = op.pts, sig = op.w * S * .75
    g.fillStyle = op.c
    const gauss = () => { const u = r() || 1e-6, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v) }
    for (let i = 0; i < p.length; i++) {
      const a = p[Math.max(0, i - 1)], b = p[i]
      const n = Math.max(6, Math.hypot(b[0] - a[0], b[1] - a[1]) * S * 2.2 * (op.w * 40))
      for (let k = 0; k < n; k++) {
        const t = r(), x = (a[0] + (b[0] - a[0]) * t) * S + gauss() * sig, y = (a[1] + (b[1] - a[1]) * t) * S + gauss() * sig
        g.beginPath(); g.arc(x, y, S * (.0028 + r() * .0035), 0, Math.PI * 2); g.fill()
      }
    }
  },
}

function renderMotif(ctx, S) {
  ctx.clearRect(0, 0, S, S)
  for (const op of state.ops) { ctx.save(); DRAW[op.brush](ctx, op, S); ctx.restore() }
}

// 처음 열었을 때 보이는 무늬: 여러 붓으로 그린 예시
function demoOps(seed = 1) {
  const r = rng(seed * 977), ops = []
  const hues = [[46, 201, 216], [255, 111, 97], [36, 72, 160], [242, 190, 60], [30, 140, 90]]
  const col = () => { const c = hues[r() * hues.length | 0]; return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('') }
  const curve = (cx, cy, rad, a0, a1) => { const pts = []; for (let i = 0; i <= 26; i++) { const a = a0 + (a1 - a0) * i / 26; pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * .8, .5 + .6 * Math.sin(i / 26 * Math.PI)]) } return pts }
  const kinds = ['glow', 'hatch', 'dots', 'spray', 'ink']
  for (let k = 0; k < 4; k++) {
    const a0 = r() * 6.28
    ops.push({ brush: kinds[(seed + k) % kinds.length], pts: curve(.5 + (r() - .5) * .3, .5 + (r() - .5) * .3, .18 + r() * .2, a0, a0 + 1.6 + r() * 2), w: .05 + r() * .06, c: col(), seed: 11 + k * 31 + seed, ang: r() * Math.PI })
  }
  return ops
}

// ── 사방 연속 무늬 한 장 ────────────────────────────────
const TILE = 512
const motifCanvas = document.createElement('canvas'); motifCanvas.width = motifCanvas.height = 320
function buildTile() {
  renderMotif(motifCanvas.getContext('2d'), 320)
  const c = document.createElement('canvas'); c.width = c.height = TILE
  const g = c.getContext('2d')
  g.fillStyle = state.bg; g.fillRect(0, 0, TILE, TILE)
  const n = [4, 3, 2][state.scale], cell = TILE / n
  const put = (x, y, size, rot, fx, fy) => {
    for (const ox of [-TILE, 0, TILE]) for (const oy of [-TILE, 0, TILE]) {
      const cx = x + ox, cy = y + oy
      if (cx < -size || cx > TILE + size || cy < -size || cy > TILE + size) continue
      g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(fx, fy)
      g.drawImage(motifCanvas, -size / 2, -size / 2, size, size); g.restore()
    }
  }
  if (state.repeat === 'scatter') {
    let seed = state.ops.length * 31 + 3
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    for (let k = 0; k < n * n * 1.4; k++) put(rnd() * TILE, rnd() * TILE, cell * (.55 + rnd() * .45), rnd() * Math.PI * 2, 1, 1)
  } else {
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      let x = (i + .5) * cell, y = (j + .5) * cell, rot = 0, fx = 1, fy = 1
      if (state.repeat === 'brick' && j % 2) x += cell / 2
      if (state.repeat === 'mirror') { fx = i % 2 ? -1 : 1; fy = j % 2 ? -1 : 1 }
      if (state.repeat === 'rotate') rot = ((i + j * 2) % 4) * Math.PI / 2
      put(x, y, cell * .86, rot, fx, fy)
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 8
  return tex
}

// ── 화면 ─────────────────────────────────────────────
const canvas = document.getElementById('view')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = .9
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
const scene = new THREE.Scene()
scene.background = new THREE.Color('#0a0a0b')
scene.fog = new THREE.Fog('#0a0a0b', 11, 22)
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
scene.environmentIntensity = 0.42

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60)
camera.position.set(5.2, 3.1, 5.4)
const controls = new OrbitControls(camera, canvas)
controls.target.set(1.0, 0.95, -0.2)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 3.2; controls.maxDistance = 11
controls.minPolarAngle = 0.35; controls.maxPolarAngle = 1.45

// 검은 공간: 기계와 포장대 위로만 빛이 떨어지고, 뒤에서 윤곽선 빛이 돈다
function spot(color, power, pos, target, angle, pen) {
  const l = new THREE.SpotLight(color, power, 0, angle, pen, 1.6)
  l.position.copy(pos); l.target.position.copy(target)
  l.castShadow = true; l.shadow.mapSize.set(2048, 2048); l.shadow.bias = -0.0003; l.shadow.normalBias = .02
  scene.add(l, l.target); return l
}
spot('#fff3e2', 140, new THREE.Vector3(1.8, 7.5, 4.2), new THREE.Vector3(.2, .9, -.6), .5, .65)
spot('#fff1dc', 45, new THREE.Vector3(4.2, 6.5, 2.6), new THREE.Vector3(2.7, .5, -.2), .42, .7)
const rim = new THREE.DirectionalLight('#c9d4ff', 1.6); rim.position.set(-3, 3, -7); scene.add(rim)
const rim2 = new THREE.DirectionalLight('#ffd9b0', .9); rim2.position.set(6, 2.5, -4); scene.add(rim2)
scene.add(new THREE.HemisphereLight('#3a3a44', '#050505', 0.15))

// 재질
function noiseCanvas(w, h, base, spots, alpha = .07) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, w, h)
  for (let i = 0; i < spots; i++) {
    g.fillStyle = Math.random() < .5 ? `rgba(0,0,0,${alpha * Math.random()})` : `rgba(255,255,255,${alpha * Math.random()})`
    const r = Math.random() * 3 + .4; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, r, 0, 7); g.fill()
  }
  return c
}
function texOf(c, rx = 1, ry = 1) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t }

const M = {
  paint: new THREE.MeshPhysicalMaterial({ color: '#111113', roughness: .34, metalness: .15, clearcoat: 1, clearcoatRoughness: .12 }),
  paintDark: new THREE.MeshPhysicalMaterial({ color: '#070708', roughness: .5, metalness: .1, clearcoat: .6, clearcoatRoughness: .3 }),
  steel: new THREE.MeshStandardMaterial({ color: '#18181a', metalness: .9, roughness: .3 }),
  chrome: new THREE.MeshStandardMaterial({ color: '#1a1a1c', metalness: .9, roughness: .22 }),
  brass: new THREE.MeshStandardMaterial({ color: '#161618', metalness: .9, roughness: .28 }),
  rubber: new THREE.MeshStandardMaterial({ color: '#1c1c1e', roughness: .85 }),
  wood: new THREE.MeshPhysicalMaterial({ map: texOf(noiseCanvas(512, 512, '#0a0a0b', 3000, .04), 2, 2), roughness: .5, metalness: .2, clearcoat: .35, clearcoatRoughness: .3, envMapIntensity: .12 }),
  floor: new THREE.MeshStandardMaterial({ map: texOf(noiseCanvas(1024, 1024, '#0e0e0f', 30000, .06), 6, 6), roughness: .78, metalness: 0, envMapIntensity: .15 }),
  paperBlank: new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: .9 }),
}

// 바닥과 벽
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), M.floor)
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor)
const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), new THREE.MeshStandardMaterial({ color: '#0d0d0e', roughness: .95 }))
// 검은 배경이라 뒷벽은 두지 않는다 (그림자만 떠 보인다)

function add(mesh, parent = scene) { mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh }
// x축을 따라 누운 원기둥
function cylX(r, len, mat, seg = 64) { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateZ(Math.PI / 2); return new THREE.Mesh(g, mat) }

// ── 종이가 지나는 길 ───────────────────────────────────
const W = 1.6 // 종이 폭
const NIP = new THREE.Vector3(0, 1.15, -1.2)
const ROLL = { c: new THREE.Vector3(0, 2.05, -2.3), r: 0.42 }
const PLATE = { c: new THREE.Vector3(0, NIP.y + .225, NIP.z), r: 0.22 }
const IMPR = { c: new THREE.Vector3(0, NIP.y - .205, NIP.z), r: 0.2 }
const INK = { c: new THREE.Vector3(0, PLATE.c.y + .3, NIP.z - .06), r: 0.085 }
const path = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, ROLL.c.y - ROLL.r - .005, ROLL.c.z),
  new THREE.Vector3(0, 1.48, -1.85),
  new THREE.Vector3(0, 1.27, -1.45),
  NIP.clone(),
  new THREE.Vector3(0, 1.05, -0.93),
  new THREE.Vector3(0, 0.95, -0.62),
  new THREE.Vector3(0, 0.925, -0.3),
  new THREE.Vector3(0, 0.922, 0.4),
  new THREE.Vector3(0, 0.922, 1.2),
  new THREE.Vector3(0, 0.9, 1.56),
  new THREE.Vector3(0, 0.76, 1.73),
  new THREE.Vector3(0, 0.48, 1.8),
  new THREE.Vector3(0, 0.16, 1.76),
  new THREE.Vector3(0, 0.012, 1.98),
  new THREE.Vector3(0, 0.008, 2.6),
], false, 'centripetal')
const PATH_N = 600
const PATH_L = path.getLength()
function ribbonGeo() {
  const pts = path.getSpacedPoints(PATH_N)
  const pos = [], nor = [], uv = [], idx = []
  const side = new THREE.Vector3(1, 0, 0)
  pts.forEach((p, i) => {
    const t = path.getTangentAt(i / PATH_N), n = new THREE.Vector3().crossVectors(t, side).normalize()
    pos.push(p.x - W / 2, p.y, p.z, p.x + W / 2, p.y, p.z)
    nor.push(n.x, n.y, n.z, n.x, n.y, n.z)
    uv.push(0, i / PATH_N, 1, i / PATH_N)
    if (i < PATH_N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}
let drumS = 0
{
  const pts = path.getSpacedPoints(PATH_N); let best = 1e9
  pts.forEach((p, i) => { const d = p.distanceTo(NIP); if (d < best) { best = d; drumS = i / PATH_N * PATH_L } })
}

// 종이: 인쇄 실린더를 지난 자리부터 무늬가 찍힌다. 무늬를 바꾸면 그 순간 실린더 아래부터 새 무늬다
const TILE_SIZE = 0.5
const PU = {
  uNew: { value: null }, uOld: { value: null }, uTravel: { value: 0 }, uSwitch: { value: -1e9 },
  uDrum: { value: drumS }, uL: { value: PATH_L }, uW: { value: W }, uTile: { value: TILE_SIZE },
  uBlank: { value: new THREE.Color('#f4efe6') },
}
const paperMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .82, side: THREE.DoubleSide })
paperMat.defines = { USE_UV: '' }
paperMat.onBeforeCompile = (sh) => {
  Object.assign(sh.uniforms, PU)
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>
      uniform sampler2D uNew, uOld; uniform float uTravel, uSwitch, uDrum, uL, uW, uTile; uniform vec3 uBlank;`)
    .replace('#include <map_fragment>', `
      float pathS = vUv.y * uL;
      float paperS = pathS - uTravel;
      vec2 puv = vec2(vUv.x * uW, -paperS) / uTile;
      vec3 pc = paperS < uSwitch ? texture2D(uNew, puv).rgb : texture2D(uOld, puv).rgb;
      float printed = smoothstep(uDrum - .004, uDrum + .004, pathS);
      // 막 찍힌 잉크는 살짝 번들거린다
      diffuseColor.rgb *= mix(uBlank, pc, printed);`)
}
const paper = add(new THREE.Mesh(ribbonGeo(), paperMat))
paper.castShadow = true

// ── 기계 ─────────────────────────────────────────────
const machine = new THREE.Group(); scene.add(machine)
// 옆판: 모서리가 둥근 판에 구멍 몇 개
function sidePlate() {
  const s = new THREE.Shape(), z0 = 0.62, z1 = 2.9, y0 = 0, y1 = 2.62, rr = .18
  // 셰이프의 x = -z (월드), y = y
  s.moveTo(z0 + rr, y0); s.lineTo(z1 - rr, y0); s.quadraticCurveTo(z1, y0, z1, y0 + rr)
  s.lineTo(z1, y1 - rr); s.quadraticCurveTo(z1, y1, z1 - rr, y1)
  s.lineTo(1.55, y1); s.quadraticCurveTo(1.2, y1, 1.05, 2.0)
  s.lineTo(z0 + .05, 1.75); s.quadraticCurveTo(z0, 1.73, z0, 1.6)
  s.lineTo(z0, y0 + rr); s.quadraticCurveTo(z0, y0, z0 + rr, y0)
  for (const [z, y, r] of [[2.0, .55, .22], [1.25, .55, .22], [2.55, .55, .14]]) { const h = new THREE.Path(); h.absarc(z, y, r, 0, Math.PI * 2, true); s.holes.push(h) }
  const g = new THREE.ExtrudeGeometry(s, { depth: .07, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 3, curveSegments: 32 })
  return g
}
for (const sx of [-1, 1]) {
  const m = add(new THREE.Mesh(sidePlate(), M.paint), machine)
  m.rotation.y = Math.PI / 2
  m.position.x = sx * (W / 2 + .14) - (sx > 0 ? 0 : .07)
  // 밑받침
  const foot = add(new THREE.Mesh(new RoundedBoxGeometry(.24, .1, 2.45, 3, .03), M.paintDark), machine)
  foot.position.set(sx * (W / 2 + .13), .05, -1.75)
}
// 가로 보
for (const [y, z] of [[.3, -2.75], [.3, -.75], [2.5, -2.75]]) {
  const b = add(cylX(.035, W + .3, M.steel, 24), machine); b.position.set(0, y, z)
}
// 롤러들
const supply = new THREE.Group(); supply.position.copy(ROLL.c); machine.add(supply)
{
  const ring = document.createElement('canvas'); ring.width = ring.height = 256
  const g = ring.getContext('2d'); g.fillStyle = '#efe7d9'; g.fillRect(0, 0, 256, 256)
  for (let r = 30; r < 128; r += 1.6) { g.strokeStyle = `rgba(120,100,70,${.08 + Math.random() * .12})`; g.lineWidth = .8; g.beginPath(); g.arc(128, 128, r, 0, 7); g.stroke() }
  g.fillStyle = '#9b7a52'; g.beginPath(); g.arc(128, 128, 30, 0, 7); g.fill()
  const capMat = new THREE.MeshStandardMaterial({ map: texOf(ring), roughness: .85 })
  const roll = add(cylX(ROLL.r, W, [M.paperBlank, capMat, capMat]), supply)
  roll.material = [M.paperBlank, capMat, capMat]
}
const shaftS = add(cylX(.05, W + .5, M.chrome, 24), supply)
const plate = new THREE.Group(); plate.position.copy(PLATE.c); machine.add(plate)
const plateMat = new THREE.MeshStandardMaterial({ roughness: .5, metalness: .1 })
add(cylX(PLATE.r, W + .04, [plateMat, M.chrome, M.chrome]), plate)
add(cylX(.045, W + .5, M.chrome, 24), plate)
const impr = new THREE.Group(); impr.position.copy(IMPR.c); machine.add(impr)
add(cylX(IMPR.r, W + .04, M.rubber), impr)
add(cylX(.045, W + .5, M.chrome, 24), impr)
const ink = new THREE.Group(); ink.position.copy(INK.c); machine.add(ink)
const inkMat = new THREE.MeshPhysicalMaterial({ color: '#d2452c', roughness: .18, clearcoat: 1, clearcoatRoughness: .05 })
add(cylX(INK.r, W - .05, inkMat), ink)
add(cylX(.03, W + .4, M.chrome, 16), ink)
// 잉크 통
const tray = add(new THREE.Mesh(new RoundedBoxGeometry(W - .02, .14, .32, 3, .03), M.steel), machine)
tray.position.set(0, INK.c.y + .08, INK.c.z - .2)
const trayInk = add(new THREE.Mesh(new THREE.BoxGeometry(W - .1, .02, .24), inkMat), machine)
trayInk.position.set(0, INK.c.y + .155, INK.c.z - .2)
// 안내 롤러
const guides = []
for (const [y, z] of [[1.6, -2.0]]) {
  const g = add(cylX(.06, W + .06, M.chrome, 32), machine); g.position.set(0, y, z); guides.push(g)
}

// 톱니: 오른쪽 옆판 바깥에서 실린더끼리 맞물려 돈다
function gearGeo(r, teeth, depth = .05) {
  const s = new THREE.Shape(), tw = Math.PI * 2 / teeth
  for (let i = 0; i < teeth; i++) {
    const a = i * tw
    const pts = [[a, r * .88], [a + tw * .18, r * .88], [a + tw * .3, r], [a + tw * .62, r], [a + tw * .74, r * .88]]
    pts.forEach(([ang, rad], k) => { const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad; (i === 0 && k === 0) ? s.moveTo(x, y) : s.lineTo(x, y) })
  }
  s.closePath()
  const h = new THREE.Path(); h.absarc(0, 0, r * .2, 0, Math.PI * 2, true); s.holes.push(h)
  for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5, hp = new THREE.Path(); hp.absarc(Math.cos(a) * r * .52, Math.sin(a) * r * .52, r * .14, 0, Math.PI * 2, true); s.holes.push(hp) }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 2, curveSegments: 6 })
  g.rotateY(Math.PI / 2); g.translate(-depth / 2, 0, 0)
  return g
}
const gx = W / 2 + .26
const gears = [
  { m: add(new THREE.Mesh(gearGeo(.205, 22), M.brass), machine), c: PLATE.c, r: PLATE.r },
  { m: add(new THREE.Mesh(gearGeo(.205, 22), M.brass), machine), c: IMPR.c, r: IMPR.r, flip: true },
  { m: add(new THREE.Mesh(gearGeo(.3, 30), M.steel), machine), c: ROLL.c, r: ROLL.r },
]
gears.forEach((g) => g.m.position.set(gx, g.c.y, g.c.z))
gears[1].m.rotation.x = Math.PI / 22

// 조작함과 램프
const ctrl = add(new THREE.Mesh(new RoundedBoxGeometry(.32, .46, .2, 3, .03), M.paintDark), machine)
ctrl.position.set(-(W / 2 + .3), 1.35, -1.0)
const lamp = new THREE.Mesh(new THREE.SphereGeometry(.04, 20, 12), new THREE.MeshStandardMaterial({ color: '#5bd46a', emissive: '#3bd14a', emissiveIntensity: 2 }))
lamp.position.set(-(W / 2 + .3), 1.5, -0.89); machine.add(lamp)
for (const [y, c] of [[1.36, '#e5383b'], [1.24, '#f6d365']]) {
  const b = add(new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .03, 20), new THREE.MeshStandardMaterial({ color: c, roughness: .3 })), machine)
  b.rotation.x = Math.PI / 2; b.position.set(-(W / 2 + .3), y, -0.89)
}

// 받침 탁자
{
  const top = add(new THREE.Mesh(new RoundedBoxGeometry(W + .5, .06, 2.4, 3, .02), M.wood))
  top.position.set(0, .87, .4)
  for (const [x, z] of [[-1, -.7], [1, -.7], [-1, 1.5], [1, 1.5]]) {
    const leg = add(new THREE.Mesh(new RoundedBoxGeometry(.07, .84, .07, 2, .015), M.steel)); leg.position.set(x, .42, z)
  }
  const bar = add(cylX(.02, 2, M.steel, 12)); bar.position.set(0, .25, 1.5)
}

// ── 포장대와 상자 ─────────────────────────────────────
const STATION = new THREE.Vector3(2.45, .74, .55)
{
  const top = add(new THREE.Mesh(new RoundedBoxGeometry(1.15, .06, 1.15, 3, .02), M.wood))
  top.position.set(STATION.x, STATION.y - .03, STATION.z)
  for (const [x, z] of [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]]) {
    const leg = add(new THREE.Mesh(new RoundedBoxGeometry(.06, STATION.y - .06, .06, 2, .015), M.steel))
    leg.position.set(STATION.x + x, (STATION.y - .06) / 2, STATION.z + z)
  }
}
const kraft = (() => {
  const c = noiseCanvas(512, 512, '#c39a68', 9000, .08)
  const g = c.getContext('2d'); g.fillStyle = 'rgba(210,180,130,.55)'; g.fillRect(0, 230, 512, 52)
  return new THREE.MeshStandardMaterial({ map: texOf(c), roughness: .88 })
})()
const BOX = { w: .58, h: .36, d: .44 }

function newBox() {
  const grp = new THREE.Group()
  grp.position.copy(STATION)
  const box = add(new THREE.Mesh(new RoundedBoxGeometry(BOX.w, BOX.h, BOX.d, 3, .012), kraft), grp)
  box.position.y = BOX.h / 2
  scene.add(grp)
  return grp
}
let stationBox = newBox()

// 포장지 펼친 모양(전개도): 바닥, 앞, 뒤(+뚜껑), 왼쪽, 오른쪽
function faceTex(src, w, h) {
  const t = src.clone(); t.needsUpdate = true
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(w / TILE_SIZE * 1.4, h / TILE_SIZE * 1.4)
  t.offset.set(Math.random(), Math.random())
  return t
}
function flap(w, len, dir, tex) {
  const mat = new THREE.MeshStandardMaterial({ map: faceTex(tex, w, len), roughness: .7, side: THREE.DoubleSide })
  const g = new THREE.PlaneGeometry(dir === 'x' ? len : w, dir === 'x' ? w : len)
  g.rotateX(-Math.PI / 2)
  return { mat, g }
}
function wrapNet(tex) {
  const e = .006, bw = BOX.w + 2 * e, bd = BOX.d + 2 * e, bh = BOX.h + 2 * e
  const net = new THREE.Group()
  const mk = (w, len, dir, sign) => {
    const { mat, g } = flap(w, len, dir, tex)
    if (dir === 'x') g.translate(sign * len / 2, 0, 0); else g.translate(0, 0, sign * len / 2)
    const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true
    return m
  }
  const bottom = mk(bw, bd, 'z', 0); bottom.position.y = .002; net.add(bottom)
  const hinge = (x, z) => { const h = new THREE.Group(); h.position.set(x, .002, z); net.add(h); return h }
  const front = hinge(0, bd / 2); front.add(mk(bw, bh, 'z', 1))
  const back = hinge(0, -bd / 2); back.add(mk(bw, bh, 'z', -1))
  const lid = new THREE.Group(); lid.position.z = -bh; back.add(lid); lid.add(mk(bw, bd, 'z', -1))
  const left = hinge(-bw / 2 - .003, 0); left.add(mk(bd + .01, bh, 'x', -1))
  const right = hinge(bw / 2 + .003, 0); right.add(mk(bd + .01, bh, 'x', 1))
  return { net, front, back, lid, left, right }
}
function ribbonBow(color) {
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: .28, clearcoat: .8, sheen: 1, sheenColor: new THREE.Color(color) })
  const g = new THREE.Group(), e = .012, rw = .055
  const a = add(new THREE.Mesh(new THREE.BoxGeometry(rw, BOX.h + 2 * e, BOX.d + 2 * e), mat), g); a.position.y = BOX.h / 2
  const b = add(new THREE.Mesh(new THREE.BoxGeometry(BOX.w + 2 * e, BOX.h + 2 * e, rw), mat), g); b.position.y = BOX.h / 2
  const bow = new THREE.Group(); bow.position.y = BOX.h + e; g.add(bow)
  for (const s of [-1, 1]) {
    const loop = add(new THREE.Mesh(new THREE.TorusGeometry(.075, .018, 12, 32), mat), bow)
    loop.scale.set(1, .62, 1); loop.rotation.set(0, s * .35, s * .35); loop.position.set(s * .07, .05, 0)
    const tail = add(new THREE.Mesh(new THREE.BoxGeometry(.04, .006, .16), mat), bow)
    tail.position.set(s * .04, .004, .08); tail.rotation.y = s * .5
  }
  add(new THREE.Mesh(new THREE.SphereGeometry(.03, 16, 12), mat), bow).position.y = .03
  return { g, a, b, bow }
}

// 선물 더미
// 선물은 포장대 뒤쪽에 쌓인다
const PILE = [[2.35, -1.2], [3.05, -1.05], [3.65, -1.3], [2.7, -1.8], [3.35, -1.75], [2.35, -1.2], [3.05, -1.05]]
const gifts = []
let wrapping = null
const wrapBtn = document.getElementById('wrap')
function startWrap() {
  if (wrapping) return
  const tex = PU.uNew.value
  const parts = wrapNet(tex)
  stationBox.add(parts.net)
  wrapping = { t: 0, parts, grp: stationBox }
  wrapBtn.disabled = true
}
wrapBtn.addEventListener('click', startWrap)

const clamp01 = (x) => Math.max(0, Math.min(1, x))
const easeIO = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
const seg = (t, a, b) => easeIO(clamp01((t - a) / (b - a)))
function stepWrap(dt) {
  if (!wrapping) return
  const w = wrapping; w.t += dt
  const t = w.t, p = w.parts
  p.net.scale.setScalar(.6 + .4 * seg(t, 0, .25)); p.net.visible = true
  p.front.rotation.x = -Math.PI / 2 * seg(t, .35, .8)
  p.back.rotation.x = Math.PI / 2 * seg(t, .55, 1.0)
  p.left.rotation.z = -Math.PI / 2 * seg(t, .85, 1.3)
  p.right.rotation.z = Math.PI / 2 * seg(t, 1.0, 1.45)
  p.lid.rotation.x = Math.PI / 2 * seg(t, 1.4, 1.9)
  // 선물 더미로
  if (t > 2.3) {
    if (!w.to) {
      const slot = PILE[gifts.length % PILE.length]
      const below = gifts.filter((g) => g.slot === slot).length
      w.slot = slot
      w.to = new THREE.Vector3(slot[0], below * (BOX.h + .03), slot[1])
      w.from = w.grp.position.clone(); w.rot = (Math.random() - .5) * .9
    }
    const k = seg(t, 2.3, 3.2)
    w.grp.position.lerpVectors(w.from, w.to, k)
    w.grp.position.y += Math.sin(k * Math.PI) * .6
    w.grp.rotation.y = w.rot * k
    if (t > 3.2) {
      gifts.push({ grp: w.grp, slot: w.slot })
      if (gifts.length > 14) { const old = gifts.shift(); scene.remove(old.grp) }
      stationBox = newBox(); stationBox.scale.setScalar(.001); stationBox.userData.pop = 0
      wrapping = null; wrapBtn.disabled = false
    }
  }
}

// ── 무늬가 바뀌면 실린더 아래부터 새 무늬 ───────────────
let travel = 0
function applyPattern() {
  const tex = buildTile()
  const prev = PU.uNew.value
  PU.uOld.value = prev || tex
  PU.uNew.value = tex
  PU.uSwitch.value = prev ? drumS - travel : -1e9
  // 인쇄 실린더 표면에도 같은 무늬
  const pt = tex.clone(); pt.needsUpdate = true; pt.wrapS = pt.wrapT = THREE.RepeatWrapping
  pt.repeat.set(2 * Math.PI * PLATE.r / TILE_SIZE, (W + .04) / TILE_SIZE)
  if (plateMat.map) plateMat.map.dispose()
  plateMat.map = pt; plateMat.needsUpdate = true
  inkMat.color.set(state.pen)
  trayInk.material.color.set(state.pen)
  drawPad(); drawPreview(tex.image)
}
let pending = 0
function schedule() { clearTimeout(pending); pending = setTimeout(applyPattern, 90) }

// ── ① 무늬 그리기 ───────────────────────────────────────
const pad = document.getElementById('pad')
const PAD = 504
pad.width = pad.height = PAD
function drawPad() {
  const g = pad.getContext('2d')
  g.fillStyle = state.bg; g.fillRect(0, 0, PAD, PAD)
  const [m, mg] = layer(PAD); renderMotif(mg, PAD); g.drawImage(m, 0, 0)
}
// ② 포장지 미리보기: 무늬가 이어 붙은 모습
const preview = document.getElementById('preview')
function drawPreview(img) {
  if (!preview) return
  const w = preview.width = 504, h = preview.height = 168
  const g = preview.getContext('2d'), t = h * 1.05
  for (let x = 0; x < w; x += t) for (let y = -t * .4; y < h; y += t) g.drawImage(img, x, y, t, t)
}

// 붓 고르기: 버튼마다 그 붓으로 그은 작은 견본
const brushesEl = document.getElementById('brushes')
const brushBtns = BRUSHES.map(([id, name]) => {
  const b = document.createElement('button')
  const c = document.createElement('canvas'); c.width = 128; c.height = 52
  b.appendChild(c); b.appendChild(document.createTextNode(name))
  b.addEventListener('click', () => { state.brush = id; refresh() })
  brushesEl.appendChild(b)
  return { id, b, c }
})
function drawBrushSamples() {
  for (const { id, c } of brushBtns) {
    const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height)
    const S = 128, pts = []
    for (let i = 0; i <= 20; i++) { const x = .12 + i / 20 * .76; pts.push([x, .2 + Math.sin(x * 7) * .06, .45 + .7 * Math.sin(i / 20 * Math.PI)]) }
    g.save(); DRAW[id](g, { brush: id, pts, w: .1, c: state.pen, seed: 7, ang: .7 }, S); g.restore()
  }
}

// 굵기
const sizeEl = document.getElementById('size'), sizeVal = document.getElementById('sizeVal')
sizeEl.addEventListener('input', () => { state.size = +sizeEl.value; sizeVal.textContent = state.size })

// 색 고르기: 색상 바 + 밝기 바 + 스포이드
function hexToHsl(hex) {
  let [r, g, b] = hexRgb(hex).map((v) => v / 255)
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2
  let h = 0, s = 0
  if (mx !== mn) {
    const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn)
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60
  }
  return [h, s * 100, l * 100]
}
function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l)
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))))
  return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('')
}
function picker(el, key, onChange) {
  el.innerHTML = `<div class="chip"><input type="color" title="직접 고르기" /></div>
    <div class="bars"><input type="range" class="hue" min="0" max="360" /><input type="range" class="tone" min="3" max="97" /></div>
    <button class="pill eye" title="스포이드: 화면에서 색 집기">⌖</button>`
  const chip = el.querySelector('.chip'), native = el.querySelector('input[type=color]')
  const hue = el.querySelector('.hue'), tone = el.querySelector('.tone'), eye = el.querySelector('.eye')
  let sat = 85
  const paint = () => {
    chip.style.background = state[key]; native.value = state[key]
    tone.style.background = `linear-gradient(90deg, hsl(${hue.value},${sat}%,4%), hsl(${hue.value},${sat}%,50%), hsl(${hue.value},${sat}%,97%))`
  }
  const fromHex = (hex) => { const [h, s, l] = hexToHsl(hex); hue.value = h; tone.value = l; sat = Math.max(8, s); state[key] = hex; paint(); onChange() }
  const fromBars = () => { if (sat < 30) sat = 85; state[key] = hslToHex(+hue.value, sat, +tone.value); paint(); onChange() }
  hue.addEventListener('input', fromBars); tone.addEventListener('input', fromBars)
  native.addEventListener('input', () => fromHex(native.value))
  // 화면 어디서든 색을 집어 오는 스포이드 (지원하지 않는 브라우저는 색 고르기 창을 연다)
  eye.addEventListener('click', async () => {
    if (window.EyeDropper) { try { const r = await new EyeDropper().open(); fromHex(r.sRGBHex.length === 7 ? r.sRGBHex : '#' + r.sRGBHex.match(/\d+/g).slice(0, 3).map((v) => (+v).toString(16).padStart(2, '0')).join('')) } catch (e) {} }
    else native.click()
  })
  fromHex(state[key])
}
picker(document.getElementById('penPicker'), 'pen', () => { drawBrushSamples(); inkMat.color.set(state.pen); trayInk.material.color.set(state.pen) })
picker(document.getElementById('bgPicker'), 'bg', () => { drawPad(); schedule() })

document.getElementById('undo').addEventListener('click', () => { state.ops.pop(); drawPad(); schedule() })
document.getElementById('clear').addEventListener('click', () => { state.ops = []; drawPad(); schedule() })

// 패드에 그리기: 획마다 붓, 굵기, 색을 따로 기억한다
let stroke = null, lastT = 0
const padXY = (e) => { const r = pad.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height] }
pad.addEventListener('pointerdown', (e) => {
  pad.setPointerCapture(e.pointerId)
  const [x, y] = padXY(e)
  stroke = { brush: state.brush, pts: [[x, y, .8]], w: state.size * .009, c: state.pen, seed: (Math.random() * 1e6) | 0, ang: Math.random() * Math.PI }
  state.ops.push(stroke); lastT = performance.now(); drawPad()
})
pad.addEventListener('pointermove', (e) => {
  if (!stroke) return
  const [x, y] = padXY(e), l = stroke.pts[stroke.pts.length - 1], d = Math.hypot(x - l[0], y - l[1])
  if (d < .005) return
  const now = performance.now(), v = d / Math.max(1, now - lastT) * 1000; lastT = now
  const f = Math.max(.3, Math.min(1.35, 1.35 - v * .55))
  stroke.pts.push([x, y, l[2] * .6 + f * .4]); drawPad(); schedule()
})
const endStroke = () => { if (stroke) { stroke = null; schedule() } }
pad.addEventListener('pointerup', endStroke); pad.addEventListener('pointercancel', endStroke)

// ── ② 포장지 만들기 ─────────────────────────────────────
function pills(id, items, key) {
  const el = document.getElementById(id)
  items.forEach(([val, label]) => {
    const b = document.createElement('button'); b.className = 'pill'; b.textContent = label; b.dataset.val = String(val)
    b.addEventListener('click', () => { state[key] = val; refresh(); schedule() })
    el.appendChild(b)
  })
  return el
}
const repeatEl = pills('repeat', [['grid', '나란히'], ['brick', '벽돌처럼 엇갈리게'], ['mirror', '거울처럼 뒤집어'], ['rotate', '돌려 가며'], ['scatter', '흩뿌리기']], 'repeat')
const scaleEl = pills('scale', [[0, '잘게'], [1, '보통'], [2, '크게']], 'scale')
function refresh() {
  for (const b of repeatEl.children) b.classList.toggle('on', b.dataset.val === state.repeat)
  for (const b of scaleEl.children) b.classList.toggle('on', b.dataset.val === String(state.scale))
  brushBtns.forEach(({ id, b }) => b.classList.toggle('on', id === state.brush))
  sizeEl.value = state.size; sizeVal.textContent = state.size
}
drawBrushSamples()

// ── 시작 ─────────────────────────────────────────────
state.ops = THUMB ? demoOps(1) : []
applyPattern(); refresh()

function resize() {
  const w = innerWidth, h = innerHeight
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  // 패널이 왼쪽을 가리니 화면 중심을 오른쪽으로 민다
  const shift = w > 700 ? Math.min(170, w * .1) : 0
  camera.setViewOffset(w, h, -shift, w > 700 ? 0 : h * .18, w, h)
  camera.updateProjectionMatrix()
}
addEventListener('resize', resize); resize()

const SPEED = 0.22
let last = performance.now(), thumbT = 0
renderer.setAnimationLoop((now) => {
  const dt = Math.min(.05, (now - last) / 1000); last = now
  travel += SPEED * dt
  PU.uTravel.value = travel
  // 롤러는 종이 속도에 맞춰 돈다
  supply.rotation.x -= SPEED * dt / ROLL.r
  plate.rotation.x -= SPEED * dt / PLATE.r
  impr.rotation.x += SPEED * dt / IMPR.r
  ink.rotation.x += SPEED * dt / INK.r
  guides.forEach((g) => (g.rotation.x += SPEED * dt / .06))
  gears[0].m.rotation.x = plate.rotation.x
  gears[1].m.rotation.x = impr.rotation.x * (IMPR.r / PLATE.r) + Math.PI / 22
  gears[2].m.rotation.x = supply.rotation.x
  lamp.material.emissiveIntensity = 1.4 + Math.sin(now / 300) * .8
  // 새 상자가 톡 나타난다
  if (stationBox.userData.pop !== undefined) {
    stationBox.userData.pop += dt * 3
    const k = Math.min(1, stationBox.userData.pop)
    stationBox.scale.setScalar(Math.max(.001, 1 - Math.pow(1 - k, 3) + Math.sin(k * Math.PI) * .12))
    if (k >= 1) { stationBox.scale.setScalar(1); delete stationBox.userData.pop }
  }
  stepWrap(dt)
  if (THUMB) {
    thumbT += dt
    if (thumbT > 3.2) { thumbT = 0; state.ops = demoOps(2 + (Math.random() * 50 | 0)); applyPattern() }
  }
  controls.update()
  renderer.render(scene, camera)
})
