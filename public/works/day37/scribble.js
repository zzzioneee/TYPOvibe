// 우연: 어릴 때 하던 '스탑!' 놀이. 얼굴형·머리·눈·코·입 낙서 위를 연필이 빠르게 왔다 갔다 하고,
// 스페이스바로 멈춘 자리의 낙서를 옆 종이에 옮겨 그려 '○○의 얼굴'을 완성한다.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

const THUMB = new URLSearchParams(location.search).has('thumb')
if (THUMB) document.documentElement.classList.add('thumb')
const $ = (id) => document.getElementById(id)

import { rng, kid, PARTS, ORDER, LABEL, AMP, SHOW, drawStrokes, mapper, metrics, placePart, TAU } from './faces.js'

// ── 종이 ─────────────────────────────────────────────
const PW = 1000, PH = 1400
function paperBase() {
  const c = document.createElement('canvas'); c.width = PW; c.height = PH
  const g = c.getContext('2d'); g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, PW, PH)
  const d = g.getImageData(0, 0, PW, PH)
  for (let i = 0; i < d.data.length; i += 4) { const v = (Math.random() - .5) * 10; d.data[i] += v; d.data[i + 1] += v; d.data[i + 2] += v }
  g.putImageData(d, 0, 0)
  return c
}
const leftBase = paperBase(), rightBase = paperBase()
const left = document.createElement('canvas'), right = document.createElement('canvas')
left.width = right.width = PW; left.height = right.height = PH

const XS = Array.from({ length: 5 }, (_, i) => 140 + i * 180)
const ROWY = { face: 215, hair: 500, eyes: 735, nose: 945, mouth: 1160 }
let items = {}, picks = []
function buildItems(seed) {
  items = {}
  for (const part of ORDER) items[part] = PARTS[part].map((fn, i) => kid(fn(rng(seed + i * 31)), seed * 7 + i * 101 + part.length * 13, AMP[part]))
}
function drawLeft() {
  const g = left.getContext('2d'); g.drawImage(leftBase, 0, 0)
  for (const part of ORDER) items[part].forEach((st, i) => {
    const hit = picks.some((p) => p.part === part && p.i === i) || (current && current.part === part && current.i === i)
    drawStrokes(g, st, mapper(XS[i], ROWY[part], SHOW[part].s, SHOW[part].c), 5.6, 1, hit ? '214,38,43' : '28,28,32')
  })
}
let name = ''
const FACE_C = [500, 735], FACE_S = 255
function drawRight(partial) {
  const g = right.getContext('2d'); g.drawImage(rightBase, 0, 0)
  g.fillStyle = 'rgba(40,40,46,.88)'; g.font = '700 74px Gaegu'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(`${name} 얼굴`, PW / 2, 150)
  const map = mapper(FACE_C[0], FACE_C[1], FACE_S)
  for (const pk of picks) drawStrokes(g, pk.copy, map, 9.6)
  return partial ? drawStrokes(g, partial.copy, map, 9.6, partial.p) : null
}

// ── 3D 장면 ──────────────────────────────────────────
const canvas = $('view')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
const scene = new THREE.Scene(); scene.background = new THREE.Color('#050505')
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture
scene.environmentIntensity = .3
const camera = new THREE.PerspectiveCamera(30, 1, .05, 50)
const lamp = new THREE.SpotLight('#fff6ea', 34, 0, .75, .8, 1.2)
lamp.position.set(-1.2, 3.8, 1.4); lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.bias = -.0002; lamp.shadow.normalBias = .01
scene.add(lamp, lamp.target); scene.add(new THREE.HemisphereLight('#ffffff', '#3a3530', .55))
// 학교 책상: 단풍나무 무늬 상판, 갈색 테두리, 회색 철제 다리와 서랍 받침
function mapleTexture() {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 1360
  const g = c.getContext('2d'); g.fillStyle = '#d49b5f'; g.fillRect(0, 0, c.width, c.height)
  for (let i = 0; i < 260; i++) {
    const y = Math.random() * c.height, a = .03 + Math.random() * .07
    g.strokeStyle = Math.random() < .55 ? `rgba(150,85,35,${a})` : `rgba(245,200,140,${a})`
    g.lineWidth = 1 + Math.random() * 4; g.beginPath()
    for (let x = 0; x <= c.width; x += 40) g.lineTo(x, y + Math.sin(x / 260 + i) * 6 + Math.sin(x / 47 + i * 3) * 1.5)
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t
}
const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ color: '#050505' }))
floor.rotation.x = -Math.PI / 2; floor.position.y = -.75; floor.receiveShadow = true; scene.add(floor)
{
  const edge = new THREE.MeshStandardMaterial({ color: '#7a3f1d', roughness: .5 })
  const topMat = new THREE.MeshPhysicalMaterial({ map: mapleTexture(), roughness: .45, clearcoat: .5, clearcoatRoughness: .3 })
  const top = new THREE.Mesh(new RoundedBoxGeometry(3.0, .05, 2.0, 2, .024), topMat)
  { const s = new THREE.Shape(), w = 1.5, d = 1.0, r = .12; s.moveTo(-w + r, -d); s.lineTo(w - r, -d); s.quadraticCurveTo(w, -d, w, -d + r); s.lineTo(w, d - r); s.quadraticCurveTo(w, d, w - r, d); s.lineTo(-w + r, d); s.quadraticCurveTo(-w, d, -w, d - r); s.lineTo(-w, -d + r); s.quadraticCurveTo(-w, -d, -w + r, -d)
    const g = new THREE.ExtrudeGeometry(s, { depth: .05, bevelEnabled: false }); g.rotateX(Math.PI / 2); top.geometry = g
    const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 3 + .5, p.getZ(i) / 2 + .5)
    top.material = [topMat, edge] }
  top.position.y = 0; top.receiveShadow = true; top.castShadow = true; scene.add(top)
  const metal = new THREE.MeshStandardMaterial({ color: '#a9adb2', metalness: .7, roughness: .35 })
  const tray = new THREE.Mesh(new THREE.BoxGeometry(2.4, .14, 1.4), new THREE.MeshStandardMaterial({ color: '#2b2d30', metalness: .5, roughness: .5 }))
  tray.position.set(0, -.13, -.1)
  for (const x of [-1.35, 1.35]) for (const z of [-.8, .8]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.07, .7, .07), metal); leg.position.set(x, -.4, z); leg.castShadow = true
  }
}

const W = 1.1, H = 1.54
function paper(cnv, x, yaw, seg = 1, z = 0) {
  const tex = new THREE.CanvasTexture(cnv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8
  const g = new THREE.PlaneGeometry(W, H, seg, Math.round(seg * 1.4)); g.rotateX(-Math.PI / 2)
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: .9, side: THREE.DoubleSide })); m.receiveShadow = true; m.castShadow = true
  const grp = new THREE.Group(); grp.add(m); grp.position.set(x, .002, z); grp.rotation.y = yaw; scene.add(grp)
  return { grp, tex, mesh: m, geo: g, flat: g.attributes.position.array.slice(), home: [x, yaw, z] }
}
// 오른쪽 '○○의 얼굴'은 맞은편 친구 쪽을 보게 거꾸로 놓는다
const L = paper(left, -.66, .03, 1, .12), R = paper(right, .66, Math.PI - .025, 28, -.12)
const toWorld = (P, px, py, lift = 0) => P.grp.localToWorld(new THREE.Vector3((px / PW - .5) * W, lift, (py / PH - .5) * H))

// 연필: 육각 노란 몸통, 깎인 나무, 흑연 심, 금속 띠, 분홍 지우개
const pencil = new THREE.Group(); scene.add(pencil)
{
  const R0 = .0115
  const part = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.castShadow = true; pencil.add(m) }
  part(new THREE.CylinderGeometry(.0034, .0004, .012, 6), new THREE.MeshStandardMaterial({ color: '#2b2b2e', metalness: .5, roughness: .35 }), .006)
  part(new THREE.CylinderGeometry(R0, .0034, .042, 6), new THREE.MeshStandardMaterial({ color: '#e7c697', roughness: .8 }), .033)
  part(new THREE.CylinderGeometry(R0, R0, .37, 6), new THREE.MeshPhysicalMaterial({ color: '#f2b92c', roughness: .4, clearcoat: .6 }), .239)
  part(new THREE.CylinderGeometry(R0 * 1.04, R0 * 1.04, .028, 18), new THREE.MeshStandardMaterial({ color: '#c8c8cc', metalness: 1, roughness: .28 }), .438)
  part(new THREE.CylinderGeometry(R0 * .98, R0 * .98, .03, 18), new THREE.MeshStandardMaterial({ color: '#e7808d', roughness: .75 }), .467)
  pencil.scale.setScalar(1.35)
  pencil.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(.5, .22, -.84).normalize())
}
const tip = new THREE.Vector3()

// 책상 오른쪽 고리에 걸린 책가방: 손처럼 말랑한 3D 장난감 느낌
{
  const toy = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: .5, sheen: .5, sheenColor: new THREE.Color('#ffffff'), clearcoat: .25 })
  const RB = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 5, r)
  const bag = new THREE.Group()
  const add = (geo, mat, p, rot = [0, 0, 0]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.rotation.set(...rot); m.castShadow = m.receiveShadow = true; bag.add(m); return m }
  add(RB(.3, .78, .62, .1), toy('#e3242b'), [0, 0, 0])                        // 몸통 (분홍)
  add(RB(.08, .36, .5, .06), toy('#8fd14f'), [.15, .18, 0])                     // 덮개 (남색)
  add(RB(.08, .26, .44, .06), toy('#ffd23f'), [.15, -.17, 0])                   // 앞주머니 (노랑)
  add(RB(.05, .1, .14, .03), toy('#2bd4c4'), [.2, .02, 0])                      // 잠금쇠 (민트)
  for (const z of [-.16, .16]) add(new THREE.SphereGeometry(.035, 16, 12), toy('#ffffff'), [.2, -.12, z])  // 단추
  for (const z of [-.2, .2]) add(new THREE.CapsuleGeometry(.03, .5, 8, 16), toy('#8fd14f'), [-.17, -.05, z]) // 어깨끈 (보라)
  bag.scale.setScalar(1.6); bag.position.set(1.62, -.7, .1); bag.rotation.set(0, 0, 0)
  scene.add(bag)
}

// 둥근 캐릭터 손: 통통한 손바닥, 짧은 손가락, 파란 소매
const hand = new THREE.Group(); scene.add(hand); hand.visible = false
{
  const skin = new THREE.MeshPhysicalMaterial({ color: '#ffd2b0', roughness: .55, sheen: .6, sheenColor: new THREE.Color('#ffe6d6') })
  const add = (geo, mat, p, rot = [0, 0, 0], sc = [1, 1, 1]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.rotation.set(...rot); m.scale.set(...sc); m.castShadow = true; hand.add(m); return m }
  add(new THREE.SphereGeometry(.15, 32, 20), skin, [0, .05, 0], [0, 0, 0], [1, .55, 1])
  ;[-.09, -.03, .03, .09].forEach((x, i) => add(new THREE.CapsuleGeometry(.033, .05 + (i === 1 || i === 2 ? .02 : 0), 8, 16), skin, [x, .045, .15], [Math.PI / 2, 0, 0]))
  add(new THREE.CapsuleGeometry(.035, .06, 8, 16), skin, [-.16, .05, .03], [Math.PI / 2, 0, .9])
  const sleeve = add(new THREE.CylinderGeometry(.13, .14, 1.2, 32), new THREE.MeshStandardMaterial({ color: '#3d6fd6', roughness: .8 }), [0, .06, -.75], [Math.PI / 2, 0, 0])
  add(new THREE.TorusGeometry(.13, .025, 12, 32), new THREE.MeshStandardMaterial({ color: '#2f58b2', roughness: .8 }), [0, .06, -.16])
}

// 구김: 종이의 각 점을 울퉁불퉁한 공 위의 점으로 옮긴다
function crumpleTarget(geo) {
  const pos = geo.attributes.position, out = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / W + .5, v = pos.getZ(i) / H + .5
    const th = u * TAU, ph = .15 + v * (Math.PI - .3)
    const n = Math.sin(th * 3 + ph * 5) * .5 + Math.sin(th * 7 - ph * 3) * .3 + Math.sin(th * 13 + ph * 11) * .2
    const rr = .17 * (1 + .28 * n)
    out[i * 3] = Math.sin(ph) * Math.cos(th) * rr; out[i * 3 + 1] = .17 + Math.cos(ph) * rr; out[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * rr
  }
  return out
}
function setFlat(P) { P.geo.attributes.position.array.set(P.flat); P.geo.attributes.position.needsUpdate = true; P.geo.computeVertexNormals(); P.mesh.material.flatShading = false; P.mesh.material.needsUpdate = true }

// ── 소리: 연필이 종이를 긁는 소리 ─────────────────────────
let ac, scratchGain
function audioOn() {
  if (ac || THUMB) return
  try {
    ac = new AudioContext()
    const n = ac.sampleRate * 2, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
    const src = ac.createBufferSource(); src.buffer = b; src.loop = true
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = .8
    scratchGain = ac.createGain(); scratchGain.gain.value = 0
    src.connect(f).connect(scratchGain).connect(ac.destination); src.start()
  } catch (e) {}
}
const scratch = (v) => { if (scratchGain) scratchGain.gain.setTargetAtTime(v, ac.currentTime, .03) }

// ── 놀이 진행 ─────────────────────────────────────────
let state = 'idle', row = 0, phase = 0, t = 0, lastPx = null, from = null, current = null
function say(html) { $('say').innerHTML = html }
function openModal() {
  $('faceImg').src = right.toDataURL('image/png')
  $('modal').classList.remove('off'); R.grp.visible = false; state = 'leave'
}
function resetPaper() {
  setFlat(R); R.grp.visible = true; R.grp.position.set(R.home[0], .002, R.home[2]); R.grp.rotation.set(0, R.home[1], 0)
}
function showEnd() { $('end').classList.remove('off') }
function startRound() {
  resetPaper(); hand.visible = false
  buildItems((Math.random() * 1e6) | 0)
  picks = []; current = null
  row = 0; drawLeft(); L.tex.needsUpdate = true; drawRight(); R.tex.needsUpdate = true; beginSweep()
  $('end').classList.add('off'); $('hud').classList.remove('off')
}
function beginSweep() {
  state = 'sweep'; phase = Math.random() * TAU; lastPx = null
  say(`<b>Space</b> 스탑! · 지금은 ${LABEL[ORDER[row]]}`)
}
function stop() {
  if (state !== 'sweep' || !lastPx) return
  const part = ORDER[row]
  const i = XS.reduce((best, x, k) => Math.abs(x - lastPx[0]) < Math.abs(XS[best] - lastPx[0]) ? k : best, 0)
  // 옮겨 그릴 때는 같은 낙서를 다시 한 번 손으로 따라 그린다
  const raw = items[part][i]
  current = { part, i, copy: part === 'face' ? raw : placePart(part, raw, metrics(picks[0].copy)), p: 0 }
  // 짧은 낙서(^ 코 등)는 짧게, 긴 낙서는 길게: 그리는 속도가 일정하도록
  const len = current.copy.reduce((n, s) => n + s.pts.reduce((m, p, k) => k ? m + Math.hypot(p[0] - s.pts[k - 1][0], p[1] - s.pts[k - 1][1]) : m, 0), 0)
  current.dur = Math.max(.22, Math.min(1.1, len * .085))
  state = 'circle'; t = 0; scratch(0)
  say(`스탑! ${LABEL[part]} 골랐다`)
}

$('nameInput').addEventListener('input', (e) => { $('start').disabled = !e.target.value.trim() })
$('nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.value.trim()) $('start').click() })
$('start').addEventListener('click', () => {
  name = $('nameInput').value.trim(); audioOn()
  $('name').classList.add('off'); startRound()
})
addEventListener('keydown', (e) => { if (e.code === 'Space' && $('name').classList.contains('off')) { e.preventDefault(); stop() } })
canvas.addEventListener('pointerdown', stop)
$('again').addEventListener('click', startRound)
$('save').addEventListener('click', () => {
  const a = document.createElement('a'); a.download = `${name} 얼굴.png`; a.href = right.toDataURL('image/png'); a.click()
  $('modal').classList.add('off'); resetPaper(); showEnd()
})
$('trash').addEventListener('click', () => {
  $('modal').classList.add('off')
  // 종이를 화면 앞(정면)으로 가져와 구긴다
  setFlat(R); R.crumple = crumpleTarget(R.geo)
  R.mesh.material.flatShading = true; R.mesh.material.needsUpdate = true
  R.grp.visible = true; R.grp.position.set(0, .35, .05); R.grp.rotation.set(0, 0, 0)
  state = 'crumple'; t = 0
})
$('rename').addEventListener('click', () => { $('end').classList.add('off'); $('name').classList.remove('off'); $('nameInput').select(); state = 'idle' })

await document.fonts.load('700 40px Gaegu')
buildItems(1); drawLeft(); drawRight(); L.tex.needsUpdate = R.tex.needsUpdate = true

function resize() {
  renderer.setSize(innerWidth, innerHeight, false)
  camera.aspect = innerWidth / innerHeight
  const fov = camera.fov * Math.PI / 180, needW = 4.05, needH = 2.35
  const dist = Math.max(needH / 2 / Math.tan(fov / 2), needW / 2 / (Math.tan(fov / 2) * camera.aspect))
  camera.position.set(.12, dist, dist * .06); camera.lookAt(.12, 0, 0); camera.updateProjectionMatrix()
}
addEventListener('resize', resize); resize()

if (THUMB) { name = '친구'; startRound() }
const restPx = [880, 1330]
tip.set(.02, 0, .62)
let thumbT = 0
const easeIO = (x) => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
renderer.setAnimationLoop((now) => {
  const dt = Math.min(.05, (performance.now() - (renderer._last || now)) / 1000); renderer._last = performance.now()
  t += dt
  let lift = .003
  if (state === 'sweep') {
    // 연필은 눕힌 채 줄 위를 빠르게 왔다 갔다 한다. 선은 긋지 않는다
    phase += dt * (15 + row * .8)
    const mid = (XS[0] + XS[XS.length - 1]) / 2, amp = (XS[XS.length - 1] - XS[0]) / 2 + 30
    const px = [mid + Math.sin(phase) * amp, ROWY[ORDER[row]] + 20]
    lastPx = px; tip.copy(toWorld(L, px[0], px[1])); lift = .02
    scratch(0)
    if (THUMB && (thumbT += dt) > 1.1) { thumbT = 0; stop() }
  } else if (state === 'circle') {
    // 고른 낙서가 빨갛게 바뀌는 걸 잠깐 보여 준다
    if (t < dt * 1.5) { drawLeft(); L.tex.needsUpdate = true }
    lift = .02
    if (t > .3) { state = 'travel'; t = 0; from = tip.clone() }
  } else if (state === 'travel' || state === 'back' || state === 'rest') {
    const dur = .32, k = easeIO(Math.min(1, t / dur))
    let to
    if (state === 'travel') { const p0 = mapper(FACE_C[0], FACE_C[1], FACE_S)(current.copy[0].pts[0]); to = toWorld(R, p0[0], p0[1]) }
    else if (state === 'back') to = toWorld(L, XS[0], ROWY[ORDER[row]])
    else to = new THREE.Vector3(.02, 0, .62)
    tip.lerpVectors(from, to, k); lift = .003 + Math.sin(k * Math.PI) * .09
    if (k >= 1) {
      if (state === 'travel') { state = 'draw'; t = 0 }
      else if (state === 'back') beginSweep()
      else { state = THUMB ? 'done' : 'push'; t = 0; $('hud').classList.add('off') }
    }
  } else if (state === 'draw') {
    current.p = Math.min(1, t / current.dur)
    const e = drawRight(current); R.tex.needsUpdate = true
    if (e) tip.copy(toWorld(R, e[0], e[1]))
    scratch(.07)
    if (current.p >= 1) {
      picks.push(current); current = null; scratch(0); drawRight(); R.tex.needsUpdate = true
      row++; from = tip.clone(); t = 0
      if (row < ORDER.length) state = 'back'
      else {
        state = 'rest'; say(`완성! 이거 ${name}${'야'}`)
        if (THUMB) setTimeout(startRound, 2600)
      }
    }
  } else if (state === 'push') {
    // 맞은편에서 둥근 손이 들어와 종이를 내 쪽으로 스윽 민다
    hand.visible = true
    const z0 = -H / 2 - .12, k1 = easeIO(Math.min(1, t / .6)), k2 = easeIO(Math.max(0, Math.min(1, (t - .65) / .7)))
    const slide = k2 * 1.25
    hand.position.set(R.home[0], .0, -2.2 + (z0 + 2.2) * k1 + slide)
    R.grp.position.set(R.home[0] - k2 * .3, .002 + k2 * .02, R.home[2] + slide)
    if (t > 1.45) { state = 'modal'; t = 0; openModal() }
  } else if (state === 'leave') {
    hand.position.z -= dt * 3.5
    if (hand.position.z < -3) { hand.visible = false; state = 'wait' }
  } else if (state === 'crumple') {
    // 화면 앞에서 와락 구겨서 책상 밖으로 던진다
    const k = Math.min(1, t / .9), e = 1 - Math.pow(1 - k, 3)
    const pos = R.geo.attributes.position, tgt = R.crumple
    for (let i = 0; i < pos.count * 3; i++) {
      const wob = Math.sin(k * Math.PI) * .025 * Math.sin(i * 12.9898)
      pos.array[i] = R.flat[i] + (tgt[i] - R.flat[i]) * e + (i % 3 === 1 ? Math.abs(wob) : wob)
    }
    pos.needsUpdate = true; R.geo.computeVertexNormals()
    R.grp.rotation.y += dt * 2 * e
    if (t > 1.0) {
      const f = t - 1.0
      R.grp.position.set(R.grp.position.x + dt * .9, .002 + .35 * Math.max(0, 1 - f * 2) - f * f * 3, R.grp.position.z + dt * 1.6)
      if (f > 1.1) { R.grp.visible = false; state = 'wait'; showEnd() }
    }
  }
  pencil.position.copy(tip); pencil.position.y += lift
  renderer.render(scene, camera)
})
