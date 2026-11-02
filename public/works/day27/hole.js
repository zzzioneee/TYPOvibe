// 양손 엄지·검지가 만드는 동그라미(구멍) 판정.
// 좌표는 화면 픽셀. 엄지(4)는 아래, 검지(8)는 위에서 만나고 손목은 바깥에 있다.

const TIP_SETS = [
  [4, 8],
  [4, 8, 12],
]

export function detectHole(hands, opts = {}) {
  const sens = clamp(opts.sensitivity ?? 62, 0, 100) / 100
  const gates = {
    minR: opts.minR ?? 28,
    maxR: opts.maxR ?? 10000,
    minCirc: 0.4 + sens * 0.4,
    maxGap: 1.05 - sens * 0.62,
    maxIntrude: Math.max(0, Math.round(7 - sens * 7)),
    minWristSep: 0.28 + sens * 0.45,
  }

  if (!hands || hands.length < 2 || hands.some((h) => !h || h.length < 21)) {
    return blank('wait')
  }

  const four = evaluate(hands, TIP_SETS[0], gates)
  const six = evaluate(hands, TIP_SETS[1], gates)
  if (four.open && six.open) return four.score >= six.score ? four : six
  if (four.open) return four
  if (six.open) return six
  return four
}

export function stepSpring(state, target, dt, stiffness, damping) {
  const steps = 4
  const h = dt / steps
  for (let i = 0; i < steps; i++) {
    const accel = -stiffness * (state.x - target) - damping * state.v
    state.v += accel * h
    state.x += state.v * h
  }
  return state
}

export function springGains(bounce, emerge) {
  const b = clamp(bounce, 0, 100) / 100
  const e = clamp(emerge, 0, 100) / 100
  const omega = 9 + b * 14
  const zeta = 1.15 - e * 0.85
  return { stiffness: omega * omega, damping: 2 * omega * zeta }
}

// openness 0 = 동그라미가 닫힌 상태, 1 = 양손이 벌어진 상태.
export function syntheticHoleHands(cx, cy, r, openness = 0) {
  const shift = openness * r * 1.35
  const gap = 0.16 + openness * 1.1
  const top = -Math.PI / 2
  const bot = Math.PI / 2
  const at = (ang, extraX) => ({
    x: cx + Math.cos(ang) * r + extraX,
    y: cy + Math.sin(ang) * r,
  })
  const leftTips = {
    4: at(bot + gap, -shift),
    8: at(top - gap, -shift),
    12: at(Math.PI, -shift),
  }
  const rightTips = {
    4: at(bot - gap, shift),
    8: at(top + gap, shift),
    12: at(0, shift),
  }
  const leftWrist = { x: cx - r * 0.95 - shift, y: cy + r * 1.7 }
  const rightWrist = { x: cx + r * 0.95 + shift, y: cy + r * 1.7 }
  return [fillHand(leftWrist, leftTips), fillHand(rightWrist, rightTips)]
}

function evaluate(hands, indices, gates) {
  const pts = []
  for (const hand of hands) {
    for (const i of indices) pts.push(hand[i])
  }
  const c = centroid(pts)
  const distances = pts.map((p) => dist(p, c))
  const r = median(distances)
  const variance = distances.reduce((sum, d) => sum + (d - r) ** 2, 0) / distances.length
  const circularity = r > 1 ? clamp(1 - Math.sqrt(variance) / r, 0, 1) : 0

  let gap = Infinity
  for (const i of indices) {
    for (const j of indices) gap = Math.min(gap, dist(hands[0][i], hands[1][j]))
  }
  const gapRatio = r > 1 ? gap / r : 1

  const tips = new Set(indices)
  let intrude = 0
  for (const hand of hands) {
    for (let i = 0; i < hand.length; i++) {
      if (tips.has(i)) continue
      if (dist(hand[i], c) < r * 0.56) intrude++
    }
  }

  const w0 = hands[0][0]
  const w1 = hands[1][0]
  const wristSep = dist(w0, w1) / (r || 1)
  const wristsOut = dist(w0, c) > r * 0.85 && dist(w1, c) > r * 0.85
  const angle = holeAngle(hands)

  let reason = 'open'
  if (!(r > 1) || !wristsOut || wristSep < gates.minWristSep) reason = 'hands'
  else if (r < gates.minR || r > gates.maxR) reason = 'size'
  else if (intrude > gates.maxIntrude) reason = 'blocked'
  else if (circularity < gates.minCirc) reason = 'shape'
  else if (gapRatio > gates.maxGap) reason = 'gap'

  const open = reason === 'open'
  const score = circularity * (1 - Math.min(1, gapRatio * 0.45)) + (open ? 0.25 : 0)
  return {
    open,
    reason,
    x: c.x,
    y: c.y,
    r,
    circularity,
    gap: gapRatio,
    intrude,
    angle,
    score,
  }
}

function holeAngle(hands) {
  const top = midpoint(hands[0][8], hands[1][8])
  const bottom = midpoint(hands[0][4], hands[1][4])
  return Math.atan2(top.x - bottom.x, bottom.y - top.y)
}

function fillHand(wrist, tips) {
  const hand = Array.from({ length: 21 }, () => ({ x: wrist.x, y: wrist.y }))
  for (const [index, point] of Object.entries(tips)) hand[index] = point
  return hand
}

function blank(reason) {
  return {
    open: false,
    reason,
    x: 0,
    y: 0,
    r: 0,
    circularity: 0,
    gap: 1,
    intrude: 0,
    angle: 0,
    score: 0,
  }
}

function centroid(pts) {
  let x = 0
  let y = 0
  for (const p of pts) {
    x += p.x
    y += p.y
  }
  return { x: x / pts.length, y: y / pts.length }
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2) return sorted[mid]
  return (sorted[mid - 1] + sorted[mid]) / 2
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function coverRect(sw, sh, dw, dh) {
  if (!sw || !sh) return { x: 0, y: 0, w: dw, h: dh }
  const scale = Math.max(dw / sw, dh / sh)
  const w = sw * scale
  const h = sh * scale
  return { x: (dw - w) / 2, y: (dh - h) / 2, w, h }
}

// mirror가 켜지면 화면은 거울처럼 좌우가 뒤집힌다. 랜드마크도 같은 변환을 쓴다.
export function mapLandmark(nx, ny, rect, mirror, viewW) {
  const x = mirror ? viewW - rect.x - nx * rect.w : rect.x + nx * rect.w
  const y = rect.y + ny * rect.h
  return { x, y }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}
