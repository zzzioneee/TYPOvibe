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

  const valid = (hands || []).filter((hand) => hand && hand.length >= 21)
  if (!valid.length) return blank('wait')

  const candidates = []
  if (valid.length >= 2) {
    candidates.push(evaluate(valid, TIP_SETS[0], gates))
    candidates.push(evaluate(valid, TIP_SETS[1], gates))
  }
  for (const hand of valid) candidates.push(evaluateOne(hand, gates))

  const open = candidates.filter((item) => item.open)
  if (open.length) {
    open.sort((a, b) => b.r * (0.7 + b.score) - a.r * (0.7 + a.score))
    return open[0]
  }
  return candidates[0] || blank('hands')
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

export function syntheticOkHand(cx, cy, r, openness = 0) {
  const split = openness * r * 1.4
  const tips = {
    2: { x: cx - r * 0.72, y: cy + r * 0.52 },
    3: { x: cx - r * 0.12, y: cy + r * 0.9 },
    4: { x: cx + r * 0.88, y: cy + r * 0.16 + split },
    5: { x: cx - r * 0.92, y: cy - r * 0.08 },
    6: { x: cx - r * 0.18, y: cy - r * 0.9 },
    7: { x: cx + r * 0.55, y: cy - r * 0.72 },
    8: { x: cx + r * 0.88, y: cy - r * 0.16 - split },
    12: { x: cx + r * 2.1, y: cy - r * 0.4 },
  }
  const wrist = { x: cx - r * 1.7, y: cy + r * 1.85 }
  return fillHand(wrist, tips)
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

function evaluateOne(hand, gates) {
  const ring = [2, 3, 4, 5, 6, 7, 8]
  const pts = ring.map((i) => hand[i])
  const c = centroid(pts)
  const distances = pts.map((p) => dist(p, c))
  const r = median(distances)
  const variance = distances.reduce((sum, d) => sum + (d - r) ** 2, 0) / distances.length
  const circularity = r > 1 ? clamp(1 - Math.sqrt(variance) / r, 0, 1) : 0
  const gapRatio = r > 1 ? dist(hand[4], hand[8]) / r : 1
  const minR = Math.max(12, gates.minR * 0.42)
  const tips = new Set(ring)
  let intrude = 0
  for (let i = 0; i < hand.length; i++) {
    if (tips.has(i)) continue
    if (dist(hand[i], c) < r * 0.5) intrude++
  }
  const wristOut = dist(hand[0], c) > r * 0.9
  const angle = Math.atan2(hand[8].x - hand[4].x, hand[4].y - hand[8].y)

  let reason = 'open'
  if (!(r > 1) || !wristOut) reason = 'hands'
  else if (r < minR || r > gates.maxR) reason = 'size'
  else if (intrude > gates.maxIntrude) reason = 'blocked'
  else if (circularity < gates.minCirc) reason = 'shape'
  else if (gapRatio > gates.maxGap) reason = 'gap'

  const open = reason === 'open'
  const score = circularity * (1 - Math.min(1, gapRatio * 0.45)) + (open ? 0.2 : 0)
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

export function opaqueBounds(rgba, width, height) {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  let sumX = 0
  let sumY = 0
  let count = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] < 32) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
      sumX += x
      sumY += y
      count++
    }
  }
  return { minX, minY, maxX, maxY, sumX, sumY, count }
}

export function findFace(rgba, width, height) {
  const bounds = opaqueBounds(rgba, width, height)
  if (bounds.count < 20) {
    const size = Math.min(width, height)
    return { cx: width / 2, cy: height / 2, size, eyes: null }
  }
  const eyes = findEyePair(rgba, width, height, bounds)
  const bbox = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY)
  if (eyes) {
    const span = Math.hypot(eyes.b.x - eyes.a.x, eyes.b.y - eyes.a.y)
    if (span >= Math.max(8, bbox * 0.055)) {
      return {
        cx: (eyes.a.x + eyes.b.x) / 2,
        cy: (eyes.a.y + eyes.b.y) / 2 + span * 0.4,
        size: span * 4.9,
        eyes,
      }
    }
  }
  const boxW = Math.max(1, bounds.maxX - bounds.minX)
  const boxH = Math.max(1, bounds.maxY - bounds.minY)
  return {
    cx: bounds.sumX / bounds.count,
    cy: bounds.minY + boxH * 0.28,
    size: Math.max(boxW, boxH * 0.46) * 1.08,
    eyes: null,
  }
}

export function faceSquare(rgba, width, height) {
  const face = findFace(rgba, width, height)
  return clampSquare(face.cx, face.cy, face.size, width, height)
}

export function coverageInSquare(rgba, width, height, square) {
  let seen = 0
  let opaque = 0
  const x0 = Math.max(0, Math.floor(square.x))
  const y0 = Math.max(0, Math.floor(square.y))
  const x1 = Math.min(width, Math.ceil(square.x + square.size))
  const y1 = Math.min(height, Math.ceil(square.y + square.size))
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      seen++
      if (rgba[(y * width + x) * 4 + 3] >= 32) opaque++
    }
  }
  return seen ? opaque / seen : 0
}

export function applySaliencyAlpha(rgba, width, height, mask, maskW, maskH) {
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] < min) min = mask[i]
    if (mask[i] > max) max = mask[i]
  }
  const range = max - min || 1
  for (let y = 0; y < height; y++) {
    const my = ((y + 0.5) / height) * maskH - 0.5
    const y0 = Math.max(0, Math.floor(my))
    const y1 = Math.min(maskH - 1, y0 + 1)
    const ty = my - y0
    for (let x = 0; x < width; x++) {
      const mx = ((x + 0.5) / width) * maskW - 0.5
      const x0 = Math.max(0, Math.floor(mx))
      const x1 = Math.min(maskW - 1, x0 + 1)
      const tx = mx - x0
      const a = (mask[y0 * maskW + x0] - min) / range
      const b = (mask[y0 * maskW + x1] - min) / range
      const c = (mask[y1 * maskW + x0] - min) / range
      const d = (mask[y1 * maskW + x1] - min) / range
      const value = a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty
      const index = (y * width + x) * 4
      let alpha = 0
      if (value >= 0.64) alpha = 255
      else if (value > 0.38) alpha = Math.round(((value - 0.38) / 0.26) * 255)
      rgba[index + 3] = Math.min(rgba[index + 3], alpha)
    }
  }
}

export function cleanMatte(rgba, width, height) {
  const total = width * height
  const src = new Uint8Array(total)
  for (let i = 0; i < total; i++) src[i] = rgba[i * 4 + 3]
  const eroded = new Uint8Array(total)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minA = 255
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            minA = 0
            continue
          }
          minA = Math.min(minA, src[ny * width + nx])
        }
      }
      eroded[y * width + x] = minA
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      let count = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          sum += eroded[ny * width + nx]
          count++
        }
      }
      rgba[(y * width + x) * 4 + 3] = Math.round(sum / count)
    }
  }
}

export function keepBlobAt(rgba, width, height, cx, cy) {
  const total = width * height
  const inside = (x, y) => x >= 0 && y >= 0 && x < width && y < height
  const alphaAt = (x, y) => rgba[(y * width + x) * 4 + 3]
  let sx = Math.round(cx)
  let sy = Math.round(cy)
  if (!inside(sx, sy) || alphaAt(sx, sy) < 32) {
    let found = false
    for (let radius = 1; radius < 64 && !found; radius++) {
      for (let y = sy - radius; y <= sy + radius && !found; y++) {
        for (let x = sx - radius; x <= sx + radius && !found; x++) {
          if (!inside(x, y) || alphaAt(x, y) < 32) continue
          sx = x
          sy = y
          found = true
        }
      }
    }
    if (!found) return 0
  }
  const keep = new Uint8Array(total)
  const queue = [sy * width + sx]
  keep[sy * width + sx] = 1
  while (queue.length) {
    const index = queue.pop()
    const x = index % width
    const y = (index - x) / width
    const nexts = [index - 1, index + 1, index - width, index + width]
    for (const next of nexts) {
      if (next < 0 || next >= total || keep[next]) continue
      const nx = next % width
      if (Math.abs(nx - x) + Math.abs(((next - nx) / width) - y) !== 1) continue
      if (rgba[next * 4 + 3] < 32) continue
      keep[next] = 1
      queue.push(next)
    }
  }
  let count = 0
  for (let i = 0; i < total; i++) {
    if (keep[i]) count++
    else rgba[i * 4 + 3] = 0
  }
  return count
}

export function trimToSubject(rgba, width, height, face) {
  const faceCols = []
  const edgeCols = []
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const color = samplePixel(rgba, width, height, x, y)
      if (!color) continue
      const dist = Math.hypot(x - face.cx, y - face.cy)
      if (dist < face.size * 0.28 && faceCols.length < 36) faceCols.push(color)
      const index = y * width + x
      const edge = (
        (x > 0 && rgba[(index - 1) * 4 + 3] < 32) ||
        (x + 1 < width && rgba[(index + 1) * 4 + 3] < 32) ||
        (y > 0 && rgba[(index - width) * 4 + 3] < 32) ||
        (y + 1 < height && rgba[(index + width) * 4 + 3] < 32)
      )
      if (edge && dist > face.size * 0.42 && edgeCols.length < 36) edgeCols.push(color)
    }
  }
  if (faceCols.length < 6 || edgeCols.length < 4) return 0
  let dropped = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4
      if (rgba[index + 3] < 32) continue
      const dist = Math.hypot(x - face.cx, y - face.cy)
      if (dist < face.size * 0.4) continue
      const color = [rgba[index], rgba[index + 1], rgba[index + 2]]
      if (nearestColor(color, edgeCols) + 10 < nearestColor(color, faceCols)) {
        rgba[index + 3] = 0
        dropped++
      }
    }
  }
  return dropped
}

function nearestColor(color, list) {
  let best = 1e9
  for (const sample of list) {
    const dist = colorDist(color, sample)
    if (dist < best) best = dist
  }
  return best
}

export function punchSimilarBackground(rgba, width, height, face) {
  const faceColor = samplePixel(rgba, width, height, Math.round(face.cx), Math.round(face.cy))
  const total = width * height
  const seen = new Uint8Array(total)
  const queue = []
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const index = y * width + x
    if (seen[index]) return
    seen[index] = 1
    const color = samplePixel(rgba, width, height, x, y)
    if (!color) return
    if (faceColor && colorDist(color, faceColor) < 28) return
    queue.push(index)
  }
  for (let x = 0; x < width; x++) {
    push(x, 0)
    push(x, height - 1)
  }
  for (let y = 0; y < height; y++) {
    push(0, y)
    push(width - 1, y)
  }
  while (queue.length) {
    const index = queue.pop()
    const x = index % width
    const y = (index - x) / width
    const base = samplePixel(rgba, width, height, x, y)
    rgba[index * 4 + 3] = 0
    const nexts = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]
    for (const [nx, ny] of nexts) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      const next = ny * width + nx
      if (seen[next]) continue
      const color = samplePixel(rgba, width, height, nx, ny)
      if (!color || !base) continue
      if (colorDist(color, base) > 26) continue
      if (faceColor && colorDist(color, faceColor) < 28) continue
      seen[next] = 1
      queue.push(next)
    }
  }
}

export function growSubject(rgba, width, height, face) {
  const total = width * height
  const keep = new Uint8Array(total)
  const queue = []
  const inner = face.size * 0.22
  const maxR = face.size * 1.12
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const dx = x - face.cx
      const dy = y - face.cy
      if (dx * dx + dy * dy > inner * inner) continue
      const index = y * width + x
      if (rgba[index * 4 + 3] < 32) continue
      keep[index] = 1
      queue.push(index)
    }
  }
  while (queue.length) {
    const index = queue.pop()
    const x = index % width
    const y = (index - x) / width
    const base = samplePixel(rgba, width, height, x, y)
    const fromFace = Math.hypot(x - face.cx, y - face.cy)
    const limit = fromFace < face.size * 0.42 ? 78 : 36
    const nexts = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]
    for (const [nx, ny] of nexts) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      if (Math.hypot(nx - face.cx, ny - face.cy) > maxR) continue
      const next = ny * width + nx
      if (keep[next]) continue
      const color = samplePixel(rgba, width, height, nx, ny)
      if (!color || !base || colorDist(color, base) > limit) continue
      keep[next] = 1
      queue.push(next)
    }
  }
  let count = 0
  for (let i = 0; i < total; i++) {
    if (keep[i]) count++
    else rgba[i * 4 + 3] = 0
  }
  return count
}

export function cutoutSubject(rgba, width, height) {
  const original = new Uint8ClampedArray(rgba)
  const face = findFace(rgba, width, height)
  punchSimilarBackground(rgba, width, height, face)
  let square = clampSquare(face.cx, face.cy, face.size, width, height)
  if (coverageInSquare(rgba, width, height, square) < 0.4) {
    rgba.set(original)
    growSubject(rgba, width, height, face)
    square = clampSquare(face.cx, face.cy, face.size, width, height)
  }
  if (coverageInSquare(rgba, width, height, square) < 0.28) {
    rgba.set(original)
    punchSimilarBackground(rgba, width, height, face)
  }
  keepLargestOpaque(rgba, width, height)
  return findFace(rgba, width, height)
}

function findEyePair(rgba, width, height, bounds) {
  const subjectW = Math.max(1, bounds.maxX - bounds.minX)
  const step = Math.max(1, Math.floor(Math.min(width, height) / 180))
  const radii = [2, 3, 5].map((radius) => radius * step)
  const candidates = []
  for (let y = bounds.minY; y <= bounds.maxY; y += step) {
    for (let x = bounds.minX; x <= bounds.maxX; x += step) {
      if (isBlush(rgba, width, height, x, y)) continue
      let best = 0
      for (const radius of radii) {
        best = Math.max(best, eyeContrast(rgba, width, height, x, y, radius))
      }
      if (best > 22) candidates.push({ x, y, score: best })
    }
  }
  candidates.sort((a, b) => b.score - a.score)
  const kept = []
  for (const point of candidates) {
    const near = kept.some((other) => Math.hypot(other.x - point.x, other.y - point.y) < step * 6)
    if (near) continue
    kept.push(point)
    if (kept.length >= 16) break
  }
  const minDx = Math.max(step * 5, subjectW * 0.16)
  const maxDx = Math.min(subjectW * 0.72, width * 0.6)
  const top = bounds.minY + Math.max(1, bounds.maxY - bounds.minY) * 0.78
  let bestPair = null
  let bestScore = 0
  for (let i = 0; i < kept.length; i++) {
    for (let j = i + 1; j < kept.length; j++) {
      const dx = Math.abs(kept[i].x - kept[j].x)
      const dy = Math.abs(kept[i].y - kept[j].y)
      const midY = (kept[i].y + kept[j].y) / 2
      if (dx < minDx || dx > maxDx) continue
      if (dy > dx * 0.42) continue
      if (midY > top) continue
      const score = Math.min(kept[i].score, kept[j].score) + dx * 0.25
      if (score > bestScore) {
        bestScore = score
        bestPair = { a: kept[i], b: kept[j] }
      }
    }
  }
  return bestPair
}

function isBlush(rgba, width, height, x, y) {
  const color = samplePixel(rgba, width, height, x, y)
  if (!color) return true
  const luma = color[0] * 0.3 + color[1] * 0.5 + color[2] * 0.2
  return color[0] > 130 && color[0] > color[1] + 22 && color[0] > color[2] + 12 && luma > 72
}

function samplePixel(rgba, width, height, x, y) {
  if (x < 0 || y < 0 || x >= width || y >= height) return null
  const index = (y * width + x) * 4
  if (rgba[index + 3] < 32) return null
  return [rgba[index], rgba[index + 1], rgba[index + 2]]
}

function colorDist(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])
}

function eyeContrast(rgba, width, height, x, y, radius) {
  const center = sampleRing(rgba, width, height, x, y, 0, radius * 0.6)
  const ring = sampleRing(rgba, width, height, x, y, radius * 1.2, radius * 2.2)
  if (!center || !ring) return 0
  return ring - center
}

function sampleRing(rgba, width, height, x, y, inner, outer) {
  let luma = 0
  let seen = 0
  let clear = 0
  const rings = inner === 0 ? 1 : 2
  for (let ring = 0; ring < rings; ring++) {
    const dist = inner === 0 ? 0 : inner + (outer - inner) * ring
    const steps = dist === 0 ? 1 : 10
    for (let i = 0; i < steps; i++) {
      const angle = (Math.PI * 2 * i) / steps
      const px = Math.round(x + Math.cos(angle) * dist)
      const py = Math.round(y + Math.sin(angle) * dist)
      if (px < 0 || py < 0 || px >= width || py >= height) {
        clear++
        continue
      }
      const index = (py * width + px) * 4
      if (rgba[index + 3] < 32) {
        clear++
        continue
      }
      luma += rgba[index] * 0.3 + rgba[index + 1] * 0.5 + rgba[index + 2] * 0.2
      seen++
    }
  }
  if (seen < 1 || clear > seen) return null
  return luma / seen
}

const PET_LABELS = /cat|dog|bird|horse|cow|sheep|animal/

export function cutoutKeepIds(labels) {
  if (!labels || !labels.length) return [3, 8, 10, 12, 13, 17]
  const ids = []
  labels.forEach((name, index) => {
    if (PET_LABELS.test(String(name).toLowerCase())) ids.push(index)
  })
  return ids.length ? ids : [3, 8, 10, 12, 13, 17]
}

export function applyCategoryCutout(rgba, width, height, categories, keepIds) {
  const keep = new Set(keepIds || [])
  let kept = 0
  if (keep.size) {
    for (let i = 0; i < width * height; i++) {
      if (keep.has(categories[i])) kept++
    }
  }
  const useKeep = kept > width * height * 0.004
  for (let i = 0; i < width * height; i++) {
    const category = categories[i]
    const stay = useKeep ? keep.has(category) : category > 0
    if (!stay) rgba[i * 4 + 3] = 0
  }
  return useKeep ? kept : -1
}

export function keepLargestOpaque(rgba, width, height) {
  const total = width * height
  const seen = new Uint8Array(total)
  let best = []
  for (let start = 0; start < total; start++) {
    if (seen[start] || rgba[start * 4 + 3] < 32) continue
    const blob = []
    const queue = [start]
    seen[start] = 1
    while (queue.length) {
      const index = queue.pop()
      blob.push(index)
      const x = index % width
      const y = (index - x) / width
      const neighbors = [index - 1, index + 1, index - width, index + width]
      for (const next of neighbors) {
        if (next < 0 || next >= total || seen[next]) continue
        const nx = next % width
        if (Math.abs(nx - x) + Math.abs(((next - nx) / width) - y) !== 1) continue
        if (rgba[next * 4 + 3] < 32) continue
        seen[next] = 1
        queue.push(next)
      }
    }
    if (blob.length > best.length) best = blob
  }
  if (!best.length) return 0
  const keep = new Uint8Array(total)
  for (const index of best) keep[index] = 1
  for (let i = 0; i < total; i++) {
    if (!keep[i]) rgba[i * 4 + 3] = 0
  }
  return best.length
}

function clampSquare(cx, cy, size, width, height) {
  const side = Math.max(8, Math.min(size, width, height))
  let x = cx - side / 2
  let y = cy - side / 2
  if (x < 0) x = 0
  if (y < 0) y = 0
  if (x + side > width) x = width - side
  if (y + side > height) y = height - side
  return { x, y, size: side }
}

export function peekRise(radius, emerge = 0) {
  return Math.max(0, radius) * (0.5 + clamp(emerge, 0, 1) * 0.16)
}

export function clipPeekHole(ctx, x, y, radius, peek) {
  const r = Math.max(1, radius)
  const rise = Math.max(0, peek)
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI, false)
  ctx.arc(x, y - rise, r, Math.PI, 0, false)
  ctx.closePath()
  ctx.clip()
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
