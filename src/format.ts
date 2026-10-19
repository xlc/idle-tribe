import { RESOURCE_INFO } from './constants'
import { RESOURCES } from './ids'
import type { Cost } from './types'
export function formatResource(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(
    value,
  )
}
export function formatCompactResource(value: number) {
  return Math.abs(value) < 10000
    ? formatResource(value)
    : new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 2,
      }).format(value)
}
export function formatCost(cost: Cost) {
  return (
    RESOURCES.filter((r) => cost[r])
      .map(
        (r) =>
          `${formatResource(cost[r] ?? 0)} ${RESOURCE_INFO[r].name.toLowerCase()}`,
      )
      .join(' · ') || 'No materials'
  )
}
export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return 'Paused'
  if (seconds < 60) return `${Math.ceil(seconds)}s`
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}
