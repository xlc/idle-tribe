import { wipeSave } from '../persistence'
import { Button, type ViewProps } from './common'

async function refreshApp(session: ViewProps['session']) {
  session.change(() => undefined)
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.update()
        const worker = await waitingWorker(registration)
        if (worker) {
          const controllerChanged = new Promise<void>((resolve) => {
            navigator.serviceWorker.addEventListener(
              'controllerchange',
              () => resolve(),
              { once: true },
            )
          })
          worker.postMessage('SKIP_WAITING')
          await controllerChanged
        }
      }
    }
  } finally {
    window.location.reload()
  }
}

async function waitingWorker(
  registration: ServiceWorkerRegistration,
): Promise<ServiceWorker | null> {
  if (registration.waiting) return registration.waiting
  const installing = registration.installing
  if (!installing) return null
  const worker = installing
  return new Promise((resolve) => {
    function checkState() {
      if (worker.state !== 'installed' && worker.state !== 'redundant') return
      worker.removeEventListener('statechange', checkState)
      resolve(worker.state === 'installed' ? registration.waiting : null)
    }
    worker.addEventListener('statechange', checkState)
    checkState()
  })
}

export function Settings({ session, confirm }: ViewProps) {
  return (
    <>
      <h2>Settings</h2>
      <p>Manage this browser's local game data.</p>
      <div className="settings-actions">
        <Button color="grass" onClick={() => void refreshApp(session)}>
          Check for updates &amp; reload
        </Button>
        <Button
          color="amber"
          onClick={() =>
            confirm(
              'Wipe local save?',
              'This permanently deletes the settlement saved in this browser and starts a new game.',
              () => {
                wipeSave()
                window.location.reload()
              },
              { direct: true },
            )
          }
        >
          Wipe local save
        </Button>
      </div>
      <section className="event-log-section">
        <h2>Event log</h2>
        <p className="event-log-note">
          Events from this session. Refreshing the page clears the log.
        </p>
        {session.events.length ? (
          <ul className="event-log">
            {[...session.events].reverse().map((event) => (
              <li key={event.id}>
                <time>
                  {new Date(event.at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
                <span>{event.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="event-log-note">No events yet.</p>
        )}
      </section>
    </>
  )
}
