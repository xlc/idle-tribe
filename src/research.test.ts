import { expect, test } from 'bun:test'
import { parseSave } from './persistence'
import { enqueue } from './research'
import { createDefaultState } from './state'

test('reloading a queued project does not allow the same project to be queued again', () => {
  const state = createDefaultState()
  expect(
    enqueue(state, { kind: 'expand', id: 'housing', target: 1, form: 0 }),
  ).toBe(true)
  const restored = parseSave(JSON.stringify(state))
  expect(restored.queues.construction.waiting).toHaveLength(1)
  expect(
    enqueue(restored, { kind: 'expand', id: 'housing', target: 1, form: 0 }),
  ).toBe(false)
  expect(
    enqueue(restored, { kind: 'expand', id: 'housing', target: 2, form: 0 }),
  ).toBe(true)
  expect(restored.queues.construction.waiting).toHaveLength(2)
})
