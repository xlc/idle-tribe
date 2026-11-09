import { Card } from '@radix-ui/themes'
import { useEffect, useRef, useState } from 'react'
import {
  actionArrivals,
  actionAvailability,
  actionCompletionDuration,
  actionCost,
  actionDuration,
  actionJobActive,
  actionOutputRate,
  actionRequiredXp,
  actionYield,
  exploreExpectedRate,
  isRateMode,
} from '../actions'
import { ACTIONS } from '../definitions'
import { formatResource, formatResourceGain } from '../format'
import { ACTION_IDS, type ActionId } from '../ids'
import { affordability } from '../resources'
import type { GameSession } from '../session'
import { housingFull as isHousingFull, jobCapacity } from '../settlement'
import type { GameState } from '../types'
import { ResourceArt } from './art'
import {
  ActionCountdown,
  ActionProgress,
  Button,
  type Confirm,
  CostProgress,
  Costs,
  confirmStop,
  DisclosureToggle,
} from './common'

function ActionSkill({
  level,
  xp,
  requiredXp,
}: {
  level: number
  xp: number
  requiredXp: number
}) {
  const label = useRef<HTMLSpanElement>(null)
  const previousLevel = useRef(level)
  useEffect(() => {
    const increased = level > previousLevel.current
    previousLevel.current = level
    if (
      !increased ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return
    const animation = label.current?.animate(
      [
        {
          color: 'var(--color-primary)',
          backgroundColor: 'var(--color-base-300)',
        },
        { color: 'var(--color-neutral)', backgroundColor: 'transparent' },
      ],
      { duration: 900, easing: 'ease-out' },
    )
    return () => animation?.cancel()
  }, [level])
  return (
    <span className="action-skill">
      <span className="action-level" ref={label}>
        Level {level}
      </span>
      <span>·</span>
      <span>
        {Math.floor(xp)}/{requiredXp} XP
      </span>
    </span>
  )
}

function exploreHint(level: number) {
  if (level >= 10)
    return 'Finds: resources · discoveries · rare finds · travelers and stories'
  if (level >= 5)
    return 'Finds: resources · discoveries · rare finds · travelers'
  return 'Finds: resources · discoveries · exploration XP'
}

function ExploreSummary({
  state,
  automated,
  working,
}: {
  state: GameState
  automated: boolean
  working: boolean
}) {
  const expected = formatResourceGain(exploreExpectedRate(state))
  if (!automated || !working || !expected) {
    return null
  }
  return (
    <span className="action-explore-summary">
      <span>Expected: {expected}/s</span>
    </span>
  )
}

export function ActionCard({
  session,
  confirm,
  id,
}: {
  session: GameSession
  confirm: Confirm
  id: ActionId
}) {
  const [expanded, setExpanded] = useState(false)
  const s = session.game.state
  const entry = s.manual.find((m) => m.id === id)
  const def = ACTIONS[id],
    availability = actionAvailability(s, id),
    cost = actionCost(s, id),
    slots = jobCapacity(s, def.job),
    running = Boolean(entry),
    rateMode = isRateMode(s, id),
    duration = actionCompletionDuration(s, id),
    skill = s.actionSkills[id],
    housingFull = def.kind === 'arrival' && isHousingFull(s)
  const working =
    availability.kind === 'automated' &&
    availability.state === 'active' &&
    actionJobActive(s, id)
  const stop = () => {
    if (!entry) return
    confirmStop(confirm, session, {
      title: `Stop ${def.name}?`,
      paid: entry.paid,
      loss: 'Action',
      earned: entry.progress * actionDuration(s, id) > 10,
      run: () => session.game.cancelAction(id),
    })
  }
  const statusKind =
    availability.kind === 'locked' ? 'locked' : availability.state
  const missingCost = statusKind !== 'running' && affordability(s, cost) < 1
  const yieldPrefix = def.resource
    ? `+${formatResource(actionYield(s, id))} ${def.resource} · `
    : def.kind === 'arrival'
      ? `+${actionArrivals(s, id)} settler${actionArrivals(s, id) === 1 ? '' : 's'} · `
      : null
  const yieldLine = `${yieldPrefix ?? ''}${formatResource(duration)}s${housingFull ? ' · Housing full' : ''}`
  const icon = (
    <span
      className="action-icon"
      data-resource={def.resource}
      aria-hidden="true"
    >
      {def.resource ? <ResourceArt resource={def.resource} /> : '↗'}
    </span>
  )
  return (
    <Card asChild>
      <article
        className={`manual-action${def.kind === 'exploration' ? ' exploration-action' : ''}`}
        aria-label={def.name}
        data-running={running}
        data-action-state={statusKind}
        data-cost-missing={missingCost}
      >
        {missingCost && <CostProgress progress={affordability(s, cost)} />}
        <div className="action-row">
          {availability.kind === 'automated' ? (
            <fieldset className="action-automated" aria-label={def.name}>
              {icon}
              <span className="action-copy">
                <strong className="action-name">{def.name}</strong>
                <span className="action-yield">{yieldLine}</span>
                <ActionSkill
                  level={skill.level}
                  xp={skill.xp}
                  requiredXp={actionRequiredXp(s, id)}
                />
                {def.kind === 'exploration' && (
                  <ExploreSummary state={s} automated working={working} />
                )}
              </span>
              <span className="action-automation-controls">
                {!rateMode && (
                  <ActionProgress
                    session={session}
                    duration={duration}
                    label={`${def.name} progress`}
                    value={s.actionProgress[id] % 1}
                    running={working}
                  />
                )}
              </span>
            </fieldset>
          ) : (
            <button
              type="button"
              className="manual-trigger"
              aria-label={def.name}
              disabled={
                running ||
                availability.kind !== 'manual' ||
                availability.state !== 'ready'
              }
              onClick={() => session.change(() => session.game.startAction(id))}
            >
              {icon}
              <span className="action-copy">
                <strong className="action-name">{def.name}</strong>
                <span className="action-yield">{yieldLine}</span>
                <ActionSkill
                  level={skill.level}
                  xp={skill.xp}
                  requiredXp={actionRequiredXp(s, id)}
                />
                {def.kind === 'exploration' && (
                  <ExploreSummary state={s} automated={false} working={false} />
                )}
              </span>
              <span className="project-progress" data-running={running}>
                <ActionProgress
                  session={session}
                  duration={duration}
                  label={`${def.name} progress`}
                  value={entry?.progress ?? 0}
                  running={running}
                />
                <small>
                  <ActionCountdown
                    session={session}
                    duration={duration}
                    value={entry?.progress ?? 0}
                    running={running}
                  />
                </small>
              </span>
            </button>
          )}
          {running && (
            <Button
              className="action-stop"
              color="red"
              aria-label={`Stop ${def.name}`}
              title={`Stop ${def.name}`}
              onClick={stop}
            >
              Stop
            </Button>
          )}
          <DisclosureToggle
            expanded={expanded}
            controls={`${id}-details`}
            label={`${def.name} details`}
            onToggle={() => setExpanded((value) => !value)}
          />
        </div>
        {expanded && (
          <div className="action-details" id={`${id}-details`}>
            <p className="action-description">{def.description}</p>
            {slots > 0 && (
              <p className="action-hint">
                {slots} worker slot{slots === 1 ? '' : 's'}
              </p>
            )}
            {availability.kind === 'automated' && working && (
              <p className="action-hint">
                {def.resource
                  ? `+${formatResource(actionOutputRate(s, id))} ${def.resource}/s`
                  : def.kind === 'arrival'
                    ? `+${formatResource(actionArrivals(s, id) / duration)} settlers/s`
                    : `${formatResource(1 / duration)} explores/s`}
              </p>
            )}
            {Object.keys(cost).length > 0 && (
              <Costs session={session} cost={cost} vertical />
            )}
            {def.kind === 'exploration' && (
              <p className="action-hint">{exploreHint(skill.level)}</p>
            )}
          </div>
        )}
      </article>
    </Card>
  )
}

export function ActionCards({
  session,
  confirm,
  ids = ACTION_IDS,
}: {
  session: GameSession
  confirm: Confirm
  ids?: readonly ActionId[]
}) {
  const state = session.game.state
  return (
    <div className="manual-actions">
      {ids
        .filter((id) => actionAvailability(state, id).kind !== 'locked')
        .map((id) => (
          <ActionCard key={id} session={session} confirm={confirm} id={id} />
        ))}
    </div>
  )
}
