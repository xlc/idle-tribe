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

export type ResearchGroupId =
  | 'foundations'
  | 'production'
  | 'specialization'
  | 'development'

export type ResearchSpecialization =
  | { kind: 'choice'; id: Specialization; description: string }
  | { kind: 'requirement'; id: Specialization }

export interface ResearchDefinition {
  actionId: ActionId
  name: string
  prerequisite: (state: GameState) => boolean
  effect: (level: number) => string
  group: ResearchGroupId
  requirement: string
  specialization?: ResearchSpecialization
  onFirstCompletion?: (state: GameState) => void
  populationCapacity?: (level: number) => number
  workerMultiplier?: (level: number) => number
  levels: ResearchCost[]
}

export interface Action {
  id: ActionId
  name: string
  researchId?: ResearchId
  baseDurationMs: number | (() => number)
  visible?: () => boolean
  discovery?: boolean
  canStart?: () => boolean
  cost?: () => Cost | null
  complete: () => string
}
