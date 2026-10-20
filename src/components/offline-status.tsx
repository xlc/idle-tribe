import { useEffect } from 'react'

export function OfflineStatus() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      !('serviceWorker' in navigator)
    )
      return
    navigator.serviceWorker
      .register('/service-worker.js', { updateViaCache: 'none' })
      .catch((error: Error) => console.warn('Offline setup failed:', error))
  }, [])
  return null
}
