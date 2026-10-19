import { createActivityTimer, createClock } from './clock'
import { isAutomationUnlocked } from './economy'
import { createGame } from './game'
import { RESOURCES } from './ids'
import { createRecord } from './records'
import type { Action, GameState, ResourceId } from './types'

export interface AwayProgress {
  elapsed: number
  gains: Record<ResourceId, number>
}

function createActivity(
  action: Action,
  duration: number,
  now: number,
  visible: boolean,
) {
  const timer = createActivityTimer(duration, now, visible)
  const listeners = new Set<() => void>()
  let elapsed = 0
  return {
    action,
    duration,
    timer,
    getSnapshot: () => elapsed,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    advance(time: number) {
      const next = timer.sample(time)
      if (next !== elapsed) {
        elapsed = next
        for (const listener of listeners) listener()
      }
      return elapsed >= duration
    },
  }
}
export type Activity = ReturnType<typeof createActivity>

// React observes revisions of the existing mutable game, and each activity's
// elapsed time separately. The game remains the only owner of gameplay state.
export function createSession(
  state: GameState,
  save: (state: GameState) => void,
  now: number,
  visible: boolean,
) {
  let settledAt = () => now
  const game = createGame(state, (snapshot) =>
    save({ ...snapshot, savedAt: settledAt() }),
  )
  const offline = game.applyOffline(now)
  const clock = createClock(
    (elapsed) => game.advanceTime(elapsed),
    now,
    visible,
  )
  settledAt = clock.settledAt
  const activities = new Map<Action, Activity>()
  const listeners = new Set<() => void>()
  let revision = 0
  let feedback = ''
  let away: AwayProgress | null = null
  let showing = visible

  function showAway(progress: AwayProgress) {
    if (progress.elapsed >= 60000 && isAutomationUnlocked(state))
      away = progress
  }
  showAway(offline)
  function publish() {
    game.syncUnlocks()
    revision++
    for (const listener of listeners) listener()
  }
  function tick(time: number) {
    if (!showing) return
    clock.tick(time)
    publish()
  }
  function change(run: () => boolean, time: number, message = '') {
    clock.tick(time)
    const changed = run()
    if (changed) feedback = message
    publish()
    return changed
  }
  function startAction(action: Action, time: number, frameTime: number) {
    clock.tick(time)
    if (!game.startAction(action)) {
      publish()
      return false
    }
    activities.set(
      action,
      createActivity(
        action,
        game.getActionDuration(action),
        frameTime,
        showing,
      ),
    )
    publish()
    return true
  }
  function advanceActivities(time: number, frameTime: number) {
    for (const [action, activity] of activities) {
      if (!activity.advance(frameTime)) continue
      clock.tick(time)
      activities.delete(action)
      const result = game.finishAction(action)
      if (action.researchId || action.discovery)
        feedback = action.researchId
          ? `${action.name} · level ${game.getResearchLevel(action.researchId)}`
          : (result ?? '')
      publish()
    }
  }
  function setVisible(next: boolean, time: number, frameTime: number) {
    for (const activity of activities.values())
      activity.timer.setVisible(next, frameTime)
    const before = createRecord(RESOURCES, (id) => state[id])
    const elapsed = clock.setVisible(next, time)
    showing = next
    if (elapsed)
      showAway({
        elapsed,
        gains: createRecord(RESOURCES, (id) =>
          Math.max(0, state[id] - before[id]),
        ),
      })
    game.saveProgress()
    publish()
  }
  return {
    game,
    activities,
    tick,
    change,
    startAction,
    advanceActivities,
    setVisible,
    get feedback() {
      return feedback
    },
    get away() {
      return away
    },
    getSnapshot: () => revision,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
export type GameSession = ReturnType<typeof createSession>
