import type { BuildingId } from '../ids'
import type { BuildingDefinition } from '../types'

export const PRODUCTION_BUILDINGS = {
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
      {
        name: 'Timber yard',
        description:
          'More timber, neatly arranged for its upcoming life as something else.',
        requires: { research: ['forestry-methods'] },
        cost: { planks: 20, blocks: 10, tools: 3 },
        work: 6,
        actionAutomation: { sticks: 0.05 },
      },
      {
        name: 'Mechanical timber yard',
        description:
          'The trees have noticed that the tools are getting louder.',
        requires: { research: ['powered-workshops'] },
        cost: { planks: 40, blocks: 30, metal: 20, machinery: 5 },
        work: 12,
        actionAutomation: { sticks: 0.1 },
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
      {
        name: 'Stone pit',
        description: 'The good rocks were underneath the other rocks.',
        requires: { research: ['stone-lifting'] },
        cost: { planks: 15, blocks: 20, tools: 3 },
        work: 6,
        actionAutomation: { stone: 0.05 },
      },
      {
        name: 'Mechanical quarry',
        description:
          'The rocks remain stubborn, but the machines have excellent patience.',
        requires: { research: ['powered-workshops'] },
        cost: { planks: 30, blocks: 40, metal: 20, machinery: 5 },
        work: 12,
        actionAutomation: { stone: 0.1 },
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
      {
        name: 'Mechanical sawmill',
        description: 'The logs are forming a very orderly queue.',
        requires: { research: ['powered-workshops'] },
        cost: { planks: 50, blocks: 40, metal: 25, machinery: 10 },
        work: 12,
        rate: 1.5,
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
      {
        name: 'Mechanical stoneworks',
        description: 'Square corners have become a regular appointment.',
        requires: { research: ['powered-workshops'] },
        cost: { planks: 40, blocks: 50, metal: 25, machinery: 10 },
        work: 12,
        rate: 1.5,
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
      {
        name: 'Mechanical tool workshop',
        description: 'The tools now have tools of their own.',
        requires: { research: ['powered-workshops'] },
        cost: { planks: 40, blocks: 30, metal: 30, machinery: 10 },
        work: 15,
        rate: 0.3,
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
      {
        name: 'School',
        description: 'A place to learn how much there is left to learn.',
        requires: { research: ['writing'] },
        cost: { planks: 25, blocks: 15, tools: 5 },
        work: 8,
        rate: 0.75,
      },
      {
        name: 'Research institute',
        description:
          'A larger building for discovering how many questions the school missed.',
        requires: { research: ['computing'] },
        cost: { metal: 100, machinery: 30, circuits: 50 },
        work: 20,
        rate: 2.25,
      },
    ],
    effect: 'Knowledge production; later forms improve the base rate.',
    job: 'scholar',
  },
  farm: {
    forms: [
      {
        name: 'Farm',
        description: 'Lunch now grows where we tell it to.',
        cost: { planks: 30, blocks: 20, tools: 10 },
        work: 15,
        requires: { research: ['agriculture'] },
        rate: 18,
      },
    ],
    effect: 'Farmer workplace; 18 food/min per worker',
    job: 'farmer',
  },
  kiln: {
    forms: [
      {
        name: 'Kiln',
        description:
          'A hot little room where clay becomes patient enough to be useful.',
        cost: { planks: 80, blocks: 80, tools: 20 },
        work: 30,
        requires: { research: ['ceramic-craft'] },
        rate: 1,
      },
    ],
    effect: 'Potter workplace; 1 ceramic/min per worker.',
    job: 'potter',
  },
  'ore-mine': {
    forms: [
      {
        name: 'Ore mine',
        description:
          'The metal is down there, wearing a very convincing rock disguise.',
        requires: { research: ['mechanization'] },
        cost: { planks: 80, blocks: 60, tools: 20 },
        work: 20,
        rate: 6,
      },
    ],
    effect: 'Miner workplace; 6 ore/min per worker.',
    job: 'miner',
  },
  foundry: {
    forms: [
      {
        name: 'Foundry',
        description: 'Where stubborn ore warms up to the idea of being metal.',
        requires: { research: ['mechanization'] },
        cost: { planks: 60, blocks: 100, tools: 30 },
        work: 30,
        rate: 2,
      },
      {
        name: 'Electric foundry',
        description: 'The furnace now takes its orders through a switch.',
        requires: { research: ['automation'] },
        cost: { metal: 100, machinery: 30, circuits: 30 },
        work: 45,
        rate: 6,
        input: { ore: 3, charge: 1 },
      },
    ],
    effect:
      'Metal production; electric conversion improves rate and uses charge.',
    job: 'smelter',
  },
  'machine-shop': {
    forms: [
      {
        name: 'Machine shop',
        description:
          "A workshop for building the things that do the workshop's work.",
        requires: { research: ['mechanization'] },
        cost: { planks: 80, blocks: 80, metal: 40, tools: 20 },
        work: 30,
        rate: 0.25,
      },
      {
        name: 'Automated machine shop',
        description:
          'Several machines are quietly taking credit for each other\u2019s work.',
        requires: { research: ['automation'] },
        cost: { metal: 150, machinery: 40, circuits: 50 },
        work: 45,
        rate: 0.75,
        input: { metal: 3, tools: 1, charge: 2 },
      },
      {
        name: 'Predictive machine shop',
        description:
          'Your next machine is already occupying the assembly bench.',
        requires: { research: ['predictive-fabrication'] },
        cost: { metal: 300, 'quantum-components': 30, 'causal-models': 20 },
        work: 70,
        rate: 1.5,
        input: { metal: 2, tools: 0.5, charge: 1, 'causal-models': 0.01 },
      },
    ],
    effect: 'Machinery production; later forms improve rate and recipes.',
    job: 'machinist',
  },
  generator: {
    forms: [
      {
        name: 'Generator',
        description:
          'Makes the sort of power that does not require a motivational speech.',
        requires: { research: ['electronics'] },
        cost: { metal: 100, machinery: 30, blocks: 60 },
        work: 30,
        rate: 12,
      },
      {
        name: 'Solar array',
        description:
          'The fuel arrives every morning with very little paperwork.',
        requires: { research: ['solar-collection'] },
        cost: { metal: 150, circuits: 80, 'exotic-material': 20 },
        work: 45,
        rate: 24,
        input: {},
      },
    ],
    effect:
      'Charge production; solar conversion improves rate and removes fuel use.',
    job: 'power-worker',
  },
  'electronics-plant': {
    forms: [
      {
        name: 'Electronics plant',
        description:
          'Persuades tiny components to agree on where the electricity should go.',
        requires: { research: ['electronics'] },
        cost: { metal: 100, machinery: 20, tools: 40 },
        work: 30,
        rate: 0.5,
      },
    ],
    effect: 'Electronics workplace; 0.5 circuits/min per worker.',
    job: 'electronics-worker',
  },
  'computing-center': {
    forms: [
      {
        name: 'Computing center',
        description:
          'Does the thinking that mostly involves doing the same thing a billion times.',
        requires: { research: ['computing'] },
        cost: { metal: 80, circuits: 60, machinery: 20 },
        work: 30,
        rate: 1,
      },
    ],
    effect: 'Analyst workplace; 1 data/min per worker.',
    job: 'analyst',
  },
} satisfies Partial<Record<BuildingId, BuildingDefinition>>
