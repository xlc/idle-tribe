import { grantStartingBuildings, isAutomationUnlocked } from './economy'
import { formatResource } from './format'
import type {
  GameState,
  ResearchDefinition,
  ResearchGroupId,
  ResearchId,
} from './types'

export const RESEARCH_CONFIG: Record<ResearchId, ResearchDefinition> = {
  carpentry: {
    group: 'production',
    requirement: 'Shelters · discover stone',
    effect: (level) => (level ? 'Sawmill · houses' : 'Not researched'),
    actionId: 'research-carpentry',
    name: 'Carpentry',
    prerequisite: (state) =>
      state.researchLevels.shelters > 0 && state.stoneFound,
    levels: [{ wood: 12, fruit: 15, durationMs: 6000 }],
  },
  masonry: {
    group: 'production',
    requirement: 'Flint knapping',
    effect: (level) => (level ? 'Stoneworks' : 'Not researched'),
    actionId: 'research-masonry',
    name: 'Masonry',
    prerequisite: (state) => state.researchLevels['stone-flakes'] > 0,
    levels: [{ wood: 10, stone: 12, durationMs: 7000 }],
  },
  writing: {
    group: 'production',
    requirement: 'Carpentry + Masonry',
    effect: (level) => (level ? 'Study · specializations' : 'Not researched'),
    actionId: 'research-writing',
    name: 'Writing',
    prerequisite: (state) =>
      state.researchLevels.carpentry > 0 && state.researchLevels.masonry > 0,
    levels: [{ planks: 6, blocks: 4, durationMs: 10000 }],
  },
  forestry: {
    group: 'specialization',
    requirement: 'Writing',
    effect: (level) => (level ? '+60% worker wood & planks' : 'Not researched'),
    actionId: 'research-forestry',
    name: 'Forestry',
    specialization: {
      kind: 'choice',
      id: 'forestry',
      description:
        'Worker wood and planks +60%. Unlocks Precision joinery: processors use 2 raw materials.',
    },
    prerequisite: (state) => state.researchLevels.writing > 0,
    levels: [{ knowledge: 12, planks: 10, durationMs: 12000 }],
  },
  stonecraft: {
    group: 'specialization',
    requirement: 'Writing',
    effect: (level) =>
      level ? '+60% worker stone & blocks' : 'Not researched',
    actionId: 'research-stonecraft',
    name: 'Stonecraft',
    specialization: {
      kind: 'choice',
      id: 'stonecraft',
      description:
        'Worker stone and blocks +60%. Unlocks Architecture: more housing capacity and +50% block output.',
    },
    prerequisite: (state) => state.researchLevels.writing > 0,
    levels: [{ knowledge: 12, blocks: 10, durationMs: 12000 }],
  },
  agriculture: {
    group: 'development',
    requirement: 'Writing',
    effect: (level) => (level ? '+100% worker fruit' : 'Not researched'),
    actionId: 'research-agriculture',
    name: 'Cultivation',
    prerequisite: (state) => state.researchLevels.writing > 0,
    levels: [{ knowledge: 15, planks: 12, blocks: 6, durationMs: 12000 }],
  },
  joinery: {
    group: 'development',
    requirement: 'Forestry',
    effect: (level) =>
      level ? 'Processors use 2 raw materials' : 'Not researched',
    actionId: 'research-joinery',
    name: 'Precision joinery',
    specialization: { kind: 'requirement', id: 'forestry' },
    prerequisite: () => true,
    levels: [{ knowledge: 35, planks: 35, blocks: 15, durationMs: 18000 }],
  },
  architecture: {
    group: 'development',
    requirement: 'Stonecraft',
    effect: (level) =>
      level ? '+2 places per house · +50% blocks' : 'Not researched',
    actionId: 'research-architecture',
    name: 'Architecture',
    specialization: { kind: 'requirement', id: 'stonecraft' },
    prerequisite: () => true,
    levels: [{ knowledge: 35, blocks: 35, planks: 15, durationMs: 18000 }],
  },
  engineering: {
    group: 'development',
    requirement: 'Cultivation + your path technology',
    effect: (level) =>
      level ? '+25% worker output · Great Hall' : 'Not researched',
    actionId: 'research-engineering',
    name: 'Engineering',
    workerMultiplier: (level) => (level > 0 ? 1.25 : 1),
    prerequisite: (state) =>
      state.researchLevels.agriculture > 0 &&
      (state.researchLevels.joinery > 0 ||
        state.researchLevels.architecture > 0),
    levels: [{ knowledge: 40, planks: 40, blocks: 30, durationMs: 20000 }],
  },

  'sharpened-stick': {
    group: 'foundations',
    requirement: '2 wood',
    effect: (level) =>
      level > 0
        ? `+${formatResource(1 + 0.5 * (level - 1))} fruit`
        : '+0 fruit',
    actionId: 'research',
    name: 'Sharpened stick',
    prerequisite: (state) => state.researchUnlocked,
    levels: [
      { wood: 2, fruit: 5, durationMs: 5000 },
      { wood: 4, fruit: 20, durationMs: 7000 },
      { wood: 7, fruit: 35, durationMs: 10000 },
    ],
  },
  'foraging-practice': {
    group: 'foundations',
    requirement: 'Sharpened stick',
    effect: (level) => `+${level * 25}% worker fruit`,
    actionId: 'research-foraging',
    name: 'Woven baskets',
    prerequisite: (state) => state.researchLevels['sharpened-stick'] >= 1,
    levels: [
      { wood: 2, fruit: 20, durationMs: 8000 },
      { wood: 5, fruit: 45, durationMs: 15000 },
      { wood: 9, fruit: 90, durationMs: 30000 },
    ],
  },
  'stone-flakes': {
    group: 'foundations',
    requirement: 'Discover stone',
    effect: (level) => `+${formatResource(level * 0.1)} stone`,
    actionId: 'research-stone-flakes',
    name: 'Flint knapping',
    prerequisite: (state) => state.stoneFound,
    levels: [
      { wood: 2, stone: 3, fruit: 10, durationMs: 10000 },
      { wood: 5, stone: 10, fruit: 25, durationMs: 18000 },
      { wood: 10, stone: 25, fruit: 50, durationMs: 30000 },
    ],
  },
  shelters: {
    group: 'foundations',
    requirement: 'Sharpened stick',
    effect: (level) =>
      level > 0 ? `${1 + level * 2} people · workplaces` : '1 person',
    actionId: 'research-shelters',
    name: 'Shelters',
    populationCapacity: (level) => level * 2,
    onFirstCompletion: (state) => {
      grantStartingBuildings(state)
      const idle = state.people.find((person) => person.job === 'idle')
      if (idle) idle.job = 'forager'
    },
    prerequisite: (state) => state.researchLevels['sharpened-stick'] >= 1,
    levels: [
      { wood: 4, fruit: 8, durationMs: 6000 },
      { wood: 20, stone: 5, fruit: 30, durationMs: 15000 },
      { wood: 50, stone: 20, fruit: 60, durationMs: 25000 },
    ],
  },
  'stone-axes': {
    group: 'foundations',
    requirement: 'Flint knapping',
    effect: (level) => `+${formatResource(level * 0.5)} wood`,
    actionId: 'research-axes',
    name: 'Stone axes',
    prerequisite: (state) => state.researchLevels['stone-flakes'] >= 1,
    levels: [
      { wood: 5, stone: 5, durationMs: 10000 },
      { wood: 15, stone: 15, durationMs: 18000 },
      { wood: 30, stone: 35, durationMs: 30000 },
    ],
  },
  quarrying: {
    group: 'foundations',
    requirement: 'Stone axes',
    effect: (level) => `+${formatResource(level * 0.5)} stone`,
    actionId: 'research-quarrying',
    name: 'Quarrying',
    prerequisite: (state) => state.researchLevels['stone-axes'] >= 1,
    levels: [
      { wood: 10, stone: 8, fruit: 10, durationMs: 12000 },
      { wood: 25, stone: 20, fruit: 25, durationMs: 20000 },
      { wood: 50, stone: 40, fruit: 50, durationMs: 30000 },
    ],
  },
  teamwork: {
    group: 'foundations',
    requirement: 'Shelters',
    effect: (level) => `+${level * 25}% worker output`,
    actionId: 'research-teamwork',
    name: 'Teamwork',
    workerMultiplier: (level) => 1 + level * 0.25,
    prerequisite: (state) => state.researchLevels.shelters >= 1,
    levels: [
      { wood: 8, fruit: 25, durationMs: 12000 },
      { wood: 20, stone: 10, fruit: 50, durationMs: 20000 },
      { wood: 40, stone: 25, fruit: 100, durationMs: 30000 },
    ],
  },
}

export function isResearchExcluded(state: GameState, id: ResearchId) {
  const { specialization } = RESEARCH_CONFIG[id]
  return Boolean(
    specialization &&
      state.specialization &&
      specialization.id !== state.specialization,
  )
}

export function isResearchAvailable(state: GameState, id: ResearchId) {
  const definition = RESEARCH_CONFIG[id]
  const specialization = definition.specialization
  if (isResearchExcluded(state, id)) return false
  if (
    specialization?.kind === 'requirement' &&
    state.specialization !== specialization.id
  )
    return false
  return definition.prerequisite(state)
}

export const RESEARCH_GROUPS: {
  id: ResearchGroupId
  name: string
  visible: (state: GameState) => boolean
  collapseWhen?: (state: GameState) => boolean
}[] = [
  {
    id: 'foundations',
    name: 'Foundations',
    visible: (state) => state.researchUnlocked,
    collapseWhen: (state) => state.researchLevels.writing > 0,
  },
  {
    id: 'production',
    name: 'Workshops',
    visible: (state) => isAutomationUnlocked(state) && state.stoneFound,
  },
  {
    id: 'specialization',
    name: 'Choose a specialization',
    visible: (state) => state.researchLevels.writing > 0,
  },
  {
    id: 'development',
    name: 'A growing village',
    visible: (state) => state.researchLevels.writing > 0,
  },
]
