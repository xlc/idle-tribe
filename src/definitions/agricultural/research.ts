import type { ResearchId } from '../../ids'
import type { ResearchDefinition } from '../../types'

export const research = {
  agriculture: {
    name: 'Agriculture',
    cost: { knowledge: 180, food: 500, wood: 200, stone: 100, tools: 30 },
    seconds: 21600,
    effect:
      'Enter agricultural era; unlock Farm, Cottages and Granary. Building a Farm retires wild food gathering.',
    description: 'Convince dinner to put down roots.',
    requires: { research: ['preparedness', 'seasonal-knowledge'] },
    effects: {},
    era: 1,
  },
  irrigation: {
    name: 'Irrigation',
    cost: { knowledge: 1200, planks: 480, blocks: 360, tools: 120 },
    seconds: 16200,
    effect: 'Unlock Irrigation works.',
    description: 'Teach water a route that includes the vegetables.',
    requires: { research: ['agriculture'] },
    effects: {},
  },
  'forestry-methods': {
    name: 'Forestry methods',
    cost: { knowledge: 900, wood: 600, planks: 360, tools: 120 },
    seconds: 10800,
    effect: 'Unlock Timber yard conversion.',
    description: 'A little planning saves a lot of arguing with trees.',
    requires: { research: ['agriculture'] },
    effects: {},
  },
  'stone-lifting': {
    name: 'Stone lifting',
    cost: { knowledge: 900, stone: 600, blocks: 360, tools: 120 },
    seconds: 10800,
    effect: 'Unlock Stone pit conversion.',
    description: 'The rock remains heavy, but fewer people have to mention it.',
    requires: { research: ['agriculture'] },
    effects: {},
  },
  'organized-work': {
    name: 'Organized work',
    cost: { knowledge: 1500, planks: 600, blocks: 480, tools: 180 },
    seconds: 21600,
    effect: 'Unlock tier-2 equipment.',
    description: 'Everyone knows which end of the job they are holding.',
    requires: { research: ['irrigation'] },
    effects: {},
  },
  'inventory-keeping': {
    name: 'Inventory keeping',
    cost: { knowledge: 1200, planks: 480, blocks: 360 },
    seconds: 16200,
    effect: 'All storage thresholds \u00d71.50; full-speed offline window +4h.',
    description:
      'We have counted the piles, and some of them were surprisingly large.',
    requires: { research: ['agriculture'] },
    effects: { storage: 1.5, offlineHours: 4 },
    upgrade: {
      maxLevel: 3,
      requires: { research: ['writing'] },
      costMultiplier: 1.75,
      timeMultiplier: 1.2,
      effect: 'Storage thresholds ×1.08 per additional level.',
      effects: { storage: 1.08 },
    },
  },
} satisfies Partial<Record<ResearchId, ResearchDefinition>>
