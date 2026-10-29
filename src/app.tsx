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
import { People } from './components/people'
import { Production } from './components/production'
import { Construction, QueueView } from './components/queues'
import { Settings } from './components/settings'
import { Stockpile } from './components/stockpile'
import { Technology } from './components/technology'
import { Workforce } from './components/workforce'
import { ERAS } from './definitions'
import { projectName, researchQueueUnlocked } from './research'
import type { GameSession } from './session'
import { assigned, automationUnlocked, comfortablePlaces } from './settlement'
import { useSession } from './use-session'

type View = 'settlement' | 'queue' | 'people' | 'legacy' | 'settings'

function SettlementBrief({ session }: { session: GameSession }) {
  const s = session.game.state
  const construction = s.queues.construction.active
    ? projectName(s, s.queues.construction.active.project)
    : s.queues.construction.waiting.length
      ? `${s.queues.construction.waiting.length} queued`
      : 'No project'
  const research = s.queues.research.active
    ? projectName(s, s.queues.research.active.project)
    : s.queues.research.waiting.length
      ? `${s.queues.research.waiting.length} queued`
      : 'No project'
  const rooms = comfortablePlaces(s)
  return (
    <SectionDisclosure
      className="settlement-brief"
      title={
        <>
          <ViewIcon name="settlement" />
          Settlement
        </>
      }
      status={ERAS[s.era]?.name ?? 'Current era'}
      ariaLabel="Settlement status"
    >
      <section className="settlement-brief-content">
        <div className="settlement-brief-heading">
          <div>
            <span className="eyebrow">Current era</span>
            <h1>{ERAS[s.era]?.name ?? 'Settlement'}</h1>
          </div>
        </div>
        <p className="settlement-brief-description">
          {ERAS[s.era]?.description}
        </p>
        <dl className="settlement-status-grid">
          <div>
            <dt>People</dt>
            <dd>
              {s.people.length} <small>{assigned(s, 'idle')} unassigned</small>
            </dd>
          </div>
          <div>
            <dt>Housing</dt>
            <dd>
              {s.people.length}/{rooms} <small>capacity</small>
            </dd>
          </div>
          <div>
            <dt>Construction</dt>
            <dd>{construction}</dd>
          </div>
          <div data-visible={s.researchUnlocked}>
            <dt>Research</dt>
            <dd>{research}</dd>
          </div>
        </dl>
      </section>
    </SectionDisclosure>
  )
}

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
                {automated && (
                  <Tabs.Content
                    value="people"
                    forceMount
                    hidden={view !== 'people'}
                  >
                    <div className="people-view">
                      <SettlementBrief session={session} />
                      <Workforce session={session} />
                      <People session={session} />
                    </div>
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
            <Button onClick={() => setChoice(null)}>Keep playing</Button>
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
    </main>
  )
}
