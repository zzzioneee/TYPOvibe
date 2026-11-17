// 별소리: 별 모양 동서남북 종이접기. 방향키로 입을 벌리고, 손을 떼면 그 각도의 말을 한다.
import * as THREE from 'three'

const THUMB = new URLSearchParams(location.search).has('thumb')
if (THUMB) document.documentElement.classList.add('thumb')

const D = Math.PI / 180
const TAU = Math.PI * 2
const clamp = THREE.MathUtils.clamp

// ── 종이 색 ────────────────────────────────────────────
const PAPERS = [
  { paper: '#f7c525', bg: '#3c60b4' },
  { paper: '#f4a2b5', bg: '#3b8c5c' },
  { paper: '#62c070', bg: '#3d5cae' },
  { paper: '#b8a3ec', bg: '#efbf3a' },
  { paper: '#f28a3c', bg: '#2e8789' },
  { paper: '#f4eedf', bg: '#d6534d' },
  { paper: '#80b8f0', bg: '#ef9566' },
]

// ── 렌더러 · 장면 ───────────────────────────────────────
const canvas = document.getElementById('view')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace

const scene = new THREE.Scene()
scene.background = new THREE.Color(PAPERS[0].bg)
const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60)
camera.position.set(0, 0.05, 6.4)

scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cfc4, 2.1))
const sun = new THREE.DirectionalLight(0xffffff, 1.7)
sun.position.set(-2.6, 3.2, 6)
scene.add(sun)

// ── 동화책 후처리: 거친 입자, 끊긴 외곽선, 어긋난 인쇄 그림자 ──
const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4, depthTexture: new THREE.DepthTexture(1, 1) })
const post = new THREE.ShaderMaterial({
  uniforms: {
    tColor: { value: rt.texture }, tDepth: { value: rt.depthTexture },
    res: { value: new THREE.Vector2(1, 1) }, time: { value: 0 }, dpr: { value: 1 },
    near: { value: camera.near }, far: { value: camera.far },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: `
    uniform sampler2D tColor, tDepth; uniform vec2 res; uniform float time, dpr, near, far;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
    float ld(vec2 uv){ float z = texture2D(tDepth, uv).r * 2. - 1.; return 2. * near * far / (far + near - z * (far - near)); }
    float lum(vec2 uv){ return dot(texture2D(tColor, uv).rgb, vec3(.299, .587, .114)); }
    float solid(vec2 uv){ return step(texture2D(tDepth, uv).r, .99999); }
    vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
    void main(){
      vec2 fc = gl_FragCoord.xy / dpr;
      vec2 px = 1. / res;
      vec3 col = texture2D(tColor, vUv).rgb;
      float m = solid(vUv);
      // 겹쳐 찍은 듯 어긋난 진한 면
      float mo = solid(vUv - vec2(8., -8.) * px * dpr);
      col = mix(col, col * vec3(.5, .54, .66), (1. - m) * mo);
      // 명암을 몇 단계로 눌러 납작한 색면으로
      float l = dot(col, vec3(.299, .587, .114));
      float lq = floor(l * 6. + .5) / 6.;
      col *= mix(1., lq / max(l, 1e-3), .5 * m);
      // 면 위로 아주 옅은 세로 그러데이션
      col *= 1. + (vUv.y - .5) * .12 * m;
      // 고운 입자: 픽셀 단위 노이즈 + 결이 다른 큰 얼룩
      float g = hash(fc + .37) - .5;
      float g2 = hash(floor(fc / 2.) + 11.) - .5;
      col *= 1. + g * .24 + g2 * .12;
      col *= .97 + .06 * vnoise(fc / 90.);
      col += step(.985, hash(fc * 1.7 + 3.)) * .06;
      gl_FragColor = vec4(toSRGB(clamp(col, 0., 1.)), 1.);
    }`,
})
const postScene = new THREE.Scene()
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post))
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

// ── 별 모양 ─────────────────────────────────────────────
// 다섯 팔은 가운데 능선이 솟은 피라미드. 입은 오른쪽·왼쪽 팔 아래 골에서 갈라진다.
const R = 1, r = 0.42, H = 0.36, BK = 0.07
const pt = (deg, rad, z = 0) => new THREE.Vector3(Math.cos(deg * D) * rad, Math.sin(deg * D) * rad, z)
const T = (a) => pt(a, R)
const V = (a) => pt(a, r)
const C = new THREE.Vector3(0, 0, H)
const B = new THREE.Vector3(0, 0, -BK)
const VL = V(198), VR = V(342)
const S = 1.05 // 텍스처가 덮는 반경

// 얼굴 텍스처: 종이 결, 볼, 입선
const faceCanvas = document.createElement('canvas')
faceCanvas.width = faceCanvas.height = 1024
const faceTex = new THREE.CanvasTexture(faceCanvas)
faceTex.colorSpace = THREE.SRGBColorSpace
faceTex.anisotropy = 8
const backCanvas = document.createElement('canvas')
backCanvas.width = backCanvas.height = 512
const backTex = new THREE.CanvasTexture(backCanvas)
backTex.colorSpace = THREE.SRGBColorSpace

function paperGrain(ctx, size, hex, seed) {
  const rnd = mulberry(seed)
  ctx.fillStyle = hex
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < size * 6; i++) {
    const light = rnd() < 0.5
    ctx.fillStyle = light ? `rgba(255,255,255,${0.05 + rnd() * 0.08})` : `rgba(60,40,20,${0.025 + rnd() * 0.04})`
    const x = rnd() * size, y = rnd() * size
    ctx.save(); ctx.translate(x, y); ctx.rotate(rnd() * Math.PI)
    ctx.fillRect(0, 0, 2 + rnd() * size * 0.012, 0.8 + rnd())
    ctx.restore()
  }
}

function toCanvas(x, y) { return [(x / S + 1) / 2 * 1024, (1 - (y / S + 1) / 2) * 1024] }

function drawFace(hex) {
  const ctx = faceCanvas.getContext('2d')
  paperGrain(ctx, 1024, hex, 11)
  // 볼
  for (const sx of [-1, 1]) {
    const [cx, cy] = toCanvas(sx * 0.33, -0.035)
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 46)
    g.addColorStop(0, 'rgba(240,90,110,.32)')
    g.addColorStop(1, 'rgba(240,90,110,0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.ellipse(cx, cy, 56, 38, 0, 0, TAU); ctx.fill()
  }
  // 입선: 가운데가 뾰족한 웃는 입
  ctx.strokeStyle = '#d62f2a'
  ctx.lineWidth = 13
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  const p = [[-0.2, -0.22], [-0.1, -0.29], [0, -0.335], [0.1, -0.29], [0.2, -0.22]].map(([x, y]) => toCanvas(x, y))
  ctx.moveTo(...p[0])
  ctx.quadraticCurveTo(...p[1], ...p[2])
  ctx.quadraticCurveTo(...p[3], ...p[4])
  ctx.stroke()
  faceTex.needsUpdate = true

  paperGrain(backCanvas.getContext('2d'), 512, hex, 23)
  backTex.needsUpdate = true
}

const frontMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.86, flatShading: true, side: THREE.DoubleSide })
const backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.9, flatShading: true, side: THREE.DoubleSide })

const head = new THREE.Group()
scene.add(head)

// ── 한 장으로 이어진 별, 네 조각으로 벌어진다 ─────────────
// 동서남북처럼 가운데 꼭짓점 C가 네 조각(위왼·위오·아래왼·아래오)의 꼭짓점으로 갈라진다.
// ↑↓: 입꼬리 VL–VR 선을 경첩으로 위아래가 벌어지고, ←→: 세로선 T90–V270을 경첩으로 좌우가 벌어진다.
// 테두리 점은 어느 조각에서나 같은 자리에 있어서 종이가 찢어지지 않는다.
const REST = {
  T18: T(18), T90: T(90), T162: T(162), V54: V(54), V126: V(126),
  T234: T(234), T306: T(306), V270: V(270), VL, VR,
  MT: new THREE.Vector3().lerpVectors(C, T(90), 0.42),
  Cul: C.clone(), Cur: C.clone(), Cll: C.clone(), Clr: C.clone(), D: C.clone(), B: B.clone(),
}
const CUR = Object.fromEntries(Object.entries(REST).map(([k, v]) => [k, v.clone()]))
const QUAD = { Cur: [1, 1], Cul: [1, -1], Cll: [-1, -1], Clr: [-1, 1] } // [위/아래, 오른/왼]

const FRONT_UP = [['Cur', 'VR', 'T18'], ['Cur', 'T18', 'V54'], ['Cur', 'V54', 'MT'], ['MT', 'V54', 'T90'], ['MT', 'T90', 'V126'], ['Cul', 'MT', 'V126'], ['Cul', 'V126', 'T162'], ['Cul', 'T162', 'VL']]
const FRONT_LO = [['Cll', 'VL', 'T234'], ['Cll', 'T234', 'V270'], ['Clr', 'V270', 'T306'], ['Clr', 'T306', 'VR']]
// 안쪽 주머니: 갈라진 네 꼭짓점 사이로 접혀 들어간 면
const POCKET = [
  ['Cur', 'MT', 'D'], ['MT', 'Cul', 'D'], ['Cul', 'VL', 'D'], ['VL', 'Cll', 'D'],
  ['Cll', 'V270', 'D'], ['V270', 'Clr', 'D'], ['Clr', 'VR', 'D'], ['VR', 'Cur', 'D'],
]
const RIM = ['VR', 'T18', 'V54', 'T90', 'V126', 'T162', 'VL', 'T234', 'V270', 'T306']
const BACK = RIM.map((k, i) => ['B', RIM[(i + 1) % RIM.length], k])

function liveMesh(tris, mat, colorOf) {
  const g = new THREE.BufferGeometry()
  const pos = new Float32Array(tris.length * 9)
  const uv = [], col = []
  for (const tri of tris) for (const k of tri) {
    const p = REST[k]
    uv.push((p.x / S + 1) / 2, (p.y / S + 1) / 2)
    if (colorOf) { const c = colorOf(k); col.push(c, c, c) }
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  if (colorOf) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  const m = new THREE.Mesh(g, mat)
  m.frustumCulled = false
  head.add(m)
  return { m, g, pos, tris }
}
const innerMat = new THREE.MeshStandardMaterial({ map: backTex, vertexColors: true, roughness: 0.92, flatShading: true, side: THREE.DoubleSide })
const parts = [
  liveMesh([...FRONT_UP, ...FRONT_LO], frontMat),
  liveMesh(BACK, backMat),
  liveMesh(POCKET, innerMat, (k) => (k === 'D' ? 0.22 : k[0] === 'C' ? 0.8 : 0.6)),
]

const Y0 = VR.y
// 좌우 경첩(세로선 x=0)으로 먼저, 위아래 경첩(가로선 y=Y0)으로 다음에 돌린다. 경첩 위의 점은 제자리.
function bend(p, a, b, out) {
  const cb = Math.cos(b), sb = Math.sin(b)
  const x = p.x * cb + p.z * sb, z = -p.x * sb + p.z * cb
  const ca = Math.cos(a), sa = Math.sin(a)
  const dy = p.y - Y0
  return out.set(x, Y0 + dy * ca - z * sa, dy * sa + z * ca)
}
const sgn = (v, eps = 1e-6) => (v > eps ? 1 : v < -eps ? -1 : 0)
const AU = 0.16, AL = 0.42, BS = 0.18

function foldStar(o, w) {
  for (const k of RIM) {
    const p = REST[k]
    const v = sgn(p.y - Y0), h = sgn(p.x)
    bend(p, v > 0 ? -o * AU : v < 0 ? o * AL : 0, h > 0 ? w * BS : h < 0 ? -w * BS : 0, CUR[k])
  }
  bend(REST.MT, -o * AU, 0, CUR.MT)
  CUR.MT.z -= 0.04 * w
  for (const [k, [v, h]] of Object.entries(QUAD)) {
    bend(C, v > 0 ? -o * AU : o * AL, h > 0 ? w * BS : -w * BS, CUR[k])
    CUR[k].y += v > 0 ? o * 0.12 : -o * 0.3
    CUR[k].x += h * w * 0.36
    CUR[k].z -= (v > 0 ? 0.04 : 0.02) * o + 0.03 * w
  }
  // 안쪽 주머니: 네 꼭짓점이 벌어진 만큼 안으로 꺼진다
  CUR.D.set(0, 0, 0)
  for (const k in QUAD) CUR.D.add(CUR[k])
  CUR.D.multiplyScalar(0.25)
  const gap = Math.max(CUR.Cur.distanceTo(CUR.Clr), CUR.Cur.distanceTo(CUR.Cul))
  CUR.D.z = Math.max(CUR.D.z - gap * 1.05, -BK * 0.5)
  CUR.B.set(0, 0, -BK - gap * 0.25)
  for (const part of parts) {
    let i = 0
    for (const tri of part.tris) for (const k of tri) {
      const p = CUR[k]
      part.pos[i++] = p.x; part.pos[i++] = p.y; part.pos[i++] = p.z
    }
    part.g.attributes.position.needsUpdate = true
    part.g.computeVertexNormals()
  }
}

// 눈: 윗턱 면에 무게중심 좌표로 붙여 두고, 면이 접힐 때마다 따라간다
function locate(tris, x, y) {
  for (const keys of tris) {
    const [a, b, c] = keys.map((k) => REST[k])
    const d = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y)
    const w1 = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / d
    const w2 = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / d
    const w3 = 1 - w1 - w2
    if (w1 >= -1e-6 && w2 >= -1e-6 && w3 >= -1e-6) return { keys, w: [w1, w2, w3] }
  }
  return null
}

const eyes = []
const circle = new THREE.CircleGeometry(1, 40)
const black = new THREE.MeshBasicMaterial({ color: 0x1b1714 })
const white = new THREE.MeshBasicMaterial({ color: 0xffffff })
for (const sx of [-1, 1]) {
  const g = new THREE.Group()
  g.matrixAutoUpdate = false
  const blink = new THREE.Group()
  const ball = new THREE.Mesh(circle, black)
  ball.scale.set(0.062, 0.085, 1)
  const glint = new THREE.Mesh(circle, white)
  glint.scale.set(0.022, 0.026, 1)
  glint.position.set(0.018, 0.03, 0.002)
  blink.add(ball, glint)
  g.add(blink)
  head.add(g)
  eyes.push({ g, blink, at: locate(FRONT_UP, sx * 0.15, 0.43) })
}
const _e = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
function placeEyes() {
  for (const e of eyes) {
    const [a, b, c] = e.at.keys.map((k) => CUR[k])
    const [w1, w2, w3] = e.at.w
    const p = _e[0].set(0, 0, 0).addScaledVector(a, w1).addScaledVector(b, w2).addScaledVector(c, w3)
    const n = _e[1].subVectors(b, a).cross(_e[2].subVectors(c, a)).normalize()
    const xA = _e[3].set(1, 0, 0).projectOnPlane(n).normalize()
    const yA = _e[4].crossVectors(n, xA)
    e.g.matrix.makeBasis(xA, yA, n).setPosition(p.addScaledVector(n, 0.004))
  }
}

// ── 낯선 말 ─────────────────────────────────────────────
function mulberry(a) {
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
const hashInts = (...n) => n.reduce((h, v) => Math.imul(h ^ (v + 0x9e3779b9), 2654435761) >>> 0, 2166136261)

// 모음: 포먼트 F1·F2·F3, 입 벌림 정도
const VOWELS = {
  a: [820, 1300, 2700, 1], ɛ: [650, 1800, 2600, 0.78], e: [480, 2000, 2700, 0.55],
  i: [300, 2350, 3050, 0.25], o: [520, 880, 2550, 0.6], u: [330, 820, 2350, 0.22],
  ɯ: [350, 1450, 2450, 0.28], ø: [430, 1650, 2350, 0.45], ʌ: [620, 1200, 2600, 0.7],
}
const CONS = {
  p: { k: 'stop', f: 900, lab: 1 }, b: { k: 'stop', f: 700, voiced: 1, lab: 1 },
  t: { k: 'stop', f: 4200 }, d: { k: 'stop', f: 3400, voiced: 1 },
  k: { k: 'stop', f: 1900 }, g: { k: 'stop', f: 1600, voiced: 1 },
  m: { k: 'nasal', f2: 1000, lab: 1 }, n: { k: 'nasal', f2: 1600 }, ŋ: { k: 'nasal', f2: 2000 },
  s: { k: 'fric', f: 6500 }, ʃ: { k: 'fric', f: 3200 }, h: { k: 'fric', f: 1500, soft: 1 },
  l: { k: 'liquid' }, r: { k: 'trill' }, ʔ: { k: 'glottal' },
}

function makeLang(seed) {
  const rnd = mulberry(seed)
  return { seed, tonal: rnd() < 0.5, pitch: 820 + rnd() * 360, rate: 0.95 + rnd() * 0.35 }
}

// 한 줄 문장을 소리 그대로 휘파람 음절로 옮긴다: 초성 → 자음, 중성 → 모음(음높이), 종성 → 받침
const CHO = ['g', 'k', 'n', 'd', 't', 'l', 'm', 'b', 'p', 's', 's', null, 'ʃ', 'ʃ', 'ʃ', 'k', 't', 'p', 'h']
const JUNG = ['a', 'ɛ', 'a', 'ɛ', 'ʌ', 'e', 'ʌ', 'e', 'o', 'a', 'ɛ', 'ø', 'o', 'u', 'ʌ', 'e', 'i', 'u', 'ɯ', 'i', 'i']
const LATIN_V = { a: 'a', e: 'e', i: 'i', o: 'o', u: 'u', y: 'i' }
const LATIN_C = { b: 'b', c: 'k', d: 'd', f: 'h', g: 'g', h: 'h', j: 'ʃ', k: 'k', l: 'l', m: 'm', n: 'n', p: 'p', q: 'k', r: 'r', s: 's', t: 't', v: 'b', w: null, x: 's', z: 's' }

function lineToWord(line, lang, loud) {
  const syl = []
  let pend = null, q = 0
  for (const ch of line) {
    const code = ch.codePointAt(0)
    if (code >= 0xac00 && code <= 0xd7a3) {
      const k = code - 0xac00
      syl.push({ c: CHO[Math.floor(k / 588)], v: JUNG[Math.floor((k % 588) / 28)], coda: k % 28 > 0, len: 0.9 + (code % 5) * 0.08 })
    } else if (/\s/.test(ch)) {
      if (syl.length) syl[syl.length - 1].gap = true
    } else if (ch === '?') q = 1
    else if (ch === '!') q = -1
    else {
      const lo = ch.toLowerCase()
      if (LATIN_V[lo]) { syl.push({ c: pend, v: LATIN_V[lo], coda: false, len: 0.8 }); pend = null }
      else if (lo in LATIN_C) pend = LATIN_C[lo]
    }
  }
  if (!syl.length) syl.push({ c: null, v: 'a', coda: false, len: 1 })
  if (lang.tonal) syl.forEach((s, i) => { s.tone = ['L', 'M', 'H', 'R', 'F'][hashInts(lang.seed, i, s.v.charCodeAt(0)) % 5] })
  return { syl: syl.slice(0, 42), tb: q, loud }
}

// 같은 별이 같은 자세를 하면 늘 같은 문장을 말한다
let LINES = ['…']
fetch('./lines.json').then((r) => r.json()).then((d) => { if (d.lines && d.lines.length) LINES = d.lines }).catch(() => {})
function lineFor(lang, openDeg, sideDeg) {
  return LINES[hashInts(lang.seed, Math.round(openDeg / 4), Math.round(sideDeg / 4)) % LINES.length]
}

let ac = null, master = null, voiceBus = null, crinkle = null
function startAudio() {
  if (THUMB) return
  if (ac) { if (ac.state !== 'running') ac.resume(); return }
  ac = new AudioContext()
  const comp = ac.createDynamicsCompressor()
  comp.threshold.value = -16; comp.ratio.value = 4
  master = ac.createGain()
  master.gain.value = 0.85
  master.connect(comp).connect(ac.destination)
  // 휘파람이 방 안에 살짝 퍼지도록 짧은 잔향
  voiceBus = ac.createGain()
  voiceBus.connect(master)
  const verb = ac.createConvolver()
  const ir = ac.createBuffer(2, ac.sampleRate * 1.3, ac.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.2)
  }
  verb.buffer = ir
  const wet = ac.createGain()
  wet.gain.value = 0.28
  voiceBus.connect(verb).connect(wet).connect(master)
  // 종이가 접히는 바스락 소리
  const src = ac.createBufferSource()
  src.buffer = noiseBuffer(2)
  src.loop = true
  const bp = ac.createBiquadFilter()
  bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.6
  crinkle = ac.createGain()
  crinkle.gain.value = 0
  src.connect(bp).connect(crinkle).connect(master)
  src.start()
}
let NOISE = null
function noiseBuffer(sec = 1) {
  if (NOISE && sec === 1) return NOISE
  const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  if (sec === 1) NOISE = b
  return b
}

let speech = null

function stopSpeech() {
  if (!speech) return
  const t = ac.currentTime
  speech.out.gain.cancelScheduledValues(t)
  speech.out.gain.setValueAtTime(speech.out.gain.value, t)
  speech.out.gain.linearRampToValueAtTime(0, t + 0.04)
  for (const s of speech.srcs) { try { s.stop(t + 0.06) } catch (_) { /* 이미 멈춤 */ } }
  speech = null
}

// 휘파람 말: 모음은 음높이(높은 '이' ~ 낮은 '우'), 자음은 음이 끊기거나 휘는 모양으로 옮긴다.
// 실보 고메로처럼 말의 억양과 리듬만 남고, 뜻은 전해지지 않는다.
const WHISTLE = { i: 1.9, e: 1.66, ɛ: 1.52, ø: 1.42, ɯ: 1.32, a: 1.22, ʌ: 1.12, o: 1.0, u: 0.9 }

function speak(word, lang, pan, base) {
  if (!ac) return
  stopSpeech()
  const t0 = ac.currentTime + 0.03
  const out = ac.createGain()
  out.gain.value = word.loud * 0.32
  const panner = ac.createStereoPanner()
  panner.pan.value = pan
  const soft = ac.createBiquadFilter()
  soft.type = 'lowpass'; soft.frequency.value = 5200
  out.connect(soft).connect(panner).connect(voiceBus)

  const osc = ac.createOscillator()
  osc.type = 'sine'
  const osc2 = ac.createOscillator()
  osc2.type = 'sine'
  const o2g = ac.createGain(); o2g.gain.value = 0.07
  const vib = ac.createOscillator()
  vib.frequency.value = 5.2
  const vibG = ac.createGain(); vibG.gain.value = lang.pitch * 0.008
  const vibG2 = ac.createGain(); vibG2.gain.value = lang.pitch * 0.016
  vib.connect(vibG).connect(osc.frequency)
  vib.connect(vibG2).connect(osc2.frequency)
  const vg = ac.createGain(); vg.gain.value = 0
  osc.connect(vg); osc2.connect(o2g).connect(vg)
  vg.connect(out)

  // 숨소리: 휘파람 음 근처의 바람
  const ns = ac.createBufferSource()
  ns.buffer = noiseBuffer(); ns.loop = true
  const nf = ac.createBiquadFilter()
  nf.type = 'bandpass'; nf.Q.value = 5
  const ng = ac.createGain(); ng.gain.value = 0
  ns.connect(nf).connect(ng).connect(out)

  const sp = 1 / lang.rate
  const tl = [[t0, 0]]
  const marks = []
  let t = t0
  const freq = (f, at, jump) => {
    for (const [prm, k] of [[osc.frequency, 1], [osc2.frequency, 2], [nf.frequency, 1]]) {
      if (jump) prm.setValueAtTime(f * k, at)
      else prm.linearRampToValueAtTime(f * k, at)
    }
  }
  const amp = (v, at, breath = 0.07) => {
    vg.gain.linearRampToValueAtTime(v, at)
    ng.gain.linearRampToValueAtTime(v * breath, at)
  }
  const vowelP = (s) => lang.pitch * WHISTLE[s.v]
  vg.gain.setValueAtTime(0, t0)
  ng.gain.setValueAtTime(0, t0)
  freq(vowelP(word.syl[0]) * 0.92, t0, true)

  const n = word.syl.length
  word.syl.forEach((s, i) => {
    const c = s.c ? CONS[s.c] : null
    const vp = vowelP(s)
    const last = i === n - 1
    let onset = 0.03
    if (c) {
      if (c.k === 'stop') {
        // 음이 끊겼다가, 자음 자리에 따라 위나 아래에서 미끄러져 들어온다
        amp(0, t + 0.012)
        tl.push([t + 0.02, c.lab ? 0 : 0.2])
        t += 0.045 * sp
        const locus = c.lab ? 0.8 : c.f > 3000 ? 1.16 : 1.05
        freq(vp * locus, t, true)
        if (!c.voiced) { ng.gain.setValueAtTime(0.06, t); ng.gain.linearRampToValueAtTime(0, t + 0.03) }
        onset = c.voiced ? 0.03 : 0.01
      } else if (c.k === 'fric') {
        amp(c.soft ? 0.2 : 0.12, t + 0.02, c.soft ? 0.5 : 1.2)
        tl.push([t + 0.02, 0.3])
        t += 0.07 * sp
      } else if (c.k === 'nasal') {
        amp(0.35, t + 0.02)
        freq(vp * 0.84, t + 0.02)
        tl.push([t + 0.02, c.lab ? 0 : 0.15])
        t += 0.06 * sp
      } else if (c.k === 'liquid') {
        amp(0.6, t + 0.02)
        freq(vp * 0.95, t + 0.02)
        tl.push([t + 0.02, 0.3])
        t += 0.04 * sp
      } else if (c.k === 'trill') {
        amp(0.7, t + 0.02)
        for (let k = 0; k < 3; k++) { freq(vp * 1.07, t + 0.012); freq(vp * 0.95, t + 0.024); t += 0.024 }
        tl.push([t, 0.3])
      } else if (c.k === 'glottal') {
        amp(0, t + 0.006)
        t += 0.05
        onset = 0.008
      }
    }
    // 모음: 성조가 있으면 음이 오르내린다
    const vd = (0.12 + 0.07 * s.len) * sp * (last ? 1.5 : 1)
    let [k0, k1] = s.tone
      ? { L: [0.9, 0.88], M: [1, 1], H: [1.12, 1.13], R: [0.92, 1.16], F: [1.15, 0.9] }[s.tone]
      : [1.04 - 0.08 * i / Math.max(1, n - 1), 1 - 0.08 * i / Math.max(1, n - 1)]
    if (last && word.tb > 0) k1 *= 1.25
    if (last && word.tb < 0) k1 *= 0.85
    marks.push({ t, p: WHISTLE[s.v] * (k0 + k1) / 2, gap: !!s.gap })
    amp(1, t + onset)
    freq(vp * k0, t + 0.04)
    freq(vp * k1, t + vd)
    tl.push([t + 0.04, VOWELS[s.v][3]], [t + vd * 0.85, VOWELS[s.v][3] * 0.85])
    t += vd
    if (s.coda) {
      amp(0.45, t + 0.03)
      freq(vp * k1 * 0.88, t + 0.03)
      tl.push([t + 0.03, 0.15])
      t += 0.06 * sp
    }
    if (s.gap && !last) { amp(0, t + 0.03); tl.push([t + 0.03, 0.05]); t += 0.11 * sp }
    else { amp(last ? 0 : 0.6, t + (last ? 0.08 : 0.02)); t += last ? 0.08 : 0.015 }
  })
  tl.push([t, 0])
  for (const src of [osc, osc2, vib, ns]) { src.start(t0); src.stop(t + 0.25) }
  speech = { out, srcs: [osc, osc2, vib, ns], tl, end: t, base }
  return marks
}

function mouthAt(time) {
  const tl = speech.tl
  if (time <= tl[0][0]) return tl[0][1]
  for (let i = 1; i < tl.length; i++) {
    if (time <= tl[i][0]) {
      const [ta, a] = tl[i - 1], [tb, b] = tl[i]
      return a + (b - a) * ((time - ta) / Math.max(1e-4, tb - ta))
    }
  }
  return 0
}

// ── 상태 · 조작 ─────────────────────────────────────────
const MAX_OPEN = 56
const state = { hold: 0, open: 0, side: 0, wide: 0, spin: 0, paper: 0, speakAt: 0, blink: 0, nextBlink: 2 }
let lang = makeLang(Math.floor(Math.random() * 1e9))
const keys = { up: false, down: false, left: false, right: false }
let drag = null

drawFace(PAPERS[0].paper)

function anyHeld() { return keys.up || keys.down || keys.left || keys.right || !!drag }
function onRelease() { if (!anyHeld()) state.speakAt = performance.now() + 160 }
function onGrab() { state.speakAt = 0; if (speech) stopSpeech(); hideBubble() }

function sayNow() {
  state.speakAt = 0
  const big = Math.max(state.hold, state.side)
  if (big < 5) return
  const line = lineFor(lang, state.hold, state.side)
  const loud = 0.55 + clamp(big / 50, 0.15, 1) * 0.45
  const marks = speak(lineToWord(line, lang, loud), lang, 0, big)
  if (marks) showBubble(line, marks)
}

function newStar() {
  let k
  do { k = Math.floor(Math.random() * PAPERS.length) } while (k === state.paper)
  state.paper = k
  state.spin = 1
  lang = makeLang(Math.floor(Math.random() * 1e9))
  setTimeout(() => {
    drawFace(PAPERS[k].paper)
    scene.background.set(PAPERS[k].bg)
    document.body.style.background = PAPERS[k].bg
    tintBubble(PAPERS[k].bg)
  }, 180)
  if (Math.max(state.hold, state.side) < 12) state.hold = 22
  setTimeout(sayNow, 620)
}

const ARROWS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }
window.addEventListener('keydown', (e) => {
  startAudio()
  const k = ARROWS[e.key]
  if (k) {
    e.preventDefault()
    if (!keys[k]) { keys[k] = true; onGrab() }
  } else if (e.key === 'r' || e.key === 'R' || e.key === ' ') {
    e.preventDefault()
    newStar()
  }
})
window.addEventListener('keyup', (e) => {
  const k = ARROWS[e.key]
  if (k && keys[k]) { keys[k] = false; onRelease() }
})
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false })

canvas.addEventListener('pointerdown', (e) => {
  startAudio()
  canvas.setPointerCapture(e.pointerId)
  drag = { x: e.clientX, y: e.clientY }
  onGrab()
})
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return
  const s = 300 / Math.min(innerWidth, innerHeight)
  const dy = -(e.clientY - drag.y) * 0.36 * s, dx = (e.clientX - drag.x) * 0.36 * s
  if (Math.abs(dy) >= Math.abs(dx)) openAxis('v', dy)
  else openAxis('h', dx)
  drag.x = e.clientX; drag.y = e.clientY
})
// 동서남북처럼 한쪽으로 벌리면 다른 쪽은 닫힌다
function openAxis(axis, d) {
  if (axis === 'v') {
    state.hold = clamp(state.hold + d, 0, MAX_OPEN)
    if (d > 0) state.side = Math.max(0, state.side - d * 1.4)
  } else {
    state.side = clamp(state.side + d, 0, MAX_OPEN)
    if (d > 0) state.hold = Math.max(0, state.hold - d * 1.4)
  }
}
const endDrag = () => { if (drag) { drag = null; onRelease() } }
canvas.addEventListener('pointerup', endDrag)
canvas.addEventListener('pointercancel', endDrag)

// ── 말풍선: 휘파람 악보 → 누르면 원래 한 줄 ─────────────
const bubble = document.getElementById('bubble')
const notesEl = bubble.querySelector('.notes')
const textEl = bubble.querySelector('.text')
let bubbleMarks = []
function showBubble(line, marks) {
  notesEl.textContent = ''
  const ps = marks.map((m) => m.p)
  const lo = Math.min(...ps), hi = Math.max(...ps)
  bubbleMarks = marks.map((m) => {
    const el = document.createElement('i')
    el.style.transform = `translateY(${-((m.p - lo) / Math.max(0.01, hi - lo)) * 14}px)`
    if (m.gap) el.classList.add('gap')
    notesEl.appendChild(el)
    return { el, t: m.t }
  })
  textEl.textContent = line
  bubble.classList.remove('open')
  bubble.classList.add('show')
}
// 말풍선 그림자와 점 색은 배경색을 눌러 만든다 (별의 어긋난 면과 같은 비율)
function tintBubble(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const mul = (k) => `rgb(${c.map((v, i) => Math.round(v * k[i])).join(',')})`
  bubble.style.setProperty('--shadow', mul([0.73, 0.756, 0.828]))
  bubble.style.setProperty('--ink', mul([0.34, 0.34, 0.4]))
}
tintBubble(PAPERS[0].bg)
function hideBubble() { bubble.classList.remove('show', 'open'); bubbleMarks = [] }
bubble.addEventListener('pointerdown', (e) => e.stopPropagation())
bubble.addEventListener('click', () => bubble.classList.toggle('open'))
const anchor = new THREE.Vector3()

const degEl = document.getElementById('deg')
let lastDeg = ''

function resize() {
  const w = innerWidth, h = innerHeight
  renderer.setSize(w, h, false)
  const pr = renderer.getPixelRatio()
  rt.setSize(Math.round(w * pr), Math.round(h * pr))
  post.uniforms.res.value.set(Math.round(w * pr), Math.round(h * pr))
  post.uniforms.dpr.value = pr
  camera.aspect = w / h
  // 세로로 긴 화면에서도 별이 다 보이게
  camera.position.z = w / h < 1 ? 6.4 / Math.max(0.55, w / h) : 6.4
  camera.updateProjectionMatrix()
}
addEventListener('resize', resize)
resize()

// ── 루프 ────────────────────────────────────────────────
const clock = new THREE.Clock()
let prevOpen = 0, prevWide = 0
function tick() {
  const dt = Math.min(0.033, clock.getDelta())
  const now = performance.now()
  const time = now / 1000

  if (THUMB) {
    // 손가락으로 위아래, 양옆을 번갈아 벌리는 동서남북
    const k = Math.sin(time * 2.4)
    state.hold = Math.max(0, k) * 44
    state.side = Math.max(0, -k) * 44
  } else {
    if (keys.up) openAxis('v', 62 * dt)
    if (keys.down) openAxis('v', -62 * dt)
    if (keys.right) openAxis('h', 62 * dt)
    if (keys.left) openAxis('h', -62 * dt)
    if (state.speakAt && now >= state.speakAt) sayNow()
  }

  let target = state.hold, targetW = state.side
  let talking = false
  if (speech && ac && ac.state !== 'running') speech = null
  if (speech && ac) {
    const at = ac.currentTime
    if (at > speech.end + 0.05) speech = null
    else {
      // 말할 때는 더 크게 벌린 쪽으로 뻐끔거린다
      talking = true
      const m = mouthAt(at) * 1.05
      if (state.hold >= state.side) target = Math.max(state.hold, 20) * m
      else targetW = Math.max(state.side, 20) * m
    }
  }
  const ease = Math.min(1, dt * (talking ? 26 : 14))
  state.open += (target - state.open) * ease
  state.wide += (targetW - state.wide) * ease

  // 별을 새로 받을 때 한 바퀴
  let spinA = 0
  if (state.spin > 0) {
    state.spin = Math.max(0, state.spin - dt * 1.6)
    const e = 1 - state.spin
    spinA = (1 - Math.pow(1 - e, 3)) * TAU
    if (state.spin === 0) spinA = 0
  }

  const o = state.open * D, w = state.wide * D
  foldStar(o, w)
  placeEyes()
  head.rotation.y = Math.sin(time * 0.5) * 0.03 + spinA
  head.rotation.z = Math.sin(time * 1.3) * 0.015
  head.rotation.x = -o * 0.12 + Math.sin(time * 0.9) * 0.02
  head.position.y = -0.02 + Math.sin(time * 1.6) * 0.018 + o * 0.12

  // 깜빡임
  if (time > state.nextBlink) { state.blink = 1; state.nextBlink = time + 2.2 + Math.random() * 3.2 }
  state.blink = Math.max(0, state.blink - dt * 7)
  const lid = 1 - Math.sin(state.blink * Math.PI) * 0.92
  for (const e of eyes) e.blink.scale.y = lid

  if (crinkle) {
    const v = Math.abs(state.open - prevOpen) / dt + Math.abs(state.wide - prevWide) / dt
    const g = talking ? 0 : Math.min(0.22, v / 360) * (0.35 + Math.random() * 0.65)
    crinkle.gain.setTargetAtTime(g, ac.currentTime, 0.02)
  }
  prevOpen = state.open; prevWide = state.wide

  const label = `위아래 ${Math.round(state.hold)}° · 양옆 ${Math.round(state.side)}°`
  if (label !== lastDeg) { degEl.textContent = label; lastDeg = label }

  // 말풍선 위치와 음표가 하나씩 켜지는 시점
  if (bubble.classList.contains('show')) {
    anchor.set(0.62, 0.78, 0.2)
    head.localToWorld(anchor).project(camera)
    const bx = (anchor.x * 0.5 + 0.5) * innerWidth, by = (0.5 - anchor.y * 0.5) * innerHeight
    bubble.style.left = `${clamp(bx, 16, Math.max(16, innerWidth - bubble.offsetWidth - 16))}px`
    bubble.style.top = `${Math.max(12, by - bubble.offsetHeight)}px`
    const at = ac ? ac.currentTime : Infinity
    for (const m of bubbleMarks) if (!m.on && at >= m.t) { m.on = true; m.el.classList.add('on') }
  }

  post.uniforms.time.value = time
  renderer.setRenderTarget(rt)
  renderer.render(scene, camera)
  renderer.setRenderTarget(null)
  renderer.render(postScene, postCam)
  requestAnimationFrame(tick)
}
tick()
