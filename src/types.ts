import type {
  ActionId,
  ActionJob,
  BuildingId,
  JobId,
  PerkId,
  ResearchId,
  ResourceId,
  SpecializationId,
  WorkingJob,
} from './ids'

export type ActionBonus = Partial<Record<ActionId, number>>

export type {
  ActionId,
  BuildingId,
  JobId,
  PerkId,
  ResearchId,
  ResourceId,
  WorkingJob,
} from './ids'
export type Cost = Partial<Record<ResourceId, number>>
export type Specialization = SpecializationId

export interface ResourceDefinition {
  name: string
  description: string
  threshold: number
}
export interface EquipmentDefinition {
  research: ResearchId
  cost: Cost
  work: number
  description: string
}
export interface PerkDefinition {
  name: string
  cost: number
  effect: string
  description: string
}
interface ActionDefinitionBase {
  name: string
  description: string
  levelEffect: string
  seconds: number
  baseXp: number
  cost: Cost
  building: BuildingId
  job: ActionJob
  visible: (state: GameState) => boolean
  hiddenReason?: (state: GameState) => string
}
export type ActionDefinition =
  | (ActionDefinitionBase & {
      kind: 'resource'
      resource: ResourceId
      amount: number
    })
  | (ActionDefinitionBase & {
      kind: 'exploration'
      resource?: never
      amount?: never
    })

export interface Requirements {
  research?: ResearchId[]
  anyResearch?: ResearchId[]
  discovery?: 'wood' | 'stone'
  perk?: PerkId
  facilities?: Partial<Record<BuildingId, number>>
  expedition?: boolean
}
export interface Effects {
  jobBonus?: Partial<Record<JobId, number>>
  specialization?: Partial<Record<JobId, number>>
  recipeMultiplier?: Partial<Record<JobId, number>>
  recipeReduction?: Partial<Record<JobId, Cost>>
  actionAutomation?: ActionBonus
  actionXp?: ActionBonus
  actionYield?: ActionBonus
  storage?: number
  resourceStorage?: Cost
  housing?: number
  crew?: number
  offlineHours?: number
}
export interface ResearchDefinition {
  name: string
  description: string
  requires: Requirements
  cost: Cost
  minutes: number
  effect: string
  effects: Effects
  branch?: Specialization
  branchIdentity?: string
  grant?: { building: BuildingId; job: JobId }
  era?: number
  unlockHappiness?: boolean
  discoverTimeBox?: boolean
}
export interface FormDefinition {
  name: string
  description: string
  requires: Requirements
  cost: Cost
  work: number
  rate?: number
  actionAutomation?: ActionBonus
  storage?: Cost
  housing?: number
  input?: Cost
  offlineHours?: number
}
export interface BuildingDefinition {
  forms: FormDefinition[]
  effect: string
  job?: JobId
  unique?: boolean
  crew?: number
  leisure?: number
  amenities?: number
  offlineHours?: number
  jobBonus?: Partial<Record<JobId, number>>
}
export interface OccupationDefinition {
  name: string
  aptitude: string
  learning: 'production' | 'construction'
}
export interface JobDefinition extends OccupationDefinition {
  description: string
  output: ResourceId
  input: Cost
}
export interface Person {
  name: string
  health: number
  job: JobId
  progress: number
  aptitude: WorkingJob
  practice: Record<WorkingJob, number>
}
export interface Facility {
  level: number
  form: number
  equipment: number
}
export type Project =
  | { kind: 'research'; id: ResearchId }
  | { kind: 'expand'; id: BuildingId; target: number; form: number }
  | { kind: 'convert'; id: BuildingId; form: number }
  | { kind: 'equip'; id: BuildingId; target: number }
export interface QueueEntry {
  sequence: number
  project: Project
}
export interface ActiveProject extends QueueEntry {
  paid: Cost
  progress: number
  total: number
}
export interface ProjectQueue {
  active: ActiveProject | null
  waiting: QueueEntry[]
}
export type QueueId = 'research' | 'construction'
export interface ManualAction {
  id: ActionId
  paid: Cost
  progress: number
}
export interface Absence {
  start: number
  windowHours: number
  settledSeconds: number
  resources: Record<ResourceId, number>
  population: number
  expertise: Record<WorkingJob, number>[]
  completed: number
}
export interface GameState {
  actionSkills: Record<ActionId, { level: number; xp: number }>
  actionProgress: Record<ActionId, number>
  resources: Record<ResourceId, number>
  facilities: Record<BuildingId, Facility>
  research: Record<ResearchId, boolean>
  people: Person[]
  nameSeed: number
  discovered: { wood: boolean; stone: boolean }
  exploreUnlocked: boolean
  researchUnlocked: boolean
  expeditionUnlocked: boolean
  exploreRolls: number
  queues: Record<QueueId, ProjectQueue>
  nextSequence: number
  manual: ManualAction | null
  minuteProgress: number
  arrivalProgress: number
  welcome: boolean
  happiness: number
  era: number
  specialization: Specialization | null
  savedAt: number
  absence: Absence | null
  completedProjects: number
  notice: string
  legacy: {
    discovered: boolean
    lifetime: number
    points: number
    highestEra: number
    perks: Record<PerkId, boolean>
  }
}
