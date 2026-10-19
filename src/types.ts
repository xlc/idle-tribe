import type { ActionId, BuildingId, JobId, ResearchId, ResourceId } from './ids'

export type {
  ActionId,
  ActionKey,
  BuildingId,
  JobId,
  ResearchId,
  ResourceId,
} from './ids'

export type Cost = Partial<Record<ResourceId, number>>
export type Specialization = 'forestry' | 'stonecraft'

export interface Person {
  job: JobId
  isPlayer: boolean
  workElapsedMs: number
  name: string
  hunger: number
  maxHunger: number
}

export interface Skill {
  level: number
  xp: number
}

export interface GameState {
  version: 4
  fruit: number
  planks: number
  blocks: number
  knowledge: number
  buildings: Record<BuildingId, number>
  specialization: Specialization | null
  savedAt: number
  wood: number
  stone: number
  people: Person[]
  actions: number
  explored: boolean
  exploreUnlocked: boolean
  stoneFound: boolean
  researchUnlocked: boolean
  basicTools: boolean
  researchLevels: Record<ResearchId, number>
  seenResearchLevels: Record<ResearchId, number>
  skills: Record<ActionId, Skill>
  foodElapsedMs: number
}

export interface ResearchCost extends Cost {
  durationMs: number
}

export interface ResearchDefinition {
  actionId: ActionId
  name: string
  maxLevel: number
  prerequisite: () => boolean
  levels: ResearchCost[]
}

export interface Action {
  id: ActionId
  name: string
  researchId?: ResearchId
  baseDurationMs: number | (() => number)
  workingFeedback: string
  canStart?: () => boolean
  unavailableMessage?: string | (() => string)
  cost?: () => Cost | null
  complete: () => string
}
