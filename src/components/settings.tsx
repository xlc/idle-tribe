import { useState } from 'react'
import type { AwayProgress } from '../clock'
import { wipeSave } from '../persistence'
import { AwayReportDialog } from './away-report'
import { Button, type ViewProps } from './common'

async function refreshApp(session: ViewProps['session']) {
  session.change(() => undefined)
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration('/')
      await registration?.unregister()
      await Promise.all(
        (await caches.keys())
          .filter((key) => key.startsWith('tribe-app-'))
          .map((key) => caches.delete(key)),
      )
    }
  } finally {
    window.location.reload()
  }
}

export function Settings({ session, confirm }: ViewProps) {
  const [selectedReport, setSelectedReport] = useState<AwayProgress | null>(
    null,
  )
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
                session.disablePersistence()
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
                <span className="event-log-entry">
                  <span>{event.text}</span>
                  {event.report && (
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedReport(event.report ?? null)}
                    >
                      View report
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="event-log-note">No events yet.</p>
        )}
      </section>
      {selectedReport && (
        <AwayReportDialog
          session={session}
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </>
  )
}
