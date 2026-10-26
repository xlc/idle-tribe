import type { BuildingId } from '../../ids'
import type { FormDefinition } from '../../types'

export const buildingUpgrades = {
  housing: [
    {
      name: 'Quantum habitat',
      description:
        'Room for everyone, with unusually thoughtful arrangements for the furniture.',
      requires: { research: ['coherent-assembly'] },
      cost: { metal: 200, circuits: 50, 'quantum-components': 10 },
      work: 40,
      housing: 24,
    },
  ],
  library: [
    {
      name: 'Quantum archive',
      description:
        'Every record has a carefully measured place to be uncertain.',
      requires: { research: ['quantum-engineering'] },
      cost: { metal: 250, circuits: 100, 'exotic-material': 40, data: 200 },
      work: 25,
      storage: { knowledge: 4000, data: 2000 },
      offlineHours: 1,
    },
  ],
} satisfies Partial<Record<BuildingId, FormDefinition[]>>
