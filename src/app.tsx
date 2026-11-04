import { Dialog, Flex, Tabs } from '@radix-ui/themes'
import { useRef, useState } from 'react'
import type { AwayProgress } from './clock'
import { ActionCards } from './components/actions'
import { ViewIcon } from './components/art'
import {
  AwayReportDialog,
  SessionNotificationToast,
} from './components/away-report'
import { Button, type Confirm, SectionDisclosure } from './components/common'
import { ExpeditionEncounter } from './components/expedition'
import { Legacy } from './components/legacy'
import { OfflineStatus } from './components/offline-status'
import { PeopleView } from './components/people'
import { Production } from './components/production'
import { Construction, QueueView } from './components/queues'
import { Settings } from './components/settings'
import { Stockpile } from './components/stockpile'
import { Technology } from './components/technology'
import { ERAS } from './definitions'
import { NOTES } from './definitions/notes'
import { NOTE_IDS } from './ids'
import { researchQueueUnlocked } from './research'
import type { GameSession } from './session'
import { automationUnlocked, noteUnlocked } from './settlement'
import { useSession } from './use-session'

type View = 'settlement' | 'queue' | 'people' | 'legacy' | 'settings'

export function App({ session }: { session: GameSession }) {
  useSession(session)
  const s = session.game.state,
    automated = automationUnlocked(s),
    notification = session.notification
  const [view, setView] = useState<View>('settlement')
  const [awayReport, setAwayReport] = useState<AwayProgress | null>(null)
  const views: {
    id: View
    label: string
    mobileLabel: string
    available: boolean
    working?: boolean
  }[] = [
    {
      id: 'settlement',
      label: 'Settlement',
      mobileLabel: 'Actions',
      available: true,
    },
    {
      id: 'queue',
      label: 'Queue',
      mobileLabel: 'Queue',
      available: s.researchUnlocked && researchQueueUnlocked(s),
      working: Boolean(
        s.queues.research.active || s.queues.research.waiting.length,
      ),
    },
    {
      id: 'people',
      label: 'People',
      mobileLabel: 'People',
      available: true,
    },
    {
      id: 'legacy',
      label: 'Time box',
      mobileLabel: 'Legacy',
      available: s.legacy.discovered,
    },
    {
      id: 'settings',
      label: 'Settings',
      mobileLabel: 'Settings',
      available: true,
    },
  ]
  const availableViews = views.filter((entry) => entry.available)
  // First unlocked-but-unseen note; dismissing marks it seen and queues the next.
  const note = NOTE_IDS.find((id) => noteUnlocked(s, id) && !s.seenNotes[id])
  const dismissNote = () => {
    if (note) session.change(() => (s.seenNotes[note] = true))
  }
  const content = useRef<HTMLDivElement>(null)
  function showView(next: typeof view) {
    if (next !== view) session.dismissNotification()
    setView(next)
    content.current?.scrollTo({ top: 0 })
  }
  const [choice, setChoice] = useState<{
    title: string
    body: string
    run: () => void
    direct: boolean
  } | null>(null)
  const confirm: Confirm = (title, body, run, options) => {
    session.tick(Date.now())
    setChoice({ title, body, run, direct: options?.direct ?? false })
  }
  const props = { session, confirm }
  return (
    <main className={`game-shell${automated ? '' : ' opening-shell'}`}>
      <div className="game-layout">
        <Stockpile session={session} />
        <Tabs.Root
          className="game-content"
          value={view}
          onValueChange={(value) => {
            const next = availableViews.find((entry) => entry.id === value)
            if (next) showView(next.id)
          }}
        >
          {view === 'settlement' && notification && (
            <SessionNotificationToast
              key={notification.id}
              notification={notification}
              onDismiss={() => session.dismissNotification(notification.id)}
              onOpenReport={setAwayReport}
            />
          )}
          {awayReport && (
            <AwayReportDialog
              session={session}
              report={awayReport}
              onClose={() => setAwayReport(null)}
            />
          )}
          <div className="view-scroll" ref={content}>
            {view === 'settlement' && <ExpeditionEncounter session={session} />}
            {view === 'settlement' && !automated && (
              <SectionDisclosure
                className="discoveries"
                title={
                  <>
                    <ViewIcon name="actions" />
                    Actions
                  </>
                }
                ariaLabel="Actions"
              >
                <ActionCards {...props} />
              </SectionDisclosure>
            )}
            <div className={automated ? 'settlement-content' : 'opening'}>
              <div className="view-panel">
                <Tabs.Content
                  value="settlement"
                  forceMount
                  hidden={view !== 'settlement'}
                >
                  {automated ? (
                    <>
                      <Production
                        {...props}
                        middle={
                          s.researchUnlocked ? <Technology {...props} /> : null
                        }
                      />
                      <Construction {...props} compact />
                    </>
                  ) : (
                    <p className="opening-flavor">{ERAS[0]?.description}</p>
                  )}
                  {!automated && s.researchUnlocked && (
                    <Technology {...props} />
                  )}
                </Tabs.Content>
                <Tabs.Content
                  value="queue"
                  forceMount
                  hidden={view !== 'queue'}
                >
                  <QueueView {...props} />
                </Tabs.Content>
                <Tabs.Content
                  value="people"
                  forceMount
                  hidden={view !== 'people'}
                >
                  <PeopleView session={session} />
                </Tabs.Content>
                {s.legacy.discovered && (
                  <Tabs.Content
                    className="legacy"
                    value="legacy"
                    forceMount
                    hidden={view !== 'legacy'}
                  >
                    <Legacy {...props} onReset={() => setView('settlement')} />
                  </Tabs.Content>
                )}
                <Tabs.Content
                  value="settings"
                  forceMount
                  hidden={view !== 'settings'}
                >
                  <Settings {...props} />
                </Tabs.Content>
              </div>
            </div>
          </div>
          <Tabs.List className="view-tabs" aria-label="Game views" size="2">
            {availableViews.map((entry) => (
              <Tabs.Trigger
                key={entry.id}
                value={entry.id}
                onClick={() => content.current?.scrollTo({ top: 0 })}
              >
                <ViewIcon name={entry.id} />
                <span className="nav-label nav-label-desktop">
                  {entry.label}
                  {entry.working && (
                    <span
                      className="working-dot"
                      role="img"
                      aria-label="Work in progress"
                      title="Work in progress"
                    />
                  )}
                </span>
                <span className="nav-label nav-label-mobile" aria-hidden="true">
                  {entry.mobileLabel}
                  {entry.working && (
                    <span
                      className="working-dot"
                      role="img"
                      aria-label="Work in progress"
                      title="Work in progress"
                    />
                  )}
                </span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs.Root>
      </div>
      <OfflineStatus />
      <Dialog.Root
        open={Boolean(choice)}
        onOpenChange={(open) => {
          if (!open) setChoice(null)
        }}
      >
        <Dialog.Content size="2">
          <Dialog.Title>{choice?.title}</Dialog.Title>
          <Dialog.Description>{choice?.body}</Dialog.Description>
          <Flex justify="end" gap="3" mt="4">
            <Button onClick={() => setChoice(null)}>Dismiss</Button>
            <Button
              variant="solid"
              color="grass"
              onClick={() => {
                if (choice) {
                  if (choice.direct) choice.run()
                  else session.change(choice.run)
                }
                setChoice(null)
              }}
            >
              Confirm
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
      {note && (
        <Dialog.Root open onOpenChange={(open) => !open && dismissNote()}>
          <Dialog.Content size="2">
            <Dialog.Title>{NOTES[note].title}</Dialog.Title>
            <Dialog.Description>{NOTES[note].text}</Dialog.Description>
            <Flex justify="end" gap="3" mt="4">
              <Button variant="solid" color="grass" onClick={dismissNote}>
                Got it
              </Button>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
      )}
    </main>
  )
}
