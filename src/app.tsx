import { Tabs } from '@radix-ui/themes'
import { useEffect, useRef, useState } from 'react'
import { ACTIONS } from './actions'
import { ManualActions } from './components/actions'
import { ViewIcon } from './components/art'
import { AwayReport } from './components/away-report'
import { Button, type Confirm } from './components/common'
import { OfflineStatus } from './components/offline-status'
import { People } from './components/people'
import { Construction, Queue } from './components/queues'
import { Production, Stockpile, Workforce } from './components/settlement'
import { Technology } from './components/technology'
import { ERAS } from './constants'
import { formatResource } from './format'
import { ACTION_IDS, PERK_IDS } from './ids'
import { wipeSave } from './persistence'
import { buyPerk, canReset, legacyReward, PERKS, resetRun } from './prestige'
import { RESEARCH } from './research-definitions'
import type { GameSession } from './session'
import { automationUnlocked, prestigeMultiplier } from './settlement'
import { useSession } from './use-session'

type View = 'settlement' | 'research' | 'people' | 'legacy'
export function App({ session }: { session: GameSession }) {
  useSession(session)
  const s = session.game.state,
    automated = automationUnlocked(s),
    away = session.away
  const [view, setView] = useState<View>('settlement')
  const views: {
    id: View
    label: string
    available: boolean
    working?: boolean
  }[] = [
    { id: 'settlement', label: 'Settlement', available: true },
    {
      id: 'research',
      label: 'Technology',
      available: s.researchUnlocked,
      working: Boolean(s.queues.research.active),
    },
    { id: 'people', label: 'People', available: automated },
    { id: 'legacy', label: 'Time box', available: s.legacy.discovered },
  ]
  const availableViews = views.filter((entry) => entry.available)
  const content = useRef<HTMLDivElement>(null)
  function showView(next: typeof view) {
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
      <header className="game-header">
        <div className="game-header-copy">
          <h1>Primitive Tribe</h1>
          <div className="settlement-identity">
            <span>{ERAS[s.era]?.name} era</span>
            {s.specialization && (
              <span className="branch-badge">
                {RESEARCH[s.specialization].name}
              </span>
            )}
          </div>
        </div>
        <details className="settings-menu">
          <summary className="settings-trigger">Settings</summary>
          <div className="settings-panel">
            <h2>Settings</h2>
            <p>Manage this browser's local game data.</p>
            <Button
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
        </details>
      </header>
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
          <div className="view-scroll" ref={content}>
            {away && away.wallSeconds >= 60 && (
              <AwayReport session={session} report={away} />
            )}
            {s.notice && (
              <p className="feedback" role="status">
                {s.notice}
              </p>
            )}
            {view === 'settlement' && automated && (
              <Workforce session={session} />
            )}
            {view === 'settlement' &&
              automated &&
              ACTION_IDS.some(
                (id) => ACTIONS[id].discovery && ACTIONS[id].visible(s),
              ) && (
                <section className="discoveries">
                  <h2>Explore</h2>
                  <ManualActions session={session} discoveries />
                </section>
              )}
            {view === 'settlement' && automated && (
              <div
                className="settlement-landscape"
                data-landscape={ERAS[s.era]?.landscape}
                aria-hidden="true"
              />
            )}
            <div className={automated ? 'settlement-layout' : 'opening'}>
              <div className="view-panel">
                <Tabs.Content
                  value="settlement"
                  forceMount
                  hidden={view !== 'settlement'}
                >
                  {automated ? (
                    <Production {...props} />
                  ) : (
                    <>
                      <p className="opening-flavor">{ERAS[0]?.description}</p>
                      <ManualActions session={session} />
                      <section
                        className="discoveries opening-discoveries"
                        aria-label="Discoveries"
                      >
                        <ManualActions session={session} discoveries />
                      </section>
                    </>
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
                    <h2>
                      Mysterious time box · {s.legacy.points} legacy points
                    </h2>
                    <p>
                      A small box with a very unreasonable relationship to time.
                    </p>
                    <p>
                      {s.legacy.lifetime} lifetime points · efficiency ×
                      {formatResource(prestigeMultiplier(s))}
                      {!canReset(s) && ' · Reset requires Writing'}
                    </p>
                    <p className="legacy-note">
                      Lifetime points improve worker, construction, and research
                      speed for every settlement.
                    </p>
                    <Button
                      disabled={!canReset(s)}
                      onClick={() =>
                        confirm(
                          'Begin a new settlement?',
                          `Gain ${legacyReward(s)} legacy points. Lose all resources, people, facilities, equipment, assignments, aptitudes, personal expertise, action levels, discoveries, research, branch choices, and queued work. Keep lifetime points, perks, settings, and the time box.`,
                          () => {
                            resetRun(s)
                            setView('settlement')
                          },
                        )
                      }
                    >
                      Reset settlement · +{legacyReward(s)}
                    </Button>
                    <div className="tech-grid">
                      {PERK_IDS.map((id) => (
                        <article className="tech-card" key={id}>
                          <h3>{PERKS[id].name}</h3>
                          <p className="flavor">{PERKS[id].description}</p>
                          <p>{PERKS[id].effect}</p>
                          <Button
                            disabled={
                              s.legacy.perks[id] ||
                              s.legacy.points < PERKS[id].cost
                            }
                            onClick={() => session.change(() => buyPerk(s, id))}
                          >
                            {s.legacy.perks[id]
                              ? 'Owned'
                              : `${PERKS[id].cost} points`}
                          </Button>
                        </article>
                      ))}
                    </div>
                  </Tabs.Content>
                )}
              </div>
              <aside className="camp-aside">
                {!automated && <People session={session} />}
                {automated && (
                  <div className="project-plans">
                    <Construction {...props} />
                    <Queue {...props} id="research" />
                  </div>
                )}
                {automated && view === 'settlement' && (
                  <details className="manual-work">
                    <summary>Manual work</summary>
                    <ManualActions session={session} />
                  </details>
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
                {entry.label}
                {entry.working && (
                  <span className="working-status">
                    <span className="working-dot" aria-hidden="true" />
                    Working
                  </span>
                )}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs.Root>
      </div>
      <OfflineStatus />
      {choice && (
        <dialog ref={dialog} className="modal" onClose={() => setChoice(null)}>
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
