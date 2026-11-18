// 별소리: 별 모양 동서남북 종이접기. 입을 벌렸다 놓으면 '좋네', '잘했네' 같은 한 마디를 내뱉는다.
// 같은 말이어도 톤은 매번 다르다. 진심인지, 비꼬는지, 슬픈지, 부러운지, 지쳤는지, 화났는지에 따라
// 별의 색 온도와 몸 모양이 바뀐다. 자막은 늘 같은 한 줄이다.
import * as THREE from 'three'

const THUMB = new URLSearchParams(location.search).has('thumb')
if (THUMB) document.documentElement.classList.add('thumb')

const D = Math.PI / 180
const clamp = THREE.MathUtils.clamp

// ── 톤마다 온도와 몸 ───────────────────────────────────
// heat: 위 → 아래 그라디언트 / scale: 크기 / H: 가운데가 솟은 정도 / r: 골 깊이(클수록 뭉툭)
// spike: 팔 길이 / droop: 팔이 처진 정도 / crumple: 구김 / twist: 팔이 한쪽으로 꼬인 정도
// sink·tiltX·tiltZ: 고개 / eye: 눈 뜬 정도 / shake·bounce: 말할 때 몸짓
const MOODS = {
  idle: { heat: ['#ffe27a', '#f7c525', '#efa92a'], scale: 1, H: 0.36, r: 0.42, spike: 1, droop: 0, crumple: 0, twist: 0, sink: 0, tiltX: 0, tiltZ: 0, eye: 1, shake: 0, bounce: 0 },
  sincere: { heat: ['#ffd36e', '#ff9a5a', '#ff6f7d'], scale: 1.06, H: 0.46, r: 0.42, spike: 1.02, droop: -0.08, crumple: 0, twist: 0, sink: 0.06, tiltX: -0.08, tiltZ: 0, eye: 1.1, shake: 0, bounce: 1 },
  sarcastic: { heat: ['#d9f25a', '#7fe0c8', '#e548b8'], scale: 1, H: 0.34, r: 0.4, spike: 1.06, droop: 0, crumple: 0.015, twist: 0.3, sink: 0, tiltX: 0, tiltZ: 0.24, eye: 0.62, shake: 0, bounce: 0 },
  sad: { heat: ['#a9c3ea', '#5b7fd4', '#2c3f8f'], scale: 0.8, H: 0.14, r: 0.47, spike: 0.86, droop: 0.55, crumple: 0.07, twist: 0, sink: -0.3, tiltX: 0.4, tiltZ: 0.06, eye: 0.72, shake: 0, bounce: 0 },
  envious: { heat: ['#c4e86a', '#4fc28a', '#21806f'], scale: 0.93, H: 0.28, r: 0.41, spike: 0.98, droop: 0.14, crumple: 0.02, twist: -0.1, sink: -0.06, tiltX: 0.08, tiltZ: -0.28, eye: 0.85, shake: 0, bounce: 0 },
  tired: { heat: ['#dcd8cf', '#b9b4c6', '#8d90a8'], scale: 0.9, H: 0.12, r: 0.49, spike: 0.9, droop: 0.4, crumple: 0.05, twist: 0, sink: -0.22, tiltX: 0.24, tiltZ: -0.08, eye: 0.42, shake: 0, bounce: 0 },
  angry: { heat: ['#ffb199', '#ff4a2f', '#9e1230'], scale: 1.14, H: 0.56, r: 0.33, spike: 1.12, droop: -0.12, crumple: 0.012, twist: 0, sink: 0.04, tiltX: -0.14, tiltZ: 0, eye: 0.9, shake: 1, bounce: 0 },
}
const NUM = ['scale', 'H', 'r', 'spike', 'droop', 'crumple', 'twist', 'sink', 'tiltX', 'tiltZ', 'eye', 'shake', 'bounce']
const toLin = (h) => new THREE.Color(h)                       // sRGB 문자열 → 선형 색
const mood = { ...MOODS.idle, heat: MOODS.idle.heat.map(toLin) } // 지금 그려지는 값
let moodTo = mood

// ── 렌더러 · 장면 ───────────────────────────────────────
const canvas = document.getElementById('view')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace

const BG = toLin('#f2eee7')
const scene = new THREE.Scene()
scene.background = BG.clone()
const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60)
camera.position.set(0, 0.05, 6.4)

scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cfc4, 2.1))
const sun = new THREE.DirectionalLight(0xffffff, 1.7)
sun.position.set(-2.6, 3.2, 6)
scene.add(sun)

// ── 후처리: 납작한 면, 고운 입자, 어긋나게 겹친 진한 면 ──
const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4, depthTexture: new THREE.DepthTexture(1, 1) })
const post = new THREE.ShaderMaterial({
  uniforms: { tColor: { value: rt.texture }, tDepth: { value: rt.depthTexture }, res: { value: new THREE.Vector2(1, 1) }, dpr: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: `
    uniform sampler2D tColor, tDepth; uniform vec2 res; uniform float dpr;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
    float solid(vec2 uv){ return step(texture2D(tDepth, uv).r, .99999); }
    vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
    void main(){
      vec2 fc = gl_FragCoord.xy / dpr;
      vec2 px = 1. / res;
      vec3 col = texture2D(tColor, vUv).rgb;
      float m = solid(vUv);
      float mo = solid(vUv - vec2(8., -8.) * px * dpr);
      col = mix(col, col * vec3(.62, .62, .68), (1. - m) * mo);
      float l = dot(col, vec3(.299, .587, .114));
      float lq = floor(l * 6. + .5) / 6.;
      col *= mix(1., lq / max(l, 1e-3), .45 * m);
      float g = hash(fc + .37) - .5;
      float g2 = hash(floor(fc / 2.) + 11.) - .5;
      col *= 1. + g * .2 + g2 * .1;
      col *= .97 + .06 * vnoise(fc / 90.);
      gl_FragColor = vec4(toSRGB(clamp(col, 0., 1.)), 1.);
    }`,
})
const postScene = new THREE.Scene()
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post))
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

// ── 종이 결 ─────────────────────────────────────────────
function mulberry(a) {
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
const S = 1.05 // 텍스처가 덮는 반경
const faceCanvas = document.createElement('canvas')
faceCanvas.width = faceCanvas.height = 1024
const faceTex = new THREE.CanvasTexture(faceCanvas)
faceTex.colorSpace = THREE.SRGBColorSpace
faceTex.anisotropy = 8
const backCanvas = document.createElement('canvas')
backCanvas.width = backCanvas.height = 512
const backTex = new THREE.CanvasTexture(backCanvas)
backTex.colorSpace = THREE.SRGBColorSpace

function paperGrain(ctx, size, seed) {
  const rnd = mulberry(seed)
  ctx.fillStyle = '#fbf7ef'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < size * 6; i++) {
    const light = rnd() < 0.5
    ctx.fillStyle = light ? `rgba(255,255,255,${0.1 + rnd() * 0.1})` : `rgba(60,40,20,${0.03 + rnd() * 0.05})`
    const x = rnd() * size, y = rnd() * size
    ctx.save(); ctx.translate(x, y); ctx.rotate(rnd() * Math.PI)
    ctx.fillRect(0, 0, 2 + rnd() * size * 0.012, 0.8 + rnd())
    ctx.restore()
  }
}
const toCanvas = (x, y) => [(x / S + 1) / 2 * 1024, (1 - (y / S + 1) / 2) * 1024]
function drawFace() {
  const ctx = faceCanvas.getContext('2d')
  paperGrain(ctx, 1024, 11)
  for (const sx of [-1, 1]) {
    const [cx, cy] = toCanvas(sx * 0.33, -0.035)
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 46)
    g.addColorStop(0, 'rgba(240,90,110,.3)')
    g.addColorStop(1, 'rgba(240,90,110,0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.ellipse(cx, cy, 56, 38, 0, 0, Math.PI * 2); ctx.fill()
  }
  faceTex.needsUpdate = true
  paperGrain(backCanvas.getContext('2d'), 512, 23)
  backTex.needsUpdate = true
}
drawFace()

// ── 한 장으로 이어진 별, 네 조각으로 벌어진다 ─────────────
// 가운데 꼭짓점 C가 네 조각의 꼭짓점으로 갈라진다. ↑↓는 입꼬리 VL–VR 선을, ←→는 세로선 T90–V270을 경첩으로 벌어진다.
// 테두리 점은 어느 조각에서나 같은 자리에 있어서 종이가 찢어지지 않는다. 몸 모양(REST)은 톤에 따라 매 프레임 바뀐다.
const KEYS = ['T18', 'T90', 'T162', 'T234', 'T306', 'V54', 'V126', 'V198', 'V270', 'V342', 'MT', 'C', 'B']
const REST = Object.fromEntries(KEYS.map((k) => [k, new THREE.Vector3()]))
REST.VL = REST.V198; REST.VR = REST.V342
for (const k of ['Cul', 'Cur', 'Cll', 'Clr', 'D']) REST[k] = REST.C
const UVREST = {}
const CUR = Object.fromEntries(Object.keys(REST).map((k) => [k, new THREE.Vector3()]))
const QUAD = { Cur: [1, 1], Cul: [1, -1], Cll: [-1, -1], Clr: [-1, 1] }
const CRUMPLE = (() => { const rnd = mulberry(5); return Object.fromEntries(KEYS.map((k) => [k, new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5)])) })()

function shapeRest(m) {
  const sc = m.scale
  for (const a of [18, 90, 162, 234, 306]) {
    const ang = (a + m.twist * 28 * (a === 90 ? 0.4 : 1)) * D
    let x = Math.cos(ang) * sc * m.spike, y = Math.sin(ang) * sc * m.spike
    // 처진 팔: 옆 팔은 아래로, 위 팔은 짧게 꺾인다
    y -= m.droop * Math.abs(x) * 0.6
    if (a === 90) y *= 1 - m.droop * 0.32
    if (a === 234 || a === 306) x *= 1 - m.droop * 0.18
    REST['T' + a].set(x, y, 0)
  }
  for (const a of [54, 126, 198, 270, 342]) REST['V' + a].set(Math.cos(a * D) * sc * m.r, Math.sin(a * D) * sc * m.r - m.droop * 0.05, 0)
  REST.C.set(0, -m.droop * 0.04, m.H * sc)
  REST.B.set(0, 0, -0.07)
  REST.MT.lerpVectors(REST.C, REST.T90, 0.42)
  if (m.crumple > 0) for (const k of KEYS) if (k !== 'B') REST[k].addScaledVector(CRUMPLE[k], m.crumple * (k[0] === 'T' ? 1.6 : 1))
}
shapeRest(MOODS.idle)
for (const k in REST) UVREST[k] = REST[k].clone()

const FRONT_UP = [['Cur', 'VR', 'T18'], ['Cur', 'T18', 'V54'], ['Cur', 'V54', 'MT'], ['MT', 'V54', 'T90'], ['MT', 'T90', 'V126'], ['Cul', 'MT', 'V126'], ['Cul', 'V126', 'T162'], ['Cul', 'T162', 'VL']]
const FRONT_LO = [['Cll', 'VL', 'T234'], ['Cll', 'T234', 'V270'], ['Clr', 'V270', 'T306'], ['Clr', 'T306', 'VR']]
const POCKET = [
  ['Cur', 'MT', 'D'], ['MT', 'Cul', 'D'], ['Cul', 'VL', 'D'], ['VL', 'Cll', 'D'],
  ['Cll', 'V270', 'D'], ['V270', 'Clr', 'D'], ['Clr', 'VR', 'D'], ['VR', 'Cur', 'D'],
]
const RIM = ['VR', 'T18', 'V54', 'T90', 'V126', 'T162', 'VL', 'T234', 'V270', 'T306']
const BACK = RIM.map((k, i) => ['B', RIM[(i + 1) % RIM.length], k])

const head = new THREE.Group()
scene.add(head)
const paperMat = (map) => new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: 0.88, flatShading: true, side: THREE.DoubleSide })

// 색은 꼭짓점마다: 위→아래 그라디언트 × 면의 그늘
function liveMesh(tris, mat, shadeOf) {
  const g = new THREE.BufferGeometry()
  const pos = new Float32Array(tris.length * 9)
  const col = new Float32Array(tris.length * 9)
  const uv = [], vy = [], shade = []
  for (const tri of tris) for (const k of tri) {
    const p = UVREST[k]
    uv.push((p.x / S + 1) / 2, (p.y / S + 1) / 2)
    vy.push(clamp((1 - p.y) / 2, 0, 1))
    shade.push(shadeOf ? shadeOf(k) : 1)
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const m = new THREE.Mesh(g, mat)
  m.frustumCulled = false
  head.add(m)
  return { g, pos, col, tris, vy, shade }
}
const parts = [
  liveMesh([...FRONT_UP, ...FRONT_LO], paperMat(faceTex)),
  liveMesh(BACK, paperMat(backTex), () => 0.85),
  liveMesh(POCKET, paperMat(backTex), (k) => (k === 'D' ? 0.22 : k[0] === 'C' ? 0.8 : 0.6)),
]
const _c = new THREE.Color()
function heatAt(t, out) {
  const h = mood.heat
  return t < 0.5 ? out.copy(h[0]).lerp(h[1], t * 2) : out.copy(h[1]).lerp(h[2], (t - 0.5) * 2)
}
function paint() {
  for (const p of parts) {
    for (let i = 0; i < p.vy.length; i++) {
      heatAt(p.vy[i], _c).multiplyScalar(p.shade[i])
      p.col[i * 3] = _c.r; p.col[i * 3 + 1] = _c.g; p.col[i * 3 + 2] = _c.b
    }
    p.g.attributes.color.needsUpdate = true
  }
}

let Y0 = 0
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
  Y0 = (REST.VL.y + REST.VR.y) / 2
  for (const k of RIM) {
    const p = REST[k]
    const v = sgn(p.y - Y0, 0.02), h = sgn(p.x, 0.02)
    bend(p, v > 0 ? -o * AU : v < 0 ? o * AL : 0, h > 0 ? w * BS : h < 0 ? -w * BS : 0, CUR[k])
  }
  bend(REST.MT, -o * AU, 0, CUR.MT)
  CUR.MT.z -= 0.04 * w
  for (const [k, [v, h]] of Object.entries(QUAD)) {
    bend(REST.C, v > 0 ? -o * AU : o * AL, h > 0 ? w * BS : -w * BS, CUR[k])
    CUR[k].y += v > 0 ? o * 0.12 : -o * 0.3
    CUR[k].x += h * w * 0.36
    CUR[k].z -= (v > 0 ? 0.04 : 0.02) * o + 0.03 * w
  }
  CUR.D.set(0, 0, 0)
  for (const k in QUAD) CUR.D.add(CUR[k])
  CUR.D.multiplyScalar(0.25)
  const gap = Math.max(CUR.Cur.distanceTo(CUR.Clr), CUR.Cur.distanceTo(CUR.Cul))
  CUR.D.z = Math.max(CUR.D.z - gap * 1.05, -0.035)
  CUR.B.set(0, 0, -0.07 - gap * 0.25)
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

// ── 눈 ──────────────────────────────────────────────────
function locate(tris, x, y) {
  for (const keys of tris) {
    const [a, b, c] = keys.map((k) => UVREST[k])
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

// ── 목소리 ──────────────────────────────────────────────
const VOICE = await fetch('./tone/tones.json').then((r) => r.json())
const subEl = document.getElementById('sub')
const toneEl = document.getElementById('tone')
let voice = null          // { audio, clip }
let lastTone = -1

let ac = null, crinkle = null
function startAudio() {
  if (THUMB) return
  if (ac) { if (ac.state !== 'running') ac.resume(); return }
  ac = new AudioContext()
  // 종이가 접히는 바스락 소리
  const n = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate)
  const d = n.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource()
  src.buffer = n; src.loop = true
  const bp = ac.createBiquadFilter()
  bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.6
  crinkle = ac.createGain()
  crinkle.gain.value = 0
  src.connect(bp).connect(crinkle).connect(ac.destination)
  src.start()
}

function setMood(id) {
  const m = MOODS[id]
  moodTo = { ...m, heat: m.heat.map(toLin) }
}

// 아무 말이나, 아무 톤으로
function speak() {
  const ph = VOICE.phrases[Math.floor(Math.random() * VOICE.phrases.length)]
  let ti
  do { ti = Math.floor(Math.random() * VOICE.tones.length) } while (ti === lastTone && VOICE.tones.length > 1)
  lastTone = ti
  const tone = VOICE.tones[ti]
  setMood(tone.id)
  subEl.textContent = `${ph.text}.`
  toneEl.textContent = tone.label
  document.body.classList.add('said')
  if (voice) voice.audio.pause()
  if (THUMB) { voice = { clip: ph.clips[tone.id], t0: performance.now() }; return }
  const audio = new Audio(`./tone/voice/${ph.id}-${tone.id}.mp3`)
  voice = { audio, clip: ph.clips[tone.id] }
  audio.play().catch(() => {})
  audio.addEventListener('ended', () => { if (voice && voice.audio === audio) voice = null })
}
function stopVoice() { if (voice && voice.audio) voice.audio.pause(); voice = null }

// 지금 목소리의 크기 → 입 벌림 (0~1)
function mouthNow() {
  if (!voice) return null
  const t = voice.audio ? voice.audio.currentTime : (performance.now() - voice.t0) / 1000
  if (voice.audio && voice.audio.paused && t > 0) return null
  const c = voice.clip
  if (t > c.dur + 0.05) { if (!voice.audio) voice = null; return null }
  const db = c.db[Math.min(c.db.length - 1, Math.floor(t / 0.02))]
  return clamp((db + 42) / 26, 0, 1)
}

// ── 상태 · 조작 ─────────────────────────────────────────
const MAX_OPEN = 56
const state = { hold: 0, open: 0, side: 0, wide: 0, speakAt: 0, blink: 0, nextBlink: 2 }
const keys = { up: false, down: false, left: false, right: false }
let drag = null

function anyHeld() { return keys.up || keys.down || keys.left || keys.right || !!drag }
function onRelease() { if (!anyHeld() && Math.max(state.hold, state.side) >= 5) state.speakAt = performance.now() + 140 }
function onGrab() { state.speakAt = 0; stopVoice() }

const ARROWS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }
addEventListener('keydown', (e) => {
  startAudio()
  const k = ARROWS[e.key]
  if (k) {
    e.preventDefault()
    if (!keys[k]) { keys[k] = true; onGrab() }
  } else if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    if (Math.max(state.hold, state.side) < 12) state.hold = 24
    speak()
  }
})
addEventListener('keyup', (e) => {
  const k = ARROWS[e.key]
  if (k && keys[k]) { keys[k] = false; onRelease() }
})
addEventListener('blur', () => { for (const k in keys) keys[k] = false })

canvas.addEventListener('pointerdown', (e) => {
  startAudio()
  canvas.setPointerCapture(e.pointerId)
  drag = { x: e.clientX, y: e.clientY, moved: 0 }
  onGrab()
})
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return
  const s = 300 / Math.min(innerWidth, innerHeight)
  const dy = -(e.clientY - drag.y) * 0.36 * s, dx = (e.clientX - drag.x) * 0.36 * s
  drag.moved += Math.abs(dx) + Math.abs(dy)
  if (Math.abs(dy) >= Math.abs(dx)) openAxis('v', dy)
  else openAxis('h', dx)
  drag.x = e.clientX; drag.y = e.clientY
})
function openAxis(axis, d) {
  // 동서남북처럼 한쪽으로 벌리면 다른 쪽은 닫힌다
  if (axis === 'v') {
    state.hold = clamp(state.hold + d, 0, MAX_OPEN)
    if (d > 0) state.side = Math.max(0, state.side - d * 1.4)
  } else {
    state.side = clamp(state.side + d, 0, MAX_OPEN)
    if (d > 0) state.hold = Math.max(0, state.hold - d * 1.4)
  }
}
const endDrag = () => {
  if (!drag) return
  const tap = drag.moved < 4
  drag = null
  if (tap) { if (Math.max(state.hold, state.side) < 12) state.hold = 24; speak() } else onRelease()
}
canvas.addEventListener('pointerup', endDrag)
canvas.addEventListener('pointercancel', endDrag)

function resize() {
  const w = innerWidth, h = innerHeight
  renderer.setSize(w, h, false)
  const pr = renderer.getPixelRatio()
  rt.setSize(Math.round(w * pr), Math.round(h * pr))
  post.uniforms.res.value.set(Math.round(w * pr), Math.round(h * pr))
  post.uniforms.dpr.value = pr
  camera.aspect = w / h
  camera.position.z = w / h < 1 ? 6.4 / Math.max(0.55, w / h) : 6.4
  camera.updateProjectionMatrix()
}
addEventListener('resize', resize)
resize()

// ── 루프 ────────────────────────────────────────────────
const clock = new THREE.Clock()
let prevOpen = 0, prevWide = 0, thumbNext = 0
const bgNow = new THREE.Color()
function tick() {
  const dt = Math.min(0.033, clock.getDelta())
  const now = performance.now()
  const time = now / 1000

  if (THUMB) {
    if (now > thumbNext) { thumbNext = now + 2600; state.hold = 26; speak() }
  } else {
    if (keys.up) openAxis('v', 62 * dt)
    if (keys.down) openAxis('v', -62 * dt)
    if (keys.right) openAxis('h', 62 * dt)
    if (keys.left) openAxis('h', -62 * dt)
    if (state.speakAt && now >= state.speakAt) { state.speakAt = 0; speak() }
  }

  // 톤의 몸과 온도로 천천히 옮겨 간다
  const k = Math.min(1, dt * 3.2)
  for (const n of NUM) mood[n] += (moodTo[n] - mood[n]) * k
  mood.heat.forEach((c, i) => c.lerp(moodTo.heat[i], k))
  shapeRest(mood)
  paint()
  bgNow.copy(BG).lerp(mood.heat[1], 0.16)
  scene.background.copy(bgNow)

  let target = state.hold, targetW = state.side
  const m = mouthNow()
  const talking = m != null
  if (talking) {
    // 목소리 크기에 맞춰, 더 크게 벌린 쪽으로 뻐끔거린다
    if (state.hold >= state.side) target = Math.max(state.hold, 22) * (0.15 + m * 0.95)
    else targetW = Math.max(state.side, 22) * (0.15 + m * 0.95)
  }
  const ease = Math.min(1, dt * (talking ? 24 : 14))
  state.open += (target - state.open) * ease
  state.wide += (targetW - state.wide) * ease

  const o = state.open * D, w = state.wide * D
  foldStar(o, w)
  placeEyes()
  const shake = talking ? mood.shake * Math.sin(time * 55) * 0.018 : 0
  const bounce = talking ? mood.bounce * Math.abs(Math.sin(time * 7)) * 0.06 : 0
  head.rotation.y = Math.sin(time * 0.5) * 0.03
  head.rotation.z = mood.tiltZ + Math.sin(time * 1.3) * 0.015
  head.rotation.x = mood.tiltX - o * 0.12 + Math.sin(time * 0.9) * 0.02
  head.position.set(shake, -0.02 + mood.sink + bounce + Math.sin(time * 1.6) * 0.018 + o * 0.12, 0)

  if (time > state.nextBlink) { state.blink = 1; state.nextBlink = time + 2.2 + Math.random() * 3.2 }
  state.blink = Math.max(0, state.blink - dt * 7)
  const lid = (1 - Math.sin(state.blink * Math.PI) * 0.92) * mood.eye
  for (const e of eyes) e.blink.scale.y = lid

  if (crinkle) {
    const v = Math.abs(state.open - prevOpen) / dt + Math.abs(state.wide - prevWide) / dt
    const g = talking ? 0 : Math.min(0.22, v / 360) * (0.35 + Math.random() * 0.65)
    crinkle.gain.setTargetAtTime(g, ac.currentTime, 0.02)
  }
  prevOpen = state.open; prevWide = state.wide

  renderer.setRenderTarget(rt)
  renderer.render(scene, camera)
  renderer.setRenderTarget(null)
  renderer.render(postScene, postCam)
  requestAnimationFrame(tick)
}
tick()
