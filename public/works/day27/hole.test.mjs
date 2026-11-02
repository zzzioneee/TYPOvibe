import test from 'node:test'
import assert from 'node:assert/strict'
import { applyCategoryCutout, applySaliencyAlpha, cleanMatte, coverRect, cutoutSubject, detectHole, detectHoles, faceSquare, findFace, keepBlobAt, keepLargestOpaque, mapLandmark, peekRise, springGains, stepSpring, syntheticHoleHands, syntheticOkHand, trimToSubject } from './hole.js'

test('닫힌 동그라미는 구멍으로 인정한다', () => {
  const hands = syntheticHoleHands(400, 300, 120, 0)
  const hole = detectHole(hands, { sensitivity: 62, minR: 28, maxR: 800 })
  assert.equal(hole.open, true)
  assert.equal(hole.reason, 'open')
  assert.ok(hole.circularity > 0.9)
  assert.ok(Math.abs(hole.x - 400) < 8)
  assert.ok(Math.abs(hole.y - 300) < 8)
  assert.ok(Math.abs(hole.angle) < 0.2)
})

test('양손이 벌어지면 구멍이 닫힌다', () => {
  const hands = syntheticHoleHands(400, 300, 120, 1)
  const hole = detectHole(hands, { sensitivity: 62, minR: 28, maxR: 800 })
  assert.equal(hole.open, false)
})

test('가운데를 가리면 민감할 때 거절한다', () => {
  const hands = syntheticHoleHands(400, 300, 120, 0)
  hands[0][9] = { x: 400, y: 300 }
  const hole = detectHole(hands, { sensitivity: 100, minR: 28, maxR: 800 })
  assert.equal(hole.open, false)
  assert.equal(hole.reason, 'blocked')
})

test('한 손 작은 원도 구멍으로 인정한다', () => {
  const hole = detectHole([syntheticOkHand(220, 180, 36, 0)], { sensitivity: 62, minR: 28, maxR: 800 })
  assert.equal(hole.open, true)
  assert.ok(Math.abs(hole.x - 220) < 16)
  assert.ok(hole.r < 70)
})

test('한 손 원이 벌어지면 닫힌다', () => {
  const hole = detectHole([syntheticOkHand(220, 180, 36, 1)], { sensitivity: 62, minR: 28, maxR: 800 })
  assert.equal(hole.open, false)
})

test('양손 작은 원은 구멍 두 개로 인정한다', () => {
  const holes = detectHoles(
    [syntheticOkHand(220, 180, 36, 0), syntheticOkHand(520, 190, 40, 0)],
    { sensitivity: 62, minR: 28, maxR: 800 },
  )
  assert.equal(holes.length, 2)
  assert.equal(holes.every((item) => item.open), true)
  assert.ok(Math.abs(holes[0].x - 220) < 16)
  assert.ok(Math.abs(holes[1].x - 520) < 16)
})

test('양손이 만든 큰 원은 구멍 하나로 남긴다', () => {
  const holes = detectHoles(syntheticHoleHands(400, 300, 120, 0), { sensitivity: 62, minR: 28, maxR: 800 })
  assert.equal(holes.length, 1)
  assert.equal(holes[0].open, true)
  assert.ok(Math.abs(holes[0].x - 400) < 8)
})

test('눈 위치를 얼굴 중심으로 잡는다', () => {
  const width = 120
  const height = 160
  const rgba = new Uint8ClampedArray(width * height * 4)
  fill(rgba, width, 8, 0, 112, 70, [168, 164, 158, 255])
  fill(rgba, width, 28, 82, 96, 152, [214, 208, 198, 255])
  fill(rgba, width, 44, 104, 54, 116, [18, 18, 16, 255])
  fill(rgba, width, 68, 104, 78, 116, [18, 18, 16, 255])
  const square = faceSquare(rgba, width, height)
  const centerX = square.x + square.size / 2
  const centerY = square.y + square.size / 2
  assert.ok(Math.abs(centerX - 60) < 16)
  assert.ok(centerY >= 100)
  assert.ok(square.y < 110 && square.y + square.size > 116)
})

test('볼터치나 코 조각이 아니라 눈을 얼굴로 잡는다', () => {
  const width = 100
  const height = 100
  const rgba = new Uint8ClampedArray(width * height * 4)
  fill(rgba, width, 0, 0, 100, 100, [250, 248, 244, 255])
  fill(rgba, width, 28, 22, 72, 78, [255, 214, 196, 255])
  fill(rgba, width, 36, 34, 44, 44, [18, 16, 16, 255])
  fill(rgba, width, 56, 34, 64, 44, [18, 16, 16, 255])
  fill(rgba, width, 34, 54, 44, 62, [232, 118, 128, 255])
  fill(rgba, width, 56, 54, 66, 62, [232, 118, 128, 255])
  const face = findFace(rgba, width, height)
  assert.ok(Math.abs(face.cx - 50) < 10)
  assert.ok(face.cy < 58)
  assert.ok(face.size > 28)
})

test('단색 배경 캐릭터는 얼굴 전체를 남긴다', () => {
  const width = 80
  const height = 80
  const rgba = new Uint8ClampedArray(width * height * 4)
  fill(rgba, width, 0, 0, 80, 80, [248, 248, 246, 255])
  fill(rgba, width, 22, 18, 58, 62, [255, 224, 198, 255])
  fill(rgba, width, 30, 28, 36, 36, [20, 18, 18, 255])
  fill(rgba, width, 44, 28, 50, 36, [20, 18, 18, 255])
  cutoutSubject(rgba, width, height)
  let opaque = 0
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] >= 32) opaque++
  assert.ok(opaque > 400)
  assert.equal(rgba[3], 0)
  const face = findFace(rgba, width, height)
  assert.ok(Math.abs(face.cx - 40) < 12)
})

test('눈이 없으면 피사체 중심에 맞춘다', () => {
  const width = 100
  const height = 100
  const rgba = new Uint8ClampedArray(width * height * 4)
  fill(rgba, width, 20, 60, 80, 96, [180, 170, 160, 255])
  const square = faceSquare(rgba, width, height)
  const centerY = square.y + square.size / 2
  assert.ok(centerY > 60)
})

function fill(rgba, width, x0, y0, x1, y1, color) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const index = (y * width + x) * 4
      rgba[index] = color[0]
      rgba[index + 1] = color[1]
      rgba[index + 2] = color[2]
      rgba[index + 3] = color[3]
    }
  }
}

test('고양이 클래스만 남기고 배경을 지운다', () => {
  const rgba = new Uint8ClampedArray(4 * 4 * 4)
  rgba.fill(255)
  applyCategoryCutout(rgba, 4, 4, [0, 0, 8, 8, 0, 8, 8, 0, 0, 0, 0, 0, 9, 9, 9, 9], [8])
  assert.equal(rgba[2 * 4 + 3], 255)
  assert.equal(rgba[0 * 4 + 3], 0)
  assert.equal(rgba[12 * 4 + 3], 0)
})

test('떨어진 조각은 버리고 가장 큰 피사체만 남긴다', () => {
  const width = 6
  const height = 3
  const rgba = new Uint8ClampedArray(width * height * 4)
  fill(rgba, width, 0, 0, 1, 1, [10, 10, 10, 255])
  fill(rgba, width, 2, 0, 6, 3, [200, 200, 200, 255])
  keepLargestOpaque(rgba, width, height)
  assert.equal(rgba[3], 0)
  assert.equal(rgba[(2 * width + 4) * 4 + 3], 255)
})

test('거울 모드에서도 손 좌표가 화면과 맞는다', () => {
  const rect = coverRect(200, 100, 100, 100)
  assert.ok(rect.w >= 100 && rect.h >= 100)
  const left = mapLandmark(0.25, 0.5, { x: 0, y: 0, w: 100, h: 100 }, true, 100)
  const right = mapLandmark(0.75, 0.5, { x: 0, y: 0, w: 100, h: 100 }, true, 100)
  assert.ok(left.x > right.x)
  assert.equal(left.y, 50)
})

test('튀어나옴을 높이면 스프링이 목표를 넘어선다', () => {
  const soft = springGains(58, 100)
  const state = { x: 0, v: 0 }
  let peak = 0
  for (let i = 0; i < 180; i++) {
    stepSpring(state, 1, 1 / 60, soft.stiffness, soft.damping)
    peak = Math.max(peak, state.x)
    assert.ok(state.x < 3, 'spring exploded')
  }
  assert.ok(peak > 1.08)
  assert.ok(state.x > 0.8 && state.x < 1.7)
})

test('살로우시 마스크로 배경 알파를 지운다', () => {
  const width = 8
  const height = 8
  const rgba = new Uint8ClampedArray(width * height * 4)
  rgba.fill(255)
  const mask = new Float32Array(4)
  mask[0] = 0
  mask[1] = 0
  mask[2] = 1
  mask[3] = 1
  applySaliencyAlpha(rgba, width, height, mask, 2, 2)
  assert.equal(rgba[3], 0)
  assert.equal(rgba[((height - 1) * width + width - 1) * 4 + 3], 255)
})

test('얼굴이 있는 덩어리만 남긴다', () => {
  const width = 8
  const height = 4
  const rgba = new Uint8ClampedArray(width * height * 4)
  fill(rgba, width, 0, 0, 2, 2, [10, 10, 10, 255])
  fill(rgba, width, 4, 0, 8, 4, [200, 180, 160, 255])
  keepBlobAt(rgba, width, height, 6, 2)
  assert.equal(rgba[3], 0)
  assert.equal(rgba[(2 * width + 6) * 4 + 3], 255)
})

test('얼굴색과 다른 가장자리 배경은 잘라낸다', () => {
  const width = 40
  const height = 40
  const rgba = new Uint8ClampedArray(width * height * 4)
  fill(rgba, width, 4, 4, 36, 36, [90, 90, 88, 255])
  fill(rgba, width, 12, 10, 28, 30, [240, 220, 200, 255])
  trimToSubject(rgba, width, height, { cx: 20, cy: 18, size: 16 })
  assert.equal(rgba[3], 0)
  assert.ok(rgba[(18 * width + 20) * 4 + 3] > 200)
})

test('아래쪽 콧구멍보다 위쪽 눈을 고른다', () => {
  const width = 100
  const height = 120
  const rgba = new Uint8ClampedArray(width * height * 4)
  fill(rgba, width, 18, 10, 82, 110, [230, 220, 210, 255])
  fill(rgba, width, 32, 28, 42, 40, [16, 16, 14, 255])
  fill(rgba, width, 58, 28, 68, 40, [16, 16, 14, 255])
  fill(rgba, width, 44, 72, 48, 78, [22, 18, 16, 255])
  fill(rgba, width, 52, 72, 56, 78, [22, 18, 16, 255])
  const face = findFace(rgba, width, height)
  assert.ok(Math.abs(face.cx - 50) < 12)
  assert.ok(face.cy < 58)
  assert.ok(face.size > 40)
})

test('가까운 수염점보다 눈을 고른다', () => {
  const width = 100
  const height = 100
  const rgba = new Uint8ClampedArray(width * height * 4)
  fill(rgba, width, 18, 14, 82, 86, [255, 224, 198, 255])
  fill(rgba, width, 32, 32, 40, 42, [16, 16, 16, 255])
  fill(rgba, width, 60, 32, 68, 42, [16, 16, 16, 255])
  fill(rgba, width, 46, 62, 49, 65, [16, 16, 16, 255])
  fill(rgba, width, 53, 62, 56, 65, [16, 16, 16, 255])
  const face = findFace(rgba, width, height)
  assert.ok(Math.abs(face.cx - 50) < 10)
  assert.ok(face.cy < 58)
})

test('얇은 누끼 가장자리는 정리한다', () => {
  const width = 6
  const height = 6
  const rgba = new Uint8ClampedArray(width * height * 4)
  fill(rgba, width, 1, 1, 5, 5, [200, 180, 160, 255])
  fill(rgba, width, 0, 0, 1, 1, [90, 90, 90, 255])
  cleanMatte(rgba, width, height)
  assert.equal(rgba[3], 0)
  assert.ok(rgba[(3 * width + 3) * 4 + 3] > 80)
})

test('위쪽으로 귀가 나갈 여유를 둔다', () => {
  assert.ok(peekRise(100, 0) >= 48)
  assert.ok(peekRise(100, 1) > peekRise(100, 0))
})
