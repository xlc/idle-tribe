import type { BuildingId } from '../ids'
import type { BuildingDefinition } from '../types'

export const SUPPORT_BUILDINGS = {
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
      {
        name: 'Cottages',
        description: 'Now with walls the wind has to go around.',
        requires: { research: ['agriculture'] },
        cost: { planks: 12, blocks: 8, tools: 3 },
        work: 5,
        housing: 4,
      },
      {
        name: 'Town houses',
        description:
          'More neighbors, conveniently within complaining distance.',
        requires: { research: ['town-planning'] },
        cost: { planks: 25, blocks: 25, tools: 5 },
        work: 10,
        housing: 8,
      },
      {
        name: 'Habitat',
        description: 'Home is where you can leave your helmet off.',
        requires: {
          research: ['orbital-flight'],
          facilities: { 'launch-complex': 1 },
        },
        cost: { metal: 120, machinery: 20, circuits: 30 },
        work: 25,
        housing: 16,
      },
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
    effect: 'Housing; later forms provide more comfortable places.',
  },
  'food-store': {
    forms: [
      {
        name: 'Food store',
        description: "Tomorrow's lunch has somewhere to wait.",
        cost: { wood: 20, stone: 10 },
        work: 2,
        requires: { research: ['shelters'] },
        storage: { food: 400 },
      },
      {
        name: 'Granary',
        description: 'The harvest has moved in and brought all its friends.',
        requires: { research: ['agriculture'] },
        cost: { planks: 15, blocks: 10 },
        work: 4,
        storage: { food: 1200 },
      },
    ],
    effect: 'Food storage; later forms increase the storage threshold.',
  },
  stockyard: {
    forms: [
      {
        name: 'Stockyard',
        description: 'Wood here, stone there, toes out of the way.',
        cost: { wood: 40, stone: 20 },
        work: 3,
        requires: { research: ['shelters'] },
        storage: { wood: 300, stone: 300 },
      },
      {
        name: 'Ore stockyard',
        description:
          'The rocks now require a slightly more detailed sorting system.',
        requires: { research: ['mechanization'] },
        cost: { planks: 100, blocks: 80, tools: 20 },
        work: 10,
        storage: { wood: 1000, stone: 1000, ore: 600 },
      },
    ],
    effect: 'Raw material storage; later forms also store ore.',
  },
  storehouse: {
    forms: [
      {
        name: 'Storehouse',
        description:
          'Finished goods deserve better than the nearest empty patch.',
        cost: { wood: 60, stone: 40 },
        work: 4,
        requires: { research: ['carpentry'] },
        storage: { planks: 150, blocks: 150, tools: 60, ceramics: 150 },
      },
      {
        name: 'Warehouse',
        description: 'The piles have grown large enough to deserve an address.',
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
    effect:
      'Storage for crafted goods; later forms also store industrial goods.',
  },
  library: {
    forms: [
      {
        name: 'Records shelter',
        description: 'Good ideas finally have somewhere to stay overnight.',
        cost: { planks: 10, blocks: 5 },
        work: 4,
        requires: { research: ['oral-tradition'] },
        storage: { knowledge: 100 },
      },
      {
        name: 'Library',
        description:
          'A quiet building full of people who thought they had answers.',
        requires: { research: ['writing'] },
        cost: { planks: 15, blocks: 15 },
        work: 5,
        storage: { knowledge: 400 },
      },
      {
        name: 'Technical archive',
        description:
          'The instructions have finally outgrown the back of the envelope.',
        requires: { research: ['computing'] },
        cost: { metal: 200, machinery: 50, circuits: 30 },
        work: 15,
        storage: { knowledge: 1800 },
      },
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
      {
        name: 'Causal archive',
        description:
          'The filing system is remarkably prepared for your next question.',
        requires: { research: ['causal-archives'] },
        cost: { circuits: 200, 'quantum-components': 50, 'causal-models': 20 },
        work: 40,
        storage: { knowledge: 9000, data: 2000, 'causal-models': 300 },
        offlineHours: 2,
      },
    ],
    effect:
      'Knowledge storage; later archives also store data and causal models.',
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
  irrigation: {
    forms: [
      {
        name: 'Irrigation works',
        description: "Water takes the scenic route through everyone's crops.",
        cost: { planks: 40, blocks: 30, tools: 10 },
        work: 20,
        requires: { research: ['irrigation'] },
      },
    ],
    effect: 'Farm production technology +15% × √level; no workers or upkeep.',
    jobBonus: { farmer: 0.15 },
  },
  'meeting-place': {
    forms: [
      {
        name: 'Meeting place',
        description: 'An excellent place to accomplish very little together.',
        cost: { planks: 80, blocks: 60, tools: 15 },
        work: 30,
        requires: { research: ['writing'] },
      },
    ],
    effect: 'Leisure coverage for 10 people per level',
    leisure: 10,
  },
  'public-well': {
    forms: [
      {
        name: 'Public well',
        description:
          "Fresh water, with a convenient place to discuss everyone else's business.",
        cost: { blocks: 60, planks: 30, tools: 10 },
        work: 20,
        requires: { research: ['town-planning'] },
      },
    ],
    effect: 'Amenity coverage for 10 people per level',
    amenities: 10,
  },
  bathhouse: {
    forms: [
      {
        name: 'Bathhouse',
        description:
          'Warm water and clean cups make a crowded town feel considered.',
        cost: { planks: 100, blocks: 80, tools: 25, ceramics: 40 },
        work: 45,
        requires: { research: ['public-health'] },
      },
    ],
    effect: 'Amenity coverage +15 and leisure coverage +5 per level',
    amenities: 15,
    leisure: 5,
  },
  'great-hall': {
    forms: [
      {
        name: 'Great Hall',
        description:
          "Finally, a room large enough for the settlement's collective self-importance.",
        cost: { planks: 120, blocks: 120, tools: 40, knowledge: 200 },
        work: 90,
        requires: { research: ['civic-engineering'] },
      },
    ],
    effect:
      'Unique milestone; +20 leisure coverage and +20 amenity coverage; ceremonial town milestone',
    unique: true,
    leisure: 20,
    amenities: 20,
  },
  observatory: {
    forms: [
      {
        name: 'Observatory',
        description: 'Stare into space with enough purpose to call it work.',
        cost: { planks: 80, blocks: 60, tools: 20 },
        work: 30,
        requires: { research: ['early-astronomy'] },
      },
    ],
    effect:
      'Knowledge bonus +5% \u00d7 \u221alevel; offline window +\u221alevel hours.',
    offlineHours: 1,
    jobBonus: { scholar: 0.05 },
  },
  'battery-bank': {
    forms: [
      {
        name: 'Battery bank',
        description: 'A savings account for whatever needs switching on later.',
        requires: { research: ['electronics'] },
        cost: { metal: 80, blocks: 60, tools: 20 },
        work: 20,
        storage: { charge: 4000 },
      },
    ],
    effect: '+4,000 charge base storage.',
  },
  'data-center': {
    forms: [
      {
        name: 'Data center',
        description: "A home for facts that have outgrown everyone's memory.",
        requires: { research: ['electronics'] },
        cost: { metal: 80, machinery: 20, blocks: 80 },
        work: 25,
        storage: { circuits: 400, data: 1000, knowledge: 1000 },
      },
      {
        name: 'Causal data center',
        description:
          'The answers have begun arriving with suspiciously convenient timestamps.',
        requires: { research: ['causal-archives'] },
        cost: { circuits: 200, 'quantum-components': 30, 'causal-models': 20 },
        work: 50,
        storage: {
          circuits: 1200,
          data: 10000,
          knowledge: 3000,
          'causal-models': 400,
        },
      },
    ],
    effect: 'Store circuits, data, and knowledge.',
  },
  'launch-complex': {
    forms: [
      {
        name: 'Launch complex',
        description:
          'The ground has served us well, but we have other appointments.',
        requires: { research: ['orbital-flight'] },
        cost: { machinery: 80, circuits: 80, charge: 1000, metal: 200 },
        work: 60,
      },
    ],
    effect:
      'Enables orbital workplaces; exotic extraction technology +10% \u00d7 \u221alevel.',
    jobBonus: { 'orbital-worker': 0.1 },
  },
  'cargo-depot': {
    forms: [
      {
        name: 'Cargo depot',
        description:
          'Even among the stars, someone has to organize the deliveries.',
        requires: { research: ['orbital-flight'] },
        cost: { machinery: 40, circuits: 80, metal: 300 },
        work: 30,
        storage: {
          'exotic-material': 400,
          machinery: 400,
          circuits: 800,
          'quantum-components': 50,
        },
      },
    ],
    effect: 'Storage for exotic materials and orbital supplies.',
  },
  'space-observatory': {
    forms: [
      {
        name: 'Deep-space array',
        description:
          'The view is excellent, and somebody should really write this down.',
        requires: {
          research: ['orbital-flight'],
          facilities: { 'launch-complex': 1 },
        },
        cost: { machinery: 40, circuits: 100, metal: 200 },
        work: 40,
      },
    ],
    effect:
      'Knowledge technology +10% \u00d7 \u221alevel; offline window +\u221alevel hours.',
    jobBonus: { scholar: 0.1 },
    offlineHours: 1,
  },
  'quantum-fabricator': {
    forms: [
      {
        name: 'Quantum fabricator',
        description:
          "Assembles tomorrow's equipment from parts that make yesterday's engineers nervous.",
        requires: { research: ['quantum-engineering'] },
        cost: {
          machinery: 100,
          circuits: 150,
          'quantum-components': 20,
          data: 300,
        },
        work: 50,
      },
    ],
    effect: 'Selected processing technology +15% \u00d7 \u221alevel.',
    jobBonus: {
      sawyer: 0.15,
      mason: 0.15,
      toolmaker: 0.15,
      machinist: 0.15,
      'electronics-worker': 0.15,
      'quantum-engineer': 0.15,
    },
  },
  'quantum-vault': {
    forms: [
      {
        name: 'Quantum vault',
        description:
          'Keeps complicated little things in a reassuringly ordinary inventory.',
        requires: { research: ['quantum-engineering'] },
        cost: { metal: 200, circuits: 100, 'exotic-material': 20 },
        work: 40,
        storage: {
          'quantum-components': 300,
          'exotic-material': 600,
          'causal-models': 100,
        },
      },
      {
        name: 'Temporal vault',
        description:
          'Everything stays where it belongs, including the order of events.',
        requires: { research: ['causal-engineering'] },
        cost: { circuits: 200, 'quantum-components': 40, data: 600 },
        work: 65,
        storage: {
          'quantum-components': 900,
          'exotic-material': 1200,
          'causal-models': 600,
        },
      },
    ],
    effect: 'Storage for quantum and exotic materials and causal models.',
  },
} satisfies Partial<Record<BuildingId, BuildingDefinition>>
