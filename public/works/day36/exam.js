// 채점장: 차가운 소재 두 개로 '따뜻함'을 그리라는 실기 주제가 나오고,
// 강당 바닥에 깔린 답안지를 1인칭 교수가 막대기로 하나씩 채점한다.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const THUMB = new URLSearchParams(location.search).has('thumb')
if (THUMB) document.documentElement.classList.add('thumb')
const $ = (id) => document.getElementById(id)
const manifest = await fetch('./manifest.json').then((r) => r.json())

// ── 심사위원 한마디: 그림 수준과 매긴 점수가 맞물려야 말이 된다 ──
const SAY = {
  best: {
    hi: ['내가 찾던 인재군.', '얼음 굴절까지 잡았네. 손이 아니라 눈이 좋은 거야.', '올해 수석은 여기서 나오겠다.', '차가운 걸로 이렇게 데울 줄은 몰랐다.'],
    mid: ['묘사는 합격인데, 내 기분이 오늘 C야. 미안하다.', '너무 잘 그려서 학원 냄새가 나.'],
    lo: ['이걸 떨어뜨리면 내가 떨어지겠지만… 원칙은 원칙이다.', '완벽해서 오히려 차갑구나. 따뜻함은 어디 두고 왔니?'],
  },
  good: {
    hi: ['작년 합격 우수작 향기가 살짝 스치네?', '성실함이 보인다. 한 끗만 더 과감했으면.', '온기는 느껴진다. 조금 미지근하지만.'],
    mid: ['무난해. 무난한 게 문제야.', '학원에서 배운 공식 그대로구나. 네 얘기를 해 봐.', '따뜻함이 미지근함에서 멈췄네.'],
    lo: ['그라데이션만 예쁘다. 그림은 어디 있니?', '소재는 읽었는데 주제는 못 읽었구나.'],
  },
  plain: {
    hi: ['원근은 틀렸는데 마음은 맞았다. 이번만 봐준다.', '서툴러도 이상하게 끌리네.'],
    mid: ['열심히 한 건 보여. 그게 다야.', '원근이 바닥에서 미끄러지고 있다.'],
    lo: ['예술에 정답은 없다지만, 이건 오답에 가까워.', '그림에서 찬바람 불어서 감기 걸리겠어. 주제어 잘못 읽었니?', '색이 다 얼어붙었네.'],
  },
  unfinished: {
    hi: ['미완성이 주제라고 우기면… 그래, 한 번 믿어 본다.', '연필 선만으로도 온기가 있네. 다음엔 끝까지 칠하자.'],
    mid: ['밑그림은 합격, 시간 관리는 불합격.', '칠하다 만 쪽이 제일 따뜻하구나.'],
    lo: ['시험장 시계 고장 났었니? 스케치하다 끝났네.', '이건 그림이 아니라 계획서야.', '종이가 제일 따뜻하네. 하얘서.'],
  },
}
const band = (g) => ('AB'.includes(g) ? 'hi' : g === 'C' ? 'mid' : 'lo')

// ── 화면 ─────────────────────────────────────────────
const canvas = $('view')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
const scene = new THREE.Scene()
scene.background = new THREE.Color('#1a1d22')
scene.fog = new THREE.Fog('#1a1d22', 9, 22)
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
scene.environmentIntensity = 0.35
const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 60)

// 창으로 드는 차가운 오후 빛 + 천장 조명의 따뜻한 빛
const sun = new THREE.DirectionalLight('#dfe9ff', 2.6)
sun.position.set(-4, 7, -6); sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 6, bottom: -6, near: 1, far: 25 })
sun.shadow.bias = -0.0004; sun.shadow.normalBias = .02
scene.add(sun)
scene.add(new THREE.HemisphereLight('#f4ead8', '#3b2a1c', 0.55))
const lamp = new THREE.PointLight('#ffd6a0', 3, 12, 1.6); lamp.position.set(0, 4, 1.5); scene.add(lamp)

// 나무 바닥: 니스 칠한 강당 마루
function woodTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 2048
  const g = c.getContext('2d'), pw = 128
  for (let x = 0; x < 2048; x += pw) {
    let y = -Math.random() * 600
    while (y < 2048) {
      const len = 500 + Math.random() * 700
      const v = Math.random(); const base = [142 + v * 46, 92 + v * 34, 54 + v * 22]
      g.fillStyle = `rgb(${base.map((v) => v | 0).join(',')})`; g.fillRect(x, y, pw, len)
      for (let k = 0; k < 26; k++) {
        g.strokeStyle = `rgba(${Math.random() < .5 ? '60,35,15' : '230,190,140'},${.05 + Math.random() * .09})`
        g.lineWidth = .8 + Math.random() * 2.2; g.beginPath()
        const gx = x + Math.random() * pw; g.moveTo(gx, y)
        for (let t = 0; t <= len; t += 40) g.lineTo(gx + Math.sin(t / 90 + k) * 3, y + t)
        g.stroke()
      }
      g.fillStyle = 'rgba(40,22,10,.55)'; g.fillRect(x, y, pw, 2); g.fillRect(x, y, 2, len)
      y += len
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(18, 18); t.anisotropy = 8
  return t
}
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40),
  new THREE.MeshPhysicalMaterial({ map: woodTexture(), roughness: .55, clearcoat: .25, clearcoatRoughness: .4, envMapIntensity: .4 }))
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor)
// 강당 벽과 높은 창
const wallMat = new THREE.MeshStandardMaterial({ color: '#cfc8bb', roughness: .95 })
const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 9), wallMat); back.position.set(0, 4.5, -7); back.receiveShadow = true; scene.add(back)
const glass = new THREE.MeshStandardMaterial({ color: '#cfe0f5', emissive: '#bcd2f0', emissiveIntensity: 1.1 })
const frameMat = new THREE.MeshStandardMaterial({ color: '#3c3a36', roughness: .6 })
for (let i = -6; i <= 6; i++) {
  const w = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.6), glass); w.position.set(i * 2.6, 4.2, -6.98); scene.add(w)
  for (const [dx, dy, sx, sy] of [[0, 0, .06, 3.6], [0, .6, 1.4, .06], [0, -.6, 1.4, .06]]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, .04), frameMat); f.position.set(i * 2.6 + dx, 4.2 + dy, -6.95); scene.add(f)
  }
}
const skirting = new THREE.Mesh(new THREE.BoxGeometry(40, .3, .05), frameMat); skirting.position.set(0, .15, -6.97); scene.add(skirting)

// ── 막대기 ───────────────────────────────────────────
const stick = new THREE.Group(); scene.add(stick)
{
  const len = 1.6
  const wood = new THREE.Mesh(new THREE.CylinderGeometry(.016, .009, len, 16), new THREE.MeshStandardMaterial({ color: '#5a3a20', roughness: .5 }))
  wood.rotation.x = Math.PI / 2; wood.position.z = len / 2; wood.castShadow = true
  const tip = new THREE.Mesh(new THREE.SphereGeometry(.012, 12, 8), new THREE.MeshStandardMaterial({ color: '#1b1b1b', roughness: .7 }))
  tip.position.z = len
  stick.add(wood, tip); stick.userData.len = len
}
const stickTip = new THREE.Vector3(), stickTipTo = new THREE.Vector3()
function placeStick() {
  // 손잡이는 화면 오른쪽 아래, 끝은 stickTip
  const handle = camera.localToWorld(new THREE.Vector3(.36, -.3, -.6))
  const dir = stickTip.clone().sub(handle).normalize()
  stick.position.copy(stickTip).addScaledVector(dir, -stick.userData.len)
  stick.lookAt(stickTip)
}

// ── 답안지 ───────────────────────────────────────────
const PW = .76, PH = .57, GAP = 1.08
let papers = [], idx = 0, busy = false, pairKey = null, camX = 0
const loader = new THREE.TextureLoader()
function stampTex(letter) {
  const c = document.createElement('canvas'); c.width = c.height = 256
  const g = c.getContext('2d')
  g.strokeStyle = g.fillStyle = '#c8261d'; g.lineWidth = 14
  g.beginPath(); g.arc(128, 128, 104, 0, 7); g.stroke()
  g.lineWidth = 5; g.beginPath(); g.arc(128, 128, 86, 0, 7); g.stroke()
  g.font = '900 140px "Noto Serif KR", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(letter, 128, 140)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}
function clearPapers() { papers.forEach((p) => scene.remove(p.mesh)); papers = [] }
async function layPapers(key) {
  clearPapers()
  pairKey = key
  const list = manifest.pairs[key].images.slice().sort(() => Math.random() - .5)
  const n = list.length
  const loads = list.map((im, i) => new Promise((res) => {
    loader.load(`./art/${im.file}`, (t) => res(t), undefined, () => res(null))
  }).then((tex) => {
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .92, color: tex ? '#ffffff' : '#f4f1ea' })
    if (tex) { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8 }
    const g = new THREE.PlaneGeometry(PW, PH); g.rotateX(-Math.PI / 2)
    const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true; mesh.castShadow = true
    const x = (i - (n - 1) / 2) * GAP
    mesh.position.set(x + (Math.random() - .5) * .05, .003 + i * .0001, (Math.random() - .5) * .06)
    mesh.rotation.y = (Math.random() - .5) * .07
    scene.add(mesh)
    papers[i] = { mesh, im, x, home: mesh.position.clone(), grade: null, anim: null }
  }))
  await Promise.all(loads)
  idx = 0; camX = papers[0].x
  stickTip.set(camX + .2, .1, .3); stickTipTo.copy(stickTip)
  updateUI()
}

// ── 화면 위 조작 ─────────────────────────────────────
const GRADES = ['A', 'B', 'C', 'D', 'E']
const gradesEl = $('grades')
GRADES.forEach((g, i) => {
  const b = document.createElement('button'); b.className = 'pill g' + (i < 2 ? ' keep' : ''); b.textContent = g
  b.title = i < 2 ? '킵' : '치우기'
  b.addEventListener('click', () => grade(g)); gradesEl.appendChild(b)
})
function updateUI() {
  const p = papers[idx]
  const can = p && !p.grade && !busy
  gradesEl.classList.toggle('off', !can)
  const done = papers.filter((q) => q.grade).length
  $('count').textContent = `${done} / ${papers.length} 채점`
  $('prev').disabled = idx <= 0; $('next').disabled = idx >= papers.length - 1
}
function move(d) {
  if (busy || !papers.length) return
  idx = Math.max(0, Math.min(papers.length - 1, idx + d)); updateUI()
}
$('prev').addEventListener('click', () => move(-1))
$('next').addEventListener('click', () => move(1))
addEventListener('keydown', (e) => {
  if ($('hud').classList.contains('hidden')) return
  if (e.key === 'Escape') closeZoom()
  if (!$('zoom').classList.contains('hidden')) { if (e.key >= '1' && e.key <= '5') { closeZoom(); grade(GRADES[+e.key - 1]) } return }
  if (e.key === 'ArrowLeft') move(-1)
  else if (e.key === 'ArrowRight') move(1)
  else if (e.key >= '1' && e.key <= '5') grade(GRADES[+e.key - 1])
})

let bubbleT = 0
function say(text) {
  $('say').textContent = text; $('bubble').classList.add('on')
  clearTimeout(bubbleT); bubbleT = setTimeout(() => $('bubble').classList.remove('on'), 2600)
}

const ease = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
function grade(g) {
  const p = papers[idx]
  if (!p || p.grade || busy) return
  busy = true; p.grade = g; updateUI()
  // 한마디: 미완성 답안에 낮은 점수를 주면 그에 맞는 말
  const lines = SAY[p.im.tier][band(g)]
  say(lines[Math.random() * lines.length | 0])
  // 도장
  const st = new THREE.Mesh(new THREE.PlaneGeometry(.13, .13), new THREE.MeshBasicMaterial({ map: stampTex(g), transparent: true, depthWrite: false }))
  st.rotation.x = -Math.PI / 2; st.rotation.z = (Math.random() - .5) * .5
  st.position.set(PW / 2 - .1, .002, PH / 2 - .1); st.scale.setScalar(.01)
  p.mesh.add(st); p.stamp = st
  const keep = g === 'A' || g === 'B'
  p.anim = { t: 0, keep, from: p.mesh.position.clone(), rot: p.mesh.rotation.y }
}
function stepPaper(p, dt) {
  const a = p.anim; a.t += dt
  const t = a.t
  // 도장이 쿵
  const sk = Math.min(1, t / .18); p.stamp.scale.setScalar(Math.max(.01, 1.35 - .35 * sk) * Math.min(1, t / .12))
  const x = p.mesh.position.x
  if (a.keep) {
    // 막대 끝을 종이 아래쪽에 대고 위(먼 쪽)로 밀어 올린다
    if (t < .55) stickTipTo.set(x, .02, a.from.z + PH / 2 + .03)
    const k = ease(Math.max(0, Math.min(1, (t - .55) / .7)))
    p.mesh.position.z = a.from.z - k * 1.35
    if (t >= .55) stickTipTo.set(x, .02, p.mesh.position.z + PH / 2 + .03)
    if (t > 1.35) stickTipTo.set(camX + .2, .1, .3)
    if (t > 1.7) return true
  } else {
    // 종이 위쪽에 막대를 대고 아래(가까운 쪽)로 확 쓸어 치운다
    if (t < .5) stickTipTo.set(x - .05, .02, a.from.z - PH / 2 + .04)
    const k = Math.max(0, Math.min(1, (t - .5) / .45)), kk = k * k
    p.mesh.position.set(a.from.x + kk * .9, .003 + Math.sin(k * Math.PI) * .05, a.from.z + kk * 2.6)
    p.mesh.rotation.y = a.rot + kk * 1.4
    if (t >= .5 && t < .9) stickTipTo.set(a.from.x + kk * .55, .02, a.from.z - PH / 2 + .04 + kk * 1.2)
    if (t > .95) stickTipTo.set(camX + .2, .1, .3)
    if (t > 1.4) { p.mesh.visible = false; return true }
  }
  return false
}
function afterGrade() {
  busy = false
  const left = papers.findIndex((q, i) => i > idx && !q.grade)
  const any = papers.findIndex((q) => !q.grade)
  if (any < 0) { updateUI(); setTimeout(showResult, 900); return }
  idx = left >= 0 ? left : any
  updateUI()
}

// 자세히 보기: 아직 채점 안 한 그림 위에 마우스를 올리면 버튼이 뜬다
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2()
let hoverP = null, overBtn = false
canvas.addEventListener('pointermove', (e) => {
  mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  ray.setFromCamera(mouse, camera)
  const live = papers.filter((p) => !p.grade && p.mesh.visible)
  const hit = ray.intersectObjects(live.map((p) => p.mesh), false)[0]
  hoverP = hit ? live.find((p) => p.mesh === hit.object) : null
  canvas.style.cursor = hoverP ? 'zoom-in' : ''
})
canvas.addEventListener('pointerleave', () => { hoverP = null })
canvas.addEventListener('click', () => { if (hoverP) openZoom(hoverP) })
const detailBtn = $('detail')
detailBtn.addEventListener('pointerenter', () => (overBtn = true))
detailBtn.addEventListener('pointerleave', () => (overBtn = false))
let shownP = null
function placeDetail() {
  const p = hoverP || (overBtn ? shownP : null)
  if (!p || p.grade || busy) { detailBtn.style.display = 'none'; shownP = null; return }
  shownP = p
  const v = p.mesh.position.clone().project(camera)
  detailBtn.style.display = 'block'
  detailBtn.style.left = `${(v.x + 1) / 2 * innerWidth}px`
  detailBtn.style.top = `${(1 - v.y) / 2 * innerHeight}px`
}
function openZoom(p) {
  p = p || shownP; if (!p || p.grade) return
  if (!busy) { idx = papers.indexOf(p); updateUI() }
  $('zoomImg').src = `./art/${p.im.file}`; $('zoom').classList.remove('hidden')
}
function closeZoom() { $('zoom').classList.add('hidden') }
detailBtn.addEventListener('click', () => openZoom())
$('zoomClose').addEventListener('click', closeZoom)
$('zoom').addEventListener('click', (e) => { if (e.target.id === 'zoom') closeZoom() })

// 결과
function showResult() {
  const kept = papers.filter((p) => p.grade === 'A' || p.grade === 'B')
  $('resultSub').textContent = kept.length ? `${papers.length}장 중 ${kept.length}장을 남겼어요` : '남긴 그림이 한 장도 없어요. 올해는 냉정하네요.'
  $('kept').innerHTML = kept.map((p) => `<figure><img src="./art/${p.im.file}" alt="" />${p.grade}</figure>`).join('')
  show('result')
}

// ── 홈 → 출제 → 강당 ─────────────────────────────────
const picked = []
const keysEl = $('keys')
manifest.keywords.forEach((k, i) => {
  const b = document.createElement('button'); b.className = 'key'
  b.innerHTML = `<i>${i + 1}</i>${k}`
  b.addEventListener('click', () => {
    const at = picked.indexOf(i)
    if (at >= 0) picked.splice(at, 1)
    else { picked.push(i); if (picked.length > 2) picked.shift() }
    refreshKeys()
  })
  keysEl.appendChild(b)
})
function refreshKeys() {
  ;[...keysEl.children].forEach((b, i) => b.classList.toggle('on', picked.includes(i)))
  $('go').disabled = picked.length !== 2
  $('picked').textContent = picked.length ? '선택한 제시어: ' + picked.map((i) => manifest.keywords[i]).join(', ') : '제시어를 두 가지 고르세요'
}
function show(name) {
  for (const id of ['home', 'brief', 'result']) $(id).classList.toggle('hidden', id !== name)
  $('hud').classList.toggle('hidden', name !== 'hud')
}
$('go').addEventListener('click', async () => {
  const [a, b] = picked.slice().sort((x, y) => x - y)
  const key = `${a}-${b}`, topic = manifest.pairs[key].topic
  $('briefTopic').textContent = topic; $('topicText').textContent = topic
  show('brief')
  const bar = $('briefBar'), st = $('briefStatus')
  const steps = [[0, '주제를 출제하는 중…'], [900, '수험생 8명이 발상하는 중…'], [2000, '답안지에 그리는 중…'], [3200, '강당에 답안지를 펼치는 중…']]
  steps.forEach(([ms, txt]) => setTimeout(() => (st.textContent = txt), ms))
  bar.style.transition = 'none'; bar.style.width = '0'
  requestAnimationFrame(() => { bar.style.transition = 'width 4s cubic-bezier(.3,.1,.3,1)'; bar.style.width = '100%' })
  const lay = layPapers(key)
  await Promise.all([lay, new Promise((r) => setTimeout(r, 4200))])
  show('hud')
})
const backHome = () => { closeZoom(); picked.length = 0; refreshKeys(); show('home') }
$('again').addEventListener('click', backHome)
$('again2').addEventListener('click', backHome)
refreshKeys()

if (THUMB) { await layPapers('0-1'); show('hud') }

// ── 그리기 ───────────────────────────────────────────
function resize() {
  renderer.setSize(innerWidth, innerHeight, false)
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix()
}
addEventListener('resize', resize); resize()
let last = performance.now()
renderer.setAnimationLoop((now) => {
  const dt = Math.min(.05, (now - last) / 1000); last = now
  const p = papers[idx]
  if (p) camX += (p.x - camX) * Math.min(1, dt * 4)
  // 서서 내려다보는 교수의 눈높이, 걸을 때 살짝 흔들린다
  const walk = p ? Math.abs(p.x - camX) : 0
  camera.position.set(camX, 1.38 + Math.sin(now / 120) * .006 * Math.min(1, walk * 4), .2)
  camera.lookAt(camX, 0, -.02)
  lamp.position.x = camX
  for (const q of papers) if (q.anim && !q.anim.done) {
    if (stepPaper(q, dt)) { q.anim.done = true; afterGrade() }
  }
  if (!busy) stickTipTo.set(camX + .2, .1 + Math.sin(now / 700) * .01, .3)
  stickTip.lerp(stickTipTo, Math.min(1, dt * 12))
  placeStick()
  placeDetail()
  renderer.render(scene, camera)
})
