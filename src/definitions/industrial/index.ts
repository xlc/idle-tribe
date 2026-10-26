import type { EraDefinition } from '../types'
import { buildingUpgrades } from './building-upgrades'
import { buildings } from './buildings'
import { jobs } from './jobs'
import { perks } from './perks'
import { research } from './research'
import { resources } from './resources'

export const INDUSTRIAL = {
  name: 'Industrial',
  landscape: 'future',
  description: 'The settlement has discovered a louder way to work.',
  resources,
  buildings,
  buildingUpgrades,
  research,
  jobs,
  occupations: {},
  actions: {},
  equipment: [],
  perks,
} satisfies EraDefinition
