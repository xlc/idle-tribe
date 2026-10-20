import { useEffect, useRef } from 'react'
import {
  ACTIONS,
  actionDuration,
  actionRequiredXp,
  actionYield,
} from '../actions'
import { formatDuration, formatResource } from '../format'
import { ACTION_IDS } from '../ids'
import { canAfford } from '../resources'
import type { GameSession } from '../session'
import { ResourceArt } from './art'
import { ActionProgress, Costs } from './common'

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
    <span
      className="action-skill"
      title="Each completion earns 1 XP. Each level adds 3% speed; every fifth level adds 0.1 yield."
    >
      <span className="action-level" ref={label}>
        Level {level}
      </span>
      <span>·</span>
      <span>
        {xp}/{requiredXp} XP
      </span>
    </span>
  )
}

export function ManualActions({
  session,
  discoveries = false,
}: {
  session: GameSession
  discoveries?: boolean
}) {
  const s = session.game.state,
    active = s.manual
  return (
    <div className="manual-actions">
      {ACTION_IDS.filter(
        (id) =>
          ACTIONS[id].visible(s) &&
          Boolean(ACTIONS[id].discovery) === discoveries,
      ).map((id) => {
        const def = ACTIONS[id],
          running = active?.id === id,
          duration = actionDuration(s, id)
        return (
          <div className="manual-action" key={id}>
            <button
              type="button"
              className="manual-trigger"
              aria-label={def.name}
              title={def.description}
              disabled={Boolean(active) || !canAfford(s, def.cost)}
              onClick={() => session.change(() => session.game.startAction(id))}
            >
              <span
                className="action-icon"
                data-resource={def.resource}
                aria-hidden="true"
              >
                {def.resource ? <ResourceArt resource={def.resource} /> : '↗'}
              </span>
              <span className="action-copy">
                <strong className="action-name">{def.name}</strong>
                <span className="action-yield">
                  {def.resource
                    ? `+${formatResource(actionYield(s, id))} ${def.resource} · `
                    : ''}
                  {duration < 10
                    ? `${Number(duration.toFixed(2))}s`
                    : formatDuration(duration)}
                </span>
                {def.resource && (
                  <ActionSkill
                    level={s.actionSkills[id].level}
                    xp={s.actionSkills[id].xp}
                    requiredXp={actionRequiredXp(s, id)}
                  />
                )}
              </span>
              <span className="project-progress" data-running={running}>
                <ActionProgress
                  session={session}
                  duration={duration}
                  label={`${def.name} progress`}
                  value={running ? active.progress : 0}
                  running={running}
                />
                <small>
                  {formatDuration(
                    running ? (1 - active.progress) * duration : duration,
                  )}
                </small>
              </span>
            </button>
            {discoveries && <Costs session={session} cost={def.cost} />}
          </div>
        )
      })}
    </div>
  )
}
