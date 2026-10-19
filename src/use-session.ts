import { useEffect, useSyncExternalStore } from 'react'
import type { GameSession } from './session'
export function useSession(session: GameSession) {
  const revision = useSyncExternalStore(session.subscribe, session.getSnapshot)
  useEffect(() => {
    const interval = setInterval(() => session.tick(Date.now()), 500)
    const visibility = () => session.setVisible(!document.hidden, Date.now())
    const hide = () => session.setVisible(false, Date.now())
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', hide)
    window.addEventListener('pageshow', visibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pagehide', hide)
      window.removeEventListener('pageshow', visibility)
    }
  }, [session])
  return revision
}
