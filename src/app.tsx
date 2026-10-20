import { useEffect, useRef, useState } from 'react'
import { ACTIONS } from './actions'
import { offlineWindow } from './clock'
import { ManualActions } from './components/actions'
import { Button, type Confirm } from './components/common'
import { People } from './components/people'
import { Queue } from './components/queues'
import {
  Builders,
  Production,
  Stockpile,
  Workforce,
} from './components/settlement'
import { Technology } from './components/technology'
import { ERAS, RESOURCE_INFO } from './constants'
import { OCCUPATIONS } from './economy'
import { formatDuration, formatResource } from './format'
import { ACTION_IDS, PERK_IDS, RESOURCES } from './ids'
import { buyPerk, canReset, legacyReward, PERKS, resetRun } from './prestige'
import { QUEUES, queueBlocker } from './research'
import { storageMultiplier } from './resources'
import type { GameSession } from './session'
import { automationUnlocked, prestigeMultiplier } from './settlement'
import { useSession } from './use-session'
export function App({ session }: { session: GameSession }) {
  useSession(session)
  const s = session.game.state,
    automated = automationUnlocked(s),
    away = session.away
  const [view, setView] = useState<'settlement' | 'research' | 'legacy'>(
    'settlement',
  )
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
    <main className="game-shell">
      <header className="game-header">
        <h1>
          Tribe{' '}
          <span className="chapter" title={ERAS[s.era]?.description}>
            {ERAS[s.era]?.name ?? 'Beyond'}
          </span>
        </h1>
        <div className="header-meta">
          <span className="path-name">{s.specialization}</span>
          {away && away.wallSeconds >= 60 && (
            <button
              type="button"
              className="btn btn-sm"
              popoverTarget="away-notice"
            >
              Away · {formatDuration(away.wallSeconds)}
            </button>
          )}
        </div>
      </header>
      <Stockpile session={session} />
      <nav className="view-tabs" aria-label="Game views">
        <button
          type="button"
          className={view === 'settlement' ? 'selected' : ''}
          onClick={() => setView('settlement')}
        >
          Settlement
        </button>
        {s.researchUnlocked && (
          <button
            type="button"
            className={view === 'research' ? 'selected' : ''}
            onClick={() => setView('research')}
          >
            Technology
            {s.queues.research.active && <span className="working-dot" />}
          </button>
        )}
        {s.legacy.discovered && (
          <button
            type="button"
            className={view === 'legacy' ? 'selected' : ''}
            onClick={() => setView('legacy')}
          >
            Time box
          </button>
        )}
      </nav>
      {s.notice && (
        <p className="feedback" role="status">
          {s.notice}
        </p>
      )}
      <section hidden={view !== 'settlement'} aria-label="Settlement">
        {automated && <Workforce session={session} />}
        {ACTION_IDS.some(
          (id) => ACTIONS[id].discovery && ACTIONS[id].visible(s),
        ) && (
          <section className="discoveries">
            <h2>Explore</h2>
            <ManualActions session={session} discoveries />
          </section>
        )}
        <div className={automated ? 'settlement-layout' : 'opening'}>
          {automated && <Production {...props} />}
          <aside className="camp-aside">
            {automated && (
              <>
                <Builders session={session} />
                <Queue {...props} id="construction" />
              </>
            )}
            {automated ? (
              <details>
                <summary>Manual work</summary>
                <ManualActions session={session} />
              </details>
            ) : (
              <section>
                <h2>A small beginning</h2>
                <p className="opening-flavor">{ERAS[0]?.description}</p>
                <ManualActions session={session} />
              </section>
            )}
            <People session={session} />
          </aside>
        </div>
      </section>
      <section hidden={view !== 'research'} aria-label="Technology">
        <Technology {...props} />
      </section>
      {s.legacy.discovered && (
        <section
          className="legacy"
          hidden={view !== 'legacy'}
          aria-label="Time box"
        >
          <h2>Mysterious time box · {s.legacy.points} legacy points</h2>
          <p>A small box with a very unreasonable relationship to time.</p>
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
                `Gain ${legacyReward(s)} legacy points. Lose all resources, people, facilities, equipment, assignments, aptitudes, personal expertise, discoveries, research, branch choices, and queued work. Keep lifetime points, perks, settings, and the time box.`,
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
              <article className="card tech-card" key={id}>
                <h3>{PERKS[id].name}</h3>
                <p className="flavor">{PERKS[id].description}</p>
                <p>{PERKS[id].effect}</p>
                <Button
                  disabled={
                    s.legacy.perks[id] || s.legacy.points < PERKS[id].cost
                  }
                  onClick={() => session.change(() => buyPerk(s, id))}
                >
                  {s.legacy.perks[id] ? 'Owned' : `${PERKS[id].cost} points`}
                </Button>
              </article>
            ))}
          </div>
        </section>
      )}
      <footer>
        Progress saves automatically · {formatResource(offlineWindow(s))}h
        full-speed offline, then diminishing progress
      </footer>
      <section
        id="away-notice"
        className="away-notice card"
        popover="auto"
        aria-label="Offline progress"
      >
        <div>
          <strong>While you were away</strong>
          {away && (
            <>
              <p>
                {formatDuration(away.effectiveSeconds)} simulated ·{' '}
                {formatDuration(
                  Math.max(0, away.wallSeconds - away.effectiveSeconds),
                )}{' '}
                slower time
              </p>
              <p>
                {RESOURCES.filter((r) => Math.abs(away.gains[r]) > 0.0005)
                  .map(
                    (r) =>
                      `${away.gains[r] >= 0 ? '+' : ''}${formatResource(away.gains[r])} ${RESOURCE_INFO[r].name.toLowerCase()}`,
                  )
                  .join(' · ') || 'No net resource change.'}
              </p>
              <p>
                {away.arrivals} arrivals · {away.completed} projects completed
              </p>
              {away.expertise.length > 0 && (
                <div className="away-expertise">
                  <strong>Growing expertise</strong>
                  {away.expertise.slice(0, 5).map((person) => (
                    <p key={person.index}>
                      {person.name}:{' '}
                      {person.gains
                        .map(
                          (gain) =>
                            `${OCCUPATIONS[gain.job].aptitude} ${gain.before} → ${gain.after}`,
                        )
                        .join(' · ')}
                    </p>
                  ))}
                  {away.expertise.length > 5 && (
                    <details>
                      <summary>{away.expertise.length - 5} more people</summary>
                      {away.expertise.slice(5).map((person) => (
                        <p key={person.index}>
                          {person.name}:{' '}
                          {person.gains
                            .map(
                              (gain) =>
                                `${OCCUPATIONS[gain.job].aptitude} ${gain.before} → ${gain.after}`,
                            )
                            .join(' · ')}
                        </p>
                      ))}
                    </details>
                  )}
                </div>
              )}
              <p>
                {QUEUES.map((id) => {
                  const blocker = queueBlocker(s, id)
                  return blocker && blocker !== 'Waiting'
                    ? `${id}: ${blocker}`
                    : ''
                })
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <p>
                {RESOURCES.filter((r) => storageMultiplier(s, r) < 1)
                  .map((r) => `${RESOURCE_INFO[r].name}: crowded storage`)
                  .join(' · ')}
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          className="btn btn-sm"
          popoverTarget="away-notice"
          popoverTargetAction="hide"
        >
          Close
        </button>
      </section>
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
