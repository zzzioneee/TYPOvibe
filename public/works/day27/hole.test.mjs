import test from 'node:test'
import assert from 'node:assert/strict'
import { coverRect, detectHole, mapLandmark, springGains, stepSpring, syntheticHoleHands } from './hole.js'

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

test('손이 하나면 대기 상태다', () => {
  const [only] = syntheticHoleHands(200, 200, 80, 0)
  const hole = detectHole([only], { sensitivity: 40 })
  assert.equal(hole.reason, 'wait')
  assert.equal(hole.open, false)
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
