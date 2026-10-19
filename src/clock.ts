import { OFFLINE_CAP_MS } from './constants'

// A page can receive both visibility and restoration events for one absence.
// Keep one timeline so that absence is settled exactly once.
export function createClock(
  advance: (elapsed: number) => void,
  now: number,
  visible: boolean,
) {
  let at = now
  let showing = visible
  function tick(time: number) {
    if (!showing) return
    const elapsed = Math.min(OFFLINE_CAP_MS, Math.max(0, time - at))
    at = time
    if (elapsed) advance(elapsed)
  }
  function setVisible(next: boolean, time: number) {
    if (next === showing) return 0
    if (!next) tick(time)
    const away = next ? Math.min(OFFLINE_CAP_MS, Math.max(0, time - at)) : 0
    showing = next
    at = time
    if (away) advance(away)
    return away
  }
  return { tick, setVisible, settledAt: () => at }
}

// Manual work and research use active page time; only workplaces earn offline.
export function createActivityTimer(
  duration: number,
  now: number,
  visible: boolean,
) {
  let at = now
  let elapsed = 0
  let active = visible
  function sample(time: number) {
    if (active) elapsed = Math.min(duration, elapsed + Math.max(0, time - at))
    at = time
    return elapsed
  }
  function setVisible(next: boolean, time: number) {
    sample(time)
    active = next
  }
  return { sample, setVisible }
}
