import type { BuildingId, JobId } from './ids'
import type { BuildingDefinition, JobDefinition } from './types'
export const BUILDINGS: Record<BuildingId, BuildingDefinition> = {
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
    effect: '+2 comfortable places per level',
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
        rate: 6,
      },
    ],
    effect: 'Forager workplace; 6 food/min per worker',
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
        rate: 2,
      },
      {
        name: 'Timber yard',
        description:
          'More timber, neatly arranged for its upcoming life as something else.',
        requires: { research: ['forestry-methods'] },
        cost: { planks: 20, blocks: 10, tools: 3 },
        work: 6,
        rate: 4,
      },
      {
        name: 'Mechanical timber yard',
        description:
          'The trees have noticed that the tools are getting louder.',
        requires: { research: ['powered-workshops'] },
        cost: { planks: 40, blocks: 30, metal: 20, machinery: 5 },
        work: 12,
        rate: 8,
      },
    ],
    effect: 'Woodcutter workplace; 2 wood/min per worker',
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
        rate: 1.5,
      },
      {
        name: 'Stone pit',
        description: 'The good rocks were underneath the other rocks.',
        requires: { research: ['stone-lifting'] },
        cost: { planks: 15, blocks: 20, tools: 3 },
        work: 6,
        rate: 3,
      },
      {
        name: 'Mechanical quarry',
        description:
          'The rocks remain stubborn, but the machines have excellent patience.',
        requires: { research: ['powered-workshops'] },
        cost: { planks: 30, blocks: 40, metal: 20, machinery: 5 },
        work: 12,
        rate: 6,
      },
    ],
    effect: 'Stoneworker workplace; 1.5 stone/min per worker',
    job: 'stoneworker',
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
    effect: '+400 food base storage threshold',
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
    effect: '+300 wood and +300 stone base storage threshold',
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
    effect: 'Sawyer workplace; 0.5 planks/min per worker',
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
    effect: 'Mason workplace; 0.5 blocks/min per worker',
    job: 'mason',
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
        storage: { planks: 150, blocks: 150, tools: 60 },
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
          metal: 400,
          machinery: 100,
        },
      },
    ],
    effect: '+150 planks, +150 blocks, +60 tools base storage threshold',
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
    effect: 'Toolmaker workplace; 0.1 tools/min per worker',
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
    effect: 'Scholar workplace; 0.25 knowledge/min per worker',
    job: 'scholar',
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
        storage: { knowledge: 9000, 'causal-models': 300 },
        offlineHours: 2,
      },
    ],
    effect: '+100 knowledge base storage threshold',
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
    effect:
      'Farm rate \u00d7 `(1 + 0.15 \u00d7 sqrt(L))`; no workers or upkeep',
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
    effect: 'Smelter workplace; 2 metal/min per worker.',
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
    effect: 'Machinist workplace; 0.25 machinery/min per worker.',
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
    effect: 'Power workplace; 12 charge/min per worker.',
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
  'orbital-extractor': {
    forms: [
      {
        name: 'Orbital extractor',
        description:
          'Finding useful things somewhere considerably less convenient than the quarry.',
        requires: {
          research: ['orbital-flight'],
          facilities: { 'launch-complex': 1 },
        },
        cost: { machinery: 60, circuits: 80, charge: 600 },
        work: 40,
        rate: 0.25,
      },
      {
        name: 'Orbital mining network',
        description: 'The distant rocks now have a regular collection service.',
        requires: { research: ['orbital-surveying'] },
        cost: { machinery: 120, circuits: 150, 'exotic-material': 20 },
        work: 70,
        rate: 1,
        input: { charge: 6 },
      },
    ],
    effect: 'Orbital workplace; 0.25 exotic material/min per worker.',
    job: 'orbital-worker',
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
  'quantum-laboratory': {
    forms: [
      {
        name: 'Quantum laboratory',
        description:
          'A laboratory for very small things with very large research budgets.',
        requires: { research: ['quantum-engineering'] },
        cost: {
          machinery: 80,
          circuits: 150,
          'exotic-material': 30,
          data: 300,
        },
        work: 50,
        rate: 0.1,
      },
    ],
    effect: 'Quantum workplace; 0.1 components/min per worker.',
    job: 'quantum-engineer',
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
  'causal-laboratory': {
    forms: [
      {
        name: 'Causal laboratory',
        description:
          'Investigates cause and effect while carefully labeling which is which.',
        requires: { research: ['causal-engineering'] },
        cost: {
          machinery: 80,
          circuits: 100,
          'quantum-components': 30,
          data: 500,
        },
        work: 60,
        rate: 0.05,
      },
      {
        name: 'Causal synthesis lab',
        description:
          'Yesterday\u2019s results have become tomorrow\u2019s very useful equipment.',
        requires: { research: ['causal-synthesis'] },
        cost: { machinery: 150, 'quantum-components': 80, 'causal-models': 40 },
        work: 90,
        rate: 0.12,
        input: { 'quantum-components': 1, data: 8, charge: 12 },
      },
    ],
    effect: 'Causal workplace; 0.05 models/min per worker.',
    job: 'causal-researcher',
  },
  'stellar-foundry': {
    forms: [
      {
        name: 'Stellar foundry',
        description:
          'The ambitions of a furnace have become rather astronomical.',
        requires: { research: ['stellar-synthesis'] },
        cost: {
          machinery: 150,
          'quantum-components': 60,
          'causal-models': 20,
          'exotic-material': 100,
        },
        work: 90,
        rate: 30,
      },
    ],
    effect: 'Stellar workplace; 30 metal/min per worker.',
    job: 'stellar-worker',
  },
}
export type ProductionJob = Exclude<JobId, 'idle' | 'builder'>
export const JOBS: Record<ProductionJob, JobDefinition> = {
  forager: {
    name: 'Forager',
    description: 'Finds breakfast in places the rest of us walked past.',
    output: 'food',
    input: {},
    mastery: 'food',
  },
  farmer: {
    name: 'Farmer',
    description: 'Persuades plants to keep regular working hours.',
    output: 'food',
    input: {},
    mastery: 'food',
  },
  woodcutter: {
    name: 'Woodcutter',
    description: 'Negotiates a change of direction for trees.',
    output: 'wood',
    input: {},
    mastery: 'wood',
  },
  stoneworker: {
    name: 'Stoneworker',
    description: 'Brings home the rocks the settlement has taken a liking to.',
    output: 'stone',
    input: {},
    mastery: 'stone',
  },
  sawyer: {
    name: 'Sawyer',
    description: 'Helps trees settle into a flatter line of work.',
    output: 'planks',
    input: { wood: 3 },
  },
  mason: {
    name: 'Mason',
    description: 'Makes stone look like it was expecting to become a building.',
    output: 'blocks',
    input: { stone: 3 },
  },
  toolmaker: {
    name: 'Toolmaker',
    description: 'Equips everyone else to complain less about their equipment.',
    output: 'tools',
    input: { planks: 2, blocks: 1 },
  },
  scholar: {
    name: 'Scholar',
    description: 'Turns a full stomach into difficult questions.',
    output: 'knowledge',
    input: { food: 1 },
  },
  miner: {
    name: 'Miner',
    description: 'Finds promising metal before it has stopped being a rock.',
    output: 'ore',
    input: {},
  },
  smelter: {
    name: 'Smelter',
    description: 'Helps ore reconsider its commitment to being inconvenient.',
    output: 'metal',
    input: { ore: 3, wood: 1 },
  },
  machinist: {
    name: 'Machinist',
    description:
      'Builds the moving parts that make everyone else look organized.',
    output: 'machinery',
    input: { metal: 3, tools: 1 },
  },
  'power-worker': {
    name: 'Power worker',
    description: 'Keeps the switches supplied with reasons to switch on.',
    output: 'charge',
    input: { wood: 0.5 },
  },
  'electronics-worker': {
    name: 'Electronics worker',
    description:
      'Connects tiny parts with impressively strong opinions about direction.',
    output: 'circuits',
    input: { metal: 2, charge: 3 },
  },
  analyst: {
    name: 'Analyst',
    description:
      'Asks the machines to turn an interesting question into several files.',
    output: 'data',
    input: { knowledge: 1, circuits: 1, charge: 2 },
  },
  'orbital-worker': {
    name: 'Orbital worker',
    description:
      'Gathers useful material a rather long way from the lunch room.',
    output: 'exotic-material',
    input: { charge: 4 },
  },
  'quantum-engineer': {
    name: 'Quantum engineer',
    description:
      'Keeps very small parts on unusually complicated speaking terms.',
    output: 'quantum-components',
    input: { 'exotic-material': 2, data: 5, charge: 10 },
  },
  'causal-researcher': {
    name: 'Causal researcher',
    description:
      'Files the results carefully enough to remember which happened first.',
    output: 'causal-models',
    input: { 'quantum-components': 2, data: 10, charge: 20 },
  },
  'stellar-worker': {
    name: 'Stellar worker',
    description:
      'Works beside a furnace with an unusually ambitious job description.',
    output: 'metal',
    input: { 'exotic-material': 0.1, charge: 2 },
  },
}
export function isProductionJob(job: JobId): job is ProductionJob {
  return job !== 'idle' && job !== 'builder'
}
