import { useEffect, useRef } from 'react'
import {
  ACTIONS,
  actionCompletionDuration,
  actionOutputRate,
  actionRequiredXp,
  actionSlots,
  actionWorkers,
  actionYield,
  automationFactor,
  isRateMode,
} from '../actions'
import { formatResource } from '../format'
import { ACTION_IDS } from '../ids'
import { canAfford } from '../resources'
import type { GameSession } from '../session'
import { ResourceArt } from './art'
import { ActionProgress, Costs } from './common'
import { WorkerControls } from './settlement'

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

export function ActionCards({ session }: { session: GameSession }) {
  const s = session.game.state,
    active = s.manual
  return (
    <div className="manual-actions">
      {ACTION_IDS.filter((id) => ACTIONS[id].visible(s)).map((id) => {
        const def = ACTIONS[id],
          workers = actionWorkers(s, id),
          slots = actionSlots(s, id),
          running = active?.id === id,
          rateMode = isRateMode(s, id)
        return (
          <div className="manual-action" key={id}>
            {workers > 0 ? (
              <fieldset className="action-automated" aria-label={def.name}>
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
                      ? `+${formatResource(actionOutputRate(s, id) * 60)} ${def.resource}/min · automation ${Math.round(automationFactor(s, id) * 100)}%`
                      : `${formatResource((1 / actionCompletionDuration(s, id)) * 60)} explores/min`}
                  </span>
                  <ActionSkill
                    level={s.actionSkills[id].level}
                    xp={s.actionSkills[id].xp}
                    requiredXp={actionRequiredXp(s, id)}
                  />
                </span>
                <span className="action-automation-controls">
                  {rateMode ? (
                    <span className="rate-chip" role="status">
                      {def.resource
                        ? `${formatResource(actionYield(s, id))} ${def.resource} · continuous`
                        : 'exploring'}
                    </span>
                  ) : (
                    <ActionProgress
                      session={session}
                      duration={actionCompletionDuration(s, id)}
                      label={`${def.name} progress`}
                      value={s.actionProgress[id] % 1}
                      running
                    />
                  )}
                  <WorkerControls session={session} job={def.job} />
                </span>
              </fieldset>
            ) : (
              <button
                type="button"
                className="manual-trigger"
                aria-label={def.name}
                disabled={Boolean(active) || !canAfford(s, def.cost)}
                onClick={() =>
                  session.change(() => session.game.startAction(id))
                }
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
                  <span className="action-description">{def.description}</span>
                  <span className="action-yield">
                    {def.resource
                      ? `+${formatResource(actionYield(s, id))} ${def.resource} · `
                      : ''}
                    {formatResource(actionCompletionDuration(s, id))}s
                    {slots > 0
                      ? ` · ${slots} slot${slots === 1 ? '' : 's'}`
                      : ''}
                  </span>
                  <ActionSkill
                    level={s.actionSkills[id].level}
                    xp={s.actionSkills[id].xp}
                    requiredXp={actionRequiredXp(s, id)}
                  />
                  <span className="action-skill-rules">
                    +2% yield/level · −2% duration/level
                  </span>
                </span>
                <span className="project-progress" data-running={running}>
                  <ActionProgress
                    session={session}
                    duration={actionCompletionDuration(s, id)}
                    label={`${def.name} progress`}
                    value={running && active ? active.progress : 0}
                    running={running}
                  />
                  <small>
                    {formatResource(
                      running && active
                        ? (1 - active.progress) *
                            actionCompletionDuration(s, id)
                        : actionCompletionDuration(s, id),
                    )}
                    s
                  </small>
                </span>
              </button>
            )}
            {!def.resource && <Costs session={session} cost={def.cost} />}
            {id === 'explore' && (
              <p className="action-hint">
                {exploreHint(s.actionSkills.explore.level)}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
