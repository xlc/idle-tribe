import { useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import { ACTION_SKILL_CONFIG } from '../constants'
import { formatDuration, formatResearchCost, formatResource } from '../format'
import type { Game } from '../game'
import { isResearchExcluded } from '../research-definitions'
import type { Activity, GameSession } from '../session'
import type { Action } from '../types'
import { Costs } from './common'

function ActionProgress({ activity }: { activity: Activity }) {
  const elapsed = useSyncExternalStore(activity.subscribe, activity.getSnapshot)
  const remaining = Math.max(0, activity.duration - elapsed)
  return (
    <span className="action-progress">
      <progress
        className="progress progress-accent h-1 min-w-0"
        max={100}
        value={Math.min(100, (elapsed / activity.duration) * 100)}
        aria-label={`${activity.action.name} progress`}
      />
      <span>{(Math.ceil(remaining / 100) / 10).toFixed(1)}s</span>
    </span>
  )
}

function describeAction(game: Game, action: Action) {
  const duration = game.getActionDuration(action)
  const active = action.researchId
    ? game.getActiveResearch()
    : game.getActiveAction()
  const working = active === action
  const id = action.researchId
  if (!id) {
    const resource = ACTION_SKILL_CONFIG[action.id].resource
    const cost = action.cost?.()
    const summary = resource
      ? `+${formatResource(game.getNextResourceGain(action.id))} ${resource}`
      : cost
        ? formatResearchCost({ ...cost, durationMs: 0 })
        : ''
    const subtitle = `${summary} · ${formatDuration(duration)}`
    return {
      working,
      duration,
      subtitle,
      level: `Lv ${game.getSkill(action.id).level}`,
      disabled:
        !working &&
        (Boolean(active) || Boolean(action.canStart && !action.canStart())),
      label: `${action.name}. ${subtitle}`,
      complete: false,
      locked: false,
      cost: null,
      requirement: '',
    }
  }
  const definition = game.getResearchDefinition(id)
  const level = game.getResearchLevel(id)
  const next = game.getResearchNextLevel(id)
  const complete = !next
  const ready = definition.prerequisite()
  const excluded = isResearchExcluded(game.state, id)
  const subtitle = game.getResearchEffect(id, complete ? level : level + 1)
  return {
    working,
    duration,
    subtitle,
    complete,
    level: complete
      ? 'Complete'
      : definition.levels.length > 1
        ? `${level}/${definition.levels.length}`
        : '',
    disabled:
      !working &&
      (complete ||
        Boolean(active) ||
        !ready ||
        excluded ||
        !game.canAffordResearch(id)),
    label: `${action.name}. ${excluded ? 'Other path locked' : complete ? 'Complete' : !ready ? `Requires ${definition.requirement}` : next ? formatResearchCost(next) : ''}. ${subtitle}`,
    locked: !ready || excluded,
    cost: next,
    requirement: excluded
      ? 'Other path locked'
      : !ready && !complete
        ? `Requires ${definition.requirement}`
        : definition.specialization?.kind === 'choice' && !complete
          ? 'Choose for this run'
          : '',
  }
}

export interface ActionButtonProps {
  session: GameSession
  action: Action
  onAction: (action: Action) => void
  focusView: () => void
}

export function ActionButton({
  session,
  action,
  onAction,
  focusView,
}: ActionButtonProps) {
  const { game } = session
  const view = describeAction(game, action)
  const activity = session.activities.get(action)
  const button = useRef<HTMLButtonElement>(null)
  const focused = useRef(false)
  useLayoutEffect(() => {
    const control = button.current
    if (
      (control === document.activeElement ||
        (focused.current && document.activeElement === document.body)) &&
      (view.disabled || control?.closest('details:not([open])'))
    ) {
      focused.current = false
      focusView()
    }
  })
  useLayoutEffect(() => {
    const control = button.current
    return () => {
      if (control === document.activeElement) focusView()
    }
  }, [focusView])
  return (
    <button
      ref={button}
      type="button"
      id={`${action.id}-button`}
      className={`btn btn-soft btn-primary block h-auto w-full min-w-0 rounded-box p-4 text-left text-xs font-normal disabled:text-base-content/65 aria-disabled:text-base-content/65 ${action.researchId ? 'tech-card' : 'mb-2'}`}
      disabled={view.disabled}
      aria-disabled={view.working || view.disabled}
      aria-busy={view.working}
      aria-label={view.label}
      data-locked={view.locked}
      data-complete={view.complete}
      onFocus={() => {
        focused.current = true
      }}
      onBlur={(event) => {
        // Disabling a focused button blurs it before layout effects run.
        if (!event.currentTarget.disabled) focused.current = false
      }}
      onClick={() => {
        if (!view.working) onAction(action)
      }}
    >
      <span className="flex items-baseline justify-between gap-2.5 text-sm font-semibold">
        <span>{action.name}</span>
        <span className="level-label">{view.level}</span>
      </span>
      <span className="action-status">
        <span className="action-subtitle">{view.subtitle}</span>
        {activity && <ActionProgress activity={activity} />}
      </span>
      {action.researchId && (
        <>
          {!view.complete && (
            <span className="tech-effect">{formatDuration(view.duration)}</span>
          )}
          {view.cost && <Costs state={game.state} cost={view.cost} />}
          {view.requirement && (
            <span className="requirement">{view.requirement}</span>
          )}
        </>
      )}
    </button>
  )
}
