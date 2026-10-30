import { Card } from '@radix-ui/themes'
import { useEffect, useRef, useState } from 'react'
import {
  actionAvailability,
  actionCompletionDuration,
  actionDuration,
  actionJobActive,
  actionOutputRate,
  actionRequiredXp,
  actionSlots,
  actionWorkersUnlocked,
  actionYield,
  automationFactor,
  exploreExpectedRate,
  isRateMode,
} from '../actions'
import { ACTIONS } from '../definitions'
import { formatCost, formatResource, formatResourceGain } from '../format'
import { ACTION_IDS, type ActionId } from '../ids'
import type { GameSession } from '../session'
import type { GameState } from '../types'
import { ResourceArt } from './art'
import {
  ActionCountdown,
  ActionProgress,
  Button,
  type Confirm,
  Costs,
  DisclosureToggle,
} from './common'
import { WorkerControls } from './worker-controls'

const LEVEL_EFFECT_LABEL = 'Level effect:'

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
  return 'Finds: resources · discoveries · sometimes nothing'
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
  const s = session.game.state,
    active = s.manual
  const def = ACTIONS[id],
    availability = actionAvailability(s, id),
    slots = actionSlots(s, id),
    running = active?.id === id,
    rateMode = isRateMode(s, id),
    duration = actionCompletionDuration(s, id),
    skill = s.actionSkills[id],
    workersUnlocked = actionWorkersUnlocked(s, id)
  const working =
    availability.kind === 'automated' &&
    availability.state === 'active' &&
    actionJobActive(s, id)
  const stop = () => {
    if (!active) return
    const run = () => session.game.cancelAction()
    if (active.progress * actionDuration(s, id) > 10) {
      confirm(
        `Stop ${def.name}?`,
        `Refund ${formatCost(active.paid)}. Action progress will be lost.`,
        run,
      )
    } else session.change(run)
  }
  const statusKind =
    availability.kind === 'locked' ? 'locked' : availability.state
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
      >
        <div className="action-row">
          {availability.kind === 'automated' ? (
            <fieldset className="action-automated" aria-label={def.name}>
              {icon}
              <span className="action-copy">
                <strong className="action-name">{def.name}</strong>
                <span className="action-yield">
                  {def.resource
                    ? `+${formatResource(working ? actionOutputRate(s, id) : 0)} ${def.resource}/s · automation ${Math.round(automationFactor(s, id) * 100)}%`
                    : `${formatResource(working ? 1 / duration : 0)} explores/s`}
                </span>
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
              <span
                className="action-worker-inline"
                data-visible={workersUnlocked}
              >
                <WorkerControls
                  session={session}
                  job={def.job}
                  assignable={!active}
                  showFill={false}
                />
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
                <span className="action-yield">
                  {def.resource ? (
                    `+${formatResource(actionYield(s, id))} ${def.resource} · `
                  ) : (
                    <>
                      <Costs session={session} cost={def.cost} inline /> ·{' '}
                    </>
                  )}
                  {formatResource(duration)}s
                  {slots > 0 ? ` · ${slots} slot${slots === 1 ? '' : 's'}` : ''}
                </span>
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
                  value={running && active ? active.progress : 0}
                  running={running}
                />
                <small>
                  <ActionCountdown
                    session={session}
                    duration={duration}
                    value={running && active ? active.progress : 0}
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
            {availability.kind !== 'locked' &&
              availability.kind !== 'automated' && (
                <div
                  className="action-worker-slot"
                  data-visible={workersUnlocked}
                >
                  <WorkerControls
                    session={session}
                    job={def.job}
                    assignable={!active}
                    showFill={false}
                  />
                </div>
              )}
            <p className="action-description">{def.description}</p>
            <p className="action-skill-rules">
              {LEVEL_EFFECT_LABEL} {def.levelEffect}
            </p>
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
