// 알림음: 짧은 알림 소리를 늘이면, 파형 안에서 그 소리가 울리는 장면이 펼쳐진다.
// 다시 줄이면 익숙한 길이의 소리와 파형으로 돌아온다.
import * as THREE from 'three'

const THUMB = new URLSearchParams(location.search).has('thumb')
if (THUMB) document.documentElement.classList.add('thumb')

const SR = 44100
const BINS = 1024
const MAX_STRETCH = 40

// ── 소리 ─────────────────────────────────────────────
// 식당 호출벨: 높은 '띵' 다음 낮은 '동'
function bell(out, t0, f, amp, tau) {
  const parts = [[1, 1, tau], [2, 0.22, tau * 0.5], [3, 0.07, tau * 0.32], [4.16, 0.05, tau * 0.2]]
  const s0 = Math.floor(t0 * SR)
  for (let i = s0; i < out.length; i++) {
    const t = (i - s0) / SR
    const att = Math.min(1, t / 0.004)
    let v = 0
    for (const [k, a, tau] of parts) v += a * Math.exp(-t / tau) * Math.sin(2 * Math.PI * f * k * t)
    out[i] += amp * att * v
  }
}
// 뻐꾸기: 높은 '뻐'에서 낮은 '꾹'으로 미끄러지는 두 음, 두 번
function coo(out, t0, f0, f1, len, amp) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(len * SR)
  let ph = 0
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const u = i / n, f = f0 + (f1 - f0) * u
    ph += 2 * Math.PI * f / SR
    const env = Math.min(1, u / 0.12) * Math.pow(1 - u, 1.4)
    out[s0 + i] += amp * env * (Math.sin(ph) + 0.16 * Math.sin(2 * ph) + 0.05 * Math.sin(3 * ph))
  }
}
// 자동차 경적: 두 음이 겹친 거친 소리, 짧게 한 번 길게 한 번
function honk(out, t0, len, amp) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(len * SR)
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / SR
    const env = Math.min(1, t / 0.008) * Math.min(1, (len - t) / 0.03)
    let v = 0
    for (const f of [415, 494]) for (let h = 1; h <= 9; h += 2) v += Math.sin(2 * Math.PI * f * h * t) / (h * 1.3)
    out[s0 + i] += amp * env * Math.tanh(v * 1.6) * 0.6
  }
}
// 꼬르륵: 낮은 울림 위로 크고 작은 거품이 이어 터진다
function growl(out) {
  let seed = 7
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const n = out.length
  // 낮은 울림
  let ph = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR, u = i / n
    const f = 72 + 22 * Math.sin(t * 5.3) + 14 * Math.sin(t * 13.1)
    ph += 2 * Math.PI * f / SR
    const env = Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 1.5 * (0.6 + 0.4 * Math.sin(t * 9.7) ** 2)
    out[i] += 0.28 * env * Math.sin(ph)
  }
  // 거품: 짧게 음이 올라가는 '꾸륵'
  let tc = 0.08
  while (tc < 1.6) {
    const w = 0.018 + rnd() * 0.05, f0 = 110 + rnd() * 170, amp = 0.25 + rnd() * 0.55
    const a = Math.floor((tc - w * 2) * SR), b = Math.floor((tc + w * 2) * SR)
    let p = 0
    for (let i = Math.max(0, a); i < Math.min(n, b); i++) {
      const t = i / SR - tc, g = Math.exp(-(t * t) / (2 * w * w))
      p += 2 * Math.PI * f0 * (1 + 0.8 * (t / w + 2) / 4) / SR
      out[i] += amp * g * Math.sin(p)
    }
    tc += 0.025 + rnd() * (tc < 1.1 ? 0.07 : 0.14)
  }
}

const SOUNDS = [
  {
    id: 'dingdong', name: '띵동', img: './scene/dingdong.jpg', ink: '#d23c1c', dur: 2.1,
    synth(out) { bell(out, 0.0, 659.25, 0.42, 0.28); bell(out, 0.5, 523.25, 0.5, 0.42) },
  },
  {
    id: 'cuckoo', name: '뻐꾹', img: './scene/cuckoo.jpg', ink: '#1d6b34', dur: 2.1,
    synth(out) {
      coo(out, 0.02, 720, 700, 0.24, 0.5); coo(out, 0.3, 585, 560, 0.36, 0.48)
      coo(out, 1.0, 720, 700, 0.24, 0.42); coo(out, 1.28, 585, 560, 0.42, 0.4)
    },
  },
  {
    id: 'horn', name: '빵빵', img: './scene/horn.jpg', ink: '#2a4bc4', dur: 1.4,
    synth(out) { honk(out, 0.02, 0.24, 0.5); honk(out, 0.4, 0.62, 0.55) },
  },
  {
    id: 'growl', name: '꼬르륵', img: './scene/growl.jpg', ink: '#b8620e', dur: 1.9,
    synth: growl,
  },
]

// ── 소리 → 파형 높이 ──────────────────────────────────
function hash1(i) { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }
function vnoise(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash1(i) * (1 - u) + hash1(i + 1) * u }
function fbm(x, seed) { let v = 0, a = 0.5, f = 1; for (let o = 0; o < 4; o++) { v += a * vnoise(x * f + seed * 17.3); f *= 2.1; a *= 0.5 } return v / 0.9375 }

function shapes(buf) {
  const raw = new Float32Array(BINS)
  const per = buf.length / BINS
  for (let i = 0; i < BINS; i++) {
    let m = 0
    for (let j = Math.floor(i * per); j < Math.floor((i + 1) * per); j++) m = Math.max(m, Math.abs(buf[j]))
    raw[i] = m
  }
  const mx = Math.max(...raw)
  for (let i = 0; i < BINS; i++) raw[i] = raw[i] / mx
  // 짧을 때: 막대마다 조금씩 들쭉날쭉한 익숙한 파형
  const bars = raw.map((v, i) => Math.max(0.025, v * (0.72 + 0.28 * hash1(i * 3.1))))
  // 늘였을 때: 소리의 큰 흐름을 따라가는 능선. 위아래가 다르게 일렁인다
  const sm = new Float32Array(BINS), sg = 22
  for (let i = 0; i < BINS; i++) {
    let s = 0, w = 0
    for (let k = -3 * sg; k <= 3 * sg; k++) {
      const j = Math.min(BINS - 1, Math.max(0, i + k)), g = Math.exp(-(k * k) / (2 * sg * sg))
      s += raw[j] * g; w += g
    }
    sm[i] = s / w
  }
  const smx = Math.max(...sm)
  const top = new Float32Array(BINS), bot = new Float32Array(BINS)
  for (let i = 0; i < BINS; i++) {
    const x = i / BINS, e = sm[i] / smx
    top[i] = (0.6 + 0.4 * e) * (0.72 + 0.5 * fbm(x * 9, 1)) + 0.03 * (fbm(x * 70, 4) - 0.5)
    bot[i] = (0.6 + 0.4 * e) * (0.72 + 0.5 * fbm(x * 7, 2)) + 0.03 * (fbm(x * 60, 5) - 0.5)
  }
  const n = Math.max(...top, ...bot)
  for (let i = 0; i < BINS; i++) { top[i] /= n; bot[i] /= n }
  return { bars, top, bot, raw }
}

for (const s of SOUNDS) {
  s.data = new Float32Array(Math.floor(s.dur * SR))
  s.synth(s.data)
  let pk = 0
  for (const v of s.data) pk = Math.max(pk, Math.abs(v))
  for (let i = 0; i < s.data.length; i++) s.data[i] *= 0.8 / pk
  const fadeN = Math.floor(0.25 * SR)
  for (let i = 0; i < fadeN; i++) s.data[s.data.length - 1 - i] *= i / fadeN
  s.shape = shapes(s.data)
}

// ── 화면 ─────────────────────────────────────────────
const canvas = document.getElementById('view')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
const scene = new THREE.Scene()
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
const envData = new Uint8Array(BINS * 4)
const envTex = new THREE.DataTexture(envData, BINS, 1, THREE.RGBAFormat)
envTex.magFilter = envTex.minFilter = THREE.LinearFilter
envTex.needsUpdate = true

const loader = new THREE.TextureLoader()
for (const s of SOUNDS) {
  s.tex = loader.load(s.img)
  s.tex.colorSpace = THREE.NoColorSpace
  s.tex.minFilter = THREE.LinearFilter
}
const hex = (h) => new THREE.Vector3(...[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255))

const mat = new THREE.ShaderMaterial({
  uniforms: {
    uImg: { value: null }, uEnv: { value: envTex },
    uRes: { value: new THREE.Vector2() }, uX: { value: new THREE.Vector2() },
    uMid: { value: 0 }, uH: { value: 0 }, uS: { value: 0 }, uCell: { value: new THREE.Vector2() },
    uPhoto: { value: 0 }, uPlay: { value: -1 }, uTime: { value: 0 }, uHover: { value: -1 }, uSeed: { value: 0 },
    uBg: { value: new THREE.Vector3() }, uInk: { value: new THREE.Vector3() },
  },
  vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: /* glsl */`
    precision highp float;
    uniform sampler2D uImg, uEnv;
    uniform vec2 uRes, uX, uCell;
    uniform float uMid, uH, uS, uPhoto, uPlay, uTime, uHover, uSeed;
    uniform vec3 uBg, uInk;
    float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + 1.), f.x), f.y); }
    float bayer4(vec2 c){
      c = mod(c, 4.);
      float x = c.x, y = c.y;
      float a = mod(x, 2.), b = mod(y, 2.), A = floor(x / 2.), B = floor(y / 2.);
      float v = 4. * (2. * a * (1. - b) + 3. * a * b + 1. * (1. - a) * b) + (2. * A * (1. - B) + 3. * A * B + 1. * (1. - A) * B);
      return (v + .5) / 16.;
    }
    // 화면 위치 → 장면 밝기. 파형 밖이면 inside = 0
    float lum(vec2 p, out float inside){
      inside = 0.;
      float t = (p.x - uX.x) / (uX.y - uX.x);
      if (t < 0. || t > 1.) return 1.;
      vec4 e = texture2D(uEnv, vec2(t, .5));
      float top = uMid + e.r * uH, bot = uMid - e.g * uH;
      if (p.y >= top || p.y <= bot) return 1.;
      inside = 1.;
      float vw = (p.y - bot) / max(1., top - bot);
      float vf = (p.y - (uMid - uH)) / max(1., 2. * uH);
      return dot(texture2D(uImg, vec2(t, clamp(mix(vw, vf, .82), 0., 1.))).rgb, vec3(.299, .587, .114));
    }
    float dens(float L){ return smoothstep(.03, .85, pow(clamp(1. - L, 0., 1.), .48)); }

    void main(){
      vec2 px = gl_FragCoord.xy;
      vec3 col = uBg;
      float D = uCell.x / 4.;
      // 1비트 판화: 고운 정사각 픽셀 위에, 밝은 곳은 흩뿌린 점, 중간은 형태를 따라 도는 빗금,
      // 어두운 곳은 거의 꽉 찬 먹에 흰 티끌, 경계는 가는 검은 선
      float P = 2. * D;
      vec2 cc = floor(px / P), ctr = (cc + .5) * P;
      // 늘일수록 픽셀이 하나씩 막대 파형에서 판화로 바뀐다
      bool pattern = h21(cc * .37 + 11.) < smoothstep(.2, .9, uPhoto) * 1.04 - .02;
      if (pattern) {
        float ins;
        float L = lum(ctr, ins);
        bool on = false;
        if (ins > .5) {
          float d = dens(L);
          // 형태의 결: 밝기 기울기 방향에 직각으로 빗금이 돈다
          float r = 3. * P, i1, i2, i3, i4;
          float gx = lum(ctr + vec2(r, 0.), i1) - lum(ctr - vec2(r, 0.), i2);
          float gy = lum(ctr + vec2(0., r), i3) - lum(ctr - vec2(0., r), i4);
          float gm = length(vec2(gx, gy));
          vec2 dir = gm > .02 ? normalize(vec2(gx, gy)) : normalize(vec2(1., 1.));
          float wob = (n2(cc * .05 + uSeed * 3.) - .5) * 1.2;
          float u = dot(cc, dir) + wob * 3.;
          float period = 3. + floor(h21(vec2(uSeed, 9.)) * 2.);
          float hatch = fract(u / period);
          float noiseT = h21(cc + uSeed * 17.);
          if (d > .78) {
            // 먹: 흰 티끌만 드문드문
            on = noiseT > (1. - d) * .55;
          } else if (d > .4) {
            // 빗금: 진할수록 선이 굵어지고, 사이에 점이 섞인다
            float w = mix(.22, .75, (d - .4) / .38);
            on = hatch < w || noiseT < (d - .4) * .35;
          } else {
            // 흩뿌린 점: 밝을수록 성기다
            on = noiseT < d * d * 2.2 + .012 * smoothstep(0., .3, d);
          }
          // 경계는 가는 검은 선
          float i5, i6;
          float Lr = lum(ctr + vec2(P, 0.), i5), Lu = lum(ctr + vec2(0., P), i6);
          if (abs(Lr - L) * i5 + abs(Lu - L) * i6 > .16) on = true;
          // 파형 윤곽선
          float o1, o2, o3, o4;
          lum(ctr + vec2(P, 0.), o1); lum(ctr - vec2(P, 0.), o2); lum(ctr + vec2(0., P), o3); lum(ctr - vec2(0., P), o4);
          if (o1 < .5 || o2 < .5 || o3 < .5 || o4 < .5) on = true;
        }
        if (on) col = uInk;
      } else {
        // 화면 전체가 같은 크기의 세로 막대 칸으로 나뉜다
        float cx = floor((px.x - uX.x) / uCell.x);
        float cy = floor((px.y - uMid) / uCell.y);
        float gx = fract((px.x - uX.x) / uCell.x);
        float t = (cx + .5) * uCell.x / (uX.y - uX.x);
        if (px.x >= uX.x && t <= 1. && gx < .72) {
          vec4 e = texture2D(uEnv, vec2(t, .5));
          float top = uMid + e.r * uH, bot = uMid - e.g * uH;
          float yc = uMid + (cy + .5) * uCell.y;
          // 늘일수록 칸 단위로 잘려, 가장자리가 계단처럼 떨어진다
          bool inside = uPhoto < .5 ? (px.y < top && px.y > bot) : (yc < top && yc > bot);
          if (inside) {
            // 장면은 제자리에 두고 파형 윤곽이 창처럼 잘라 낸다. 윤곽을 따라 살짝만 휜다
            float vw = (yc - bot) / max(1., top - bot);
            float vf = (yc - (uMid - uH)) / max(1., 2. * uH);
            float v = mix(vw, vf, .82);
            vec3 ph = texture2D(uImg, vec2(t, clamp(v, 0., 1.))).rgb;
            float L = dot(ph, vec3(.299, .587, .114));
            // 밝은 쪽 계조를 넓혀, 흰 벽의 빛 번짐도 밀도 차이로 남긴다
            float d = pow(clamp(1. - L, 0., 1.), .5);
            d = smoothstep(.02, .82, d);
            // 큰 결의 농담: 같은 면 안에서도 진하고 옅은 덩어리가 생긴다
            float g = n2(vec2(cx * .045, cy * .03)) - .5;
            d = clamp(d + g * .22 * (1. - d) * d * 4., 0., 1.);
            // 밝은 면은 큰 결을 따라 성기거나 촘촘하게 일렁인다
            float lowf = n2(vec2(cx * .018 + 9., cy * .012));
            d = d < .5 ? d * (.45 + 1.2 * lowf) : d;
            d = max(d, .05 + .09 * lowf);
            // 윤곽 바로 안쪽은 촘촘하게
            float rim = min(top - yc, yc - bot) / uCell.y;
            d = max(d, rim < 1.5 ? .85 : (rim < 4. ? .5 - rim * .08 : 0.));
            // 칸을 세로로 2~4개씩 묶어 길이가 다른 대시를 만든다
            float k = 2. + floor(h21(vec2(cx, 1.)) * 3.);
            float off = floor(h21(vec2(cx, 2.)) * k);
            float seg = floor((cy + off) / k);
            float loc = mod(cy + off, k);
            float th = mix(bayer4(vec2(cx, seg)), h21(vec2(cx, seg)), .5);
            bool on = d > th * uPhoto - .001;
            // 대시 사이 얇은 틈. 아주 진한 면에서는 이어져 막대가 된다
            float gy = fract((px.y - uMid) / uCell.y);
            if (on && uPhoto > .5 && loc < .5 && gy < .45 && d < .9 - h21(vec2(cx, seg + 7.)) * .25) on = false;
            if (on) col = uInk;
          }
        }
      }
      // 지금 울리는 자리
      if (uPlay >= 0.) {
        float xp = uX.x + uPlay * (uX.y - uX.x);
        if (abs(px.x - xp) < 1.2 && abs(px.y - uMid) < uH * 1.12) col = mix(col, uInk, .5);
      }
      // 마우스가 가리키는 자리: 여기서부터 들을 수 있다
      if (uHover >= 0.) {
        float xh = uX.x + uHover * (uX.y - uX.x);
        if (abs(px.x - xh) < 1. && abs(px.y - uMid) < uH * 1.18 && mod(px.y, 8.) < 5.) col = mix(col, uInk, .45);
      }
      gl_FragColor = vec4(col, 1.);
    }`,
})
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat))

// ── 늘이기 상태 ──────────────────────────────────────
let cur = 0
let sTarget = THUMB ? 0.72 : 0, sShown = sTarget
const ease = (x) => x * x * (3 - 2 * x)
const lerp = (a, b, k) => a + (b - a) * k
const stretchOf = (s) => Math.pow(MAX_STRETCH, s)
const nameEl = document.getElementById('name'), lenEl = document.getElementById('len')
function fmt(sec) {
  if (sec < 60) return `${sec.toFixed(1)}초`
  return `${Math.floor(sec / 60)}분 ${String(Math.round(sec % 60)).padStart(2, '0')}초`
}

let lastS = -1
function writeEnv(s) {
  const sh = SOUNDS[cur].shape, k = ease(Math.min(1, s / 0.85))
  for (let i = 0; i < BINS; i++) {
    const t = lerp(sh.bars[i], sh.top[i], k), b = lerp(sh.bars[i], sh.bot[i], k)
    envData[i * 4] = Math.round(Math.min(1, t) * 255)
    envData[i * 4 + 1] = Math.round(Math.min(1, b) * 255)
  }
  envTex.needsUpdate = true
}

// ── 오디오: 늘이면 알갱이로 쪼개 겹쳐 웅장하게 ─────────
let ac = null, master, dry, wet, lp, verb
let playing = false, pos = 0, nextGrain = 0, waitUntil = 0, direct = null, everPlayed = false
function impulse(sec) {
  const n = Math.floor(sec * ac.sampleRate), b = ac.createBuffer(2, n, ac.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c)
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2)
  }
  return b
}
function initAudio() {
  if (ac) return
  ac = new AudioContext()
  for (const s of SOUNDS) {
    s.buf = ac.createBuffer(1, s.data.length, SR)
    s.buf.copyToChannel(s.data, 0)
  }
  master = ac.createGain(); master.gain.value = 0.9
  lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 18000
  dry = ac.createGain(); wet = ac.createGain()
  verb = ac.createConvolver(); verb.buffer = impulse(6)
  lp.connect(dry).connect(master)
  lp.connect(verb).connect(wet).connect(master)
  master.connect(ac.destination)
}
function play(from = 0) {
  initAudio()
  ac.resume()
  everPlayed = true
  if (direct) { try { direct.stop() } catch (e) {} direct = null }
  playing = true; pos = from; nextGrain = ac.currentTime + 0.02
  if (stretchOf(sShown) < 1.12) {
    // 원래 길이에 가까우면 그대로 재생
    direct = ac.createBufferSource(); direct.buffer = SOUNDS[cur].buf
    direct.connect(lp); direct.start(0, from * SOUNDS[cur].dur)
  }
}
function grain(at, offset, s) {
  const S = SOUNDS[cur]
  const g = ac.createGain(), src = ac.createBufferSource()
  src.buffer = S.buf
  const len = lerp(0.07, 0.42, s)
  const deep = Math.random() < lerp(0, 0.35, s)
  src.playbackRate.value = deep ? 0.5 : (Math.random() < 0.08 * s ? 2 : 1)
  src.detune.value = (Math.random() - 0.5) * 14 * s
  const amp = lerp(0.55, 0.32, s) * (deep ? 1.3 : 1)
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(amp, at + len * 0.5)
  g.gain.linearRampToValueAtTime(0, at + len)
  src.connect(g).connect(lp)
  const off = Math.max(0, Math.min(S.dur - 0.01, offset + (Math.random() - 0.5) * 0.04 * s))
  src.start(at, off, len * 1.2)
}
function schedule() {
  if (!ac || !playing || direct) return
  const s = sShown
  const hop = lerp(0.035, 0.05, s)
  while (nextGrain < ac.currentTime + 0.12) {
    const tPos = Math.min(1, pos) * SOUNDS[cur].dur
    grain(nextGrain, tPos, s)
    nextGrain += hop * (0.8 + Math.random() * 0.4)
  }
}
setInterval(schedule, 25)

// ── 조작 ─────────────────────────────────────────────
const keys = new Set()
// 소리 바꾸기: 알약 버튼과 숫자키
const pillsEl = document.getElementById('pills')
const pills = SOUNDS.map((S, i) => {
  const b = document.createElement('button')
  b.textContent = '#' + S.name
  b.addEventListener('click', () => select(i))
  pillsEl.appendChild(b)
  return b
})
function select(i) {
  if (i === cur) return
  if (direct) { try { direct.stop() } catch (e) {} direct = null }
  playing = false; waitUntil = 0
  cur = i; lastS = -1
  pills.forEach((b, j) => b.classList.toggle('on', j === i))
  if (everPlayed) play(0)
}
pills[0].classList.add('on')

addEventListener('keydown', (e) => {
  const n = Number(e.key)
  if (n >= 1 && n <= SOUNDS.length) { select(n - 1); return }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { keys.add(e.key); e.preventDefault() }
  else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); play() }
})
addEventListener('keyup', (e) => keys.delete(e.key))
let drag = null
// 커서가 가리키는 파형 위 위치 (0~1). 파형 밖이면 -1
let wave = { l: 0, r: 0, mid: 0, h: 0 }, hover = -1
function hoverAt(e) {
  const t = (e.clientX - wave.l) / Math.max(1, wave.r - wave.l)
  const near = Math.abs(e.clientY - wave.mid) < wave.h * 1.25 + 18
  return t >= 0 && t <= 1 && near ? t : -1
}
canvas.addEventListener('pointerleave', () => { hover = -1 })
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, s: sTarget, moved: 0, t: hoverAt(e) }; canvas.setPointerCapture(e.pointerId) })
canvas.addEventListener('pointermove', (e) => {
  hover = hoverAt(e)
  canvas.style.cursor = hover >= 0 && !(drag && drag.moved >= 4) ? 'text' : 'ew-resize'
  if (!drag) return
  const dx = e.clientX - drag.x
  drag.moved = Math.max(drag.moved, Math.abs(dx))
  sTarget = Math.min(1, Math.max(0, drag.s + dx / (innerWidth * 0.55)))
})
// 클릭하면 그 자리부터 듣는다. 파형 밖을 누르면 처음부터
canvas.addEventListener('pointerup', () => { if (drag && drag.moved < 4) play(Math.max(0, drag.t)); drag = null })
addEventListener('wheel', (e) => { sTarget = Math.min(1, Math.max(0, sTarget - e.deltaY * 0.0009)) }, { passive: true })

// ── 그리기 ───────────────────────────────────────────
function resize() {
  renderer.setSize(innerWidth, innerHeight, false)
}
addEventListener('resize', resize); resize()

let last = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now
  if (keys.has('ArrowRight')) sTarget = Math.min(1, sTarget + dt * 0.32)
  if (keys.has('ArrowLeft')) sTarget = Math.max(0, sTarget - dt * 0.32)
  sShown += (sTarget - sShown) * Math.min(1, dt * 7)
  const s = sShown, S = SOUNDS[cur], F = stretchOf(s)

  if (Math.abs(s - lastS) > 1e-4) { writeEnv(s); lastS = s }

  // 재생 위치: 늘인 만큼 천천히 지나간다
  if (playing) {
    pos += dt / (S.dur * F)
    if (direct) pos = Math.min(pos, 1)
    if (pos >= 1) {
      playing = false; direct = null
      waitUntil = now + 1800
    }
    if (ac && !direct) {
      wet.gain.setTargetAtTime(lerp(0.05, 0.85, s), ac.currentTime, 0.1)
      dry.gain.setTargetAtTime(lerp(1, 0.35, s), ac.currentTime, 0.1)
      lp.frequency.setTargetAtTime(lerp(16000, 2600, s), ac.currentTime, 0.1)
    } else if (ac) {
      wet.gain.setTargetAtTime(0.05, ac.currentTime, 0.05)
      dry.gain.setTargetAtTime(1, ac.currentTime, 0.05)
      lp.frequency.setTargetAtTime(16000, ac.currentTime, 0.05)
    }
  } else if (everPlayed && now > waitUntil && waitUntil) {
    // 알림처럼 잠시 뒤 다시 울린다
    waitUntil = 0; play()
  }

  const W = canvas.width, H = canvas.height
  const k = ease(s)
  const w = W * lerp(0.26, 0.9, ease(Math.min(1, s * 1.15)))
  const breathe = playing ? 1 + 0.05 * S.shape.raw[Math.min(BINS - 1, Math.floor(pos * BINS))] : 1
  mat.uniforms.uRes.value.set(W, H)
  mat.uniforms.uX.value.set((W - w) / 2, (W + w) / 2)
  mat.uniforms.uMid.value = H * 0.6
  mat.uniforms.uH.value = H * lerp(0.1, 0.31, k) * breathe
  mat.uniforms.uS.value = s
  const dpr = renderer.getPixelRatio()
  mat.uniforms.uCell.value.set(4 * dpr, 3 * dpr)
  mat.uniforms.uPhoto.value = ease(Math.min(1, Math.max(0, (s - 0.04) / 0.5)))
  mat.uniforms.uPlay.value = playing ? pos : -1
  mat.uniforms.uHover.value = drag && drag.moved >= 4 ? -1 : hover
  const cs = W / innerWidth
  wave = { l: (W - w) / 2 / cs, r: (W + w) / 2 / cs, mid: innerHeight - (H * 0.6) / cs, h: mat.uniforms.uH.value / cs }
  mat.uniforms.uTime.value = now / 1000
  mat.uniforms.uImg.value = S.tex
  mat.uniforms.uSeed.value = cur + 1
  const bg = hex('#ffffff')
  mat.uniforms.uBg.value.copy(bg)
  mat.uniforms.uInk.value.copy(hex(S.ink))
  document.body.style.background = `rgb(${bg.x * 255 | 0},${bg.y * 255 | 0},${bg.z * 255 | 0})`
  nameEl.textContent = S.name
  lenEl.textContent = fmt(S.dur * F)
  renderer.render(scene, cam)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
window.day34 = { set: (v) => { sTarget = v }, get: () => ({ sShown, playing, pos }) }
