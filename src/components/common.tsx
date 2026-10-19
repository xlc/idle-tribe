import type { ReactNode } from 'react'
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
      className="btn btn-sm"
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
