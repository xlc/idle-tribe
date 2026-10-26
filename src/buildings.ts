import { ADVANCED_BUILDINGS } from './buildings/advanced'
import { PRODUCTION_BUILDINGS } from './buildings/production'
import { SUPPORT_BUILDINGS } from './buildings/support'
import type { BuildingId } from './ids'
import type { BuildingDefinition } from './types'

export const BUILDINGS: Record<BuildingId, BuildingDefinition> = {
  ...SUPPORT_BUILDINGS,
  ...PRODUCTION_BUILDINGS,
  ...ADVANCED_BUILDINGS,
}

export const WORKERS_PER_BUILDING_LEVEL = 2
