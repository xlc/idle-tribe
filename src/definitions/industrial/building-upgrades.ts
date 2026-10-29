import type { BuildingId } from '../../ids'
import type { FormDefinition } from '../../types'

export const buildingUpgrades = {
  stockyard: [
    {
      name: 'Ore depot',
      description:
        'The rocks now require a slightly more detailed sorting system.',
      requires: { research: ['mechanization'] },
      cost: { planks: 100, blocks: 80, tools: 20 },
      work: 10,
      storage: {
        food: 400,
        wood: 1000,
        stone: 1000,
        planks: 150,
        blocks: 150,
        tools: 60,
        knowledge: 100,
        ore: 600,
      },
    },
  ],
  storehouse: [
    {
      name: 'Materials depot',
      description:
        'The crafted piles have grown large enough to deserve an address.',
      requires: { research: ['mechanization'] },
      cost: { planks: 120, blocks: 100, tools: 30 },
      work: 12,
      storage: {
        planks: 500,
        blocks: 500,
        tools: 200,
        ceramics: 500,
        metal: 400,
        machinery: 100,
      },
    },
  ],
  lumber: [
    {
      name: 'Mechanical timber yard',
      description: 'The trees have noticed that the tools are getting louder.',
      requires: { research: ['powered-workshops'] },
      cost: { planks: 40, blocks: 30, metal: 20, machinery: 5 },
      work: 12,
      actionAutomation: { sticks: 0.1 },
    },
  ],
  quarry: [
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
  sawmill: [
    {
      name: 'Mechanical sawmill',
      description: 'The logs are forming a very orderly queue.',
      requires: { research: ['powered-workshops'] },
      cost: { planks: 50, blocks: 40, metal: 25, machinery: 10 },
      work: 12,
      rate: 1.5,
    },
  ],
  stoneworks: [
    {
      name: 'Mechanical stoneworks',
      description: 'Square corners have become a regular appointment.',
      requires: { research: ['powered-workshops'] },
      cost: { planks: 40, blocks: 50, metal: 25, machinery: 10 },
      work: 12,
      rate: 1.5,
    },
  ],
  'tool-workshop': [
    {
      name: 'Mechanical tool workshop',
      description: 'The tools now have tools of their own.',
      requires: { research: ['powered-workshops'] },
      cost: { planks: 40, blocks: 30, metal: 30, machinery: 10 },
      work: 15,
      rate: 0.3,
    },
  ],
} satisfies Partial<Record<BuildingId, FormDefinition[]>>
