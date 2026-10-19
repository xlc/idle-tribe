import {
  ACTION_SKILL_CONFIG,
  ACTION_XP_GROWTH,
  ACTION_XP_PER_COMPLETION,
  ACTION_XP_SPEED_REDUCTION,
  ACTION_YIELD_MILESTONE,
} from './constants'
import type { createResearch } from './research'
import type { Action, ActionId, GameState } from './types'

export function createSkills(
  state: GameState,
  getResearchLevel: ReturnType<typeof createResearch>['getResearchLevel'],
) {
  function getSkill(actionId: ActionId) {
    return state.skills[actionId]
  }

  function getActionXpGain(actionId: ActionId) {
    const { xpResearch } = ACTION_SKILL_CONFIG[actionId]
    return (
      ACTION_XP_PER_COMPLETION + (xpResearch ? getResearchLevel(xpResearch) : 0)
    )
  }

  function getRequiredXp(actionId: ActionId, level = getSkill(actionId).level) {
    const baseXp = ACTION_SKILL_CONFIG[actionId].baseXp
    return Math.max(1, Math.ceil(baseXp * ACTION_XP_GROWTH ** (level - 1)))
  }

  function getActionDuration(action: Action) {
    const skill = getSkill(action.id)
    const baseDurationMs =
      typeof action.baseDurationMs === 'function'
        ? action.baseDurationMs()
        : action.baseDurationMs
    const reduction = (skill.level - 1) * ACTION_XP_SPEED_REDUCTION
    return Math.max(500, Math.round(baseDurationMs * (1 - reduction)))
  }

  function getResourceMilestoneBonus(
    actionId: ActionId,
    level = getSkill(actionId).level,
  ) {
    const resourceAction = ACTION_SKILL_CONFIG[actionId].resource
    if (!resourceAction) return 0
    return Math.floor(level / ACTION_YIELD_MILESTONE) * 0.1
  }

  function getResourceGain(
    actionId: ActionId,
    level = getSkill(actionId).level,
  ) {
    const definition = ACTION_SKILL_CONFIG[actionId]
    if (!definition.resource) return 0
    return (
      1 +
      (definition.researchBonus?.(state) ?? 0) +
      getResourceMilestoneBonus(actionId, level)
    )
  }

  function getNextResourceGain(actionId: ActionId) {
    return getResourceGain(actionId, getSkillAfterCompletion(actionId).level)
  }

  function getSkillAfterCompletion(actionId: ActionId) {
    const skill = { ...getSkill(actionId) }
    skill.xp += getActionXpGain(actionId)
    while (skill.xp >= getRequiredXp(actionId, skill.level)) {
      skill.xp -= getRequiredXp(actionId, skill.level)
      skill.level += 1
    }
    return skill
  }

  function awardActionExperience(actionId: ActionId) {
    const skill = getSkill(actionId)
    const next = getSkillAfterCompletion(actionId)
    const levelsGained = next.level - skill.level
    Object.assign(skill, next)
    return levelsGained
  }

  return {
    getSkill,
    getActionDuration,
    getResourceGain,
    getNextResourceGain,
    awardActionExperience,
  }
}
