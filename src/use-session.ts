import { useEffect, useSyncExternalStore } from 'react'
import type { GameSession } from './session'

export function useSession(session: GameSession) {
  const revision = useSyncExternalStore(session.subscribe, session.getSnapshot)
  useEffect(() => {
    let frame: number | null = null
    function animate() {
      frame = null
      session.advanceActivities(Date.now(), performance.now())
      scheduleFrame()
    }
    function scheduleFrame() {
      if (!document.hidden && session.activities.size && frame === null)
        frame = requestAnimationFrame(animate)
    }
    function visibility(visible: boolean) {
      session.setVisible(visible, Date.now(), performance.now())
      if (!visible && frame !== null) {
        cancelAnimationFrame(frame)
        frame = null
      }
      if (visible) scheduleFrame()
    }
    const onVisibility = () => visibility(!document.hidden)
    const onHide = () => visibility(false)
    const unsubscribe = session.subscribe(scheduleFrame)
    const interval = setInterval(() => session.tick(Date.now()), 500)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onHide)
    window.addEventListener('pageshow', onVisibility)
    scheduleFrame()
    return () => {
      clearInterval(interval)
      if (frame !== null) cancelAnimationFrame(frame)
      unsubscribe()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('pageshow', onVisibility)
    }
  }, [session])
  return revision
}
