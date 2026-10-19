import { ACTION_IMMEDIATE_THRESHOLD_MS } from './constants'
import type { ResearchCost } from './types'

export function roundResource(value: number) {
  return Math.max(0, Math.round((value + Number.EPSILON) * 10) / 10)
}

export function formatResource(value: number) {
  const rounded = roundResource(value)
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function formatResearchCost(cost: ResearchCost | null | undefined) {
  if (!cost) return 'Complete'
  return [
    cost.wood ? `${formatResource(cost.wood)} wood` : '',
    cost.stone ? `${formatResource(cost.stone)} stone` : '',
    cost.fruit ? `${formatResource(cost.fruit)} fruit` : '',
  ]
    .filter(Boolean)
    .join(' + ')
}

export function formatDuration(durationMs: number) {
  if (durationMs < ACTION_IMMEDIATE_THRESHOLD_MS) return 'now'
  const seconds = durationMs / 1000
  if (seconds < 1)
    return `${seconds.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')} sec`
  return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)} sec`
}
