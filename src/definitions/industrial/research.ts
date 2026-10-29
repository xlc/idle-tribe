import type { ResearchId } from '../../ids'
import type { ResearchDefinition } from '../../types'

export const research = {
  mechanization: {
    name: 'Mechanization',
    cost: { knowledge: 2500, planks: 600, blocks: 600, tools: 200 },
    seconds: 21600,
    effect:
      'Enter the industrial era; unlock mines, foundries, machine shops, and industrial storage.',
    description: 'The heavy lifting has been offered to something with gears.',
    requires: { research: ['civic-engineering', 'record-keeping'] },
    effects: {},
    era: 3,
  },
  'powered-workshops': {
    name: 'Powered workshops',
    requires: { research: ['mechanization'] },
    cost: { knowledge: 1200, metal: 100, machinery: 30 },
    seconds: 16200,
    effect:
      'Unlock mechanical extraction, processing, and tool workshop forms.',
    description: 'The river has agreed to take the heavier shifts.',
    effects: {},
  },
  'precision-instruments': {
    name: 'Precision instruments',
    requires: { research: ['mechanization'] },
    cost: { knowledge: 1400, metal: 80, machinery: 20, tools: 50 },
    seconds: 16200,
    effect: 'Unlock Chronometry and a controlled investigation of time.',
    description: 'The measurements have become too precise to blame the ruler.',
    effects: {},
  },
  chronometry: {
    name: 'Chronometry',
    requires: { research: ['precision-instruments'] },
    cost: { knowledge: 2000, metal: 120, machinery: 40 },
    seconds: 21600,
    effect: 'Discover the mysterious time box and optional prestige.',
    description:
      'One instrument keeps recording tomorrow before anyone has ordered it.',
    effects: {},
    discoverTimeBox: true,
  },
  'lean-fabrication': {
    name: 'Lean fabrication',
    requires: { research: ['forestry', 'mechanization'] },
    cost: { knowledge: 1800, metal: 80, machinery: 20 },
    seconds: 16200,
    effect: 'Toolmaker, machinist, and electronics recipe inputs \u00d70.80.',
    description: 'Even the leftovers have been given something useful to do.',
    effects: {
      recipeMultiplier: {
        toolmaker: 0.8,
        machinist: 0.8,
        'electronics-worker': 0.8,
      },
    },
    upgrade: {
      maxLevel: 3,
      requires: { research: ['electronics'] },
      costMultiplier: 1.75,
      timeMultiplier: 1.2,
      effect: 'Selected workshop inputs ×0.96 per additional level.',
      effects: {
        recipeMultiplier: {
          toolmaker: 0.96,
          machinist: 0.96,
          'electronics-worker': 0.96,
        },
      },
    },
  },
  'structural-systems': {
    name: 'Structural systems',
    requires: { research: ['architecture', 'mechanization'] },
    cost: { knowledge: 1800, metal: 100, machinery: 30 },
    seconds: 16200,
    effect: 'Housing contribution and all storage capacities \u00d71.20.',
    description:
      'The foundations are prepared for a rather ambitious conversation.',
    effects: { housing: 1.2, storage: 1.2 },
    upgrade: {
      maxLevel: 2,
      requires: { research: ['electronics'] },
      costMultiplier: 1.75,
      timeMultiplier: 1.2,
      effect: 'Housing and storage capacity ×1.08 per additional level.',
      effects: { housing: 1.08, storage: 1.08 },
    },
  },
} satisfies Partial<Record<ResearchId, ResearchDefinition>>
