import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'

const THUMB = new URLSearchParams(location.search).has('thumb')
if (THUMB) document.documentElement.classList.add('thumb')

const canvas = document.getElementById('view')
const loading = document.getElementById('loading')
const soundBtn = document.getElementById('sound-toggle')
const ASSET = new URL('./assets/', import.meta.url).href

const renderer = new THREE.WebGLRenderer({ canvas, antialias: !THUMB, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, THUMB ? 1 : 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
renderer.setClearColor('#3d3930')

const scene = new THREE.Scene()
scene.fog = new THREE.Fog('#3d3930', 22, 48)
const camera = new THREE.PerspectiveCamera(50, 1, 0.12, 90)
camera.position.set(4.15, 3.85, 5.45)
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.target.set(-0.2, 0.12, -0.45)
controls.minPolarAngle = 0.4
controls.maxPolarAngle = Math.PI / 2 + 0.02
controls.minDistance = 2.2
controls.maxDistance = 22
controls.update()

const hemi = new THREE.HemisphereLight('#c9b48a', '#3a3328', 1.15)
scene.add(hemi)
const sun = new THREE.DirectionalLight('#ffe6c2', 2.35)
sun.position.set(6, 10, 4)
sun.castShadow = true
sun.shadow.mapSize.set(1024, 1024)
sun.shadow.camera.near = 0.5
sun.shadow.camera.far = 28
sun.shadow.camera.left = sun.shadow.camera.bottom = -8
sun.shadow.camera.right = sun.shadow.camera.top = 8
sun.shadow.bias = -0.001
scene.add(sun)

function resize() {
  const W = canvas.clientWidth || innerWidth
  const H = canvas.clientHeight || innerHeight
  renderer.setSize(W, H, false)
  camera.aspect = W / Math.max(1, H)
  camera.updateProjectionMatrix()
}
resize()
addEventListener('resize', resize)

function findBone(root, key) {
  let found = null
  root.traverse((o) => {
    if (!found && o.isBone && o.name.endsWith(key)) found = o
  })
  return found
}

function createSound() {
  const buffers = {}
  let ctx = null
  let sfxGain = null
  let bgmGain = null
  let muted = true
  let drillGain = null
  let drillSrc = null
  let bgmSrc = null
  const BGM_LEVEL = 0.08
  async function unlock() {
    if (!ctx) {
      ctx = new AudioContext()
      const master = ctx.createGain()
      master.gain.value = 0.85
      master.connect(ctx.destination)
      sfxGain = ctx.createGain()
      sfxGain.gain.value = 1.35
      sfxGain.connect(master)
      bgmGain = ctx.createGain()
      bgmGain.gain.value = BGM_LEVEL
      bgmGain.connect(master)
      const names = ['drill', 'wrench', 'saw', 'clang', 'bgm']
      await Promise.all(names.map(async (n) => {
        try {
          const res = await fetch(`${ASSET}audio/${n}.mp3`)
          if (!res.ok) throw new Error(String(res.status))
          buffers[n] = await ctx.decodeAudioData(await res.arrayBuffer())
        } catch (err) {
          console.warn('audio fail', n, err)
        }
      }))
      drillGain = ctx.createGain()
      drillGain.gain.value = 0
      drillGain.connect(sfxGain)
    }
    if (ctx.state === 'suspended') await ctx.resume()
    if (!drillSrc && buffers.drill) {
      drillSrc = ctx.createBufferSource()
      drillSrc.buffer = buffers.drill
      drillSrc.loop = true
      drillSrc.connect(drillGain)
      drillSrc.start()
    }
    if (!bgmSrc && buffers.bgm) {
      bgmSrc = ctx.createBufferSource()
      bgmSrc.buffer = buffers.bgm
      bgmSrc.loop = true
      bgmSrc.connect(bgmGain)
      bgmSrc.start()
    }
    bgmGain.gain.setTargetAtTime(BGM_LEVEL, ctx.currentTime, 0.05)
  }
  function beep(name, vol = 1) {
    if (muted || !ctx || !buffers[name]) return
    const src = ctx.createBufferSource()
    src.buffer = buffers[name]
    const g = ctx.createGain()
    g.gain.value = vol * 1.8
    src.connect(g).connect(sfxGain)
    src.start()
  }
  function setSpin(amount) {
    if (!drillGain || muted) return
    drillGain.gain.setTargetAtTime(amount * 0.65, ctx.currentTime, 0.08)
  }
  return {
    get muted() { return muted },
    async toggle() {
      muted = !muted
      if (!muted) await unlock()
      else {
        if (drillGain) drillGain.gain.value = 0
        if (bgmGain) bgmGain.gain.value = 0
      }
      soundBtn.textContent = muted ? 'Sound Off' : 'Sound On'
      soundBtn.setAttribute('aria-pressed', String(!muted))
    },
    beep,
    setSpin,
  }
}

const sound = createSound()
soundBtn.onclick = () => { sound.toggle() }

let running = !THUMB
addEventListener('keydown', (e) => {
  if (e.repeat) return
  if (e.key === ' ') { running = !running; e.preventDefault() }
  if (e.key.toLowerCase() === 'm') sound.toggle()
})

function tintGhost(root, strength) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    mats.forEach((mat, i) => {
      const m = mat.clone()
      m.transparent = true
      m.opacity = 0.36 * strength
      m.depthWrite = false
      m.blending = THREE.NormalBlending
      m.color.multiply(new THREE.Color('#d2e39a'))
      m.emissive = new THREE.Color('#6b8f2e')
      m.emissiveIntensity = 0.2 * strength
      m.roughness = Math.min(0.85, (m.roughness || 0.6) + 0.1)
      if (Array.isArray(o.material)) o.material[i] = m
      else o.material = m
    })
    o.castShadow = false
    o.receiveShadow = false
    o.frustumCulled = false
    if (/eyelash|lashes/i.test(o.name)) o.visible = false
  })
}

async function boot() {
  const draco = new DRACOLoader()
  draco.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)

  const [workerGltf, siteGltf, spinG, flairG, swipesG, uprockG] = await Promise.all([
    loader.loadAsync(`${ASSET}worker.glb`),
    loader.loadAsync(`${ASSET}site.glb`),
    loader.loadAsync(`${ASSET}spin.glb`),
    loader.loadAsync(`${ASSET}flair.glb`),
    loader.loadAsync(`${ASSET}swipes.glb`),
    loader.loadAsync(`${ASSET}uprock.glb`),
  ])

  const site = siteGltf.scene
  const siteBox = new THREE.Box3().setFromObject(site)
  const siteSize = siteBox.getSize(new THREE.Vector3())
  const siteScale = 18 / Math.max(siteSize.x, siteSize.z)
  site.scale.setScalar(siteScale)
  site.updateMatrixWorld(true)
  const siteBox2 = new THREE.Box3().setFromObject(site)
  const siteCenter = siteBox2.getCenter(new THREE.Vector3())
  site.position.x -= siteCenter.x
  site.position.z -= siteCenter.z
  site.position.y -= siteBox2.min.y
  site.updateMatrixWorld(true)
  site.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
      if (o.material) {
        o.material.metalness = Math.min(0.35, o.material.metalness || 0.2)
        o.material.roughness = Math.max(0.55, o.material.roughness || 0.7)
      }
    }
  })
  scene.add(site)
  const floorRay = new THREE.Raycaster(new THREE.Vector3(0, 8, 0), new THREE.Vector3(0, -1, 0))
  const floorHits = floorRay.intersectObject(site, true)
  let groundY = 0
  for (const hit of floorHits) {
    if (hit.point.y > 0.02 && hit.point.y < 2.4) groundY = Math.max(groundY, hit.point.y)
  }

  const source = workerGltf.scene
  const model = cloneSkeleton(source)
  model.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true
      c.receiveShadow = true
      c.frustumCulled = false
      c.renderOrder = 2
    }
  })
  scene.add(model)

  const MAX_GHOSTS = 8
  const ghosts = []
  for (let i = 0; i < MAX_GHOSTS; i++) {
    const root = cloneSkeleton(source)
    const fade = 1 - i / MAX_GHOSTS
    tintGhost(root, 0.55 + fade * 0.45)
    scene.add(root)
    const mixer = new THREE.AnimationMixer(root)
    ghosts.push({ root, mixer, action: null })
  }

  const mixer = new THREE.AnimationMixer(model)
  const clips = [
    spinG.animations[0],
    flairG.animations[0],
    swipesG.animations[0],
    uprockG.animations[0],
  ].filter(Boolean)
  clips.forEach((c, i) => { c.name = ['spin', 'flair', 'swipes', 'uprock'][i] })
  let clipIndex = 0
  let action = null
  const FADE = 0.4
  function armAction(mix, clip) {
    const a = mix.clipAction(clip)
    a.enabled = true
    a.reset()
    a.setLoop(THREE.LoopRepeat, Infinity)
    a.clampWhenFinished = false
    a.setEffectiveWeight(1)
    a.play()
    return a
  }
  function playClip(index) {
    clipIndex = index
    const next = armAction(mixer, clips[clipIndex])
    if (action && action !== next) action.crossFadeTo(next, FADE, false)
    action = next
    ghosts.forEach((g) => {
      g.mixer.stopAllAction()
      const ga = g.mixer.clipAction(clips[clipIndex])
      ga.play()
      ga.paused = true
      ga.enabled = true
      ga.setEffectiveWeight(1)
      g.action = ga
    })
  }
  playClip(0)

  const echoEl = document.getElementById('density')
  const gapEl = document.getElementById('length')
  const echoVal = document.getElementById('density-val')
  const gapVal = document.getElementById('length-val')
  let echoCount = 5
  let echoGap = 0.07
  function applyEcho() {
    echoCount = THUMB ? 4 : Math.round(Number(echoEl.value))
    echoGap = THUMB ? 0.07 : 0.035 + Number(gapEl.value) / 100 * 0.12
    ghosts.forEach((g, i) => { g.root.visible = i < echoCount })
    if (!THUMB) {
      echoVal.textContent = String(echoCount)
      gapVal.textContent = `${Math.round(echoGap * 1000)}ms`
    }
  }
  applyEcho()
  if (!THUMB) {
    echoEl.addEventListener('input', applyEcho)
    gapEl.addEventListener('input', applyEcho)
  }

  const MAX_P = 220
  const pPos = new Float32Array(MAX_P * 3)
  const pVel = Array.from({ length: MAX_P }, () => [0, 0, 0])
  const pLife = new Float32Array(MAX_P)
  const pGeo = new THREE.BufferGeometry()
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
  const dust = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: '#d2b48a',
    size: 0.05,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    toneMapped: false,
  }))
  dust.frustumCulled = false
  scene.add(dust)
  let pCursor = 0
  function burst(at, n = 20) {
    for (let i = 0; i < n; i++) {
      const k = pCursor++ % MAX_P
      pPos[k * 3] = at.x + (Math.random() - 0.5) * 0.12
      pPos[k * 3 + 1] = at.y + 0.02
      pPos[k * 3 + 2] = at.z + (Math.random() - 0.5) * 0.12
      pVel[k][0] = (Math.random() - 0.5) * 2.6
      pVel[k][1] = 1.6 + Math.random() * 3.2
      pVel[k][2] = (Math.random() - 0.5) * 2.6
      pLife[k] = 0.7 + Math.random() * 0.4
    }
  }
  function stepDust(dt) {
    for (let i = 0; i < MAX_P; i++) {
      if (pLife[i] <= 0) continue
      pLife[i] -= dt
      pVel[i][1] -= 11 * dt
      pPos[i * 3] += pVel[i][0] * dt
      pPos[i * 3 + 1] += pVel[i][1] * dt
      pPos[i * 3 + 2] += pVel[i][2] * dt
      if (pPos[i * 3 + 1] < groundY) {
        pPos[i * 3 + 1] = groundY
        pVel[i][1] *= -0.12
        pVel[i][0] *= 0.65
        pVel[i][2] *= 0.65
      }
      if (pLife[i] <= 0) pPos[i * 3 + 1] = -10
    }
    pGeo.attributes.position.needsUpdate = true
  }

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.2, 40),
    new THREE.MeshBasicMaterial({
      color: '#c5d98a',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  ring.rotation.x = -Math.PI / 2
  scene.add(ring)
  let ringAge = 9

  const leftFoot = findBone(model, 'LeftFoot')
  const rightFoot = findBone(model, 'RightFoot')
  const hips = findBone(model, 'Hips')
  const toeL = findBone(model, 'LeftToeBase') || leftFoot
  const toeR = findBone(model, 'RightToeBase') || rightFoot
  const footWorld = new THREE.Vector3()
  const contactBones = ['LeftToe_End', 'RightToe_End', 'LeftToeBase', 'RightToeBase', 'LeftFoot', 'RightFoot']
    .map((key) => findBone(model, key))
    .filter(Boolean)
  const SOLE = 0.05
  function lowestContactY() {
    model.updateMatrixWorld(true)
    let minY = Infinity
    for (const bone of contactBones) {
      bone.getWorldPosition(footWorld)
      if (footWorld.y < minY) minY = footWorld.y
    }
    return minY
  }
  model.updateMatrixWorld(true)
  const bindFloor = lowestContactY()
  const yLift = Number.isFinite(bindFloor) ? groundY + SOLE - bindFloor : groundY
  function plantOnGround() {
    model.position.y = yLift
  }

  const prevFoot = { l: null, r: null }
  const footVel = { l: 0, r: 0 }
  const footCool = { l: 0, r: 0 }
  const hipPrev = new THREE.Vector3()
  const hipNow = new THREE.Vector3()
  let shake = 0
  let clipElapsed = 0
  let last = performance.now()

  loading.remove()
  mixer.update(0)
  plantOnGround()

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016)
    last = now
    controls.update()
    if (shake > 0.002) {
      camera.position.x += (Math.random() - 0.5) * shake
      camera.position.y += (Math.random() - 0.5) * shake * 0.55
      shake *= 0.8
    }
    mixer.update(running ? dt : 0)
    model.position.y = yLift
    model.updateMatrixWorld(true)
    if (running) {
      clipElapsed += dt
      const durNow = action.getClip().duration || 2
      if (clipElapsed >= durNow - FADE) {
        clipElapsed = 0
        playClip((clipIndex + 1) % clips.length)
      }
      if (hips) {
        hips.getWorldPosition(hipNow)
        const spd = hipNow.distanceTo(hipPrev) / Math.max(dt, 1e-3)
        sound.setSpin(Math.min(1, spd * 0.5))
        hipPrev.copy(hipNow)
      }
      for (const [bone, key, sample] of [[toeL, 'l', 'wrench'], [toeR, 'r', 'clang']]) {
        if (!bone) continue
        bone.getWorldPosition(footWorld)
        const y = footWorld.y
        const v = prevFoot[key] == null ? 0 : (y - prevFoot[key]) / Math.max(dt, 1e-3)
        footCool[key] -= dt
        if (footCool[key] <= 0 && footVel[key] < -1.1 && v > -0.2) {
          sound.beep(sample, 0.9 + Math.random() * 0.3)
          if (Math.random() < 0.5) sound.beep('saw', 0.4)
          footCool[key] = 0.11
          burst(footWorld, 22)
          ring.position.set(footWorld.x, groundY + 0.025, footWorld.z)
          ringAge = 0
          shake = Math.max(shake, 0.016)
        }
        footVel[key] = v
        prevFoot[key] = y
      }
    }
    plantOnGround()
    const liveT = action.time
    const dur = action.getClip().duration || 1
    ghosts.forEach((g, i) => {
      if (!g.root.visible || !g.action) return
      const t = (liveT - echoGap * (i + 1) + dur * 8) % dur
      g.action.paused = true
      g.action.enabled = true
      g.action.time = t
      g.mixer.update(0.001)
      g.root.position.copy(model.position)
    })
    stepDust(dt)
    ringAge += dt
    ring.scale.setScalar(1 + ringAge * 7)
    ring.material.opacity = Math.max(0, 0.5 - ringAge * 1.35)
    renderer.render(scene, camera)
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

boot().catch((err) => {
  loading.textContent = 'LOAD FAILED'
  console.error(err && err.stack ? err.stack : err)
})
