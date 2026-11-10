import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

const THUMB = new URLSearchParams(location.search).has('thumb')
if (THUMB) document.documentElement.classList.add('thumb')

const N = 40
const SEG = 96
const CLAY_MAX_H = 0.85
const SHELF = { y: 1.28, z: -1.28, span: 1.7, perRow: 6, rows: 3, gap: 0.32 }
const SHELF_POT_H = SHELF.gap - 0.08
const ASSET = new URL('./models/', import.meta.url).href

const canvas = document.querySelector('#view')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const scene = new THREE.Scene()
scene.background = new THREE.Color('#1a1410')
scene.fog = new THREE.Fog('#1a1410', 6, 16)
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
scene.environmentIntensity = 0.45

const camera = new THREE.PerspectiveCamera(58, 1, 0.04, 24)
camera.position.set(0, 1.42, 0.98)
camera.lookAt(0, 0.82, 0)
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.target.set(0, 0.82, 0)
controls.minDistance = 0.55
controls.maxDistance = 6
controls.minPolarAngle = 0.18
controls.maxPolarAngle = Math.PI * 0.48
controls.enablePan = true
controls.autoRotate = THUMB
controls.autoRotateSpeed = 0.35

scene.add(new THREE.AmbientLight('#c9a882', 0.22))
scene.add(new THREE.HemisphereLight('#f0dcc0', '#3a2a20', 0.35))
const bulb = new THREE.PointLight('#ffd7a0', 10, 11, 1.4)
bulb.position.set(0.2, 2.5, 0.45)
bulb.castShadow = true
bulb.shadow.mapSize.set(1024, 1024)
scene.add(bulb)

const texLoader = new THREE.TextureLoader()
function colorMap(url, repeat = 1) {
  const t = texLoader.load(url)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  hardenTex(t)
  return t
}
function linMap(url, repeat = 1) {
  const t = texLoader.load(url)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  hardenTex(t)
  return t
}

const woodDiff = colorMap(`${ASSET}wood/wood_diff.jpg`, 2.2)
const woodNor = linMap(`${ASSET}wood/wood_nor.jpg`, 2.2)
woodNor.colorSpace = THREE.NoColorSpace
const woodRough = linMap(`${ASSET}wood/wood_rough.jpg`, 2.2)

function hardenTex(t) {
  if (!t) return
  t.anisotropy = renderer.capabilities.getMaxAnisotropy()
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.magFilter = THREE.LinearFilter
  t.needsUpdate = true
}

function woodMat(repeat = 2.2, extra = {}) {
  const d = woodDiff.clone(); d.repeat.set(repeat, repeat); hardenTex(d)
  const n = woodNor.clone(); n.repeat.set(repeat, repeat); hardenTex(n)
  const r = woodRough.clone(); r.repeat.set(repeat, repeat); hardenTex(r)
  return new THREE.MeshStandardMaterial({
    map: d, normalMap: n, roughnessMap: r, roughness: 0.88, metalness: 0.02,
    normalScale: new THREE.Vector2(0.45, 0.45), ...extra,
  })
}

const clayCanvas = document.createElement('canvas')
clayCanvas.width = clayCanvas.height = 256
{
  const ctx = clayCanvas.getContext('2d')
  ctx.fillStyle = '#c49b78'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = `rgba(${160 + Math.random() * 50},${110 + Math.random() * 40},${80 + Math.random() * 30},${0.15 + Math.random() * 0.25})`
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2)
  }
}
const clayMap = new THREE.CanvasTexture(clayCanvas)
clayMap.colorSpace = THREE.SRGBColorSpace
clayMap.wrapS = clayMap.wrapT = THREE.RepeatWrapping
clayMap.repeat.set(2, 2)

const floor = new THREE.Mesh(new THREE.CircleGeometry(7, 64), woodMat(4, { color: '#8a6a52' }))
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)

const BAT = 0.204
const FLY = 0.234
const panGeo = mergeVertices(new THREE.LatheGeometry([
  new THREE.Vector2(0.001, 0.004),
  new THREE.Vector2(FLY + 0.012, 0.004),
  new THREE.Vector2(FLY + 0.02, 0.048),
  new THREE.Vector2(FLY + 0.048, 0.05),
  new THREE.Vector2(FLY + 0.05, 0.002),
], 80))
panGeo.computeVertexNormals()
const pan = new THREE.Mesh(panGeo, woodMat(0.9, { color: '#5a4032', side: THREE.DoubleSide }))
pan.castShadow = true
scene.add(pan)

const wheel = new THREE.Mesh(new THREE.CylinderGeometry(FLY, FLY, 0.04, 64), woodMat(0.55))
wheel.castShadow = true
scene.add(wheel)
const head = new THREE.Mesh(new THREE.CylinderGeometry(BAT, BAT, 0.026, 64), woodMat(0.4, { color: '#c4a07a' }))
head.castShadow = true
scene.add(head)

const shelfUnit = new THREE.Group()
scene.add(shelfUnit)
const shelfBoards = []
const shelfBack = new THREE.Mesh(
  new THREE.BoxGeometry(SHELF.span + 0.2, SHELF.gap * SHELF.rows + 0.2, 0.05),
  woodMat(1.8, { color: '#4a372c' }),
)
shelfUnit.add(shelfBack)

const doneGroup = new THREE.Group()
scene.add(doneGroup)

const clayGroup = new THREE.Group()
scene.add(clayGroup)
const clayMat = new THREE.MeshPhysicalMaterial({
  map: clayMap,
  color: '#d2a57c',
  roughness: 0.62,
  metalness: 0,
  sheen: 0.22,
  sheenColor: '#e8c9a8',
  clearcoat: 0.08,
  clearcoatRoughness: 0.7,
})
const clayMesh = new THREE.Mesh(new THREE.BufferGeometry(), clayMat)
clayMesh.castShadow = true
clayGroup.add(clayMesh)

const hands = { left: new THREE.Group(), right: new THREE.Group() }
scene.add(hands.left, hands.right)

const keys = { up: false, down: false, left: false, right: false }
const state = {
  r: new Float32Array(N),
  height: 0.2,
  hole: 0.22,
  tool: 0.55,
  spin: 0,
  flying: null,
  tableY: 0.65,
}

function lumpProfile() {
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    state.r[i] = 0.08 * Math.cos(t * Math.PI * 0.28)
  }
  state.height = 0.2
  state.hole = 0.22
  state.tool = 0.55
}

function yAt(i) {
  return (i / (N - 1)) * state.height
}

function rebuildClay() {
  const thick = 0.02
  const floorY = Math.max(0.03, state.height * (1 - state.hole))
  const innerTop = Math.max(0.025, state.r[N - 1] - thick)
  const pts = [new THREE.Vector2(0.001, 0)]
  for (let i = 0; i < N; i++) pts.push(new THREE.Vector2(Math.max(0.03, state.r[i]), yAt(i)))
  pts.push(new THREE.Vector2(innerTop, state.height))
  for (let k = 1; k <= 12; k++) {
    const t = k / 12
    pts.push(new THREE.Vector2(
      THREE.MathUtils.lerp(innerTop, 0.04, t),
      THREE.MathUtils.lerp(state.height, floorY, t),
    ))
  }
  pts.push(new THREE.Vector2(0.001, floorY))
  let geo = mergeVertices(new THREE.LatheGeometry(pts, SEG))
  geo.computeVertexNormals()
  clayMesh.geometry.dispose()
  clayMesh.geometry = geo
}

function radiusAtTool() {
  const t = THREE.MathUtils.clamp(state.tool, 0, 1)
  const f = t * (N - 1)
  const i = Math.floor(f)
  const j = Math.min(N - 1, i + 1)
  return THREE.MathUtils.lerp(state.r[i], state.r[j], f - i)
}

function squeeze(dir, dt) {
  const t = THREE.MathUtils.clamp(state.tool, 0, 1)
  const sigma = 0.14
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1)
    const w = Math.exp(-((u - t) ** 2) / (2 * sigma * sigma))
    state.r[i] += dir * w * dt * 0.16
    const maxR = i < 3 ? BAT - 0.02 : 0.38
    state.r[i] = THREE.MathUtils.clamp(state.r[i], i === 0 ? 0.06 : 0.03, maxR)
  }
}

function resetClay() {
  lumpProfile()
  rebuildClay()
}

function shelfSlot(i) {
  const cap = SHELF.perRow * SHELF.rows
  const idx = i % cap
  const row = Math.floor(idx / SHELF.perRow)
  const col = idx % SHELF.perRow
  const x = -SHELF.span * 0.5 + (col + 0.5) * (SHELF.span / SHELF.perRow)
  const extra = Math.floor(i / cap) * 0.12
  return new THREE.Vector3(x, SHELF.y + row * SHELF.gap + extra, SHELF.z + 0.02)
}

function submitPot() {
  if (state.flying) return
  const mesh = new THREE.Mesh(
    clayMesh.geometry.clone(),
    new THREE.MeshPhysicalMaterial({
      map: clayMap,
      color: '#d2a57c',
      roughness: 0.55,
      sheen: 0.18,
      sheenColor: '#e8c9a8',
    }),
  )
  mesh.castShadow = true
  mesh.position.copy(clayGroup.position)
  mesh.rotation.y = clayGroup.rotation.y
  scene.add(mesh)
  const dest = shelfSlot(doneGroup.children.length)
  dest.y += 0.01
  const s = SHELF_POT_H / CLAY_MAX_H
  state.flying = {
    mesh,
    from: mesh.position.clone(),
    dest,
    t: 0,
    fromScale: new THREE.Vector3(1, 1, 1),
    toScale: new THREE.Vector3(s, s, s),
  }
  resetClay()
}

function fitWidth(root, width) {
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  root.scale.multiplyScalar(width / Math.max(size.x, 0.001))
  root.updateMatrixWorld(true)
  box.setFromObject(root)
  root.position.x -= (box.min.x + box.max.x) * 0.5
  root.position.y -= box.min.y
  root.position.z -= (box.min.z + box.max.z) * 0.5
}

function placeHands() {
  const y = state.tableY + 0.02 + state.tool * state.height
  const r = radiusAtTool()
  const x = r + 0.04
  const z = 0.05
  hands.left.position.set(-x, y, z)
  hands.right.position.set(x, y, z)
  const pinch = keys.left ? 0.18 : keys.right ? -0.08 : 0
  hands.left.rotation.set(Math.PI * 0.5, 0.1, pinch)
  hands.right.rotation.set(Math.PI * 0.5, -0.1, -pinch)
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') keys.up = true
  if (e.key === 'ArrowDown') keys.down = true
  if (e.key === 'ArrowLeft') keys.left = true
  if (e.key === 'ArrowRight') keys.right = true
  if (e.key === 'r' || e.key === 'R') resetClay()
  if (e.key === 'Enter') { e.preventDefault(); submitPot() }
  if (e.key.startsWith('Arrow')) e.preventDefault()
})
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowUp') keys.up = false
  if (e.key === 'ArrowDown') keys.down = false
  if (e.key === 'ArrowLeft') keys.left = false
  if (e.key === 'ArrowRight') keys.right = false
})
function step(dt) {
  const working = keys.up || keys.down || keys.left || keys.right
  if (keys.up) {
    if (state.tool < 0.9) state.tool = Math.min(0.9, state.tool + dt * 0.5)
    else {
      const prev = state.height
      state.height = Math.min(CLAY_MAX_H, state.height + dt * 0.18)
      const thin = Math.sqrt(prev / state.height)
      for (let i = 0; i < N; i++) {
        const maxR = i < 3 ? BAT - 0.02 : 0.38
        state.r[i] = THREE.MathUtils.clamp(state.r[i] * THREE.MathUtils.lerp(1, thin, 0.4), 0.03, maxR)
      }
    }
  }
  if (keys.down) {
    if (state.tool > 0.08) state.tool = Math.max(0.08, state.tool - dt * 0.5)
    else state.height = Math.max(0.28, state.height - dt * 0.2)
  }
  if (keys.left) squeeze(-1, dt)
  if (keys.right) squeeze(1, dt)
  if (working) rebuildClay()
  setClayWork(working)
  clayGroup.rotation.y = state.spin
  wheel.rotation.y = state.spin
  head.rotation.y = state.spin
  placeHands()
  if (state.flying) {
    const f = state.flying
    f.t = Math.min(1, f.t + dt * 1.35)
    const k = 1 - (1 - f.t) ** 3
    f.mesh.position.lerpVectors(f.from, f.dest, k)
    f.mesh.position.y += Math.sin(k * Math.PI) * 0.28
    f.mesh.rotation.y += dt * 1.2
    f.mesh.scale.lerpVectors(f.fromScale, f.toScale, k)
    if (f.t >= 1) {
      f.mesh.position.copy(f.dest)
      f.mesh.scale.copy(f.toScale)
      f.mesh.rotation.set(0, 0, 0)
      scene.remove(f.mesh)
      doneGroup.add(f.mesh)
      state.flying = null
    }
  }
  controls.update()
}

function resize() {
  renderer.setSize(innerWidth, innerHeight, false)
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
}
window.addEventListener('resize', resize)
resize()

async function boot() {
  const loader = new GLTFLoader()
  const [tableGltf, leftGltf, rightGltf] = await Promise.all([
    loader.loadAsync(`${ASSET}table/wooden_table_02_1k.gltf`),
    loader.loadAsync(`${ASSET}hands/left.glb`),
    loader.loadAsync(`${ASSET}hands/right.glb`),
  ])

  const table = tableGltf.scene
  const tableMat = woodMat(1.6, {
    color: '#c4a07a',
    roughness: 0.92,
    normalScale: new THREE.Vector2(0.16, 0.16),
  })
  table.traverse((o) => {
    if (!o.isMesh) return
    o.castShadow = true
    o.receiveShadow = true
    o.material = tableMat
  })
  scene.add(table)
  fitWidth(table, 2.35)
  table.updateMatrixWorld(true)
  const topY = new THREE.Box3().setFromObject(table).max.y

  pan.position.y = topY
  wheel.position.y = topY + 0.026
  head.position.y = topY + 0.05
  clayGroup.position.y = topY + 0.064
  state.tableY = clayGroup.position.y
  SHELF.y = topY + 0.42
  shelfUnit.position.set(0, 0, 0)
  shelfBack.position.set(0, SHELF.y + SHELF.gap * (SHELF.rows - 1) * 0.5, SHELF.z - 0.16)
  for (let r = 0; r < SHELF.rows; r++) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(SHELF.span + 0.12, 0.045, 0.3), woodMat(1.6))
    board.castShadow = true
    board.receiveShadow = true
    board.position.set(0, SHELF.y - 0.022 + r * SHELF.gap, SHELF.z)
    shelfUnit.add(board)
    shelfBoards.push(board)
  }
  camera.position.set(0, topY + 0.58, 0.92)
  controls.target.set(0, topY + 0.16, 0)
  controls.update()

  function prepHand(src, dest) {
    dest.add(src.scene)
    src.scene.traverse((o) => {
      if (!o.isMesh) return
      o.castShadow = true
      o.material = new THREE.MeshStandardMaterial({
        color: '#c48a6a',
        roughness: 0.72,
        metalness: 0.02,
      })
    })
    const box = new THREE.Box3().setFromObject(src.scene)
    const size = box.getSize(new THREE.Vector3())
    src.scene.scale.multiplyScalar(0.34 / Math.max(size.y, 0.001))
    src.scene.position.set(0, 0, 0)
  }
  prepHand(leftGltf, hands.left)
  prepHand(rightGltf, hands.right)

  lumpProfile()
  rebuildClay()
}

const sfx = { fire: null, clay: null, on: false }
function setClayWork(on) {
  if (!sfx.clay || !sfx.on) return
  const target = on ? 0.34 : 0
  sfx.clay.volume += (target - sfx.clay.volume) * 0.14
}

if (!THUMB) {
  sfx.fire = new Audio(`${ASSET}audio/fire.mp3`)
  sfx.clay = new Audio(`${ASSET}audio/clay.mp3`)
  sfx.fire.loop = sfx.clay.loop = true
  sfx.fire.volume = 0.38
  sfx.clay.volume = 0
  async function startAudio() {
    if (sfx.on) return
    try {
      await sfx.fire.play()
      await sfx.clay.play()
      sfx.on = true
    } catch (_) { /* 제스처 후 재생 */ }
  }
  window.addEventListener('pointerdown', startAudio)
  window.addEventListener('pointermove', startAudio)
  window.addEventListener('wheel', startAudio, { passive: true })
  window.addEventListener('keydown', startAudio)
}

boot().then(() => {
  const clock = new THREE.Clock()
  function tick() {
    const dt = Math.min(0.033, clock.getDelta())
    state.spin += dt * (THUMB ? 0.9 : 1.85)
    if (THUMB) {
      state.tool = 0.55 + Math.sin(performance.now() * 0.0008) * 0.2
      squeeze(-0.35, dt)
      rebuildClay()
    }
    step(dt)
    renderer.render(scene, camera)
    requestAnimationFrame(tick)
  }
  tick()
})
