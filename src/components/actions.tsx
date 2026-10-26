import { useEffect, useRef, useState } from 'react'
import {
  actionCompletionDuration,
  actionJobActive,
  actionOutputRate,
  actionRequiredXp,
  actionSlots,
  actionWorkers,
  actionYield,
  automationFactor,
  canRepeatAction,
  isRateMode,
} from '../actions'
import { ACTIONS } from '../definitions'
import { formatCost, formatResource } from '../format'
import { ACTION_IDS, type ActionId } from '../ids'
import { canAfford } from '../resources'
import type { GameSession } from '../session'
import { ResourceArt } from './art'
import { ActionCountdown, ActionProgress, Costs } from './common'
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
  if (level >= 5) return 'Finds: resources · discoveries · rare finds'
  return 'Finds: resources · discoveries · sometimes nothing'
}

function Chevron() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M3 6l5 5 5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ActionCard({
  session,
  id,
}: {
  session: GameSession
  id: ActionId
}) {
  const [expanded, setExpanded] = useState(false)
  const [repeat, setRepeat] = useState(false)
  const s = session.game.state,
    active = s.manual
  const def = ACTIONS[id],
    workers = actionWorkers(s, id),
    slots = actionSlots(s, id),
    running = active?.id === id,
    rateMode = isRateMode(s, id),
    duration = actionCompletionDuration(s, id),
    skill = s.actionSkills[id]
  const working = actionJobActive(s, id)
  const repeating = running && Boolean(active?.repeat)
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
    >
      <div className="action-row">
        {workers > 0 ? (
          <fieldset className="action-automated" aria-label={def.name}>
            {icon}
            <span className="action-copy">
              <strong className="action-name">{def.name}</strong>
              <span className="action-yield">
                {def.resource
                  ? `+${formatResource(actionOutputRate(s, id) * 60)} ${def.resource}/min · automation ${Math.round(automationFactor(s, id) * 100)}%`
                  : `${formatResource(working ? (1 / duration) * 60 : 0)} explores/min`}
              </span>
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
              <WorkerControls session={session} job={def.job} />
            </span>
          </fieldset>
        ) : (
          <button
            type="button"
            className="manual-trigger"
            aria-label={repeating ? `Stop ${def.name.toLowerCase()}` : def.name}
            disabled={
              !repeating && (Boolean(active) || !canAfford(s, def.cost))
            }
            onClick={() =>
              session.change(() =>
                repeating
                  ? session.game.cancelAction()
                  : session.game.startAction(
                      id,
                      repeat && canRepeatAction(s, id),
                    ),
              )
            }
          >
            {icon}
            <span className="action-copy">
              <strong className="action-name">
                {repeating ? `Stop · ${def.name}` : def.name}
              </strong>
              <span className="action-yield">
                {def.resource
                  ? `+${formatResource(actionYield(s, id))} ${def.resource} · `
                  : `${formatCost(def.cost)} · `}
                {formatResource(duration)}s
                {slots > 0 ? ` · ${slots} slot${slots === 1 ? '' : 's'}` : ''}
              </span>
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
        <button
          type="button"
          className="action-toggle"
          aria-expanded={expanded}
          aria-controls={`${id}-details`}
          aria-label={`${def.name} details`}
          onClick={() => setExpanded((value) => !value)}
        >
          <Chevron />
        </button>
      </div>
      {!workers && slots > 0 && (
        <div className="action-unassigned">
          <WorkerControls session={session} job={def.job} />
        </div>
      )}
      {!workers && canRepeatAction(s, id) && (
        <label className="action-repeat">
          <input
            type="checkbox"
            checked={running ? Boolean(active?.repeat) : repeat}
            onChange={(e) => {
              const enabled = e.target.checked
              setRepeat(enabled)
              session.change(() => {
                if (s.manual?.id === id) s.manual.repeat = enabled
              })
            }}
          />
          Repeat
        </label>
      )}
      {expanded && (
        <div className="action-details" id={`${id}-details`}>
          <p className="action-description">{def.description}</p>
          <ActionSkill
            level={skill.level}
            xp={skill.xp}
            requiredXp={actionRequiredXp(s, id)}
          />
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

export function ActionCards({ session }: { session: GameSession }) {
  return (
    <div className="manual-actions">
      {ACTION_IDS.filter((id) => ACTIONS[id].visible(session.game.state)).map(
        (id) => (
          <ActionCard key={id} session={session} id={id} />
        ),
      )}
    </div>
  )
}
