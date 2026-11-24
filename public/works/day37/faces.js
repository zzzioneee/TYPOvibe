// 아이 낙서 부품과 얼굴 배치. 브라우저와 Node(경우의 수 시트)에서 함께 쓴다
function rng(seed) { let s = (seed >>> 0) % 2147483646 + 1; return () => (s = s * 16807 % 2147483647) / 2147483647 }
const TAU = Math.PI * 2
const ell = (cx, cy, rx, ry, a0 = 0, a1 = TAU, n = 36) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] })
const poly = (...p) => p
const S = (pts, fill = false) => ({ pts, fill })

// 4~5살 아이 손: 선이 흔들리고, 크기가 들쭉날쭉하고, 닫힌 모양은 시작점을 넘어서 끝난다
function kid(strokes, seed, amp = .03) {
  const r = rng(seed)
  const rot = (r() - .5) * .08, sc = .92 + r() * .16, dx = (r() - .5) * .04, dy = (r() - .5) * .04
  return strokes.map((st) => {
    const ph = [r() * 9, r() * 9, r() * 9, r() * 9]
    const out = []
    const pts = st.pts
    let acc = 0
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[Math.max(0, i - 1)]
      acc += Math.hypot(p[0] - q[0], p[1] - q[1])
      const n = i === 0 ? 0 : 1
      const wx = amp * (Math.sin(acc * 7 + ph[0]) * .7 + Math.sin(acc * 17 + ph[1]) * .3) * n
      const wy = amp * (Math.sin(acc * 6 + ph[2]) * .7 + Math.sin(acc * 19 + ph[3]) * .3) * n
      const x = p[0] * sc, y = p[1] * sc
      out.push([x * Math.cos(rot) - y * Math.sin(rot) + dx + wx, x * Math.sin(rot) + y * Math.cos(rot) + dy + wy])
    }
    return { ...st, pts: out }
  })
}

// 각 부위는 같은 얼굴 좌표계(얼굴이 가로 -1~1, 세로 -1~1, 목은 1.6까지)에 그린다
const loopsAlong = (path, n, rad, r) => {
  const pts = []
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1), [x, y] = path(t), rr = rad * (.75 + r() * .5)
    for (let i = 0; i <= 20; i++) { const a = -Math.PI / 2 + i / 20 * TAU * 1.15; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * .9]) }
  }
  return pts
}
// 부드러운 곡선: 점 몇 개로 아이가 그은 듯한 둥근 선을 만든다
function smooth(pts, closed = false, n = 10) {
  const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]]
  const out = []
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]]
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t
      out.push([0, 1].map((j) => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)))
    }
  }
  out.push(closed ? out[0] : pts[pts.length - 1])
  return out
}
const dome = (x) => .48 * x * x
// ε 모양 눈: 위에서 왼쪽으로 둥글게 돌아 가운데서 한 번 꺾이고, 다시 왼쪽으로 돌아 오른쪽으로 끝난다
const eps = (cx, cy, k) => [[.06, -.12], [-.02, -.13], [-.07, -.08], [-.04, -.02], [.03, -.01], [-.04, .01], [-.08, .07], [-.03, .12], [.08, .12]].map(([x, y]) => [cx + x * k, cy + y * k])
const dot = (x, y, r = .035) => S(ell(x, y, r, r, 0, TAU, 12), true)
const PARTS = {
  // 얼굴형: 브로콜리, 표주박, 달걀, 깔때기, 귀 달린 네모
  face: [
    (r) => [S(smooth([[-.22, 1.45], [-.24, 1.05], [-.85, .85], [-1.05, .2], [-.75, -.55], [0, -.95], [.6, -.75], [1.05, -.2], [.95, .7], [.3, .98], [.27, 1.4]]))],
    (r) => [S(smooth([[-.13, 1.55], [-.15, 1.15], [-.75, .9], [-.85, .35], [-.55, -.05], [-.6, -.35], [-.7, -.75], [0, -1.1], [.7, -.8], [.6, -.35], [.55, -.05], [.85, .4], [.7, .95], [.18, 1.1], [.17, 1.6]]))],
    (r) => [S(smooth([[-.1, 1.55], [-.12, 1.0], [-.6, .7], [-.85, -.1], [-.75, -.75], [0, -1.0], [.75, -.75], [.85, -.05], [.6, .7], [.12, 1.0], [.1, 1.5]]))],
    (r) => [S(smooth([[-.12, 1.55], [-.13, 1.0], [-.48, .45], [-.86, -.22], [-1.08, -.7], [-1.0, -.93], [-.4, -.96], [.35, -.98], [1.0, -.94], [1.1, -.76], [.84, -.2], [.5, .44], [.13, 1.0], [.12, 1.55]], false, 8))],
    // 광대: 윗볼이 바깥으로 불룩 나왔다가 얼굴 안쪽으로 짧게 꺾여 들어온다
    (r) => [S(smooth([[-.72, .28], [-.92, .24], [-1.1, .06], [-1.08, -.18], [-.95, -.3], [-.96, -.82], [-.85, -.96], [0, -.97], [.85, -.96], [.96, -.82], [.95, -.3], [1.08, -.18], [1.1, .06], [.92, .24], [.72, .28]], false, 8)),
      S(smooth([[-.9, .22], [-.88, .62], [-.72, .88], [-.42, .98], [-.36, 1.02], [-.36, 1.38]], false, 8)), S(smooth([[.9, .22], [.88, .62], [.72, .88], [.42, .98], [.36, 1.02], [.36, 1.38]], false, 8))],
  ],
  // 머리: 한 가닥, 옆으로 넘긴 앞머리, 바가지 앞머리, 곱슬, 딸랑 한 줌
  // 머리: 정수리 (0,0), 머리 양옆 x=±1, 아래로 갈수록 y가 커지는 '머리 공간'에 그린다.
  // 고른 얼굴형의 위쪽 폭에 맞춰 늘어나 얹힌다
  hair: [
    // 정수리에 딱 한 가닥
    (r) => [S(smooth([[0, .02], [-.07, -.14], [.06, -.3], [.02, -.44], [-.06, -.52]]))],
    // 8:2 가르마: 왼쪽 2할에서 갈라져 오른쪽으로 크게 쓸어 넘긴 머리, 둘 다 까맣게
    (r) => {
      const big = [...Array.from({ length: 17 }, (_, i) => { const x = -.5 + i * .097; return [x, dome(x) - .2] }),
        ...Array.from({ length: 17 }, (_, i) => { const x = 1.05 - i * .097; return [x + .03, dome(x) + .12 + .3 * ((x + .5) / 1.55)] })]
      const small = [...Array.from({ length: 6 }, (_, i) => { const x = -.56 - i * .1; return [x, dome(x) - .2] }),
        ...Array.from({ length: 6 }, (_, i) => { const x = -1.06 + i * .1; return [x - .02, dome(x) + .2] })]
      return [S(smooth(big, true, 4), true), S(smooth(small, true, 4), true)]
    },
    // 높이 묶은 양갈래: 정수리 띠 + 위로 솟은 두 갈래 + 머리끈
    (r) => [S(smooth([...Array.from({ length: 23 }, (_, i) => { const x = -1.12 + i * .1018; return [x, -.3 + .36 * x * x] }), [1.16, .5], ...Array.from({ length: 23 }, (_, i) => { const x = 1.08 - i * .0982; return [x, .16 + .32 * x * x] }), [-1.16, .5]], true, 4), true),
      ...[-1, 1].map((s) => S(smooth([[s * .6, -.12], [s * .78, -.45], [s * 1.05, -.8], [s * 1.38, -.9], [s * 1.25, -.58], [s * .98, -.2], [s * .74, -.06]], true), true)),
      ...[-1, 1].map((s) => S(ell(s * .68, -.14, .09, .07)))],
    // 폭탄 머리: 크고 작은 동그라미를 마구 겹쳐 그린 낮은 덩어리가 정수리를 덮는다
    (r) => {
      const loops = []
      for (let k = 0; k < 48; k++) {
        const x = -.98 + r() * 1.96, y = dome(x) * .85 + .04 - r() * (.36 - .1 * Math.abs(x))
        const rad = .07 + r() * .17, rx = rad * (.85 + r() * .4), turns = 1 + r() * .35, a0 = r() * TAU
        loops.push({ x, pts: Array.from({ length: 19 }, (_, i) => { const a = a0 + i / 18 * TAU * turns; return [x + Math.cos(a) * rx, y + Math.sin(a) * rad] }) })
      }
      // 왼쪽부터 차례로 휘갈긴 순서
      return loops.sort((p, q) => p.x - q.x).map((l) => S(l.pts))
    },
    // 대머리 반짝: 머리 오른쪽 위 안쪽의 반사 곡선과 반짝 선
    (r) => [{ ...S(smooth([[-.2, .01], [-.14, -.06], [.02, -.07], [.16, -.03], [.19, .04], [.13, .07], [.04, .02], [-.12, .05], [-.2, .01]], false, 8)), bald: true }, { ...S(ell(.28, .12, .045, .045)), bald: true }],
  ],
  // 눈: 졸린 일자눈, 동그란 안경, ε ε, 속눈썹 두 가닥, 웃는 눈
  eyes: [
    // 졸린 눈: 살짝 휜 눈꺼풀 아래로 반쯤 가려진 눈동자가 볼록 나온다 (왼쪽은 납작, 오른쪽은 길쭉)
    (r) => [S(smooth([[-.62, -.165], [-.5, -.17], [-.36, -.17], [-.28, -.165], [-.23, -.15]], false, 6)), S(ell(-.46, -.16, .045, .035, 0, Math.PI, 12), true),
      S(smooth([[.2, -.15], [.28, -.165], [.4, -.17], [.54, -.168], [.6, -.162]], false, 6)), { ...S([...ell(.415, -.165, .04, .07, 0, Math.PI, 12), [.375, -.165]]), fill: true }],
    (r) => [S(ell(-.38, -.15, .15, .15)), S(ell(.38, -.15, .15, .15)), S(poly([-.23, -.16], [.23, -.16])), S(poly([-.53, -.16], [-.85, -.2])), S(poly([.53, -.16], [.85, -.2])), dot(-.38, -.15, .025), dot(.38, -.15, .025)],
    (r) => [S(smooth(eps(-.38, -.17, 1))), S(smooth(eps(.38, -.12, .9)))],
    (r) => [S(ell(-.35, -.12, .07, .1)), S(ell(.35, -.12, .07, .1)), dot(-.35, -.11, .04), dot(.35, -.11, .04), S(poly([-.39, -.22], [-.43, -.32])), S(poly([-.31, -.22], [-.27, -.32])), S(poly([.31, -.22], [.27, -.32])), S(poly([.39, -.22], [.43, -.32]))],
    (r) => [S(ell(-.38, -.13, .1, .07, Math.PI * 1.1, Math.PI * 1.9)), dot(-.38, -.14, .025), S(ell(-.38, -.13, .1, .07, Math.PI * .15, Math.PI * .85)), S(ell(.38, -.13, .1, .07, Math.PI * 1.1, Math.PI * 1.9)), dot(.38, -.14, .025), S(ell(.38, -.13, .1, .07, Math.PI * .15, Math.PI * .85))],
  ],
  // 코: 콧대 휜 코, 세 번 꺾인 ω, 짝짝이 콧구멍, 쓸데없이 긴 코, 쪼끄만 ^
  nose: [
    (r) => [S(smooth([[.06, .04], [.04, .16], [-.02, .25], [-.07, .3], [-.02, .34], [.05, .34]]))],
    (r) => [S(smooth([[-.1, .245], [-.105, .29], [-.08, .31], [-.045, .3], [-.02, .29], [0, .312], [.03, .31], [.065, .292], [.098, .29], [.106, .262], [.088, .238]], false, 6))],
    (r) => [dot(-.07, .3, .016), dot(.07, .29, .032)],
    (r) => [S(poly([-.04, .02], [-.05, .36])), S(poly([.05, .02], [.06, .34])), S(smooth([[-.05, .36], [-.08, .42], [.02, .44], [.08, .39], [.06, .34]]))],
    (r) => [S(poly([-.04, .3], [0, .24], [.04, .3]))],
  ],
  // 입: 삐죽 입술, 툭툭 그린 수염, 앞니 두 개, 옆으로 누운 3 입, 이빨 빠진 웃음
  mouth: [
    (r) => [S(smooth([[-.2, .66], [-.15, .56], [.05, .55], [.2, .63], [.15, .67], [.02, .61], [-.12, .63], [-.2, .66]], true))],
    (r) => [dot(-.2, .53, .018), S(poly([-.15, .55], [-.12, .5])), S(poly([-.08, .55], [-.09, .5])), dot(-.01, .52, .018), S(poly([.03, .55], [.03, .5])), S(poly([.07, .55], [.07, .5])), S(smooth([[.11, .5], [.13, .55], [.16, .53], [.19, .55]], false, 4)), S(smooth([[-.16, .62], [-.08, .67], [.04, .68], [.14, .63]], false, 6))],
    (r) => [S(smooth([[-.28, .58], [-.15, .5], [0, .54], [.15, .5], [.28, .58]])), S(smooth([[-.28, .58], [-.18, .71], [0, .76], [.18, .71], [.28, .58]])), S(poly([-.27, .585], [.27, .585])), S(poly([-.07, .59], [-.07, .67], [0, .67], [0, .59])), S(poly([0, .59], [0, .67], [.07, .67], [.07, .59]))],
    (r) => [S(smooth([[-.2, .58], [-.15, .66], [-.06, .66], [0, .59], [.06, .66], [.15, .66], [.2, .58]]))],
    (r) => [S(poly([-.3, .55], [.3, .55], [.22, .72], [-.22, .72], [-.3, .55])), S(poly([-.27, .62], [.27, .62])), ...[-.12, 0, .12].map((x) => S(poly([x, .55], [x, .72]))), S(poly([.0, .55], [.12, .55], [.12, .62], [0, .62]), true)],
  ],
}
const ORDER = ['face', 'hair', 'eyes', 'nose', 'mouth']
const LABEL = { face: '얼굴', hair: '머리', eyes: '눈', nose: '코', mouth: '입' }
const AMP = { face: .018, hair: .012, eyes: .008, nose: .006, mouth: .008 }
// 왼쪽 종이에 늘어놓을 때: 부위의 중심과 크기
const SHOW = { face: { c: [0, .3], s: 64 }, hair: { c: [0, -.2], s: 50 }, eyes: { c: [0, -.15], s: 92 }, nose: { c: [0, .25], s: 260 }, mouth: { c: [0, .6], s: 230 } }

// ── 연필로 긋기 ──────────────────────────────────────────
function strokeLen(st) { let l = 0; for (let i = 1; i < st.pts.length; i++) l += Math.hypot(st.pts[i][0] - st.pts[i - 1][0], st.pts[i][1] - st.pts[i - 1][1]); return l }
// progress(0~1)만큼만 그린다. 그린 끝점을 돌려준다
function drawStrokes(g, strokes, map, width, progress = 1, ink = '28,28,32') {
  const lens = strokes.map(strokeLen), total = lens.reduce((a, b) => a + b, 0) || 1
  let budget = total * progress, tip = null
  g.lineCap = g.lineJoin = 'round'
  for (let k = 0; k < strokes.length && budget > 0; k++) {
    const st = strokes[k], pts = st.pts
    const pass = (w, alpha, off) => {
      g.strokeStyle = g.fillStyle = `rgba(${ink},${alpha})`; g.lineWidth = w
      g.beginPath(); let left = budget, last = map(pts[0]); g.moveTo(last[0] + off, last[1] + off)
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], seg = Math.hypot(b[0] - a[0], b[1] - a[1])
        if (left <= 0) break
        const t = Math.min(1, left / (seg || 1e-6)); left -= seg
        last = map([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); g.lineTo(last[0] + off, last[1] + off)
      }
      g.stroke()
      // 칠하는 면은 첫 획에서만, 불투명하게
      if (st.fill && off === 0 && budget >= lens[k] - 1e-6) { g.fillStyle = `rgb(${ink})`; g.fill() }
      return last
    }
    tip = pass(width, .92, 0); pass(width * .5, .25, .6)
    budget -= lens[k]
  }
  return tip
}
const mapper = (cx, cy, s, c = [0, 0]) => (p) => [cx + (p[0] - c[0]) * s, cy + (p[1] - c[1]) * s]

// ── 얼굴형에 맞춰 배치 ─────────────────────────────────
// 얼굴 윤곽에서 정수리, 턱, 높이별 폭을 읽는다
function metrics(face) {
  // 꼭짓점만 있는 직선 윤곽(깔때기 등)도 고르게 재도록 선을 잘게 나눈다
  const pts = face.flatMap((s) => s.pts.flatMap((p, i) => {
    const q = s.pts[i + 1]; if (!q) return [p]
    const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / .03))
    return Array.from({ length: n }, (_, k) => [p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n])
  }))
  const top = Math.min(...pts.map((p) => p[1]))
  const body = pts.filter((p) => Math.abs(p[0]) > .27)
  const chin = Math.max(...body.map((p) => p[1]))
  const span = chin - top
  const half = (y, band = .07) => { const near = pts.filter((p) => Math.abs(p[1] - y) < band); return near.length ? Math.max(...near.map((p) => Math.abs(p[0]))) : .8 }
  return { top, chin, span, half }
}
const CENTER = { eyes: -.15, nose: .22, mouth: .62 }
const AT = { eyes: .28, nose: .49, mouth: .7 }
// 고른 부위를 얼굴 좌표로 옮긴다
function placePart(part, strokes, m) {
  if (part === 'face') return strokes
  let f
  if (part === 'hair' && strokes[0] && strokes[0].bald) {
    // 대머리 반짝: 정수리와 눈 사이, 머리 오른쪽 안쪽에 둔다 (눈과 윤곽선에 닿지 않게)
    const y = m.top + .085 * m.span + .02, w = m.half(y, .1), k = Math.max(.5, Math.min(.85, w / 1.05))
    f = (p) => [w * .4 + p[0] * k, y + p[1] * k]
  } else if (part === 'hair') {
    const w = m.half(m.top + .2 * m.span, .1) * 1.08, hs = w * .82, y0 = m.top - .04
    f = (p) => [p[0] * w, y0 + p[1] * hs]
  } else {
    const y = m.top + AT[part] * m.span, w = m.half(y, .1)
    const k = Math.max(.5, Math.min(1.15, w / .85))
    f = (p) => [p[0] * k, y + (p[1] - CENTER[part]) * k]
  }
  return strokes.map((s) => ({ ...s, pts: s.pts.map(f) }))
}

export { rng, kid, PARTS, ORDER, LABEL, AMP, SHOW, drawStrokes, mapper, metrics, placePart, TAU }
