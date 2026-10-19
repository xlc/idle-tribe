import { BUILDING_IDS, JOB_IDS } from './ids'
import { createRecord } from './records'
import type { BuildingId, Cost, GameState, JobId, ResearchId } from './types'

export interface BuildingDefinition {
  name: string
  job?: Exclude<JobId, 'idle'>
  discovery?: 'explored' | 'stoneFound'
  technology?: ResearchId
  startingGrant?: (state: GameState) => boolean
  expansionCost?: Cost
  cost: Cost
  maxLevel: number
  description?: (state: GameState) => string
  populationCapacity?: (state: GameState) => number
  milestone?: { message: string; target: string; chapter: string }
}

function getHouseCapacity(state: GameState) {
  return state.researchLevels.architecture ? 4 : 2
}

const WORKPLACE_EXPANSION_COST: Cost = { planks: 4, blocks: 2 }

export function isAutomationUnlocked(state: GameState) {
  return state.researchLevels.shelters > 0
}

export const BUILDINGS: Record<BuildingId, BuildingDefinition> = {
  'foraging-camp': {
    name: 'Foraging camp',
    job: 'forager',
    expansionCost: WORKPLACE_EXPANSION_COST,
    startingGrant: isAutomationUnlocked,
    cost: { wood: 6 },
    maxLevel: 8,
  },
  'lumber-camp': {
    name: 'Lumber camp',
    job: 'woodcutter',
    expansionCost: WORKPLACE_EXPANSION_COST,
    startingGrant: isAutomationUnlocked,
    discovery: 'explored',
    cost: { wood: 6, stone: 3 },
    maxLevel: 8,
  },
  quarry: {
    name: 'Quarry',
    job: 'stoneworker',
    expansionCost: WORKPLACE_EXPANSION_COST,
    startingGrant: (state) => isAutomationUnlocked(state) && state.stoneFound,
    discovery: 'stoneFound',
    cost: { wood: 8, stone: 6 },
    maxLevel: 8,
  },
  sawmill: {
    name: 'Sawmill',
    job: 'sawyer',
    expansionCost: WORKPLACE_EXPANSION_COST,
    technology: 'carpentry',
    cost: { wood: 15, stone: 8 },
    maxLevel: 8,
  },
  stoneworks: {
    name: 'Stoneworks',
    job: 'mason',
    expansionCost: WORKPLACE_EXPANSION_COST,
    technology: 'masonry',
    cost: { wood: 12, stone: 12 },
    maxLevel: 8,
  },
  study: {
    name: 'Study',
    job: 'scholar',
    expansionCost: WORKPLACE_EXPANSION_COST,
    technology: 'writing',
    cost: { planks: 8, blocks: 4 },
    maxLevel: 8,
  },
  houses: {
    name: 'Houses',
    populationCapacity: getHouseCapacity,
    description: (state) => `+${getHouseCapacity(state)} places per level`,
    technology: 'carpentry',
    cost: { planks: 8, blocks: 4 },
    maxLevel: 10,
  },
  'great-hall': {
    name: 'Great Hall',
    description: () => 'Complete the village',
    milestone: {
      message: 'The Great Hall is complete.',
      target: 'village-complete',
      chapter: 'Village established',
    },
    technology: 'engineering',
    cost: { planks: 120, blocks: 120, knowledge: 80 },
    maxLevel: 1,
  },
}

export const JOB_BUILDING = createRecord(
  JOB_IDS.filter((job) => job !== 'idle'),
  (job) => {
    const building = BUILDING_IDS.find((id) => BUILDINGS[id].job === job)
    if (!building) throw new Error(`Missing workplace for ${job}`)
    return building
  },
)

export function grantStartingBuildings(state: GameState) {
  for (const id of BUILDING_IDS) {
    if (BUILDINGS[id].startingGrant?.(state))
      state.buildings[id] = Math.max(1, state.buildings[id])
  }
}

const SETTLEMENT_CHAPTERS = [
  {
    name: 'A growing village',
    reached: (state: GameState) => state.specialization !== null,
  },
  {
    name: 'The workshop age',
    reached: (state: GameState) => state.researchLevels.carpentry > 0,
  },
  { name: 'A working settlement', reached: isAutomationUnlocked },
]

export function getSettlementChapter(state: GameState) {
  for (const id of BUILDING_IDS) {
    const milestone = BUILDINGS[id].milestone
    if (milestone && state.buildings[id] > 0) return milestone.chapter
  }
  for (const chapter of SETTLEMENT_CHAPTERS) {
    if (chapter.reached(state)) return chapter.name
  }
  return 'A small beginning'
}

export function isBuildingUnlocked(state: GameState, id: BuildingId) {
  const { discovery, technology } = BUILDINGS[id]
  return (
    isAutomationUnlocked(state) &&
    (!discovery || state[discovery]) &&
    (!technology || state.researchLevels[technology] > 0)
  )
}

export function isJobUnlocked(state: GameState, job: JobId) {
  if (job === 'idle') return true
  const building = JOB_BUILDING[job]
  return isBuildingUnlocked(state, building) && state.buildings[building] > 0
}
