import { EPSILON } from './constants'
import { BUILDINGS, RESEARCH, RESOURCE_INFO } from './definitions'
import { BUILDING_IDS, RESEARCH_IDS, RESOURCES } from './ids'
import type { Cost, GameState, ResourceId } from './types'
export function cumulative(level: number) {
  return (
    level +
    0.25 * level * (level - 1) +
    (0.0625 / 6) * level * (level - 1) * (2 * level - 1)
  )
}
export function marginal(level: number) {
  return (1 + 0.25 * level) ** 2
}
export function capital(cost: Cost, level: number): Cost {
  return Object.fromEntries(
    RESOURCES.filter((r) => cost[r]).map((r) => [
      r,
      Math.ceil((cost[r] ?? 0) * cumulative(level)),
    ]),
  )
}
export function difference(a: Cost, b: Cost): Cost {
  return Object.fromEntries(
    RESOURCES.map((r) => [r, Math.max(0, (a[r] ?? 0) - (b[r] ?? 0))]),
  )
}
export function canAfford(state: GameState, cost: Cost) {
  return RESOURCES.every((r) => state.resources[r] + EPSILON >= (cost[r] ?? 0))
}
export function pay(state: GameState, cost: Cost) {
  for (const r of RESOURCES)
    state.resources[r] = Math.max(0, state.resources[r] - (cost[r] ?? 0))
}
export function refund(state: GameState, cost: Cost) {
  for (const r of RESOURCES) state.resources[r] += cost[r] ?? 0
}
export function committed(state: GameState, r: ResourceId) {
  return (
    (state.queues.research.active?.paid[r] ?? 0) +
    (state.queues.construction.active?.paid[r] ?? 0) +
    (state.manual?.paid[r] ?? 0)
  )
}
export function threshold(state: GameState, r: ResourceId) {
  let total = RESOURCE_INFO[r].threshold
  for (const id of BUILDING_IDS) {
    const f = state.facilities[id]
    total +=
      (BUILDINGS[id].forms[f.form]?.storage?.[r] ?? 0) * cumulative(f.level)
  }
  for (const id of RESEARCH_IDS)
    if (state.research[id])
      total *=
        (RESEARCH[id].effects.storage ?? 1) *
        (RESEARCH[id].effects.resourceStorage?.[r] ?? 1)
  return Math.floor(total * (state.legacy.perks['organized-records'] ? 1.1 : 1))
}
export function storageMultiplier(
  state: GameState,
  r: ResourceId,
  stock = state.resources[r],
  comfort = threshold(state, r),
) {
  return 1 / Math.sqrt(Math.max(1, (stock + committed(state, r)) / comfort))
}
