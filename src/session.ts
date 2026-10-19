import { type AwayProgress, beginAbsence, settleAbsence } from './clock'
import { createGame } from './game'
export function createSession(
  state: import('./types').GameState,
  save: (state: import('./types').GameState) => void,
  now: number,
  visible: boolean,
) {
  const game = createGame(state),
    listeners = new Set<() => void>()
  let showing = visible,
    at = Math.max(now, state.savedAt),
    revision = 0,
    away: AwayProgress | null = null
  if (state.savedAt > 0 || state.absence) {
    beginAbsence(state, state.savedAt || at)
    away = settleAbsence(state, at)
  }
  if (visible) state.absence = null
  else beginAbsence(state, at)
  state.savedAt = at
  function persist() {
    save(structuredClone(state))
  }
  function publish() {
    revision++
    for (const listener of listeners) listener()
  }
  function settle(time: number) {
    const next = Math.max(at, time)
    if (showing) game.advanceTime((next - at) / 1000, true)
    else {
      beginAbsence(state, at)
      settleAbsence(state, next)
    }
    at = next
    state.savedAt = next
  }
  persist()
  return {
    game,
    tick(time: number) {
      settle(time)
      persist()
      publish()
    },
    change<T>(run: () => T, time = Date.now()) {
      settle(time)
      const result = run()
      game.advanceTime(0, showing)
      persist()
      publish()
      return result
    },
    setVisible(next: boolean, time: number) {
      settle(time)
      if (next !== showing) {
        if (next) {
          away = settleAbsence(state, state.savedAt)
          state.absence = null
        } else beginAbsence(state, state.savedAt)
        showing = next
      }
      persist()
      publish()
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
