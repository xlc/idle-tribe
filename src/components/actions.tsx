import { useEffect, useRef, useState } from 'react'
import {
  actionAvailability,
  actionCompletionDuration,
  actionJobActive,
  actionOutputRate,
  actionRequiredXp,
  actionSlots,
  actionWorkersUnlocked,
  actionYield,
  automationFactor,
  isRateMode,
} from '../actions'
import { ACTIONS } from '../definitions'
import { formatCost, formatResource } from '../format'
import { ACTION_IDS, type ActionId } from '../ids'
import type { GameSession } from '../session'
import { ResourceArt } from './art'
import {
  ActionCountdown,
  ActionProgress,
  Button,
  Costs,
  DisclosureToggle,
} from './common'
import { WorkerControls } from './worker-controls'

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

export function ActionCard({
  session,
  id,
}: {
  session: GameSession
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
    <article
      className="manual-action panel"
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
              {rateMode && <span className="action-live-rate">Live rate</span>}
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
          <>
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
                  {def.resource
                    ? `+${formatResource(actionYield(s, id))} ${def.resource} · `
                    : `${formatCost(def.cost)} · `}
                  {formatResource(duration)}s
                  {slots > 0 ? ` · ${slots} slot${slots === 1 ? '' : 's'}` : ''}
                </span>
                <ActionSkill
                  level={skill.level}
                  xp={skill.xp}
                  requiredXp={actionRequiredXp(s, id)}
                />
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
            {running && (
              <Button
                className="action-stop-inline"
                color="amber"
                aria-label={`Stop ${def.name}`}
                title={`Stop ${def.name}`}
                onClick={() =>
                  session.change(() => session.game.cancelAction())
                }
              >
                Stop
              </Button>
            )}
          </>
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
          <p className="action-skill-rules">{def.levelEffect}</p>
          {!def.resource && <Costs session={session} cost={def.cost} />}
          {def.kind === 'exploration' && (
            <p className="action-hint">{exploreHint(skill.level)}</p>
          )}
        </div>
      )}
    </article>
  )
}

export function ActionCards({
  session,
  ids = ACTION_IDS,
}: {
  session: GameSession
  ids?: readonly ActionId[]
}) {
  const state = session.game.state
  return (
    <div className="manual-actions">
      {ids
        .filter((id) => actionAvailability(state, id).kind !== 'locked')
        .map((id) => (
          <ActionCard key={id} session={session} id={id} />
        ))}
    </div>
  )
}
