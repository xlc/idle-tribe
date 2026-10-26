import type {
  ActionId,
  BuildingId,
  PerkId,
  ProductionJob,
  ResearchId,
  ResourceId,
  WorkingJob,
} from '../ids'
import { BUILDING_IDS } from '../ids'
import { createRecord } from '../records'
import type {
  ActionDefinition,
  BuildingDefinition,
  JobDefinition,
  OccupationDefinition,
  PerkDefinition,
  ResearchDefinition,
  ResourceDefinition,
} from '../types'
import { AGRICULTURAL } from './agricultural'
import { BEYOND_QUANTUM } from './beyond-quantum'
import { DIGITAL } from './digital'
import { INDUSTRIAL } from './industrial'
import { QUANTUM } from './quantum'
import { SPACE } from './space'
import { TOWN } from './town'
import { TRIBAL } from './tribal'
import type { EraDefinition } from './types'

export const ERA_DEFINITIONS: readonly EraDefinition[] = [
  TRIBAL,
  AGRICULTURAL,
  TOWN,
  INDUSTRIAL,
  DIGITAL,
  SPACE,
  QUANTUM,
  BEYOND_QUANTUM,
]

export const EQUIPMENT = ERA_DEFINITIONS.flatMap((era) => era.equipment)

export const ERAS = ERA_DEFINITIONS.map(({ name, landscape, description }) => ({
  name,
  landscape,
  description,
}))

export const RESOURCE_INFO: Record<ResourceId, ResourceDefinition> = {
  ...TRIBAL.resources,
  ...AGRICULTURAL.resources,
  ...TOWN.resources,
  ...INDUSTRIAL.resources,
  ...DIGITAL.resources,
  ...SPACE.resources,
  ...QUANTUM.resources,
  ...BEYOND_QUANTUM.resources,
}

export const RESEARCH: Record<ResearchId, ResearchDefinition> = {
  ...TRIBAL.research,
  ...AGRICULTURAL.research,
  ...TOWN.research,
  ...INDUSTRIAL.research,
  ...DIGITAL.research,
  ...SPACE.research,
  ...QUANTUM.research,
  ...BEYOND_QUANTUM.research,
}

export const JOBS: Record<ProductionJob, JobDefinition> = {
  ...TRIBAL.jobs,
  ...AGRICULTURAL.jobs,
  ...TOWN.jobs,
  ...INDUSTRIAL.jobs,
  ...DIGITAL.jobs,
  ...SPACE.jobs,
  ...QUANTUM.jobs,
  ...BEYOND_QUANTUM.jobs,
}

export const OCCUPATIONS: Record<WorkingJob, OccupationDefinition> = {
  ...JOBS,
  ...TRIBAL.occupations,
  ...AGRICULTURAL.occupations,
  ...TOWN.occupations,
  ...INDUSTRIAL.occupations,
  ...DIGITAL.occupations,
  ...SPACE.occupations,
  ...QUANTUM.occupations,
  ...BEYOND_QUANTUM.occupations,
}

export const ACTIONS: Record<ActionId, ActionDefinition> = {
  ...TRIBAL.actions,
  ...AGRICULTURAL.actions,
  ...TOWN.actions,
  ...INDUSTRIAL.actions,
  ...DIGITAL.actions,
  ...SPACE.actions,
  ...QUANTUM.actions,
  ...BEYOND_QUANTUM.actions,
}

export const PERKS: Record<PerkId, PerkDefinition> = {
  ...TRIBAL.perks,
  ...AGRICULTURAL.perks,
  ...TOWN.perks,
  ...INDUSTRIAL.perks,
  ...DIGITAL.perks,
  ...SPACE.perks,
  ...QUANTUM.perks,
  ...BEYOND_QUANTUM.perks,
}

const BASE_BUILDINGS: Record<BuildingId, BuildingDefinition> = {
  ...TRIBAL.buildings,
  ...AGRICULTURAL.buildings,
  ...TOWN.buildings,
  ...INDUSTRIAL.buildings,
  ...DIGITAL.buildings,
  ...SPACE.buildings,
  ...QUANTUM.buildings,
  ...BEYOND_QUANTUM.buildings,
}

// Append later-era forms chronologically, preserving the saved form indexes.
export const BUILDINGS = createRecord(BUILDING_IDS, (id) => ({
  ...BASE_BUILDINGS[id],
  forms: [
    ...BASE_BUILDINGS[id].forms,
    ...ERA_DEFINITIONS.flatMap((era) => era.buildingUpgrades[id] ?? []),
  ],
}))
