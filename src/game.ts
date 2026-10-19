import {
  ACTION_IMMEDIATE_THRESHOLD_MS,
  ACTION_SKILL_CONFIG,
  ACTION_XP_GROWTH,
  ACTION_XP_PER_COMPLETION,
  ACTION_XP_SPEED_REDUCTION,
  ACTION_YIELD_MILESTONE,
  EXPLORE_COST,
  EXPLORE_DURATION_MS,
  EXPLORE_FURTHER_COST,
  EXPLORE_FURTHER_DURATION_MS,
  EXPLORE_UNLOCK_FRUIT,
  FOOD_TICK_MS,
  GATHER_DURATION_MS,
  GATHER_STONE_DURATION_MS,
  GATHER_WOOD_DURATION_MS,
  RESEARCH_ITEM_KEYS,
  RESEARCH_UNLOCK_WOOD,
} from './constants'
import {
  formatDuration,
  formatResearchCost,
  formatResource,
  roundResource,
} from './format'
import type {
  Action,
  ActionId,
  ActionKey,
  GameState,
  Person,
  ResearchDefinition,
  ResearchId,
} from './types'

export function createGame(
  state: GameState,
  saveState: (snapshot: GameState) => void = () => {},
) {
  let activeAction: Action | null = null
  let activeResearch: Action | null = null

  function saveProgress() {
    const snapshot = { ...state }
    // In-flight work is cancelled on reload. Save its reserved materials so
    // interruption cannot spend resources without delivering the result.
    for (const action of [activeAction, activeResearch]) {
      const cost = action?.cost?.()
      for (const resource of ['fruit', 'wood', 'stone'] as const) {
        snapshot[resource] = roundResource(
          snapshot[resource] + (cost?.[resource] ?? 0),
        )
      }
    }
    saveState(snapshot)
  }

  function getActiveAction() {
    return activeAction
  }

  function getActiveResearch() {
    return activeResearch
  }

  const RESEARCH_CONFIG: Record<ResearchId, ResearchDefinition> = {
    'sharpened-stick': {
      actionId: 'research',
      name: 'Sharpened stick',
      maxLevel: 3,
      prerequisite: () => state.researchUnlocked,
      levels: [
        { wood: 2, fruit: 10, durationMs: 5000 },
        { wood: 4, fruit: 20, durationMs: 7000 },
        { wood: 7, fruit: 35, durationMs: 10000 },
      ],
    },
    'foraging-practice': {
      actionId: 'research-foraging',
      name: 'Woven baskets',
      maxLevel: 3,
      prerequisite: () => getResearchLevel('sharpened-stick') >= 1,
      levels: [
        { wood: 2, fruit: 20, durationMs: 8000 },
        { wood: 5, fruit: 45, durationMs: 15000 },
        { wood: 9, fruit: 90, durationMs: 30000 },
      ],
    },
    'stone-flakes': {
      actionId: 'research-stone-flakes',
      name: 'Flint knapping',
      maxLevel: 3,
      prerequisite: () => state.stoneFound,
      levels: [
        { wood: 2, stone: 3, fruit: 10, durationMs: 10000 },
        { wood: 5, stone: 10, fruit: 25, durationMs: 18000 },
        { wood: 10, stone: 25, fruit: 50, durationMs: 30000 },
      ],
    },
  }
  function getSkill(actionId: ActionId) {
    if (!state.skills[actionId]) state.skills[actionId] = { level: 1, xp: 0 }
    return state.skills[actionId]
  }

  function getResearchLevel(researchId: ResearchId) {
    return Math.max(0, Math.floor(state.researchLevels?.[researchId] ?? 0))
  }

  function getResearchDefinition(researchId: ResearchId) {
    return RESEARCH_CONFIG[researchId]
  }

  function getResearchNextLevel(researchId: ResearchId) {
    const definition = getResearchDefinition(researchId)
    const level = getResearchLevel(researchId)
    return definition && level < definition.maxLevel
      ? definition.levels[level]
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
    if (researchId === 'sharpened-stick') {
      return level > 0
        ? `+${formatResource(1 + 0.5 * (level - 1))} fruit`
        : '+0 fruit'
    }
    if (researchId === 'foraging-practice') return `+${level} fruit XP`
    if (researchId === 'stone-flakes')
      return `+${formatResource(level * 0.1)} stone`
    return ''
  }

  function getResearchSubtitle(researchId: ResearchId) {
    const definition = getResearchDefinition(researchId)
    const level = getResearchLevel(researchId)
    const next = getResearchNextLevel(researchId)
    if (!definition || !next)
      return `${getResearchEffect(researchId, level)} · Max level`
    return `${formatResearchCost(next)} · ${formatDuration(next.durationMs)} · ${getResearchEffect(researchId, level)} → ${getResearchEffect(researchId, level + 1)}`
  }

  function getResearchCostLabel(researchId: ResearchId) {
    const next = getResearchNextLevel(researchId)
    return next ? formatResearchCost(next) : 'Max level'
  }

  function canAffordResearch(researchId: ResearchId) {
    const next = getResearchNextLevel(researchId)
    return Boolean(
      next &&
        state.wood >= (next.wood || 0) &&
        state.stone >= (next.stone || 0) &&
        state.fruit >= (next.fruit || 0),
    )
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
    return getResearchLevel('stone-flakes') * 0.1
  }

  function getResearchRowLabel(researchId: ResearchId) {
    const definition = getResearchDefinition(researchId)
    const level = getResearchLevel(researchId)
    return `Lv ${level}/${definition.maxLevel}`
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
    return Math.max(1, Math.round(baseDurationMs * (1 - reduction)))
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
      return 1 + getResourceMilestoneBonus(actionId, level)
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
  function getHungerEffects(person: Person) {
    const ratio = person.hunger / person.maxHunger
    if (ratio <= 0.4) return { portion: 0.1, outputMultiplier: 0 }
    if (ratio <= 0.6) return { portion: 0.5, outputMultiplier: 0.8 }
    return { portion: 1, outputMultiplier: 1 }
  }
  function getResourceRates(activeAction: Action | null) {
    const rates = {
      fruit:
        -state.people.reduce(
          (sum, person) => sum + getHungerEffects(person).portion,
          0,
        ) /
        (FOOD_TICK_MS / 1000),
      wood: 0,
      stone: 0,
    }
    if (!activeAction) return rates
    const duration = getActionDuration(activeAction)
    if (duration < ACTION_IMMEDIATE_THRESHOLD_MS) return rates
    const seconds = duration / 1000
    // XP is awarded before the yield, including any milestone this action earns.
    const gain = getNextResourceGain(activeAction.id)
    if (activeAction.id === 'gather') {
      rates.fruit += gain / seconds
    } else if (activeAction.id === 'sticks') {
      rates.wood = gain / seconds
    } else if (activeAction.id === 'stone') {
      rates.stone = gain / seconds
    }
    return rates
  }
  function consumeMeal() {
    // Resolve meals in tribe order; the last remaining person cannot die.
    for (const person of [...state.people]) {
      const { portion } = getHungerEffects(person)
      if (state.fruit + 1e-9 >= portion) {
        state.fruit = roundResource(state.fruit - portion)
        person.hunger = Math.min(person.maxHunger, person.hunger + 1)
      } else {
        person.hunger = Math.max(0, person.hunger - 1)
        if (person.hunger === 0 && state.people.length > 1) {
          state.people.splice(state.people.indexOf(person), 1)
        }
      }
    }
  }
  function completeGather() {
    const fruitGain = getResourceGain('gather')
    state.fruit = roundResource(state.fruit + fruitGain)
    return `Gathered ${formatResource(fruitGain)} fruit.`
  }

  function completeExplore() {
    state.explored = true
    return 'Exploration complete. Wood is nearby.'
  }

  function completeExploreFurther() {
    state.stoneFound = true
    return 'Exploration complete. Stone is nearby.'
  }

  function completeSticks() {
    const woodGain = getResourceGain('sticks')
    state.wood = roundResource(state.wood + woodGain)
    return `Gathered ${formatResource(woodGain)} wood.`
  }

  function completeStone() {
    const stoneGain = getResourceGain('stone')
    state.stone = roundResource(state.stone + stoneGain)
    return `Gathered ${formatResource(stoneGain)} stone.`
  }

  function completeResearch(researchId: ResearchId) {
    const definition = getResearchDefinition(researchId)
    const nextLevel = getResearchLevel(researchId) + 1
    state.researchLevels[researchId] = Math.min(definition.maxLevel, nextLevel)
    state.basicTools = getResearchLevel('sharpened-stick') >= 1
    const effect = getResearchEffect(researchId, nextLevel)
    return `${definition.name} reached level ${nextLevel}. ${effect} applied.`
  }
  function createResearchAction(
    researchId: ResearchId,
    workingFeedback: string,
  ) {
    const definition = getResearchDefinition(researchId)
    return {
      id: definition.actionId,
      name: definition.name,
      researchId,
      baseDurationMs: () => getResearchNextLevel(researchId)?.durationMs ?? 1,
      workingFeedback,
      canStart: () =>
        Boolean(
          definition.prerequisite() &&
            getResearchNextLevel(researchId) &&
            canAffordResearch(researchId),
        ),
      unavailableMessage: () => {
        const next = getResearchNextLevel(researchId)
        return next
          ? `Need ${formatResearchCost(next)} to continue researching.`
          : 'This research is complete.'
      },
      cost: () => getResearchNextLevel(researchId),
      complete: () => completeResearch(researchId),
    }
  }

  const actions: Record<ActionKey, Action> = {
    gather: {
      id: 'gather',
      name: 'Gather fruit',
      baseDurationMs: GATHER_DURATION_MS,
      workingFeedback: 'Gathering fruit...',
      complete: completeGather,
    },
    explore: {
      id: 'explore',
      name: 'Explore nearby',
      baseDurationMs: EXPLORE_DURATION_MS,
      workingFeedback: 'Exploring nearby...',
      canStart: () => state.fruit >= EXPLORE_COST,
      unavailableMessage: 'Gather 10 fruit before exploring.',
      cost: () => ({ fruit: EXPLORE_COST }),
      complete: completeExplore,
    },
    exploreFurther: {
      id: 'explore-further',
      name: 'Explore farther',
      baseDurationMs: EXPLORE_FURTHER_DURATION_MS,
      workingFeedback: 'Exploring farther...',
      canStart: () => state.fruit >= EXPLORE_FURTHER_COST,
      unavailableMessage: 'Gather 10 fruit before exploring farther.',
      cost: () => ({ fruit: EXPLORE_FURTHER_COST }),
      complete: completeExploreFurther,
    },
    sticks: {
      id: 'sticks',
      name: 'Gather sticks',
      baseDurationMs: GATHER_WOOD_DURATION_MS,
      workingFeedback: 'Gathering sticks...',
      complete: completeSticks,
    },
    stone: {
      id: 'stone',
      name: 'Gather stone',
      baseDurationMs: GATHER_STONE_DURATION_MS,
      workingFeedback: 'Gathering stone...',
      complete: completeStone,
    },
    research: createResearchAction('sharpened-stick', 'Sharpening a stick...'),
    researchForaging: createResearchAction(
      'foraging-practice',
      'Weaving baskets...',
    ),
    researchStone: createResearchAction('stone-flakes', 'Knapping flint...'),
  }

  function syncUnlocks() {
    let changed = false
    if (
      !state.researchUnlocked &&
      state.explored &&
      state.wood >= RESEARCH_UNLOCK_WOOD
    ) {
      state.researchUnlocked = true
      changed = true
    }
    if (!state.exploreUnlocked && state.fruit >= EXPLORE_UNLOCK_FRUIT) {
      state.exploreUnlocked = true
      changed = true
    }
    state.basicTools = getResearchLevel('sharpened-stick') >= 1
    if (changed) saveProgress()
  }

  function getNextGoal() {
    if (!state.explored) {
      return state.fruit < EXPLORE_COST && activeAction !== actions.explore
        ? `Gather ${EXPLORE_COST} fruit to explore nearby.`
        : 'Explore nearby to discover wood.'
    }
    if (!state.researchUnlocked)
      return `Gather ${RESEARCH_UNLOCK_WOOD} wood to unlock research.`
    if (!state.basicTools)
      return 'Research a sharpened stick to gather more fruit.'
    if (!state.stoneFound) {
      return state.fruit < EXPLORE_FURTHER_COST &&
        activeAction !== actions.exploreFurther
        ? `Gather ${EXPLORE_FURTHER_COST} fruit to explore farther.`
        : 'Explore farther to discover stone.'
    }
    return RESEARCH_ITEM_KEYS.some((id) => getResearchNextLevel(id))
      ? 'Upgrade your tools in Research to improve gathering.'
      : 'All tools mastered. Keep gathering to level your skills.'
  }

  function startAction(action: Action) {
    const active = action.researchId ? activeResearch : activeAction
    if (active || (action.canStart && !action.canStart())) return false
    if (action.researchId) activeResearch = action
    else activeAction = action
    const cost = action.cost?.()
    if (cost) {
      for (const resource of ['fruit', 'wood', 'stone'] as const) {
        state[resource] = roundResource(state[resource] - (cost[resource] ?? 0))
      }
      saveProgress()
    }
    return true
  }

  function finishAction(action: Action) {
    const active = action.researchId ? activeResearch : activeAction
    if (active !== action) return null
    if (activeAction === action) activeAction = null
    if (activeResearch === action) activeResearch = null
    // Award XP first: a milestone reached by this action affects its yield.
    const levelsGained = awardActionExperience(action.id)
    const result = action.complete()
    state.actions += 1
    saveProgress()
    return levelsGained > 0
      ? `${result} ${action.name} reached level ${getSkill(action.id).level}.`
      : result
  }

  function advanceFood(elapsed: number) {
    state.foodElapsedMs += Math.max(0, elapsed)
    let changed = false
    while (state.foodElapsedMs >= FOOD_TICK_MS) {
      state.foodElapsedMs -= FOOD_TICK_MS
      consumeMeal()
      changed = true
    }
    if (elapsed > 0) saveProgress()
    return changed
  }

  return {
    state,
    saveProgress,
    actions,
    syncUnlocks,
    getNextGoal,
    startAction,
    finishAction,
    getActiveAction,
    getActiveResearch,
    advanceFood,
    consumeMeal,
    getSkill,
    getResearchLevel,
    getResearchDefinition,
    getResearchNextLevel,
    getUnreadResearch,
    markResearchSeen,
    getResearchEffect,
    getResearchSubtitle,
    getResearchCostLabel,
    canAffordResearch,
    getActionXpGain,
    getFruitResearchBonus,
    getStoneResearchBonus,
    getResearchRowLabel,
    getRequiredXp,
    getActionDuration,
    getResourceMilestoneBonus,
    getResourceGain,
    getNextResourceGain,
    getHungerEffects,
    getResourceRates,
  }
}

export type Game = ReturnType<typeof createGame>
