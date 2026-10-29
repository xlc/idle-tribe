import type { ResearchId } from '../../ids'
import type { ResearchDefinition } from '../../types'

export const research = {
  writing: {
    name: 'Writing',
    cost: { knowledge: 3600, planks: 1200, blocks: 900, tools: 360 },
    seconds: 32400,
    effect:
      'Enter town era; unlock School, Library, Meeting place, happiness, and first specialization.',
    description:
      'Good ideas can now outlive the person who keeps repeating them.',
    requires: {
      facilities: { farm: 1 },
      research: [
        'forestry-methods',
        'stone-lifting',
        'organized-work',
        'inventory-keeping',
      ],
    },
    effects: {},
    era: 2,
    unlockHappiness: true,
  },
  'town-planning': {
    name: 'Town planning',
    cost: { knowledge: 500, planks: 150, blocks: 150, tools: 40 },
    seconds: 10800,
    effect: 'Unlock Town houses and Public well.',
    description:
      'Someone should probably decide where all these neighbors are going.',
    requires: { research: ['writing'] },
    effects: {},
  },
  forestry: {
    name: 'Forestry',
    cost: { knowledge: 400, planks: 150, tools: 40 },
    seconds: 8100,
    effect:
      'Plank workplace rates ×1.40; wood gathering automation +5 percentage points.',
    description: 'A proud tradition of knowing exactly what to do with a tree.',
    requires: { research: ['writing'] },
    effects: {
      specialization: { sawyer: 1.4 },
      actionAutomation: { sticks: 0.05 },
    },
    branch: 'forestry',
    branchIdentity: 'Efficient crafting',
  },
  stonecraft: {
    name: 'Stonecraft',
    cost: { knowledge: 400, blocks: 150, tools: 40 },
    seconds: 8100,
    effect:
      'Block workplace rates ×1.40; stone gathering automation +5 percentage points.',
    description: 'Our ancestors saw rocks; we see a promising career.',
    requires: { research: ['writing'] },
    effects: {
      specialization: { mason: 1.4 },
      actionAutomation: { stone: 0.05 },
    },
    branch: 'stonecraft',
    branchIdentity: 'Room to grow',
  },
  joinery: {
    name: 'Precision joinery',
    cost: { knowledge: 800, planks: 300, blocks: 150, tools: 80 },
    seconds: 16200,
    effect: 'Plank recipes use 1 less wood; block recipes use 1 less stone.',
    description:
      'Measure carefully enough and even the offcuts start pulling their weight.',
    requires: { research: ['forestry'] },
    effects: { recipeReduction: { sawyer: { wood: 1 }, mason: { stone: 1 } } },
  },
  architecture: {
    name: 'Architecture',
    cost: { knowledge: 800, planks: 150, blocks: 300, tools: 80 },
    seconds: 16200,
    effect:
      'Housing contribution +25%; block production technology bonus +50%.',
    description:
      'Put the walls in smarter places and invite a few more neighbors.',
    requires: { research: ['stonecraft'] },
    effects: { housing: 1.25, jobBonus: { mason: 0.5 } },
  },
  'civic-engineering': {
    name: 'Civic engineering',
    cost: { knowledge: 1200, planks: 400, blocks: 400, tools: 100 },
    seconds: 21600,
    effect: 'Unlock Great Hall and tier-3 equipment.',
    description: "A whole town's ambition now comes with a set of plans.",
    requires: {
      research: ['town-planning'],
      anyResearch: ['joinery', 'architecture'],
    },
    effects: {},
  },
  'record-keeping': {
    name: 'Record keeping',
    cost: { knowledge: 600, planks: 200, blocks: 100 },
    seconds: 10800,
    effect:
      'Knowledge capacity \u00d71.50 in addition to other storage effects; full-speed offline window +4h.',
    description:
      "Tomorrow's workers would appreciate knowing what today's workers were thinking.",
    requires: { research: ['writing'] },
    effects: { resourceStorage: { knowledge: 1.5 }, offlineHours: 4 },
    upgrade: {
      maxLevel: 3,
      requires: { research: ['mechanization'] },
      costMultiplier: 1.75,
      timeMultiplier: 1.2,
      effect: 'Knowledge storage capacity ×1.08 per additional level.',
      effects: { resourceStorage: { knowledge: 1.08 } },
    },
  },
  'ceramic-craft': {
    name: 'Ceramic craft',
    cost: { knowledge: 900, planks: 260, blocks: 220, tools: 70 },
    seconds: 13500,
    effect: 'Unlock Kiln and ceramics production.',
    description:
      'A hot kiln turns careful shapes into vessels that can outlast a season.',
    requires: { research: ['writing', 'town-planning'] },
    effects: {},
  },
  'public-health': {
    name: 'Public health',
    cost: {
      knowledge: 1400,
      planks: 360,
      blocks: 280,
      tools: 90,
      ceramics: 80,
    },
    seconds: 16200,
    effect: 'Unlock Bathhouse for amenities and leisure.',
    description:
      'A town is easier to share when its water and washing have a plan.',
    requires: {
      research: ['ceramic-craft', 'town-planning'],
      facilities: { kiln: 1 },
    },
    effects: {},
  },
  'early-astronomy': {
    name: 'Early astronomy',
    cost: { knowledge: 300, planks: 100, blocks: 50 },
    seconds: 16200,
    effect: 'Unlock Observatory.',
    description: 'The sky has been showing off for ages; time to take notes.',
    requires: { research: ['writing'], perk: 'early-astronomy' },
    effects: {},
  },
} satisfies Partial<Record<ResearchId, ResearchDefinition>>
