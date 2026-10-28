import { RESEARCH } from './definitions'
import type { ActionId, JobId, ResourceId } from './ids'
import type { Effects, GameState } from './types'

type NumericMap<K extends string> = Partial<Record<K, number>>

function addMap<K extends string>(
  base: NumericMap<K> | undefined,
  upgrade: NumericMap<K> | undefined,
  levels: number,
) {
  const result: NumericMap<K> = { ...base }
  if (upgrade)
    for (const key of Object.keys(upgrade) as K[])
      result[key] = (result[key] ?? 0) + (upgrade[key] ?? 0) * levels
  return result
}

function multiplyMap<K extends string>(
  base: NumericMap<K> | undefined,
  upgrade: NumericMap<K> | undefined,
  levels: number,
) {
  const result: NumericMap<K> = { ...base }
  if (upgrade)
    for (const key of Object.keys(upgrade) as K[])
      result[key] = (result[key] ?? 1) * (upgrade[key] ?? 1) ** levels
  return result
}

export function researchLevel(
  state: GameState,
  id: import('./ids').ResearchId,
) {
  return state.research[id]
}

export function hasResearch(state: GameState, id: import('./ids').ResearchId) {
  return researchLevel(state, id) > 0
}

export function researchEffects(
  state: GameState,
  id: import('./ids').ResearchId,
): Effects {
  const level = researchLevel(state, id)
  if (!level) return {}
  const base = RESEARCH[id].effects
  const upgrade = RESEARCH[id].upgrade
  const extraLevels = upgrade ? Math.min(level, upgrade.maxLevel) - 1 : 0
  if (extraLevels <= 0 || !upgrade) return { ...base }
  const extra = upgrade.effects
  const result: Effects = { ...base }
  if (base.jobBonus || extra.jobBonus)
    result.jobBonus = addMap<JobId>(base.jobBonus, extra.jobBonus, extraLevels)
  if (base.specialization || extra.specialization)
    result.specialization = multiplyMap<JobId>(
      base.specialization,
      extra.specialization,
      extraLevels,
    )
  if (base.recipeMultiplier || extra.recipeMultiplier)
    result.recipeMultiplier = multiplyMap<JobId>(
      base.recipeMultiplier,
      extra.recipeMultiplier,
      extraLevels,
    )
  if (base.actionAutomation || extra.actionAutomation)
    result.actionAutomation = addMap<ActionId>(
      base.actionAutomation,
      extra.actionAutomation,
      extraLevels,
    )
  if (base.actionXp || extra.actionXp)
    result.actionXp = addMap<ActionId>(
      base.actionXp,
      extra.actionXp,
      extraLevels,
    )
  if (base.actionYield || extra.actionYield)
    result.actionYield = addMap<ActionId>(
      base.actionYield,
      extra.actionYield,
      extraLevels,
    )
  if (base.storage !== undefined || extra.storage !== undefined)
    result.storage = (base.storage ?? 1) * (extra.storage ?? 1) ** extraLevels
  if (base.resourceStorage || extra.resourceStorage)
    result.resourceStorage = multiplyMap<ResourceId>(
      base.resourceStorage,
      extra.resourceStorage,
      extraLevels,
    )
  if (base.housing !== undefined || extra.housing !== undefined)
    result.housing = (base.housing ?? 1) * (extra.housing ?? 1) ** extraLevels
  if (base.crew !== undefined || extra.crew !== undefined)
    result.crew = (base.crew ?? 0) + (extra.crew ?? 0) * extraLevels
  if (base.offlineHours !== undefined || extra.offlineHours !== undefined)
    result.offlineHours =
      (base.offlineHours ?? 0) + (extra.offlineHours ?? 0) * extraLevels
  return result
}
