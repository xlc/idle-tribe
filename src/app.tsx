import { Tabs } from '@radix-ui/themes'
import { useEffect, useRef, useState } from 'react'
import { ACTIONS } from './actions'
import { ManualActions } from './components/actions'
import { AwayReport } from './components/away-report'
import { Button, type Confirm } from './components/common'
import { OfflineStatus } from './components/offline-status'
import { People } from './components/people'
import { Construction } from './components/queues'
import { Production, Stockpile, Workforce } from './components/settlement'
import { Technology } from './components/technology'
import { ERAS } from './constants'
import { formatResource } from './format'
import { ACTION_IDS, PERK_IDS } from './ids'
import { buyPerk, canReset, legacyReward, PERKS, resetRun } from './prestige'
import type { GameSession } from './session'
import { automationUnlocked, prestigeMultiplier } from './settlement'
import { useSession } from './use-session'

type View = 'settlement' | 'research' | 'legacy'
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
  } | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const confirm: Confirm = (title, body, run) => {
    session.tick(Date.now())
    setChoice({ title, body, run })
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
          <Tabs.List className="view-tabs" aria-label="Game views" size="2">
            {availableViews.map((entry) => (
              <Tabs.Trigger
                key={entry.id}
                value={entry.id}
                onClick={() => content.current?.scrollTo({ top: 0 })}
              >
                {entry.label}
                {entry.working && (
                  <span
                    className="working-dot"
                    aria-hidden="true"
                    title="In progress"
                  />
                )}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
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
                    <p title="Lifetime points speed up worker production, construction and research. Spending points does not reduce this bonus.">
                      {s.legacy.lifetime} lifetime points · efficiency ×
                      {formatResource(prestigeMultiplier(s))}
                      {!canReset(s) && ' · Reset requires Writing'}
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
                <People session={session} />
                {automated && view === 'settlement' && (
                  <>
                    <Construction {...props} />
                    <section className="manual-work">
                      <h2>Manual work</h2>
                      <ManualActions session={session} />
                    </section>
                  </>
                )}
              </aside>
            </div>
          </div>
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
                  if (choice) session.change(choice.run)
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
