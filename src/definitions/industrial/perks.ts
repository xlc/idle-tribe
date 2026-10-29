import type { PerkId } from '../../ids'
import type { PerkDefinition } from '../../types'

export const perks = {
  'longer-preparations': {
    name: 'Longer preparations',
    cost: 10,
    effect: '+2h full-speed offline window.',
    description: 'Past you has thoughtfully packed a little extra future.',
  },
  'efficient-instruction': {
    name: 'Efficient instruction',
    cost: 15,
    effect: 'Research material costs −10%.',
    description: 'A useful head start on questions you have asked before.',
  },
  'early-astronomy': {
    name: 'Early astronomy',
    cost: 20,
    effect: 'Unlock optional town astronomy research.',
    description: 'A lasting suspicion that looking up might pay off.',
  },
  'organized-records': {
    name: 'Organized records',
    cost: 25,
    effect: 'All storage capacities ×1.10.',
    description: 'The piles are finally on speaking terms with the paperwork.',
  },
} satisfies Partial<Record<PerkId, PerkDefinition>>
