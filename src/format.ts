import { ACTION_IMMEDIATE_THRESHOLD_MS } from './constants'
import { RESOURCES } from './ids'
import type { ResearchCost } from './types'

const compactResourceFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function roundResource(value: number) {
  // At this magnitude tenths cannot be represented; scaling can overflow.
  if (value >= Number.MAX_SAFE_INTEGER / 10) return value
  return Math.max(0, Math.round((value + Number.EPSILON) * 10) / 10)
}

export function formatResource(value: number) {
  const rounded = roundResource(value)
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function formatCompactResource(value: number) {
  if (value >= 1e15) return value.toExponential(1).replace('e+', 'e')
  return value < 1000
    ? formatResource(value)
    : compactResourceFormatter.format(value)
}

export function formatResearchCost(cost: ResearchCost | null | undefined) {
  if (!cost) return 'Complete'
  return RESOURCES.filter((id) => cost[id])
    .map((id) => `${formatResource(cost[id] ?? 0)} ${id}`)
    .join(' · ')
}

export function formatDuration(durationMs: number) {
  if (durationMs < ACTION_IMMEDIATE_THRESHOLD_MS) return 'now'
  const seconds = durationMs / 1000
  if (seconds < 1)
    return `${seconds.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')} sec`
  return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)} sec`
}
