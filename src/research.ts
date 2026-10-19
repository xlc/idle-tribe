import { formatResource } from './format'
import { RESEARCH_ITEM_KEYS } from './ids'
import type { createResources } from './resources'
import type {
  Action,
  GameState,
  ResearchCost,
  ResearchDefinition,
  ResearchId,
} from './types'

export function createResearch(
  state: GameState,
  canAfford: ReturnType<typeof createResources>['canAfford'],
  saveProgress: () => void,
) {
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

  function getResearchLevel(researchId: ResearchId) {
    return Math.max(0, Math.floor(state.researchLevels[researchId]))
  }

  function getResearchDefinition(researchId: ResearchId) {
    return RESEARCH_CONFIG[researchId]
  }

  function getResearchNextLevel(researchId: ResearchId): ResearchCost | null {
    const definition = getResearchDefinition(researchId)
    const level = getResearchLevel(researchId)
    return level < definition.maxLevel
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
    const effects = {
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
    return level ? effects[researchId] : 'Not researched'
  }

  function canAffordResearch(researchId: ResearchId) {
    const next = getResearchNextLevel(researchId)
    return Boolean(next && canAfford(next))
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
