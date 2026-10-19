import { expect, test } from 'bun:test'
import { parseSave } from './persistence'
import { createSession } from './session'
import { createDefaultState } from './state'
import { itemAt } from './test-helpers'
import type { GameState } from './types'

function settlement() {
  const state = createDefaultState()
  state.fruit = 100
  state.wood = 100
  state.stone = 100
  state.explored = true
  state.stoneFound = true
  state.researchUnlocked = true
  state.researchLevels['sharpened-stick'] = 1
  state.researchLevels.shelters = 1
  state.buildings['foraging-camp'] = 1
  itemAt(state.people, 0).job = 'forager'
  return state
}

test('session resumes concurrent activities after one offline settlement, including duplicate restoration events', () => {
  const state = settlement()
  const session = createSession(state, () => {}, 1000000, true)
  const gather = session.game.actions.gather
  const research = session.game.actions.researchStone
  session.startAction(gather, 1000000, 0)
  session.startAction(research, 1000000, 0)
  session.advanceActivities(1000500, 500)
  session.setVisible(false, 1000500, 500)
  session.setVisible(false, 1000500, 500)
  const fruitBefore = state.fruit
  session.setVisible(true, 1300500, 300500)
  const fruitAfter = state.fruit
  expect(fruitAfter).toBeGreaterThan(fruitBefore)
  expect(session.away?.elapsed).toBe(300000)
  session.setVisible(true, 1300500, 300500)
  expect(state.fruit).toBe(fruitAfter)
  expect(session.activities.get(gather)?.getSnapshot()).toBe(500)
  expect(session.activities.get(research)?.getSnapshot()).toBe(500)
  expect(session.game.getActiveAction()).toBe(gather)
  expect(session.game.getActiveResearch()).toBe(research)
  session.advanceActivities(1301000, 301000)
  expect(state.actions).toBe(1)
  expect(session.game.getActiveResearch()).toBe(research)
  session.advanceActivities(1310000, 310000)
  expect(state.researchLevels['stone-flakes']).toBe(1)
  expect(session.feedback).toBe('Flint knapping · level 1')
})

test('animation frames update the progress subscriber, and completion publishes the earned resources once', () => {
  const state = createDefaultState()
  const session = createSession(state, () => {}, 1000000, true)
  const action = session.game.actions.gather
  let settlementUpdates = 0
  session.subscribe(() => settlementUpdates++)
  session.startAction(action, 1000000, 0)
  const activity = session.activities.get(action)
  if (!activity) throw new Error('Gathering did not start')
  const progress: number[] = []
  activity.subscribe(() => progress.push(activity.getSnapshot()))
  session.advanceActivities(1000250, 250)
  session.advanceActivities(1000500, 500)
  expect(progress).toEqual([250, 500])
  expect(settlementUpdates).toBe(1)
  session.advanceActivities(1001000, 1000)
  expect(settlementUpdates).toBe(2)
  expect(state.fruit).toBe(1)
  expect(state.actions).toBe(1)
  session.advanceActivities(1001000, 1000)
  expect(state.actions).toBe(1)
})

test('session saves refund concurrent reserved materials at the settled timestamp and reload resumes workers', () => {
  const state = settlement()
  let saved: GameState | null = null
  const session = createSession(
    state,
    (snapshot) => {
      saved = snapshot
    },
    1000000,
    true,
  )
  const research = session.game.actions.researchStone
  const cost = research.cost?.()
  session.startAction(session.game.actions.sticks, 1000000, 0)
  session.startAction(research, 1000000, 0)
  session.setVisible(false, 1000500, 500)
  const restored = parseSave(JSON.stringify(saved))
  expect(restored.savedAt).toBe(1000500)
  expect(restored.wood).toBe(state.wood + (cost?.wood ?? 0))
  expect(restored.stone).toBe(state.stone + (cost?.stone ?? 0))
  expect(restored.fruit).toBe(state.fruit + (cost?.fruit ?? 0))
  expect(itemAt(restored.people, 0).workElapsedMs).toBe(500)
  const savedFruit = restored.fruit
  const reloaded = createSession(restored, () => {}, 1005500, true)
  expect(reloaded.game.state.fruit).toBeGreaterThan(savedFruit)
  expect(itemAt(restored.people, 0).job).toBe('forager')
  expect(itemAt(restored.people, 0).workElapsedMs).toBe(500)
})
