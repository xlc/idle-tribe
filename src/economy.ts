import type { BuildingId, Cost, JobId, ResearchId } from './types'

export interface BuildingDefinition {
  name: string
  job?: Exclude<JobId, 'idle'>
  technology?: ResearchId
  cost: Cost
  maxLevel: number
}

export const BUILDINGS: Record<BuildingId, BuildingDefinition> = {
  'foraging-camp': {
    name: 'Foraging camp',
    job: 'forager',
    cost: { wood: 6 },
    maxLevel: 8,
  },
  'lumber-camp': {
    name: 'Lumber camp',
    job: 'woodcutter',
    cost: { wood: 6, stone: 3 },
    maxLevel: 8,
  },
  quarry: {
    name: 'Quarry',
    job: 'stoneworker',
    cost: { wood: 8, stone: 6 },
    maxLevel: 8,
  },
  sawmill: {
    name: 'Sawmill',
    job: 'sawyer',
    technology: 'carpentry',
    cost: { wood: 15, stone: 8 },
    maxLevel: 8,
  },
  stoneworks: {
    name: 'Stoneworks',
    job: 'mason',
    technology: 'masonry',
    cost: { wood: 12, stone: 12 },
    maxLevel: 8,
  },
  study: {
    name: 'Study',
    job: 'scholar',
    technology: 'writing',
    cost: { planks: 8, blocks: 4 },
    maxLevel: 8,
  },
  houses: {
    name: 'Houses',
    technology: 'carpentry',
    cost: { planks: 8, blocks: 4 },
    maxLevel: 10,
  },
  'great-hall': {
    name: 'Great Hall',
    technology: 'engineering',
    cost: { planks: 120, blocks: 120, knowledge: 80 },
    maxLevel: 1,
  },
}

export const JOB_BUILDING: Record<Exclude<JobId, 'idle'>, BuildingId> = {
  forager: 'foraging-camp',
  woodcutter: 'lumber-camp',
  stoneworker: 'quarry',
  sawyer: 'sawmill',
  mason: 'stoneworks',
  scholar: 'study',
}
export const PRODUCTION_TECH: ResearchId[] = ['carpentry', 'masonry', 'writing']
export const SPECIALIZATION_TECH: ResearchId[] = ['forestry', 'stonecraft']
export const DEVELOPMENT_TECH: ResearchId[] = [
  'agriculture',
  'joinery',
  'architecture',
  'engineering',
]
