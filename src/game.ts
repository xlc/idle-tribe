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
  FEAST_FRUIT_PER_HEART,
  FED_MEAL_FRUIT,
  FOOD_TICK_MS,
  GATHER_DURATION_MS,
  GATHER_STONE_DURATION_MS,
  GATHER_WOOD_DURATION_MS,
  JOBS,
  MAX_HUNGER,
  OFFLINE_CAP_MS,
  RECRUIT_COST,
  RESEARCH_ITEM_KEYS,
  RESEARCH_UNLOCK_WOOD,
  RESOURCES,
} from './constants'
import { BUILDINGS, JOB_BUILDING } from './economy'
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
  BuildingId,
  Cost,
  GameState,
  JobId,
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
      for (const resource of RESOURCES) {
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
    carpentry: {
      actionId: 'research-carpentry',
      name: 'Carpentry',
      maxLevel: 1,
      prerequisite: () => getResearchLevel('shelters') > 0 && state.stoneFound,
      levels: [{ wood: 12, fruit: 15, durationMs: 6000 }],
    },
    masonry: {
      actionId: 'research-masonry',
      name: 'Masonry',
      maxLevel: 1,
      prerequisite: () => getResearchLevel('stone-flakes') > 0,
      levels: [{ wood: 10, stone: 12, durationMs: 7000 }],
    },
    writing: {
      actionId: 'research-writing',
      name: 'Writing',
      maxLevel: 1,
      prerequisite: () =>
        getResearchLevel('carpentry') > 0 && getResearchLevel('masonry') > 0,
      levels: [{ planks: 6, blocks: 4, durationMs: 10000 }],
    },
    forestry: {
      actionId: 'research-forestry',
      name: 'Forestry',
      maxLevel: 1,
      prerequisite: () =>
        getResearchLevel('writing') > 0 &&
        state.specialization !== 'stonecraft',
      levels: [{ knowledge: 12, planks: 10, durationMs: 12000 }],
    },
    stonecraft: {
      actionId: 'research-stonecraft',
      name: 'Stonecraft',
      maxLevel: 1,
      prerequisite: () =>
        getResearchLevel('writing') > 0 && state.specialization !== 'forestry',
      levels: [{ knowledge: 12, blocks: 10, durationMs: 12000 }],
    },
    agriculture: {
      actionId: 'research-agriculture',
      name: 'Cultivation',
      maxLevel: 1,
      prerequisite: () => getResearchLevel('writing') > 0,
      levels: [{ knowledge: 15, planks: 12, blocks: 6, durationMs: 12000 }],
    },
    joinery: {
      actionId: 'research-joinery',
      name: 'Precision joinery',
      maxLevel: 1,
      prerequisite: () => state.specialization === 'forestry',
      levels: [{ knowledge: 35, planks: 35, blocks: 15, durationMs: 18000 }],
    },
    architecture: {
      actionId: 'research-architecture',
      name: 'Architecture',
      maxLevel: 1,
      prerequisite: () => state.specialization === 'stonecraft',
      levels: [{ knowledge: 35, blocks: 35, planks: 15, durationMs: 18000 }],
    },
    engineering: {
      actionId: 'research-engineering',
      name: 'Engineering',
      maxLevel: 1,
      prerequisite: () =>
        getResearchLevel('agriculture') > 0 &&
        (getResearchLevel('joinery') > 0 ||
          getResearchLevel('architecture') > 0),
      levels: [{ knowledge: 40, planks: 40, blocks: 30, durationMs: 20000 }],
    },

    'sharpened-stick': {
      actionId: 'research',
      name: 'Sharpened stick',
      maxLevel: 3,
      prerequisite: () => state.researchUnlocked,
      levels: [
        { wood: 2, fruit: 5, durationMs: 5000 },
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
    shelters: {
      actionId: 'research-shelters',
      name: 'Shelters',
      maxLevel: 3,
      prerequisite: () => getResearchLevel('sharpened-stick') >= 1,
      levels: [
        { wood: 4, fruit: 8, durationMs: 6000 },
        { wood: 20, stone: 5, fruit: 30, durationMs: 15000 },
        { wood: 50, stone: 20, fruit: 60, durationMs: 25000 },
      ],
    },
    'stone-axes': {
      actionId: 'research-axes',
      name: 'Stone axes',
      maxLevel: 3,
      prerequisite: () => getResearchLevel('stone-flakes') >= 1,
      levels: [
        { wood: 5, stone: 5, durationMs: 10000 },
        { wood: 15, stone: 15, durationMs: 18000 },
        { wood: 30, stone: 35, durationMs: 30000 },
      ],
    },
    quarrying: {
      actionId: 'research-quarrying',
      name: 'Quarrying',
      maxLevel: 3,
      prerequisite: () => getResearchLevel('stone-axes') >= 1,
      levels: [
        { wood: 10, stone: 8, fruit: 10, durationMs: 12000 },
        { wood: 25, stone: 20, fruit: 25, durationMs: 20000 },
        { wood: 50, stone: 40, fruit: 50, durationMs: 30000 },
      ],
    },
    teamwork: {
      actionId: 'research-teamwork',
      name: 'Teamwork',
      maxLevel: 3,
      prerequisite: () => getResearchLevel('shelters') >= 1,
      levels: [
        { wood: 8, fruit: 25, durationMs: 12000 },
        { wood: 20, stone: 10, fruit: 50, durationMs: 20000 },
        { wood: 40, stone: 25, fruit: 100, durationMs: 30000 },
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
    if (researchId === 'foraging-practice')
      return `+${level * 25}% worker fruit`
    if (researchId === 'stone-flakes')
      return `+${formatResource(level * 0.1)} stone`
    if (researchId === 'shelters')
      return level > 0 ? `${1 + level * 2} people · workplaces` : '1 person'
    if (researchId === 'stone-axes')
      return `+${formatResource(level * 0.5)} wood`
    if (researchId === 'quarrying')
      return `+${formatResource(level * 0.5)} stone`
    if (researchId === 'teamwork') return `+${level * 25}% worker output`
    const effects: Partial<Record<ResearchId, string>> = {
      carpentry: 'Sawmill · houses',
      masonry: 'Stoneworks',
      writing: 'Study · specializations',
      forestry: '+60% wood & planks',
      stonecraft: '+60% stone & blocks',
      agriculture: '+100% worker fruit',
      joinery: 'Processors use 2 raw materials',
      architecture: '+2 places per house · +50% blocks',
      engineering: '+25% all output · Great Hall',
    }
    return level ? (effects[researchId] ?? '') : 'Not researched'
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
    return Boolean(next && canAfford(next))
  }

  function canAfford(cost: Cost) {
    return RESOURCES.every(
      (resource) => state[resource] + 1e-9 >= (cost[resource] ?? 0),
    )
  }
  function pay(cost: Cost) {
    for (const resource of RESOURCES)
      state[resource] = roundResource(state[resource] - (cost[resource] ?? 0))
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
  function getHungerEffects(person: Person) {
    const ratio = person.hunger / person.maxHunger
    if (ratio <= 0.4) return { portion: 0.1, outputMultiplier: 0.5 }
    if (ratio <= 0.6) return { portion: 0.5, outputMultiplier: 0.8 }
    return { portion: FED_MEAL_FRUIT, outputMultiplier: 1 }
  }
  function getMealCost() {
    return roundResource(
      state.people.reduce(
        (sum, person) => sum + getHungerEffects(person).portion,
        0,
      ),
    )
  }
  function getFeastCost() {
    // Charge whole fruit, including for fractional hearts in older saves.
    return Math.ceil(
      state.people.reduce(
        (sum, person) => sum + (person.maxHunger - person.hunger),
        0,
      ) * FEAST_FRUIT_PER_HEART,
    )
  }
  function canFeast() {
    const cost = getFeastCost()
    return cost > 0 && state.fruit >= cost
  }
  function feast() {
    if (!canFeast()) return false
    state.fruit = roundResource(state.fruit - getFeastCost())
    for (const person of state.people) person.hunger = person.maxHunger
    saveProgress()
    return true
  }
  function getResourceRates(activeAction: Action | null) {
    const rates = {
      fruit: -getMealCost() / (FOOD_TICK_MS / 1000),
      wood: 0,
      stone: 0,
      planks: 0,
      blocks: 0,
      knowledge: 0,
    }
    for (const person of state.people) {
      if (person.job === 'idle' || !canWork(person)) continue
      const job = JOBS[person.job]
      rates[job.resource] += getWorkerGain(person) / (job.durationMs / 1000)
      const input = getJobInput(person.job)
      for (const resource of RESOURCES)
        rates[resource] -= (input[resource] ?? 0) / (job.durationMs / 1000)
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
      rates.wood += gain / seconds
    } else if (activeAction.id === 'stone') {
      rates.stone += gain / seconds
    }
    return rates
  }
  function consumeMeal() {
    // Feed the hungriest first. Ties retain roster order, without reordering
    // people or their mounted job controls. Player identity controls survival.
    const mealOrder = [...state.people].sort(
      (a, b) => a.hunger / a.maxHunger - b.hunger / b.maxHunger,
    )
    for (const person of mealOrder) {
      const { portion } = getHungerEffects(person)
      if (state.fruit + 1e-9 >= portion) {
        state.fruit = roundResource(state.fruit - portion)
        person.hunger = Math.min(person.maxHunger, person.hunger + 1)
      } else {
        person.hunger = Math.max(0, person.hunger - 1)
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
    if (getResearchLevel('shelters') > 0)
      state.buildings.quarry = Math.max(1, state.buildings.quarry)
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
    state.seenResearchLevels[researchId] = Math.max(
      state.seenResearchLevels[researchId],
      nextLevel,
    )
    state.basicTools = getResearchLevel('sharpened-stick') >= 1
    if (researchId === 'forestry' || researchId === 'stonecraft')
      state.specialization = researchId
    if (researchId === 'shelters' && nextLevel === 1) {
      state.buildings['foraging-camp'] = Math.max(
        1,
        state.buildings['foraging-camp'],
      )
      state.buildings['lumber-camp'] = Math.max(
        1,
        state.buildings['lumber-camp'],
      )
      if (state.stoneFound)
        state.buildings.quarry = Math.max(1, state.buildings.quarry)
      const idle = state.people.find((person) => person.job === 'idle')
      if (idle) idle.job = 'forager'
    }
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
    researchShelters: createResearchAction('shelters', 'Building shelters...'),
    researchAxes: createResearchAction('stone-axes', 'Crafting axes...'),
    researchQuarrying: createResearchAction(
      'quarrying',
      'Studying quarrying...',
    ),
    researchTeamwork: createResearchAction('teamwork', 'Organizing work...'),
    researchCarpentry: createResearchAction(
      'carpentry',
      'Researching carpentry...',
    ),
    researchMasonry: createResearchAction('masonry', 'Researching masonry...'),
    researchWriting: createResearchAction('writing', 'Researching writing...'),
    researchForestry: createResearchAction(
      'forestry',
      'Researching forestry...',
    ),
    researchStonecraft: createResearchAction(
      'stonecraft',
      'Researching stonecraft...',
    ),
    researchJoinery: createResearchAction('joinery', 'Researching joinery...'),
    researchArchitecture: createResearchAction(
      'architecture',
      'Researching architecture...',
    ),
    researchAgriculture: createResearchAction(
      'agriculture',
      'Researching agriculture...',
    ),
    researchEngineering: createResearchAction(
      'engineering',
      'Researching engineering...',
    ),
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

  function startAction(action: Action) {
    const active = action.researchId ? activeResearch : activeAction
    if (active || (action.canStart && !action.canStart())) return false
    if (action.researchId) activeResearch = action
    else activeAction = action
    const cost = action.cost?.()
    if (cost) {
      for (const resource of RESOURCES) {
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

  function getPopulationCapacity() {
    return Math.max(
      state.people.length,
      1 +
        getResearchLevel('shelters') * 2 +
        state.buildings.houses * (getResearchLevel('architecture') ? 4 : 2),
    )
  }

  function canRecruit() {
    return (
      state.people.length < getPopulationCapacity() &&
      state.fruit >= RECRUIT_COST
    )
  }

  function recruitPerson() {
    if (!canRecruit()) return false
    let number = 1
    while (
      state.people.some((person) => person.name === `Tribe member ${number}`)
    )
      number++
    state.fruit = roundResource(state.fruit - RECRUIT_COST)
    state.people.push({
      name: `Tribe member ${number}`,
      isPlayer: false,
      hunger: MAX_HUNGER,
      maxHunger: MAX_HUNGER,
      job: 'idle',
      workElapsedMs: 0,
    })
    saveProgress()
    return true
  }

  function isBuildingUnlocked(id: BuildingId) {
    if (!getResearchLevel('shelters')) return false
    const definition = BUILDINGS[id]
    if (id === 'quarry' && !state.stoneFound) return false
    if (id === 'lumber-camp' && !state.explored) return false
    return !definition.technology || getResearchLevel(definition.technology) > 0
  }
  function getBuildingCost(id: BuildingId): Cost {
    const level = state.buildings[id]
    const cost: Cost = {}
    for (const resource of RESOURCES) {
      const base = BUILDINGS[id].cost[resource]
      if (base) cost[resource] = Math.ceil(base * 1.65 ** level)
    }
    if (level > 0 && BUILDINGS[id].job) {
      cost.planks = (cost.planks ?? 0) + level * 4
      cost.blocks = (cost.blocks ?? 0) + level * 2
    }
    return cost
  }
  function canBuild(id: BuildingId) {
    return (
      isBuildingUnlocked(id) &&
      state.buildings[id] < BUILDINGS[id].maxLevel &&
      canAfford(getBuildingCost(id))
    )
  }
  function build(id: BuildingId) {
    if (!canBuild(id)) return false
    pay(getBuildingCost(id))
    state.buildings[id] += 1
    saveProgress()
    return true
  }
  function getJobCapacity(job: JobId) {
    return job === 'idle'
      ? state.people.length
      : state.buildings[JOB_BUILDING[job]] * 2
  }
  function isJobUnlocked(job: JobId) {
    if (job === 'idle') return true
    return isBuildingUnlocked(JOB_BUILDING[job]) && getJobCapacity(job) > 0
  }
  function assignJob(person: Person, job: JobId) {
    if (!state.people.includes(person) || !isJobUnlocked(job)) return false
    if (person.job === job) return true
    if (
      job !== 'idle' &&
      state.people.filter((p) => p.job === job).length >= getJobCapacity(job)
    )
      return false
    person.job = job
    person.workElapsedMs = 0
    saveProgress()
    return true
  }
  function adjustWorkers(job: Exclude<JobId, 'idle'>, amount: 1 | -1) {
    const person =
      amount === 1
        ? state.people.find((p) => p.job === 'idle')
        : [...state.people].reverse().find((p) => p.job === job)
    return person ? assignJob(person, amount === 1 ? job : 'idle') : false
  }
  function getJobInput(job: JobId): Cost {
    const rawCost = getResearchLevel('joinery') ? 2 : 3
    if (job === 'sawyer') return { wood: rawCost }
    if (job === 'mason') return { stone: rawCost }
    if (job === 'scholar') return { fruit: 1 }
    return {}
  }
  function canWork(person: Person) {
    return (
      person.job !== 'idle' &&
      isJobUnlocked(person.job) &&
      canAfford(getJobInput(person.job))
    )
  }
  function getWorkerGain(person: Person, preview = false) {
    if (person.job === 'idle' || (!preview && !isJobUnlocked(person.job)))
      return 0
    const job = JOBS[person.job]
    let gain = job.actionId ? getNextResourceGain(job.actionId) * 2 : 1
    gain *=
      1 + (Math.max(1, state.buildings[JOB_BUILDING[person.job]]) - 1) * 0.5
    if (
      state.specialization === 'forestry' &&
      (person.job === 'woodcutter' || person.job === 'sawyer')
    )
      gain *= 1.6
    if (
      state.specialization === 'stonecraft' &&
      (person.job === 'stoneworker' || person.job === 'mason')
    )
      gain *= 1.6
    if (person.job === 'mason' && getResearchLevel('architecture')) gain *= 1.5
    if (person.job === 'forager') {
      gain *= 1 + getResearchLevel('foraging-practice') * 0.25
      if (getResearchLevel('agriculture')) gain *= 2
    }
    gain *=
      (1 + getResearchLevel('teamwork') * 0.25) *
      (getResearchLevel('engineering') ? 1.25 : 1)
    return roundResource(gain * getHungerEffects(person).outputMultiplier)
  }
  // Resolve work and meal boundaries in the same order for live and offline play.
  function advanceTime(elapsed: number) {
    if (!Number.isFinite(elapsed) || elapsed <= 0) return false
    let remaining = elapsed
    let changed = false
    while (remaining > 0) {
      const workers = state.people.filter(canWork)
      let step = Math.min(remaining, FOOD_TICK_MS - state.foodElapsedMs)
      for (const person of workers) {
        if (person.job !== 'idle')
          step = Math.min(
            step,
            JOBS[person.job].durationMs - person.workElapsedMs,
          )
      }
      state.foodElapsedMs += step
      for (const person of workers) person.workElapsedMs += step
      remaining -= step
      for (const person of workers) {
        if (person.job === 'idle') continue
        const job = JOBS[person.job]
        if (person.workElapsedMs < job.durationMs) continue
        person.workElapsedMs -= job.durationMs
        if (!canAfford(getJobInput(person.job))) continue
        pay(getJobInput(person.job))
        const gain = getWorkerGain(person)
        if (job.actionId) awardActionExperience(job.actionId)
        state[job.resource] = roundResource(state[job.resource] + gain)
        changed = true
      }
      if (state.foodElapsedMs >= FOOD_TICK_MS) {
        state.foodElapsedMs -= FOOD_TICK_MS
        consumeMeal()
        changed = true
      }
    }
    syncUnlocks()
    saveProgress()
    return changed
  }
  function applyOffline(now: number) {
    const elapsed =
      state.savedAt > 0
        ? Math.min(OFFLINE_CAP_MS, Math.max(0, now - state.savedAt))
        : 0
    const before = Object.fromEntries(RESOURCES.map((id) => [id, state[id]]))
    advanceTime(elapsed)
    state.savedAt = now
    saveProgress()
    return {
      elapsed,
      gains: Object.fromEntries(
        RESOURCES.map((id) => [id, roundResource(state[id] - before[id])]),
      ) as Record<(typeof RESOURCES)[number], number>,
    }
  }

  return {
    state,
    canAfford,
    isBuildingUnlocked,
    getBuildingCost,
    canBuild,
    build,
    getJobCapacity,
    adjustWorkers,
    getJobInput,
    canWork,
    applyOffline,
    saveProgress,
    actions,
    syncUnlocks,
    startAction,
    finishAction,
    getActiveAction,
    getActiveResearch,
    advanceTime,
    getPopulationCapacity,
    canRecruit,
    recruitPerson,
    isJobUnlocked,
    assignJob,
    getWorkerGain,
    consumeMeal,
    getMealCost,
    getFeastCost,
    canFeast,
    feast,
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
