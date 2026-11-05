import type { EraDefinition } from '../types'
import { buildings } from './buildings'
import { jobs } from './jobs'
import { research } from './research'
import { resources } from './resources'

export const QUANTUM = {
  name: 'Quantum',
  landscape: 'future',
  description: 'Very small things are making very large demands.',
  resources,
  buildings,
  research,
  jobs,
  actions: {},
  equipment: [],
  perks: {},
} satisfies EraDefinition
