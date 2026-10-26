import { Button as RadixButton } from '@radix-ui/themes'
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  useLayoutEffect,
  useRef,
} from 'react'
import { EPSILON, RESOURCE_INFO } from '../constants'
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
  const bar = useRef<HTMLProgressElement>(null)
  useLayoutEffect(() => {
    if (bar.current) bar.current.value = value
  }, [value])
  useInterpolated(session, running, (elapsed) => {
    if (bar.current) bar.current.value = Math.min(1, value + elapsed / duration)
  })
  return (
    <progress
      ref={bar}
      className="progress"
      aria-label={label}
      value={value}
      max={1}
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
export function Costs({ session, cost }: { session: GameSession; cost: Cost }) {
  return (
    <p className="costs">
      {RESOURCES.filter((r) => cost[r]).map((r) => (
        <span
          key={r}
          className={
            session.game.state.resources[r] + EPSILON < (cost[r] ?? 0)
              ? 'cost-missing'
              : 'cost-enough'
          }
        >
          {cost[r]} {RESOURCE_INFO[r].name.toLowerCase()}
        </span>
      ))}
    </p>
  )
}
