import { type ReactNode, useEffect, useRef, useState } from 'react'
import { formatCompactResource } from '../format'
import { RESOURCES } from '../ids'
import type { Cost, GameState } from '../types'

export function Costs({ cost, state }: { cost: Cost; state: GameState }) {
  return (
    <span className="costs">
      {RESOURCES.filter((id) => cost[id]).map((id) => {
        const required = cost[id] ?? 0
        return (
          <span
            key={id}
            className={state[id] >= required ? 'cost-enough' : 'cost-missing'}
          >
            {formatCompactResource(required)} {id}
          </span>
        )
      })}
    </span>
  )
}

export function Disclosure({
  id,
  summaryId,
  title,
  children,
  initiallyOpen = false,
  collapseWhen = false,
  className = '',
}: {
  id?: string
  summaryId?: string
  title: ReactNode
  children: ReactNode
  initiallyOpen?: boolean
  collapseWhen?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(initiallyOpen)
  const details = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (collapseWhen) {
      if (details.current?.contains(document.activeElement))
        details.current.querySelector('summary')?.focus()
      setOpen(false)
    }
  }, [collapseWhen])
  return (
    <details
      ref={details}
      id={id}
      className={`collapse collapse-arrow rounded-none border-t border-base-300 mb-5 ${className}`}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary
        id={summaryId}
        className="collapse-title pl-0 py-4 text-xs font-semibold"
      >
        {title}
      </summary>
      <div className="collapse-content px-0">{children}</div>
    </details>
  )
}
