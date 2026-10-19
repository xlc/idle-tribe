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
    if (!state.skills[actionId]) state.skills[actionId] = { level: 1, xp: 0 }
    return state.skills[actionId]
  }

  function getActionXpGain(actionId: ActionId) {
    if (actionId === 'gather')
      return ACTION_XP_PER_COMPLETION + getResearchLevel('foraging-practice')
    return ACTION_XP_PER_COMPLETION
  }

  function getFruitResearchBonus() {
    const level = getResearchLevel('sharpened-stick')
    return level > 0 ? 1 + 0.5 * (level - 1) : 0
  }

  function getStoneResearchBonus() {
    return (
      getResearchLevel('stone-flakes') * 0.1 +
      getResearchLevel('quarrying') * 0.5
    )
  }

  function getRequiredXp(actionId: ActionId, level = getSkill(actionId).level) {
    const baseXp = ACTION_SKILL_CONFIG[actionId]?.baseXp ?? 4
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
    const resourceAction = ['gather', 'sticks', 'stone'].includes(actionId)
    if (!resourceAction) return 0
    return Math.floor(level / ACTION_YIELD_MILESTONE) * 0.1
  }

  function getResourceGain(
    actionId: ActionId,
    level = getSkill(actionId).level,
  ) {
    if (actionId === 'gather')
      return (
        1 + getFruitResearchBonus() + getResourceMilestoneBonus(actionId, level)
      )
    if (actionId === 'sticks')
      return (
        1 +
        getResearchLevel('stone-axes') * 0.5 +
        getResourceMilestoneBonus(actionId, level)
      )
    if (actionId === 'stone')
      return (
        1 + getStoneResearchBonus() + getResourceMilestoneBonus(actionId, level)
      )
    return 0
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
    getActionXpGain,
    getFruitResearchBonus,
    getStoneResearchBonus,
    getRequiredXp,
    getActionDuration,
    getResourceMilestoneBonus,
    getResourceGain,
    getNextResourceGain,
    awardActionExperience,
  }
}
