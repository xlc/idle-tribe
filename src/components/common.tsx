import { type ReactNode, useLayoutEffect, useRef } from 'react'
import { RESOURCE_INFO } from '../constants'
import { formatCost } from '../format'
import { RESOURCES } from '../ids'
import type { GameSession } from '../session'
import type { Cost } from '../types'
export type Confirm = (title: string, body: string, run: () => void) => void
export interface ViewProps {
  session: GameSession
  confirm: Confirm
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
  const updatedAt = session.game.state.savedAt
  const paused = Boolean(session.game.state.absence)
  useLayoutEffect(() => {
    if (bar.current) bar.current.value = value
    if (!running || paused) return
    let frame = 0
    function draw() {
      if (bar.current && !document.hidden) {
        // Interpolate display only; the session owns work, rewards and saves.
        const elapsed = Math.max(0, Date.now() - updatedAt) / 1000
        bar.current.value = Math.min(1, value + elapsed / duration)
      }
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [duration, paused, running, updatedAt, value])
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
export function Button({
  children,
  onClick,
  disabled = false,
  title,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      className="btn"
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  )
}
export function Costs({ session, cost }: { session: GameSession; cost: Cost }) {
  return (
    <p className="costs" title={formatCost(cost)}>
      {RESOURCES.filter((r) => cost[r]).map((r) => (
        <span
          key={r}
          className={
            session.game.state.resources[r] + 1e-9 < (cost[r] ?? 0)
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
