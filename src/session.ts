import {
  type AwayProgress,
  awaySummary,
  beginAbsence,
  MIN_AWAY_REPORT_SECONDS,
  settleAbsence,
} from './clock'
import { formatDuration } from './format'
import { createGame } from './game'

export type SessionEventKind = 'notice' | 'arrival' | 'away'
export type SessionEvent = {
  id: number
  at: number
  kind: SessionEventKind
  text: string
  report?: AwayProgress
}
export type SessionNotification = Pick<
  SessionEvent,
  'id' | 'kind' | 'text' | 'report'
>
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
    away: AwayProgress | null = null,
    notification: SessionNotification | null = null
  const events: SessionEvent[] = []
  let eventId = 0,
    lastNotice = state.notice,
    lastExploreOutcome = state.lastExploreOutcome,
    lastPeople = state.people.length
  function logEvent(
    kind: SessionEventKind,
    text: string,
    report?: AwayProgress,
    notify = showing,
  ) {
    const event: SessionEvent = report
      ? { id: eventId++, at, kind, text, report }
      : { id: eventId++, at, kind, text }
    events.push(event)
    if (events.length > 300) events.splice(0, events.length - 300)
    if (notify) notification = event
  }
  function logAway(report: AwayProgress, notify = showing) {
    if (report.wallSeconds <= MIN_AWAY_REPORT_SECONDS) return
    logEvent(
      'away',
      `Away ${formatDuration(report.wallSeconds)} · ${awaySummary(report)}`,
      report,
      notify,
    )
  }
  // Events that happen while hidden are covered by the away report.
  function syncEventBaselines() {
    lastNotice = state.notice
    lastExploreOutcome = state.lastExploreOutcome
    lastPeople = state.people.length
  }
  function trackEvents() {
    if (showing) {
      if (
        state.notice &&
        (state.notice !== lastNotice ||
          state.lastExploreOutcome !== lastExploreOutcome)
      )
        logEvent('notice', state.notice)
      if (state.people.length > lastPeople)
        logEvent(
          'arrival',
          `A new settler arrived · ${state.people.length} people`,
        )
    }
    syncEventBaselines()
  }
  if (state.savedAt > 0 || state.absence) {
    beginAbsence(state, state.savedAt || at)
    away = settleAbsence(state, at)
    if (away) logAway(away, visible)
    syncEventBaselines()
  }
  if (visible) state.absence = null
  else beginAbsence(state, at)
  state.savedAt = at
  // Ticks only need durable progress every few seconds: a stale save replays
  // the gap as offline time on reload, exactly like a pagehide. User-driven
  // changes and visibility flips always write immediately.
  const WRITE_INTERVAL = 3000
  let lastWrite = at
  let persistenceEnabled = true
  function persist(force = true) {
    if (!persistenceEnabled) return
    if (!force && at - lastWrite < WRITE_INTERVAL) return
    lastWrite = at
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
      persist(false)
      // Hidden tabs skip re-rendering; the away report covers the gap and
      // setVisible(true) publishes on return.
      if (showing) publish()
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
          if (away) logAway(away, true)
          syncEventBaselines()
          state.absence = null
        } else {
          beginAbsence(state, state.savedAt)
          notification = null
        }
        showing = next
      }
      persist()
      publish()
    },
    disablePersistence() {
      persistenceEnabled = false
    },
    get away() {
      return away
    },
    get notification() {
      return notification
    },
    dismissNotification(id?: number) {
      if (notification && (id === undefined || notification.id === id)) {
        notification = null
        revision++
        for (const listener of listeners) listener()
      }
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
