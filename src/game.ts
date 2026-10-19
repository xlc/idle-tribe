import {
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

export function createGame(state: GameState, saveState: () => void = () => {}) {
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

  function getRequiredXp(actionId: ActionId) {
    const skill = getSkill(actionId)
    const baseXp = ACTION_SKILL_CONFIG[actionId]?.baseXp ?? 4
    return Math.max(
      1,
      Math.ceil(baseXp * ACTION_XP_GROWTH ** (skill.level - 1)),
    )
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

  function getResourceMilestoneBonus(actionId: ActionId) {
    const resourceAction = ['gather', 'sticks', 'stone'].includes(actionId)
    if (!resourceAction) return 0
    return Math.floor(getSkill(actionId).level / ACTION_YIELD_MILESTONE) * 0.1
  }

  function awardActionExperience(actionId: ActionId) {
    const skill = getSkill(actionId)
    skill.xp += getActionXpGain(actionId)
    let levelsGained = 0
    while (skill.xp >= getRequiredXp(actionId)) {
      skill.xp -= getRequiredXp(actionId)
      skill.level += 1
      levelsGained += 1
    }
    return levelsGained
  }
  function getHungerEffects(person: Person) {
    const ratio = person.hunger / person.maxHunger
    if (ratio <= 0.4) return { portion: 0.1, outputMultiplier: 0 }
    if (ratio <= 0.6) return { portion: 0.5, outputMultiplier: 0.8 }
    return { portion: 1, outputMultiplier: 1 }
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
    const fruitGain =
      1 + getFruitResearchBonus() + getResourceMilestoneBonus('gather')
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
    const woodGain = 1 + getResourceMilestoneBonus('sticks')
    state.wood = roundResource(state.wood + woodGain)
    return `Gathered ${formatResource(woodGain)} wood.`
  }

  function completeStone() {
    const stoneGain =
      1 + getStoneResearchBonus() + getResourceMilestoneBonus('stone')
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
      onStart: () => {
        const next = getResearchNextLevel(researchId)
        if (!next) return
        state.fruit = roundResource(state.fruit - (next.fruit || 0))
        state.wood = roundResource(state.wood - (next.wood || 0))
        state.stone = roundResource(state.stone - (next.stone || 0))
        saveState()
      },
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
      onStart: () => {
        state.fruit = roundResource(state.fruit - EXPLORE_COST)
        saveState()
      },
      complete: completeExplore,
    },
    exploreFurther: {
      id: 'explore-further',
      name: 'Explore farther',
      baseDurationMs: EXPLORE_FURTHER_DURATION_MS,
      workingFeedback: 'Exploring farther...',
      canStart: () => state.fruit >= EXPLORE_FURTHER_COST,
      unavailableMessage: 'Gather 10 fruit before exploring farther.',
      onStart: () => {
        state.fruit = roundResource(state.fruit - EXPLORE_FURTHER_COST)
        saveState()
      },
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
    if (changed) saveState()
  }

  function finishAction(action: Action) {
    // Award XP first: a milestone reached by this action affects its yield.
    const levelsGained = awardActionExperience(action.id)
    const result = action.complete()
    state.actions += 1
    saveState()
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
    if (elapsed > 0) saveState()
    return changed
  }

  return {
    state,
    actions,
    syncUnlocks,
    finishAction,
    advanceFood,
    consumeMeal,
    getSkill,
    getResearchLevel,
    getResearchDefinition,
    getResearchNextLevel,
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
    getHungerEffects,
  }
}

export type Game = ReturnType<typeof createGame>
