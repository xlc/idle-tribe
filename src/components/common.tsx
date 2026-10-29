import {
  Button as RadixButton,
  Progress as RadixProgress,
} from '@radix-ui/themes'
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  useLayoutEffect,
  useRef,
} from 'react'
import { EPSILON } from '../constants'
import { RESOURCE_INFO } from '../definitions'
import { formatResource } from '../format'
import { RESOURCES } from '../ids'
import type { GameSession } from '../session'
import type { Cost } from '../types'
export type Confirm = (
  title: string,
  body: string,
  run: () => void,
  options?: { direct?: boolean },
) => void
export interface ViewProps {
  session: GameSession
  confirm: Confirm
}
// Drives a per-frame draw callback from wall-clock time since the last save.
// Interpolate display only; the session owns work, rewards and saves.
function useInterpolated(
  session: GameSession,
  running: boolean,
  draw: (elapsedSeconds: number) => void,
) {
  const updatedAt = session.game.state.savedAt
  const paused = Boolean(session.game.state.absence)
  const drawRef = useRef(draw)
  drawRef.current = draw
  useLayoutEffect(() => {
    if (!running || paused) return
    let frame = 0
    function tick() {
      if (!document.hidden)
        drawRef.current(Math.max(0, Date.now() - updatedAt) / 1000)
      frame = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(frame)
  }, [paused, running, updatedAt])
}
export function ActionProgress({
  session,
  duration,
  label,
  value,
  running,
}: {
  session: GameSession
  duration: number
  label: string
  value: number
  running: boolean
}) {
  const bar = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    bar.current?.style.setProperty('--progress-value', `${value * 100}`)
  }, [value])
  useInterpolated(session, running, (elapsed) => {
    bar.current?.style.setProperty(
      '--progress-value',
      `${Math.min(1, value + elapsed / duration) * 100}`,
    )
  })
  return (
    <RadixProgress
      ref={bar}
      aria-label={label}
      value={value * 100}
      max={100}
      size="1"
      color="grass"
    />
  )
}

export function ProgressBar({
  value,
  max,
  label,
  ...rest
}: {
  value: number
  max: number
  label: string
} & Omit<ComponentPropsWithoutRef<typeof RadixProgress>, 'value' | 'max'>) {
  return (
    <RadixProgress
      {...rest}
      aria-label={label}
      value={max > 0 ? (value / max) * 100 : 0}
      max={100}
      size="1"
      color="grass"
    />
  )
}
export function ActionCountdown({
  session,
  duration,
  value,
  running,
}: {
  session: GameSession
  duration: number
  value: number
  running: boolean
}) {
  const label = useRef<HTMLElement>(null)
  const remaining = Math.max(0, (1 - value) * duration)
  const shown = useRef('')
  useInterpolated(session, running, (elapsed) => {
    if (!label.current) return
    const text = `${Math.max(0, remaining - elapsed).toFixed(1)}s`
    if (text === shown.current) return
    shown.current = text
    label.current.textContent = text
  })
  return <span ref={label}>{(running ? remaining : duration).toFixed(1)}s</span>
}
export function Button({
  children,
  onClick,
  disabled = false,
  variant = 'soft',
  color = 'gray',
  ...rest
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: ComponentPropsWithoutRef<typeof RadixButton>['variant']
  color?: ComponentPropsWithoutRef<typeof RadixButton>['color']
} & Omit<
  ComponentPropsWithoutRef<'button'>,
  'children' | 'onClick' | 'disabled'
>) {
  return (
    <RadixButton
      type="button"
      variant={variant}
      color={color}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {children}
    </RadixButton>
  )
}
export function DisclosureToggle({
  expanded,
  controls,
  label,
  onToggle,
}: {
  expanded: boolean
  controls: string
  label: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className="action-toggle"
      aria-expanded={expanded}
      aria-controls={controls}
      aria-label={label}
      onClick={onToggle}
    >
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
    </button>
  )
}
export function Costs({
  session,
  cost,
  inline = false,
}: {
  session: GameSession
  cost: Cost
  inline?: boolean
}) {
  const Tag = inline ? 'span' : 'p'
  return (
    <Tag className={`costs${inline ? ' costs-inline' : ''}`}>
      {RESOURCES.filter((r) => cost[r]).map((r) => (
        <span
          key={r}
          className={
            session.game.state.resources[r] + EPSILON < (cost[r] ?? 0)
              ? 'cost-missing'
              : 'cost-enough'
          }
        >
          {formatResource(session.game.state.resources[r])}/
          {formatResource(cost[r] ?? 0)} {RESOURCE_INFO[r].name.toLowerCase()}
        </span>
      ))}
    </Tag>
  )
}
