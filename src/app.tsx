import { useCallback, useEffect, useRef, useState } from 'react'
import { ActionButton } from './components/actions'
import { Disclosure } from './components/common'
import {
  Milestone,
  People,
  Production,
  Stockpile,
  Workforce,
} from './components/settlement'
import { Technology } from './components/technology'
import {
  BUILDINGS,
  getSettlementChapter,
  isAutomationUnlocked,
} from './economy'
import { formatResource } from './format'
import { ACTION_KEYS, BUILDING_IDS, RESOURCES } from './ids'
import type { GameSession } from './session'
import type { Action } from './types'
import { useSession } from './use-session'

type View = 'camp' | 'research'

export function App({ session }: { session: GameSession }) {
  useSession(session)
  const { game, away } = session
  const { state } = game
  const [view, setView] = useState<View>('camp')
  const [choice, setChoice] = useState<Action | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const campTab = useRef<HTMLButtonElement>(null)
  const researchTab = useRef<HTMLButtonElement>(null)
  const researching = view === 'research' && state.researchUnlocked
  const automated = isAutomationUnlocked(state)
  const focusView = useCallback(() => {
    ;(researching ? researchTab : campTab).current?.focus()
  }, [researching])
  useEffect(() => {
    if (researching && !document.hidden) game.markResearchSeen()
  })
  useEffect(() => {
    if (!choice || !dialog.current) return
    dialog.current.returnValue = ''
    dialog.current.showModal()
  }, [choice])
  function onAction(action: Action) {
    session.tick(Date.now())
    const specialization = action.researchId
      ? game.getResearchDefinition(action.researchId).specialization
      : undefined
    if (specialization?.kind === 'choice') {
      if (!state.specialization && action.canStart?.()) setChoice(action)
    } else session.startAction(action, Date.now(), performance.now())
  }
  const actionProps = { session, onAction, focusView }
  const manual = ACTION_KEYS.map((key) => game.actions[key]).filter(
    (action) => !action.researchId && (action.visible?.() ?? true),
  )
  const discoveries = manual.filter((action) => action.discovery)
  const minutes = Math.floor((away?.elapsed ?? 0) / 60000)
  const awayDuration =
    minutes >= 60
      ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
      : `${minutes}m`
  const specialization = choice?.researchId
    ? game.getResearchDefinition(choice.researchId).specialization
    : undefined
  return (
    <main className="game-shell">
      <header className="game-header">
        <h1>
          Tribe
          <span className="chapter" id="chapter">
            {getSettlementChapter(state)}
          </span>
        </h1>
        <div className="header-meta">
          <span className="path-name" id="path-name">
            {state.specialization
              ? game.getResearchDefinition(state.specialization).name
              : ''}
          </span>
          {away && (
            <button
              className="btn btn-sm btn-primary btn-soft min-h-11 sm:min-h-9 whitespace-nowrap tabular-nums"
              id="away-trigger"
              type="button"
              popoverTarget="away-notice"
            >
              Away · {awayDuration}
            </button>
          )}
        </div>
      </header>
      <section
        className="away-notice card card-border border-base-300 bg-base-100 p-3.5 shadow-lg"
        id="away-notice"
        popover="auto"
        aria-label="Offline progress"
      >
        <div>
          <strong id="away-title">While you were away · {awayDuration}</strong>
          <p id="away-gains">
            {away
              ? RESOURCES.filter((id) => away.gains[id] > 0)
                  .map((id) => `+${formatResource(away.gains[id])} ${id}`)
                  .join(' · ') || 'No resources gained.'
              : ''}
          </p>
        </div>
        <button
          className="btn btn-sm btn-ghost btn-square min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 text-xl"
          id="dismiss-away"
          type="button"
          popoverTarget="away-notice"
          popoverTargetAction="hide"
          aria-label="Close offline progress"
        >
          ×
        </button>
      </section>
      <Stockpile session={session} />
      <div
        className="tabs tabs-border mt-2 border-b border-base-300"
        role="tablist"
        aria-label="Game views"
        onKeyDown={(event) => {
          const available = [
            campTab.current,
            ...(state.researchUnlocked ? [researchTab.current] : []),
          ]
          if (!(event.target instanceof HTMLButtonElement)) return
          const index = available.indexOf(event.target)
          const next =
            event.key === 'ArrowRight'
              ? available[(index + 1) % available.length]
              : event.key === 'ArrowLeft'
                ? available[(index - 1 + available.length) % available.length]
                : event.key === 'Home'
                  ? available[0]
                  : event.key === 'End'
                    ? available.at(-1)
                    : null
          if (!next) return
          event.preventDefault()
          next.click()
          next.focus()
        }}
      >
        <button
          ref={campTab}
          id="actions-tab"
          className="tab gap-2 font-semibold"
          role="tab"
          aria-selected={!researching}
          aria-controls="camp-view"
          tabIndex={researching ? -1 : 0}
          type="button"
          onClick={() => setView('camp')}
        >
          Settlement
        </button>
        <button
          ref={researchTab}
          id="research-tab"
          className="tab gap-2 font-semibold"
          role="tab"
          aria-selected={researching}
          aria-controls="research-view"
          tabIndex={researching ? 0 : -1}
          type="button"
          disabled={!state.researchUnlocked}
          onClick={() => setView('research')}
        >
          Technology
          <span
            className="badge badge-xs badge-warning size-1.5 p-0"
            id="research-unread"
            hidden={researching || !game.getUnreadResearch().length}
            role="img"
            aria-label="New technology"
          />
        </button>
      </div>
      <p
        className="feedback"
        id="feedback"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {session.feedback}
      </p>
      <div
        id="camp-view"
        role="tabpanel"
        aria-labelledby="actions-tab"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Tab panels are keyboard navigation targets.
        tabIndex={0}
        hidden={researching}
      >
        {BUILDING_IDS.filter((id) => BUILDINGS[id].milestone).map((id) => (
          <Milestone key={id} session={session} id={id} />
        ))}
        <Workforce session={session} />
        {discoveries.length > 0 && (
          <section id="discovery-section" aria-labelledby="discovery-heading">
            <h2 id="discovery-heading">Explore</h2>
            <div id="discovery-list">
              {discoveries.map((action) => (
                <ActionButton
                  key={action.id}
                  {...actionProps}
                  action={action}
                />
              ))}
            </div>
          </section>
        )}
        <div className="settlement-layout">
          <Production session={session} />
          <aside className="camp-aside">
            <Disclosure
              id="manual-work"
              title="Manual work"
              initiallyOpen={!automated}
              collapseWhen={automated}
            >
              <div id="manual-list">
                {manual
                  .filter((action) => !action.discovery)
                  .map((action) => (
                    <ActionButton
                      key={action.id}
                      {...actionProps}
                      action={action}
                    />
                  ))}
              </div>
            </Disclosure>
            <People session={session} />
          </aside>
        </div>
      </div>
      <div
        id="research-view"
        role="tabpanel"
        aria-labelledby="research-tab"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Tab panels are keyboard navigation targets.
        tabIndex={0}
        hidden={!researching}
      >
        <Technology {...actionProps} />
      </div>
      <footer>Progress saves automatically · Up to 24 hours offline</footer>
      <dialog
        ref={dialog}
        className="modal"
        id="specialization-dialog"
        aria-labelledby="specialization-title"
        onClose={(event) => {
          if (event.currentTarget.returnValue === 'confirm' && choice)
            session.startAction(choice, Date.now(), performance.now())
          setChoice(null)
        }}
      >
        <form method="dialog" className="modal-box max-w-[420px]">
          <span className="eyebrow">Choose your path</span>
          <h2 id="specialization-title">{choice?.name}</h2>
          <p id="specialization-effect">
            {specialization?.kind === 'choice'
              ? specialization.description
              : ''}
          </p>
          <p className="choice-warning">
            This choice lasts for this run. The other path will be locked.
          </p>
          <div className="modal-action">
            <button
              type="submit"
              className="btn btn-sm btn-ghost min-h-11 sm:min-h-9"
              value="cancel"
            >
              Keep deciding
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm min-h-11"
              id="confirm-specialization"
              value="confirm"
            >
              Choose this path
            </button>
          </div>
        </form>
      </dialog>
    </main>
  )
}
