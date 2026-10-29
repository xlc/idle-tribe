import {
  MIN_VISIBLE_RESOURCE_CHANGE,
  RESOURCE_DISPLAY_DECIMALS,
} from './constants'
import { RESOURCE_INFO } from './definitions'
import { RESOURCES } from './ids'
import type { Cost, ExploreOutcome } from './types'

const resourceFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: RESOURCE_DISPLAY_DECIMALS,
})
const smallResourceFormatter = new Intl.NumberFormat('en-US', {
  maximumSignificantDigits: 2,
})

export function formatResource(value: number) {
  return Math.abs(value) < MIN_VISIBLE_RESOURCE_CHANGE && value !== 0
    ? smallResourceFormatter.format(value)
    : resourceFormatter.format(value)
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
export function formatResourceGain(cost: Cost) {
  return RESOURCES.filter((r) => (cost[r] ?? 0) > 0)
    .map(
      (r) =>
        `+${formatResource(cost[r] ?? 0)} ${RESOURCE_INFO[r].name.toLowerCase()}`,
    )
    .join(' · ')
}
export function formatExploreOutcome(outcome: ExploreOutcome) {
  if (outcome.kind === 'nothing') return 'Nothing found this time'
  if (outcome.kind === 'resources')
    return formatResourceGain(outcome.amount) || 'No material find'
  if (outcome.kind === 'discovery') return `Discovered ${outcome.discovery}`
  if (outcome.kind === 'knowledge')
    return `+${formatResource(outcome.amount)} knowledge`
  if (outcome.kind === 'experience')
    return `+${formatResource(outcome.amount)} exploration XP`
  if (outcome.kind === 'encounter') return 'Expedition report ready'
  if (outcome.kind === 'arrival-progress')
    return outcome.amount > 0
      ? `Arrival progress +${formatResource(outcome.amount * 100)}%`
      : 'No arrival progress gained'
  return outcome.amount > 0
    ? `+${formatResource(outcome.amount)} happiness`
    : 'No happiness gained'
}
export function formatExploreNotice(outcome: ExploreOutcome) {
  const detail = formatExploreOutcome(outcome)
  if (outcome.kind === 'nothing') return 'Explorers found nothing this time'
  if (outcome.kind === 'resources') return `Explorers returned with ${detail}`
  if (outcome.kind === 'discovery') return `Discovered ${outcome.discovery}`
  if (outcome.kind === 'knowledge') return `Explorers brought back ${detail}`
  if (outcome.kind === 'experience')
    return `Explorers found a promising vantage point · ${detail}`
  if (outcome.kind === 'encounter') return 'Expedition report ready'
  if (outcome.kind === 'arrival-progress')
    return `Explorers met travelers · ${detail.toLowerCase()}`
  return `Explorers returned with good stories · ${detail}`
}
export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return 'Paused'
  if (seconds < 60) return `${Math.ceil(seconds)}s`
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}
