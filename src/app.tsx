import { Tabs } from '@radix-ui/themes'
import { useEffect, useRef, useState } from 'react'
import { ActionCards } from './components/actions'
import { ViewIcon } from './components/art'
import { SessionNotificationToast } from './components/away-report'
import { Button, type Confirm } from './components/common'
import { ExpeditionEncounter } from './components/expedition'
import { Legacy } from './components/legacy'
import { OfflineStatus } from './components/offline-status'
import { People } from './components/people'
import { Production } from './components/production'
import { Construction, Queue } from './components/queues'
import { Settings } from './components/settings'
import { Stockpile } from './components/stockpile'
import { Technology } from './components/technology'
import { Workforce } from './components/workforce'
import { ERAS } from './definitions'
import type { GameSession } from './session'
import { automationUnlocked } from './settlement'
import { useSession } from './use-session'

type View = 'settlement' | 'research' | 'people' | 'legacy' | 'settings'
export function App({ session }: { session: GameSession }) {
  useSession(session)
  const s = session.game.state,
    automated = automationUnlocked(s),
    notification = session.notification
  const [view, setView] = useState<View>('settlement')
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
      id: 'research',
      label: 'Technology',
      mobileLabel: 'Research',
      available: s.researchUnlocked,
      working: Boolean(s.queues.research.active),
    },
    {
      id: 'people',
      label: 'People',
      mobileLabel: 'People',
      available: automated,
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
  const dialog = useRef<HTMLDialogElement>(null)
  const confirm: Confirm = (title, body, run, options) => {
    session.tick(Date.now())
    setChoice({ title, body, run, direct: options?.direct ?? false })
  }
  useEffect(() => {
    if (choice) dialog.current?.showModal()
  }, [choice])
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
              session={session}
              notification={notification}
              onDismiss={() => session.dismissNotification(notification.id)}
            />
          )}
          <div className="view-scroll" ref={content}>
            {view === 'settlement' && !automated && (
              <section className="discoveries" aria-label="Actions">
                <h2>Actions</h2>
                <ActionCards session={session} />
              </section>
            )}
            <div
              className={automated ? 'settlement-layout' : 'opening'}
              data-aside={view !== 'settings'}
            >
              <div className="view-panel">
                <Tabs.Content
                  value="settlement"
                  forceMount
                  hidden={view !== 'settlement'}
                >
                  <ExpeditionEncounter session={session} />
                  {automated ? (
                    <>
                      <Production {...props} />
                      <details className="settlement-scenery">
                        <summary>Settlement view</summary>
                        <div
                          className="settlement-landscape"
                          data-landscape={ERAS[s.era]?.landscape}
                          aria-hidden="true"
                        />
                      </details>
                    </>
                  ) : (
                    <p className="opening-flavor">{ERAS[0]?.description}</p>
                  )}
                </Tabs.Content>
                <Tabs.Content
                  value="research"
                  forceMount
                  hidden={view !== 'research'}
                >
                  <Technology {...props} />
                </Tabs.Content>
                {automated && (
                  <Tabs.Content
                    value="people"
                    forceMount
                    hidden={view !== 'people'}
                  >
                    <People session={session} />
                  </Tabs.Content>
                )}
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
              <aside className="camp-aside" hidden={view === 'settings'}>
                {!automated && <People session={session} />}
                {automated && (
                  <div className="project-plans">
                    <section className="camp-summary panel" aria-label="Camp">
                      <Construction {...props} compact />
                      <Workforce {...props} compact />
                    </section>
                    <div className="camp-research">
                      <Queue {...props} id="research" />
                    </div>
                  </div>
                )}
              </aside>
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
                      aria-label="Working"
                    />
                  )}
                </span>
                <span className="nav-label nav-label-mobile" aria-hidden="true">
                  {entry.mobileLabel}
                  {entry.working && (
                    <span
                      className="working-dot"
                      role="img"
                      aria-label="Working"
                    />
                  )}
                </span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs.Root>
      </div>
      <OfflineStatus />
      {choice && (
        <dialog
          ref={dialog}
          className="modal panel"
          onClose={() => setChoice(null)}
        >
          <div className="modal-box">
            <h2>{choice?.title}</h2>
            <p>{choice?.body}</p>
            <div className="modal-action">
              <Button
                onClick={() => {
                  dialog.current?.close()
                  setChoice(null)
                }}
              >
                Keep playing
              </Button>
              <Button
                variant="solid"
                color="grass"
                onClick={() => {
                  if (choice) {
                    if (choice.direct) choice.run()
                    else session.change(choice.run)
                  }
                  dialog.current?.close()
                  setChoice(null)
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </dialog>
      )}
    </main>
  )
}
