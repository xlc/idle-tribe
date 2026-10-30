import type { ResearchId } from '../../ids'
import type { ResearchDefinition } from '../../types'

export const research = {
  'sharpened-stick': {
    name: 'Sharpened stick',
    cost: { wood: 6, food: 5 },
    seconds: 8,
    effect: ['+25% food gathering output', '+2% automation'],
    description: 'A stick with a surprisingly convincing point.',
    requires: { research: [], discovery: 'wood' },
    effects: {
      actionYield: { gather: 0.25 },
      actionAutomation: { gather: 0.02 },
    },
  },
  shelters: {
    name: 'Shelters',
    cost: { wood: 15, food: 10 },
    seconds: 16,
    effect:
      'Unlock housing, camps, basic storage, immigration; grant first Foraging camp.',
    description: 'The weather can conduct its business outside.',
    requires: { research: ['sharpened-stick'] },
    effects: {},
    grant: { building: 'foraging' },
  },
  'stone-tools': {
    name: 'Stone tools',
    cost: { wood: 20, stone: 15, food: 10 },
    seconds: 36,
    effect: 'Unlock Quarry.',
    description: 'Some rocks are better at convincing other rocks.',
    requires: { research: ['sharpened-stick'], discovery: 'stone' },
    effects: {},
  },
  carpentry: {
    name: 'Carpentry',
    cost: { wood: 60, stone: 30 },
    seconds: 48,
    effect: 'Unlock Sawmill and Warehouse.',
    description: 'Wood behaves better once you explain the corners.',
    requires: { research: ['shelters', 'stone-tools'] },
    effects: {},
  },
  masonry: {
    name: 'Masonry',
    cost: { wood: 40, stone: 80 },
    seconds: 72,
    effect: "Unlock Stoneworks and Builders' lodge; organized crew size +1.",
    description: 'The trick is putting the heavy bit on another heavy bit.',
    requires: { research: ['stone-tools'] },
    effects: { crew: 1 },
  },
  'oral-tradition': {
    name: 'Oral tradition',
    cost: { food: 100, planks: 20 },
    seconds: 144,
    effect:
      'Unlock Learning circle and Records shelter; automated gathering XP +2 percentage points.',
    description:
      'Good advice travels farther when someone remembers the middle.',
    requires: { research: ['shelters', 'carpentry'] },
    effects: { actionXp: { gather: 0.02, sticks: 0.02, stone: 0.02 } },
  },
  toolmaking: {
    name: 'Toolmaking',
    cost: { planks: 50, blocks: 30 },
    seconds: 144,
    effect: 'Unlock Tool workshop and tier-1 equipment.',
    description: "Perhaps the next difficult job could be the tool's problem.",
    requires: { research: ['carpentry', 'masonry'] },
    effects: {},
  },
  preparedness: {
    name: 'Preparedness',
    cost: { knowledge: 40, tools: 20, food: 150 },
    seconds: 240,
    effect: 'Unlock Supply post.',
    description:
      "Tomorrow's problems have been asked to arrive by appointment.",
    requires: { research: ['oral-tradition', 'toolmaking'] },
    effects: {},
  },
  'seasonal-knowledge': {
    name: 'Seasonal knowledge',
    cost: { knowledge: 120, planks: 50, blocks: 30, tools: 10 },
    seconds: 360,
    effect: 'Food gathering automation +3 percentage points.',
    description: 'The bushes have a schedule, and we are finally catching on.',
    requires: { research: ['oral-tradition', 'toolmaking'] },
    effects: { actionAutomation: { gather: 0.03 } },
  },
} satisfies Partial<Record<ResearchId, ResearchDefinition>>
