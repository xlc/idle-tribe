import type { ResearchId } from '../../ids'
import type { ResearchDefinition } from '../../types'

export const research = {
  electronics: {
    name: 'Electronics',
    requires: { research: ['powered-workshops'] },
    cost: { knowledge: 3500, metal: 250, machinery: 80, tools: 100 },
    seconds: 32400,
    effect:
      'Enter the digital era; unlock power, electronics, batteries, and data storage.',
    description: 'Let very small switches make some very big decisions.',
    effects: {},
    era: 4,
  },
  computing: {
    name: 'Computing',
    requires: { research: ['electronics'] },
    cost: { knowledge: 2500, circuits: 80, charge: 500, machinery: 40 },
    seconds: 21600,
    effect:
      'Unlock Computing center, Research institute, and Technical archive.',
    description:
      'A billion small calculations have requested a room of their own.',
    effects: {},
  },
  automation: {
    name: 'Automation',
    requires: { research: ['computing'] },
    cost: { knowledge: 3500, data: 300, circuits: 150, machinery: 80 },
    seconds: 21600,
    effect: 'Unlock Electric foundry and Automated machine shop.',
    description:
      'The machines have learned to leave fewer questions for the morning shift.',
    effects: {},
  },
  'distributed-records': {
    name: 'Distributed records',
    requires: { research: ['computing'] },
    cost: { knowledge: 2500, data: 300, circuits: 80 },
    seconds: 16200,
    effect:
      'Full-speed offline window +4h; knowledge and data thresholds \u00d71.25.',
    description: 'Several copies of the facts have agreed to keep in touch.',
    effects: {
      offlineHours: 4,
      resourceStorage: { knowledge: 1.25, data: 1.25 },
    },
    upgrade: {
      maxLevel: 2,
      requires: { research: ['orbital-flight'] },
      costMultiplier: 1.75,
      timeMultiplier: 1.2,
      effect: 'Knowledge and data thresholds ×1.08 per additional level.',
      effects: {
        resourceStorage: { knowledge: 1.08, data: 1.08 },
      },
    },
  },
} satisfies Partial<Record<ResearchId, ResearchDefinition>>
