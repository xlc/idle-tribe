import { Dialog, Flex } from '@radix-ui/themes'
import { useState } from 'react'
import type { AwayProgress } from '../clock'
import { NOTES } from '../definitions/notes'
import { NOTE_IDS, type NoteId } from '../ids'
import { wipeSave } from '../persistence'
import { AwayReportDialog } from './away-report'
import { Button, type ViewProps } from './common'

const CHEAT_RESOURCES = ['food', 'wood', 'stone'] as const

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
  const [selectedNote, setSelectedNote] = useState<NoteId | null>(null)
  const s = session.game.state,
    seenNotes = NOTE_IDS.filter((id) => s.seenNotes[id])
  return (
    <>
      <h2>Settings</h2>
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
      <section className="settings-cheats">
        <h2>Cheats</h2>
        <p className="settings-note">
          Add resources for testing and experimentation.
        </p>
        <div className="settings-actions">
          {CHEAT_RESOURCES.map((resource) => (
            <Button
              key={resource}
              color="amber"
              onClick={() =>
                session.change(() =>
                  session.game.grantResources({ [resource]: 100 }),
                )
              }
            >
              +100 {resource}
            </Button>
          ))}
        </div>
      </section>
      <section className="event-log-section">
        <h2>Unlock notes</h2>
        {seenNotes.length ? (
          <ul className="event-log">
            {[...seenNotes].reverse().map((id) => (
              <li key={id}>
                <span className="event-log-entry">
                  <span>{NOTES[id].title}</span>
                  <span className="event-log-action">
                    <Button variant="ghost" onClick={() => setSelectedNote(id)}>
                      Read
                    </Button>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="event-log-note">No unlock notes yet.</p>
        )}
      </section>
      <section className="event-log-section">
        <h2>Event log</h2>
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
                  <span
                    className="event-log-action"
                    data-visible={Boolean(event.report)}
                  >
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedReport(event.report ?? null)}
                    >
                      View report
                    </Button>
                  </span>
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
      {selectedNote && (
        <Dialog.Root
          open
          onOpenChange={(open) => !open && setSelectedNote(null)}
        >
          <Dialog.Content size="2">
            <Dialog.Title>{NOTES[selectedNote].title}</Dialog.Title>
            <Dialog.Description>{NOTES[selectedNote].text}</Dialog.Description>
            <Flex justify="end" gap="3" mt="4">
              <Button onClick={() => setSelectedNote(null)}>Close</Button>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
      )}
    </>
  )
}
