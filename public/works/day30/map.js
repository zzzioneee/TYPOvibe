import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const THUMB = new URLSearchParams(location.search).has('thumb')
if (THUMB) document.documentElement.classList.add('thumb')

const M_PER_DEG = 111320
const VISUAL_H = 4.2
const GRAVITY = 16
const LAUNCH = 7.6
const MAX_PULL = 3.6
const BASE_Z = 15
const MAX_Z = 18
const BLD_Z = 14

const CITIES = [
  { id: 'seoul', lat: 37.51255, lon: 127.10235, realH: 555, yaw: 0.22, radiusKm: 1.35, flatten: 90, model: null, build: makeLotte },
  { id: 'nyc', lat: 40.68925, lon: -74.0445, realH: 93, yaw: 0.2, radiusKm: 2.1, flatten: 80, model: './models/liberty.glb' },
  { id: 'london', lat: 51.50073, lon: -0.12463, realH: 96, yaw: 0.35, radiusKm: 1.4, flatten: 55, model: './models/bigben.glb' },
]

const canvas = document.querySelector('#view')
const loadingEl = document.querySelector('#loading')
const statusEl = document.querySelector('#status')
const texLoader = new THREE.TextureLoader()
texLoader.crossOrigin = 'anonymous'
const gltfLoader = new GLTFLoader()

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.08
renderer.shadowMap.enabled = true

const scene = new THREE.Scene()
scene.background = new THREE.Color('#9eb6c8')
scene.fog = new THREE.Fog('#9eb6c8', 16, 70)

const camera = new THREE.PerspectiveCamera(52, 1, 0.05, 250)
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.minPolarAngle = 0.1
controls.maxPolarAngle = Math.PI * 0.49
controls.minDistance = 1.5
controls.maxDistance = 48
controls.autoRotate = THUMB
controls.autoRotateSpeed = 0.4

scene.add(new THREE.AmbientLight('#cdd6e0', 0.35))
scene.add(new THREE.HemisphereLight('#e8eef6', '#5c5348', 0.55))
const sun = new THREE.DirectionalLight('#fff3e0', 2.4)
sun.position.set(10, 18, 8)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 0.5
sun.shadow.camera.far = 60
sun.shadow.camera.left = sun.shadow.camera.bottom = -22
sun.shadow.camera.right = sun.shadow.camera.top = 22
sun.shadow.bias = -0.0004
scene.add(sun)

const mapGroup = new THREE.Group()
const bldGroup = new THREE.Group()
const markGroup = new THREE.Group()
scene.add(mapGroup, bldGroup, markGroup)

const tileMeshes = new Map()
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const dragPlane = new THREE.Plane()
const dragHit = new THREE.Vector3()
const previewGeo = new THREE.BufferGeometry()
const preview = new THREE.Line(previewGeo, new THREE.LineDashedMaterial({
  color: '#fff', dashSize: 0.12, gapSize: 0.08, transparent: true, opacity: 0.7,
}))
preview.frustumCulled = false
preview.visible = false
scene.add(preview)

let city = CITIES[0]
let origin = { lat: city.lat, lon: city.lon }
let scale = VISUAL_H / city.realH
let mapBounds = { minX: 0, maxX: 0, minZ: 0, maxZ: 0, y: 0.02 }
let landmark = null
let dragging = false
let statusTimer = 0
let loadGen = 0
let lodT = 0
let envMap = null
let pbfUrl = ''
let VectorTile
let Pbf

function latLonToWorld(lat, lon) {
  const x = (lon - origin.lon) * M_PER_DEG * Math.cos(origin.lat * Math.PI / 180) * scale
  const z = -(lat - origin.lat) * M_PER_DEG * scale
  return new THREE.Vector3(x, 0, z)
}

function tileYToLat(y, z) {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}
function latLonToTile(lat, lon, z) {
  const n = 2 ** z
  const x = n * ((lon + 180) / 360)
  const latRad = lat * Math.PI / 180
  const y = n * (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2
  return { x, y }
}
function cityBBox(c) {
  const dLat = (c.radiusKm * 1000) / M_PER_DEG
  const dLon = dLat / Math.cos(c.lat * Math.PI / 180)
  return { west: c.lon - dLon, east: c.lon + dLon, south: c.lat - dLat, north: c.lat + dLat }
}
function tileRange(z, bbox) {
  const nw = latLonToTile(bbox.north, bbox.west, z)
  const se = latLonToTile(bbox.south, bbox.east, z)
  return { x0: Math.floor(nw.x), x1: Math.ceil(se.x) - 1, y0: Math.floor(nw.y), y1: Math.ceil(se.y) - 1 }
}
function tileExtent(z, x, y) {
  const lon0 = (x / 2 ** z) * 360 - 180
  const lon1 = ((x + 1) / 2 ** z) * 360 - 180
  const lat0 = tileYToLat(y, z)
  const lat1 = tileYToLat(y + 1, z)
  const a = latLonToWorld(lat0, lon0)
  const b = latLonToWorld(lat1, lon1)
  return { w: Math.abs(b.x - a.x), h: Math.abs(b.z - a.z), cx: (a.x + b.x) / 2, cz: (a.z + b.z) / 2 }
}

function ensureSat(z, x, y, lift) {
  const key = `${z}/${x}/${y}`
  let mesh = tileMeshes.get(key)
  if (mesh) { mesh.visible = true; return mesh }
  const ext = tileExtent(z, x, y)
  mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(ext.w, ext.h),
    new THREE.MeshStandardMaterial({ color: '#6a7468', roughness: 1 }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(ext.cx, lift, ext.cz)
  mesh.receiveShadow = true
  mesh.userData.key = key
  mapGroup.add(mesh)
  tileMeshes.set(key, mesh)
  texLoader.load(
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 8
      mesh.material.map = tex
      mesh.material.color.set('#fff')
      mesh.material.needsUpdate = true
    },
  )
  return mesh
}

function clearMap() {
  for (const m of tileMeshes.values()) {
    m.geometry.dispose(); m.material.map?.dispose(); m.material.dispose(); mapGroup.remove(m)
  }
  tileMeshes.clear()
  while (mapGroup.children.length) mapGroup.remove(mapGroup.children[0])
  while (bldGroup.children.length) {
    const ch = bldGroup.children[0]
    ch.geometry?.dispose(); ch.material?.dispose(); bldGroup.remove(ch)
  }
}

function buildPaper(c) {
  const bbox = cityBBox(c)
  const sw = latLonToWorld(bbox.south, bbox.west)
  const ne = latLonToWorld(bbox.north, bbox.east)
  const minX = Math.min(sw.x, ne.x), maxX = Math.max(sw.x, ne.x)
  const minZ = Math.min(sw.z, ne.z), maxZ = Math.max(sw.z, ne.z)
  mapBounds = { minX, maxX, minZ, maxZ, y: 0.02 }
  const w = maxX - minX, h = maxZ - minZ
  const paper = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.3, 0.08, h + 0.3),
    new THREE.MeshStandardMaterial({ color: '#e6dcc8', roughness: 0.9 }),
  )
  paper.position.set((minX + maxX) / 2, -0.03, (minZ + maxZ) / 2)
  paper.receiveShadow = true
  mapGroup.add(paper)
  const range = tileRange(BASE_Z, bbox)
  for (let x = range.x0; x <= range.x1; x++) {
    for (let y = range.y0; y <= range.y1; y++) ensureSat(BASE_Z, x, y, 0.02)
  }
}

function refreshLod() {
  const z = controls.getDistance() > 14 ? BASE_Z : controls.getDistance() > 6 ? BASE_Z + 1 : controls.getDistance() > 3 ? BASE_Z + 2 : MAX_Z
  const bbox = cityBBox(city)
  if (z === BASE_Z) {
    for (const [k, m] of tileMeshes) m.visible = k.startsWith(`${BASE_Z}/`)
    return
  }
  const cam = latLonToTile(
    origin.lat - camera.position.z / (M_PER_DEG * scale),
    origin.lon + camera.position.x / (M_PER_DEG * Math.cos(origin.lat * Math.PI / 180) * scale),
    z,
  )
  const span = z >= 18 ? 2 : 3
  const range = tileRange(z, bbox)
  for (const [k, m] of tileMeshes) m.visible = k.startsWith(`${BASE_Z}/`)
  const lift = 0.021 + (z - BASE_Z) * 0.0012
  for (let x = Math.max(range.x0, Math.floor(cam.x) - span); x <= Math.min(range.x1, Math.floor(cam.x) + span); x++) {
    for (let y = Math.max(range.y0, Math.floor(cam.y) - span); y <= Math.min(range.y1, Math.floor(cam.y) + span); y++) {
      ensureSat(z, x, y, lift).visible = true
    }
  }
}

function facadeTex(kind) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 512
  const g = c.getContext('2d')
  const pal = {
    glass: { wall: '#2c3d4a', mull: '#1a242c', on: [168, 198, 214], off: [18, 28, 36] },
    office: { wall: '#8a9096', mull: '#5c6166', on: [210, 214, 208], off: [70, 76, 82] },
    apt: { wall: '#c4b09a', mull: '#9a8a78', on: [232, 220, 200], off: [92, 78, 68] },
  }[kind]
  g.fillStyle = pal.wall
  g.fillRect(0, 0, 256, 512)
  const cw = kind === 'apt' ? 22 : 14
  const ch = kind === 'apt' ? 18 : 10
  const gapX = kind === 'apt' ? 8 : 4
  const gapY = kind === 'glass' ? 4 : 6
  for (let y = 4; y < 508; y += ch + gapY) {
    for (let x = 4; x < 252; x += cw + gapX) {
      const lit = Math.random() > (kind === 'glass' ? 0.42 : 0.55)
      const col = lit ? pal.on : pal.off
      const a = lit ? 0.55 + Math.random() * 0.4 : 0.85
      g.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`
      g.fillRect(x, y, cw, ch)
      g.strokeStyle = pal.mull
      g.lineWidth = 1
      g.strokeRect(x, y, cw, ch)
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 8
  return tex
}

const FACADES = {
  glass: facadeTex('glass'),
  office: facadeTex('office'),
  apt: facadeTex('apt'),
}

function lotteTex() {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 2048
  const g = c.getContext('2d')
  g.fillStyle = '#1c2a33'
  g.fillRect(0, 0, 512, 2048)
  for (let y = 3; y < 2044; y += 7) {
    for (let x = 2; x < 510; x += 9) {
      const lit = Math.random() > 0.38
      g.fillStyle = lit
        ? `rgba(${150 + Math.random() * 40},${190 + Math.random() * 30},${210},${0.22 + Math.random() * 0.35})`
        : `rgba(10,16,22,0.75)`
      g.fillRect(x, y, 7, 5)
    }
  }
  g.fillStyle = 'rgba(255,255,255,0.06)'
  for (let i = 0; i < 5; i++) g.fillRect((512 / 5) * i, 0, 1, 2048)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 8
  return tex
}

function makeLotte() {
  const g = new THREE.Group()
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#7e97a8',
    map: lotteTex(),
    metalness: 0.55,
    roughness: 0.12,
    clearcoat: 0.7,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.6,
  })
  const chrome = new THREE.MeshPhysicalMaterial({
    color: '#eef3f7', metalness: 0.95, roughness: 0.08, envMapIntensity: 1.8,
  })
  const pts = [
    new THREE.Vector2(0.11, 0),
    new THREE.Vector2(0.108, 0.04),
    new THREE.Vector2(0.09, 0.28),
    new THREE.Vector2(0.072, 0.52),
    new THREE.Vector2(0.055, 0.72),
    new THREE.Vector2(0.042, 0.84),
    new THREE.Vector2(0.036, 0.87),
  ]
  const shaft = new THREE.Mesh(new THREE.LatheGeometry(pts, 5), glass)
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.038, 0.055, 8, 1, true), chrome)
  lantern.position.y = 0.9
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.03, 8), chrome)
  cap.position.y = 0.938
  const needle = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.07, 8), chrome)
  needle.position.y = 0.988
  g.add(shaft, lantern, cap, needle)
  return g
}

function applyWallUV(geo) {
  geo.computeVertexNormals()
  const pos = geo.attributes.position
  const nrm = geo.attributes.normal
  const uvs = new Float32Array(pos.count * 2)
  const uScale = 8 * scale
  const vScale = 3.15 * scale
  for (let i = 0; i < pos.count; i++) {
    const ny = nrm.getY(i)
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    if (Math.abs(ny) > 0.55) {
      uvs[i * 2] = x / uScale
      uvs[i * 2 + 1] = z / uScale
    } else {
      uvs[i * 2] = (x * Math.abs(nrm.getZ(i)) + z * Math.abs(nrm.getX(i))) / uScale
      uvs[i * 2 + 1] = y / vScale
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
}

function attachBend(root) {
  const uniforms = { uPull: { value: new THREE.Vector3() }, uHeight: { value: VISUAL_H }, uActive: { value: 0 } }
  root.traverse((obj) => {
    if (!obj.isMesh) return
    obj.castShadow = true
    const src = Array.isArray(obj.material) ? obj.material : [obj.material]
    const next = src.map((m) => {
      const mat = m.clone()
      if (envMap) { mat.envMap = envMap; mat.envMapIntensity = mat.envMapIntensity ?? 1 }
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uPull = uniforms.uPull
        shader.uniforms.uHeight = uniforms.uHeight
        shader.uniforms.uActive = uniforms.uActive
        shader.vertexShader = `uniform vec3 uPull; uniform float uHeight; uniform float uActive;\n` + shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          { vec4 wp = modelMatrix * vec4(transformed,1.0);
            float t = clamp(wp.y / max(uHeight,0.001), 0.0, 1.0);
            t = t*t*uActive; wp.xyz += uPull * t;
            transformed = (inverse(modelMatrix) * wp).xyz; }`,
        )
      }
      mat.customProgramCacheKey = () => 'bend-v3'
      return mat
    })
    obj.material = next.length === 1 ? next[0] : next
  })
  return uniforms
}

function groundCenter(root) {
  root.updateWorldMatrix(true, true)
  const box = new THREE.Box3().setFromObject(root)
  const cut = box.min.y + (box.max.y - box.min.y) * 0.1
  const gbox = new THREE.Box3(); const v = new THREE.Vector3()
  root.traverse((o) => {
    const pos = o.geometry?.attributes?.position
    if (!o.isMesh || !pos) return
    for (let i = 0; i < pos.count; i += 4) {
      v.fromBufferAttribute(pos, i); o.localToWorld(v)
      if (v.y <= cut) gbox.expandByPoint(v)
    }
  })
  return gbox.isEmpty() ? box.getCenter(new THREE.Vector3()) : gbox.getCenter(new THREE.Vector3())
}

function normalizeModel(root) {
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  if (size.x > size.y && size.x > size.z) root.rotation.z = -Math.PI / 2
  else if (size.z > size.y && size.z > size.x) root.rotation.x = -Math.PI / 2
  root.updateMatrixWorld(true)
  box.setFromObject(root); size.copy(box.getSize(new THREE.Vector3()))
  root.scale.multiplyScalar(VISUAL_H / Math.max(size.y, 0.001))
  root.updateMatrixWorld(true)
  box.setFromObject(root)
  const foot = groundCenter(root)
  root.position.x -= foot.x; root.position.y -= box.min.y; root.position.z -= foot.z
}

async function loadLandmark(c) {
  const model = c.model ? (await gltfLoader.loadAsync(c.model)).scene : c.build()
  model.rotation.y += c.yaw
  normalizeModel(model)
  const root = new THREE.Group()
  const hit = new THREE.Mesh(new THREE.BoxGeometry(1.6, VISUAL_H, 1.6), new THREE.MeshBasicMaterial({ visible: false }))
  hit.position.y = VISUAL_H * 0.5
  root.add(model, hit)
  markGroup.add(root)
  landmark = {
    root, model, hit, uniforms: attachBend(model),
    pull: new THREE.Vector3(), vel: new THREE.Vector3(),
    state: 'idle', trail: null, trailPts: [],
  }
}

function clearLandmark() {
  if (!landmark) return
  markGroup.clear()
  if (landmark.trail) { scene.remove(landmark.trail); landmark.trail.geometry.dispose() }
  landmark = null
}

function tilePxToLonLat(tx, ty, z, px, py, extent) {
  const n = 2 ** z
  const lon = ((tx + px / extent) / n) * 360 - 180
  const mer = Math.PI * (1 - 2 * (ty + py / extent) / n)
  const lat = Math.atan(Math.sinh(mer)) * 180 / Math.PI
  return [lon, lat]
}

async function loadBuildings(c) {
  if (!VectorTile || !Pbf) {
    console.error('vector tile libs missing', { VectorTile, Pbf })
    return
  }
  if (!pbfUrl) {
    const tj = await fetch('https://tiles.openfreemap.org/planet').then((r) => r.json())
    pbfUrl = tj.tiles[0]
  }
  const bbox = cityBBox(c)
  const range = tileRange(BLD_Z, bbox)
  const buckets = { glass: [], office: [], apt: [] }
  const roofs = []
  const skip = (c.flatten * scale)
  for (let x = range.x0; x <= range.x1; x++) {
    for (let y = range.y0; y <= range.y1; y++) {
      const url = pbfUrl.replace('{z}', BLD_Z).replace('{x}', x).replace('{y}', y)
      const buf = await fetch(url).then((r) => r.arrayBuffer())
      if (!buf.byteLength) continue
      const tile = new VectorTile(new Pbf(new Uint8Array(buf)))
      const layer = tile.layers.building
      if (!layer) continue
      for (let i = 0; i < layer.length; i++) {
        const f = layer.feature(i)
        if (f.type !== 3) continue
        const hRaw = Number(f.properties.render_height || f.properties.height || f.properties.Height || 0)
        const levels = Number(f.properties['building:levels'] || 0)
        const hM = Math.min(180, Math.max(7, hRaw || levels * 3.2 || 10))
        const rings = f.loadGeometry()
        if (!rings?.[0] || rings[0].length < 3) continue
        const worldRing = rings[0].map((p) => {
          const [lon, lat] = tilePxToLonLat(x, y, BLD_Z, p.x, p.y, layer.extent)
          const w = latLonToWorld(lat, lon)
          return new THREE.Vector2(w.x, -w.z)
        })
        const cx = worldRing.reduce((s, p) => s + p.x, 0) / worldRing.length
        const cz = worldRing.reduce((s, p) => s - p.y, 0) / worldRing.length
        if (Math.hypot(cx, cz) < skip) continue
        const shape = new THREE.Shape(worldRing)
        const depth = hM * scale
        const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 })
        geo.rotateX(-Math.PI / 2)
        applyWallUV(geo)
        const kind = hM > 55 ? 'glass' : hM > 22 ? 'office' : 'apt'
        buckets[kind].push(geo)
        const roof = new THREE.ShapeGeometry(shape)
        roof.rotateX(-Math.PI / 2)
        roof.translate(0, depth + 0.002, 0)
        roofs.push(roof)
      }
    }
  }
  const mats = {
    glass: new THREE.MeshPhysicalMaterial({
      map: FACADES.glass, color: '#d5e0e8', metalness: 0.45, roughness: 0.22, envMapIntensity: 1.15,
    }),
    office: new THREE.MeshStandardMaterial({
      map: FACADES.office, color: '#e4e2dc', metalness: 0.12, roughness: 0.48,
    }),
    apt: new THREE.MeshStandardMaterial({
      map: FACADES.apt, color: '#eee4d6', metalness: 0.04, roughness: 0.62,
    }),
  }
  for (const kind of Object.keys(buckets)) {
    if (!buckets[kind].length) continue
    const merged = mergeGeometries(buckets[kind], false)
    buckets[kind].forEach((g) => g.dispose())
    const mesh = new THREE.Mesh(merged, mats[kind])
    mesh.castShadow = true
    mesh.receiveShadow = true
    bldGroup.add(mesh)
  }
  if (roofs.length) {
    const roofMerged = mergeGeometries(roofs, false)
    roofs.forEach((g) => g.dispose())
    const roofMesh = new THREE.Mesh(roofMerged, new THREE.MeshStandardMaterial({
      color: '#6b6560', roughness: 0.85, metalness: 0.05,
    }))
    roofMesh.receiveShadow = true
    bldGroup.add(roofMesh)
  }
}

function resetLandmark() {
  if (!landmark) return
  landmark.state = 'idle'
  landmark.vel.set(0, 0, 0); landmark.pull.set(0, 0, 0)
  landmark.root.position.set(0, 0, 0); landmark.root.quaternion.identity()
  landmark.uniforms.uActive.value = 0; landmark.uniforms.uPull.value.set(0, 0, 0)
  landmark.trailPts.length = 0
  if (landmark.trail) landmark.trail.visible = false
  preview.visible = false
  statusEl.classList.remove('on')
}

function previewFlight() {
  const p = new THREE.Vector3(0, VISUAL_H, 0)
  const v = landmark.pull.clone().multiplyScalar(-LAUNCH)
  v.y += 3 + landmark.pull.length() * 1.3
  const pts = []; const dt = 0.03
  for (let i = 0; i < 70; i++) {
    v.y -= GRAVITY * dt; p.addScaledVector(v, dt); pts.push(p.clone())
    if (p.y < -6) break
    if (p.y < 0 && v.y < 0 && Math.hypot(p.x, p.z) < 18) { v.y *= -0.28; v.x *= 0.82; v.z *= 0.82; p.y = 0 }
  }
  previewGeo.setFromPoints(pts); preview.computeLineDistances(); preview.visible = pts.length > 2
}

function fling() {
  landmark.vel.copy(landmark.pull).multiplyScalar(-LAUNCH)
  landmark.vel.y += 3 + landmark.pull.length() * 1.3
  landmark.uniforms.uActive.value = 0; landmark.uniforms.uPull.value.set(0, 0, 0)
  landmark.pull.set(0, 0, 0); landmark.state = 'fly'; preview.visible = false
}

function setPointer(e) {
  const r = canvas.getBoundingClientRect()
  pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1
  pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1
}

canvas.addEventListener('pointerdown', (e) => {
  if (THUMB || !landmark || landmark.state === 'fly' || landmark.state === 'off') return
  setPointer(e); raycaster.setFromCamera(pointer, camera)
  if (!raycaster.intersectObject(landmark.hit, false).length) return
  dragging = true; landmark.state = 'aim'; controls.enabled = false
  const camDir = new THREE.Vector3(); camera.getWorldDirection(camDir)
  dragPlane.setFromNormalAndCoplanarPoint(camDir.multiplyScalar(-1), new THREE.Vector3(0, VISUAL_H * 0.72, 0))
  canvas.setPointerCapture(e.pointerId)
})
canvas.addEventListener('pointermove', (e) => {
  if (!dragging || !landmark) return
  setPointer(e); raycaster.setFromCamera(pointer, camera)
  if (!raycaster.ray.intersectPlane(dragPlane, dragHit)) return
  landmark.pull.copy(dragHit).sub(new THREE.Vector3(0, VISUAL_H * 0.72, 0))
  if (landmark.pull.length() > MAX_PULL) landmark.pull.setLength(MAX_PULL)
  landmark.uniforms.uPull.value.copy(landmark.pull)
  landmark.uniforms.uActive.value = 1
  previewFlight()
})
function release() {
  if (!dragging || !landmark) return
  dragging = false; controls.enabled = true
  if (landmark.pull.length() > 0.4) fling()
  else {
    landmark.pull.set(0, 0, 0); landmark.uniforms.uPull.value.set(0, 0, 0)
    landmark.uniforms.uActive.value = 0; landmark.state = 'idle'; preview.visible = false
  }
}
canvas.addEventListener('pointerup', release)
canvas.addEventListener('pointercancel', release)

function ensureTrail() {
  if (landmark.trail) return
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(28 * 3), 3))
  landmark.trail = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.9 }))
  landmark.trail.frustumCulled = false; landmark.trailPts = []; scene.add(landmark.trail)
}
function pushTrail() {
  ensureTrail(); landmark.trailPts.push(landmark.root.position.clone())
  if (landmark.trailPts.length > 28) landmark.trailPts.shift()
  const arr = landmark.trail.geometry.attributes.position.array; arr.fill(0)
  landmark.trailPts.forEach((p, i) => { arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z })
  landmark.trail.geometry.setDrawRange(0, landmark.trailPts.length)
  landmark.trail.geometry.attributes.position.needsUpdate = true
  landmark.trail.visible = landmark.trailPts.length > 1
}

function stepFly(dt) {
  landmark.vel.y -= GRAVITY * dt
  landmark.root.position.addScaledVector(landmark.vel, dt)
  const p = landmark.root.position
  const on = p.x >= mapBounds.minX && p.x <= mapBounds.maxX && p.z >= mapBounds.minZ && p.z <= mapBounds.maxZ
  if (on && p.y < 0 && landmark.vel.y < 0) {
    p.y = 0; landmark.vel.y *= -0.3; landmark.vel.x *= 0.76; landmark.vel.z *= 0.76
  }
  if (!on && p.y < 0 && landmark.state === 'fly') {
    landmark.state = 'off'; statusEl.classList.add('on'); statusTimer = 2.6
  }
  if (landmark.vel.lengthSq() > 0.04) {
    landmark.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), landmark.vel.clone().normalize())
  }
  pushTrail()
  if (p.y < -22) resetLandmark()
}

function frameCamera() {
  camera.position.set(5.8, 3.6, 7.2)
  controls.target.set(0, VISUAL_H * 0.4, 0)
  controls.update()
}

async function setCity(id) {
  const next = CITIES.find((c) => c.id === id) || CITIES[0]
  const gen = ++loadGen
  city = next
  origin = { lat: next.lat, lon: next.lon }
  scale = VISUAL_H / next.realH
  dragging = false; controls.enabled = true; preview.visible = false
  clearLandmark(); clearMap(); frameCamera()
  loadingEl.style.display = 'grid'
  buildPaper(next)
  try { await Promise.all([loadLandmark(next), loadBuildings(next)]) } catch (e) { console.error(e) }
  if (gen !== loadGen) return
  loadingEl.style.display = 'none'
  document.querySelectorAll('#cities button').forEach((btn) => {
    btn.setAttribute('aria-pressed', btn.dataset.city === next.id ? 'true' : 'false')
  })
}

document.querySelector('#cities').addEventListener('click', (e) => {
  const btn = e.target.closest('button')
  if (btn?.dataset.city) setCity(btn.dataset.city)
})
document.querySelector('#reset').addEventListener('click', resetLandmark)
window.addEventListener('keydown', (e) => { if (e.key === 'r' || e.key === 'R') resetLandmark() })

function resize() {
  const w = canvas.clientWidth || innerWidth
  const h = canvas.clientHeight || innerHeight
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}
resize(); window.addEventListener('resize', resize)

const clock = new THREE.Clock()
function tick() {
  const dt = Math.min(clock.getDelta(), 0.033)
  lodT += dt
  if (lodT > 0.3) { lodT = 0; refreshLod() }
  if (landmark && (landmark.state === 'fly' || landmark.state === 'off')) stepFly(dt)
  if (statusTimer > 0) { statusTimer -= dt; if (statusTimer <= 0) statusEl.classList.remove('on') }
  controls.update()
  renderer.render(scene, camera)
  requestAnimationFrame(tick)
}

async function boot() {
  try {
    const vt = await import('https://esm.sh/@mapbox/vector-tile@1.3.1')
    const pbf = await import('https://esm.sh/pbf@3.2.1')
    VectorTile = vt.VectorTile || vt.default?.VectorTile || vt.default
    Pbf = pbf.default || pbf.Pbf || pbf
  } catch (e) { console.error('vector tile libs', e) }
  try {
    envMap = await new RGBELoader().loadAsync('https://threejs.org/examples/textures/equirectangular/blouberg_sunrise_2_1k.hdr')
    envMap.mapping = THREE.EquirectangularReflectionMapping
    scene.environment = envMap
    scene.background = envMap
    scene.backgroundBlurriness = 0.04
    scene.fog = new THREE.Fog('#c5d0da', 28, 95)
  } catch { /* solid sky */ }
  tick()
  await setCity('seoul')
}
boot()
