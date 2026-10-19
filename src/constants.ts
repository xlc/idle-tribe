import type { ActionId, JobId, ResourceId } from './types'

export const ACTION_IMMEDIATE_THRESHOLD_MS = 100
export const FOOD_TICK_MS = 60000
export const MAX_HUNGER = 5
export const FEAST_FRUIT_PER_HEART = 1
export const FED_MEAL_FRUIT = 1
export const EXPLORE_COST = 10
export const EXPLORE_UNLOCK_FRUIT = 5
export const EXPLORE_DURATION_MS = 2000
export const EXPLORE_FURTHER_COST = 10
export const EXPLORE_FURTHER_DURATION_MS = 3000
export const GATHER_DURATION_MS = 1000
export const GATHER_WOOD_DURATION_MS = 2000
export const GATHER_STONE_DURATION_MS = 3000
export const RESEARCH_UNLOCK_WOOD = 2
export const ACTION_XP_PER_COMPLETION = 1
export const OFFLINE_CAP_MS = 24 * 60 * 60 * 1000
export { RESEARCH_ITEM_KEYS, RESOURCES } from './ids'
export const ACTION_XP_SPEED_REDUCTION = 0.03
export const ACTION_XP_GROWTH = 1.2
export const ACTION_YIELD_MILESTONE = 5
export const ACTION_SKILL_CONFIG: Record<ActionId, { baseXp: number }> = {
  gather: { baseXp: 4 },
  explore: { baseXp: 1 },
  sticks: { baseXp: 3 },
  'explore-further': { baseXp: 2 },
  stone: { baseXp: 5 },
  research: { baseXp: 2 },
  'research-foraging': { baseXp: 3 },
  'research-stone-flakes': { baseXp: 4 },
  'research-shelters': { baseXp: 3 },
  'research-axes': { baseXp: 3 },
  'research-quarrying': { baseXp: 4 },
  'research-teamwork': { baseXp: 4 },
  'research-carpentry': { baseXp: 4 },
  'research-masonry': { baseXp: 4 },
  'research-writing': { baseXp: 4 },
  'research-forestry': { baseXp: 4 },
  'research-stonecraft': { baseXp: 4 },
  'research-joinery': { baseXp: 4 },
  'research-architecture': { baseXp: 4 },
  'research-agriculture': { baseXp: 4 },
  'research-engineering': { baseXp: 4 },
}

export const RECRUIT_COST = 15
export const JOBS: Record<
  Exclude<JobId, 'idle'>,
  {
    name: string
    resource: ResourceId
    actionId: ActionId | null
    durationMs: number
  }
> = {
  forager: {
    name: 'Forager',
    resource: 'fruit',
    actionId: 'gather',
    durationMs: 5000,
  },
  woodcutter: {
    name: 'Woodcutter',
    resource: 'wood',
    actionId: 'sticks',
    durationMs: 8000,
  },
  sawyer: {
    name: 'Sawyer',
    resource: 'planks',
    actionId: null,
    durationMs: 8000,
  },
  mason: {
    name: 'Mason',
    resource: 'blocks',
    actionId: null,
    durationMs: 10000,
  },
  scholar: {
    name: 'Scholar',
    resource: 'knowledge',
    actionId: null,
    durationMs: 8000,
  },
  stoneworker: {
    name: 'Stoneworker',
    resource: 'stone',
    actionId: 'stone',
    durationMs: 12000,
  },
}
