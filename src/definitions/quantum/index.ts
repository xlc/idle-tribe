import type { EraDefinition } from '../types'
import { buildingUpgrades } from './building-upgrades'
import { buildings } from './buildings'
import { jobs } from './jobs'
import { research } from './research'
import { resources } from './resources'

export const QUANTUM = {
  index: 6,
  name: 'Quantum',
  landscape: 'future',
  description: 'Very small things are making very large demands.',
  resources,
  buildings,
  buildingUpgrades,
  research,
  jobs,
  occupations: {},
  actions: {},
  perks: {},
} satisfies EraDefinition
