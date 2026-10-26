import type {
  ActionId,
  BuildingId,
  PerkId,
  ProductionJob,
  ResearchId,
  ResourceId,
  WorkingJob,
} from '../ids'
import type {
  ActionDefinition,
  BuildingDefinition,
  FormDefinition,
  JobDefinition,
  OccupationDefinition,
  PerkDefinition,
  ResearchDefinition,
  ResourceDefinition,
} from '../types'

export interface EraDefinition {
  index: number
  name: string
  description: string
  landscape: 'camp' | 'town' | 'future'
  resources: Partial<Record<ResourceId, ResourceDefinition>>
  buildings: Partial<Record<BuildingId, BuildingDefinition>>
  buildingUpgrades: Partial<Record<BuildingId, FormDefinition[]>>
  research: Partial<Record<ResearchId, ResearchDefinition>>
  jobs: Partial<Record<ProductionJob, JobDefinition>>
  occupations: Partial<Record<WorkingJob, OccupationDefinition>>
  actions: Partial<Record<ActionId, ActionDefinition>>
  perks: Partial<Record<PerkId, PerkDefinition>>
}
