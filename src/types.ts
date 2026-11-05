import type {
  ActionId,
  ActionJob,
  BuildingId,
  ExpeditionEncounterId,
  JobId,
  NoteId,
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
  ExpeditionEncounterId,
  JobId,
  NoteId,
  PerkId,
  ResearchId,
  ResourceId,
  WorkingJob,
} from './ids'
export type Cost = Partial<Record<ResourceId, number>>
export type Specialization = SpecializationId
export type EncounterOptionIndex = 0 | 1
export type EncounterEffect =
  | { kind: 'resources'; amount: Cost }
  | { kind: 'happiness'; amount: number }
  | { kind: 'arrival' }
export type ExploreOutcome =
  | { kind: 'resources'; amount: Cost }
  | { kind: 'discovery'; discovery: 'wood' | 'stone' }
  | { kind: 'knowledge'; amount: number }
  | { kind: 'experience'; amount: number }
  | { kind: 'encounter'; id: ExpeditionEncounterId }
  | { kind: 'arrival' }
  | { kind: 'happiness'; amount: number }
export interface EncounterOption {
  label: string
  description: string
  effect: EncounterEffect
}
export interface ExpeditionEncounter {
  id: ExpeditionEncounterId
  title: string
  description: string
  minimumLevel: number
  weight: number
  automatedOption: EncounterOptionIndex
  options: readonly [EncounterOption, EncounterOption]
}

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
  seconds: number
  baseXp: number
  // XP granted per completion; defaults to 1 when unset.
  xp?: number
  cost: Cost
  // Overrides cost with a state-dependent price (e.g. one that scales with
  // population); the paid snapshot still freezes the price at start.
  scaledCost?: (state: GameState) => Cost
  building: BuildingId
  job: ActionJob
  visible: (state: GameState) => boolean
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
  | (ActionDefinitionBase & {
      kind: 'arrival'
      scaledCost: (state: GameState) => Cost
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
  actionDuration?: ActionBonus
  actionXp?: ActionBonus
  actionYield?: ActionBonus
  storage?: number
  resourceStorage?: Cost
  housing?: number
  crew?: number
  offlineHours?: number
}
export interface ResearchUpgradeDefinition {
  maxLevel: number
  requires: Requirements
  costMultiplier: number
  timeMultiplier: number
  effect: string | readonly string[]
  effects: Effects
}
export interface ResearchDefinition {
  name: string
  description: string
  requires: Requirements
  cost: Cost
  seconds: number
  effect: string | readonly string[]
  effects: Effects
  upgrade?: ResearchUpgradeDefinition
  branch?: Specialization
  branchIdentity?: string
  unlocksJobs?: boolean
  era?: number
  unlockHappiness?: boolean
  discoverTimeBox?: boolean
}
export interface BuildingDefinition {
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
  effect: string
  job?: JobId | readonly JobId[]
  unique?: boolean
  crew?: number
  leisure?: number
  amenities?: number
  jobBonus?: Partial<Record<JobId, number>>
}
export interface JobDefinition {
  name: string
  aptitude: string
  learning: 'production' | 'construction'
  output?: ResourceId
  input?: Cost
}
export interface Person {
  name: string
  job: JobId
  progress: number
  aptitude: WorkingJob
  practice: Record<WorkingJob, number>
}
export interface Facility {
  level: number
  equipment: number
}
export type Project =
  | { kind: 'research'; id: ResearchId; target?: number }
  | { kind: 'expand'; id: BuildingId; target: number }
  | { kind: 'equip'; id: BuildingId; target: number }
export interface QueueEntry {
  sequence: number
  project: Project
}
export interface ActiveProject extends QueueEntry {
  paid: Cost
  progress: number
  total: number
  worker?: number
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
  // Index of the idle person running this action.
  person: number
}
export interface Absence {
  start: number
  windowHours: number
  settledSeconds: number
  resources: Record<ResourceId, number>
  population: number
  expertise: Record<WorkingJob, number>[]
  completed: number
  encounters: number
}
export interface GameState {
  actionSkills: Record<ActionId, { level: number; xp: number }>
  actionProgress: Record<ActionId, number>
  resources: Record<ResourceId, number>
  facilities: Record<BuildingId, Facility>
  research: Record<ResearchId, number>
  people: Person[]
  nameSeed: number
  discovered: { wood: boolean; stone: boolean }
  exploreUnlocked: boolean
  researchUnlocked: boolean
  expeditionUnlocked: boolean
  exploreRolls: number
  pendingEncounter: ExpeditionEncounterId | null
  completedEncounters: Record<ExpeditionEncounterId, boolean>
  seenNotes: Record<NoteId, boolean>
  queues: Record<QueueId, ProjectQueue>
  nextSequence: number
  manual: ManualAction[]
  minuteProgress: number
  happiness: number
  era: number
  specialization: Specialization | null
  savedAt: number
  absence: Absence | null
  completedProjects: number
  notice: string
  lastExploreOutcome: ExploreOutcome | null
  legacy: {
    discovered: boolean
    lifetime: number
    points: number
    highestEra: number
    perks: Record<PerkId, boolean>
  }
}
