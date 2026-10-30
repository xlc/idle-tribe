import type { BuildingId } from '../../ids'
import type { BuildingDefinition } from '../../types'

export const buildings = {
  housing: {
    forms: [
      {
        name: 'Shelters',
        description: 'A roof over your head beats a leaf on your head.',
        cost: { wood: 20, food: 10 },
        work: 2,
        requires: { research: ['shelters'] },
        housing: 2,
      },
    ],
    effect: 'Housing; later forms increase capacity.',
  },
  stockyard: {
    forms: [
      {
        name: 'Barn',
        description:
          'One roof for every pile: food, materials, tools, and ideas.',
        cost: { wood: 40, stone: 20 },
        work: 3,
        requires: { research: ['shelters'] },
        storage: {
          food: 400,
          wood: 300,
          stone: 300,
          planks: 150,
          blocks: 150,
          tools: 60,
          knowledge: 100,
        },
      },
    ],
    effect:
      'General storage for every early resource; later forms add capacity.',
  },
  library: {
    forms: [
      {
        name: 'Records shelter',
        description: 'Good ideas finally have somewhere to stay overnight.',
        cost: { planks: 10, blocks: 5 },
        work: 4,
        requires: { research: ['oral-tradition'] },
      },
    ],
    effect:
      'Unlocks the research queue; later archives store knowledge and data.',
  },
  'builders-lodge': {
    forms: [
      {
        name: "Builders' lodge",
        description:
          'More builders, fewer arguments about who is holding the ladder.',
        cost: { planks: 15, blocks: 10 },
        work: 6,
        requires: { research: ['masonry'] },
      },
    ],
    effect: '+1 organized crew size per level',
    crew: 1,
  },
  'supply-post': {
    forms: [
      {
        name: 'Supply post',
        description:
          'Someone remembered to pack for the part where you are away.',
        cost: { planks: 20, blocks: 10, tools: 5 },
        work: 10,
        requires: { research: ['preparedness'] },
      },
    ],
    effect: '+2 \u00d7 sqrt(level) full-speed offline hours',
    offlineHours: 2,
  },
  foraging: {
    forms: [
      {
        name: 'Foraging camp',
        description:
          'A meeting point for people who know which bushes are lunch.',
        cost: { wood: 10 },
        work: 1,
        requires: { research: ['shelters'] },
      },
    ],
    effect: '2 food gathering slots per level; equipment improves automation.',
    job: 'forager',
  },
  lumber: {
    forms: [
      {
        name: 'Lumber camp',
        description: 'Where standing timber begins a career in construction.',
        cost: { wood: 15 },
        work: 2,
        requires: { research: ['shelters'], discovery: 'wood' },
      },
    ],
    effect:
      '2 wood gathering slots per level; forms and equipment improve automation.',
    job: 'woodcutter',
  },
  quarry: {
    forms: [
      {
        name: 'Quarry',
        description: 'A reliable source of rocks and opinions about rocks.',
        cost: { wood: 20, stone: 10 },
        work: 3,
        requires: { research: ['stone-tools'] },
      },
    ],
    effect:
      '2 stone gathering slots per level; forms and equipment improve automation.',
    job: 'stoneworker',
  },
  'expedition-camp': {
    forms: [
      {
        name: 'Expedition camp',
        description:
          'Base camp for people who keep coming back with interesting stories.',
        cost: { wood: 15, food: 10 },
        work: 3,
        requires: { research: ['shelters'], expedition: true },
      },
    ],
    effect: 'Explorer workplace; 2 explore slots per level',
    job: 'explorer',
  },
  sawmill: {
    forms: [
      {
        name: 'Sawmill',
        description: 'Logs enter round and leave with better prospects.',
        cost: { wood: 50, stone: 30 },
        work: 5,
        requires: { research: ['carpentry'] },
        rate: 0.5,
      },
    ],
    effect: 'Plank production; later forms improve the base rate.',
    job: 'sawyer',
  },
  stoneworks: {
    forms: [
      {
        name: 'Stoneworks',
        description:
          'We found the useful blocks hiding inside the awkward rocks.',
        cost: { wood: 40, stone: 50 },
        work: 5,
        requires: { research: ['masonry'] },
        rate: 0.5,
      },
    ],
    effect: 'Block production; later forms improve the base rate.',
    job: 'mason',
  },
  'tool-workshop': {
    forms: [
      {
        name: 'Tool workshop',
        description: 'Making the tools that make making things easier.',
        cost: { planks: 20, blocks: 10 },
        work: 8,
        requires: { research: ['toolmaking'] },
        rate: 0.1,
      },
    ],
    effect: 'Tool production; later forms improve the base rate.',
    job: 'toolmaker',
  },
  study: {
    forms: [
      {
        name: 'Learning circle',
        description:
          'Sit down with a question and leave with several better ones.',
        cost: { planks: 20, blocks: 10, food: 50 },
        work: 6,
        requires: { research: ['oral-tradition'] },
        rate: 0.25,
      },
    ],
    effect: 'Knowledge production; later forms improve the base rate.',
    job: 'scholar',
  },
} satisfies Partial<Record<BuildingId, BuildingDefinition>>
