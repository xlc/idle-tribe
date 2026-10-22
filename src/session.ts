import {
  type AwayProgress,
  awaySummary,
  beginAbsence,
  settleAbsence,
} from './clock'
import { formatDuration } from './format'
import { createGame } from './game'

export type SessionEvent = { id: number; at: number; text: string }
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
  const events: SessionEvent[] = []
  let eventId = 0,
    lastNotice = state.notice,
    lastPeople = state.people.length
  function logEvent(text: string, time = Date.now()) {
    events.push({ id: eventId++, at: time, text })
    if (events.length > 300) events.splice(0, events.length - 300)
  }
  function logAway(report: AwayProgress) {
    if (report.wallSeconds < 60) return
    logEvent(
      `Away ${formatDuration(report.wallSeconds)} · ${awaySummary(report)}`,
    )
  }
  // Events that happen while hidden are covered by the away report.
  function syncEventBaselines() {
    lastNotice = state.notice
    lastPeople = state.people.length
  }
  function trackEvents() {
    if (showing) {
      if (state.notice && state.notice !== lastNotice) logEvent(state.notice)
      if (state.people.length > lastPeople)
        logEvent(`A new settler arrived · ${state.people.length} people`)
    }
    syncEventBaselines()
  }
  if (state.savedAt > 0 || state.absence) {
    beginAbsence(state, state.savedAt || at)
    away = settleAbsence(state, at)
    if (away) logAway(away)
    syncEventBaselines()
  }
  if (visible) state.absence = null
  else beginAbsence(state, at)
  state.savedAt = at
  function persist() {
    save(structuredClone(state))
  }
  function publish() {
    trackEvents()
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
          if (away) logAway(away)
          syncEventBaselines()
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
    get events() {
      return events
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
