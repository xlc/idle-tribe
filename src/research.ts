import { RESEARCH_ITEM_KEYS } from './ids'
import { isResearchAvailable, RESEARCH_CONFIG } from './research-definitions'
import type { createResources } from './resources'
import type { Action, GameState, ResearchCost, ResearchId } from './types'

export function createResearch(
  state: GameState,
  canAfford: ReturnType<typeof createResources>['canAfford'],
  saveProgress: () => void,
) {
  function getResearchLevel(researchId: ResearchId) {
    return Math.max(0, Math.floor(state.researchLevels[researchId]))
  }

  function getResearchDefinition(researchId: ResearchId) {
    const definition = RESEARCH_CONFIG[researchId]
    return {
      ...definition,
      prerequisite: () => isResearchAvailable(state, researchId),
    }
  }

  function getResearchNextLevel(researchId: ResearchId): ResearchCost | null {
    const definition = getResearchDefinition(researchId)
    const level = getResearchLevel(researchId)
    return level < definition.levels.length
      ? (definition.levels[level] ?? null)
      : null
  }

  function getUnreadResearch() {
    if (!state.researchUnlocked) return []
    return RESEARCH_ITEM_KEYS.filter(
      (id) =>
        getResearchDefinition(id).prerequisite() &&
        getResearchNextLevel(id) &&
        state.seenResearchLevels[id] < getResearchLevel(id) + 1,
    )
  }

  function markResearchSeen() {
    const unread = getUnreadResearch()
    if (!unread.length) return
    for (const id of unread) {
      state.seenResearchLevels[id] = getResearchLevel(id) + 1
    }
    saveProgress()
  }

  function getResearchEffect(researchId: ResearchId, level: number) {
    return RESEARCH_CONFIG[researchId].effect(level)
  }

  function canAffordResearch(researchId: ResearchId) {
    const next = getResearchNextLevel(researchId)
    return Boolean(next && canAfford(next))
  }

  function completeResearch(researchId: ResearchId) {
    const definition = getResearchDefinition(researchId)
    const nextLevel = getResearchLevel(researchId) + 1
    state.researchLevels[researchId] = Math.min(
      definition.levels.length,
      nextLevel,
    )
    state.seenResearchLevels[researchId] = Math.max(
      state.seenResearchLevels[researchId],
      nextLevel,
    )
    state.basicTools = getResearchLevel('sharpened-stick') >= 1
    if (definition.specialization?.kind === 'choice')
      state.specialization = definition.specialization.id
    if (nextLevel === 1) definition.onFirstCompletion?.(state)
    const effect = getResearchEffect(researchId, nextLevel)
    return `${definition.name} reached level ${nextLevel}. ${effect} applied.`
  }

  function createResearchAction(researchId: ResearchId): Action {
    const definition = getResearchDefinition(researchId)
    return {
      id: definition.actionId,
      name: definition.name,
      researchId,
      baseDurationMs: () => getResearchNextLevel(researchId)?.durationMs ?? 1,
      canStart: () =>
        Boolean(
          definition.prerequisite() &&
            getResearchNextLevel(researchId) &&
            canAffordResearch(researchId),
        ),
      cost: () => getResearchNextLevel(researchId),
      complete: () => completeResearch(researchId),
    }
  }

  return {
    getResearchLevel,
    getResearchDefinition,
    getResearchNextLevel,
    getUnreadResearch,
    markResearchSeen,
    getResearchEffect,
    canAffordResearch,
    createResearchAction,
  }
}
