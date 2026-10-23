import type { ResearchId } from './ids'
import type { ResearchDefinition } from './types'
export const RESEARCH: Record<ResearchId, ResearchDefinition> = {
  'sharpened-stick': {
    name: 'Sharpened stick',
    cost: { wood: 6, food: 5 },
    minutes: 1,
    effect: 'Gathering automation +2%.',
    description: 'A stick with a surprisingly convincing point.',
    requires: { research: [], discovery: 'wood' },
    effects: { actionAutomation: { gather: 0.02 } },
  },
  shelters: {
    name: 'Shelters',
    cost: { wood: 15, food: 10 },
    minutes: 2,
    effect:
      'Unlock housing, camps, basic storage, immigration; grant first Foraging camp.',
    description: 'The weather can conduct its business outside.',
    requires: { research: ['sharpened-stick'] },
    effects: {},
    grant: { building: 'foraging', job: 'forager' },
  },
  'stone-tools': {
    name: 'Stone tools',
    cost: { wood: 20, stone: 15, food: 10 },
    minutes: 8,
    effect: 'Unlock Quarry.',
    description: 'Some rocks are better at convincing other rocks.',
    requires: { research: ['sharpened-stick'], discovery: 'stone' },
    effects: {},
  },
  carpentry: {
    name: 'Carpentry',
    cost: { wood: 60, stone: 30 },
    minutes: 10,
    effect: 'Unlock Sawmill and Storehouse.',
    description: 'Wood behaves better once you explain the corners.',
    requires: { research: ['shelters', 'stone-tools'] },
    effects: {},
  },
  masonry: {
    name: 'Masonry',
    cost: { wood: 40, stone: 80 },
    minutes: 15,
    effect: "Unlock Stoneworks and Builders' lodge; organized crew size +1.",
    description: 'The trick is putting the heavy bit on another heavy bit.',
    requires: { research: ['stone-tools'] },
    effects: { crew: 1 },
  },
  'oral-tradition': {
    name: 'Oral tradition',
    cost: { food: 100, planks: 20 },
    minutes: 30,
    effect:
      'Unlock Learning circle and Records shelter; automated action XP +2%.',
    description:
      'Good advice travels farther when someone remembers the middle.',
    requires: { research: ['shelters', 'carpentry'] },
    effects: { actionXp: { gather: 0.02, sticks: 0.02, stone: 0.02 } },
  },
  toolmaking: {
    name: 'Toolmaking',
    cost: { planks: 50, blocks: 30 },
    minutes: 30,
    effect: 'Unlock Tool workshop and tier-1 equipment.',
    description: "Perhaps the next difficult job could be the tool's problem.",
    requires: { research: ['carpentry', 'masonry'] },
    effects: {},
  },
  preparedness: {
    name: 'Preparedness',
    cost: { knowledge: 40, tools: 20, food: 150 },
    minutes: 60,
    effect: 'Unlock Supply post.',
    description:
      "Tomorrow's problems have been asked to arrive by appointment.",
    requires: { research: ['oral-tradition', 'toolmaking'] },
    effects: {},
  },
  'seasonal-knowledge': {
    name: 'Seasonal knowledge',
    cost: { knowledge: 120, planks: 50, blocks: 30, tools: 10 },
    minutes: 90,
    effect: 'Gathering automation +3%.',
    description: 'The bushes have a schedule, and we are finally catching on.',
    requires: { research: ['oral-tradition', 'toolmaking'] },
    effects: { actionAutomation: { gather: 0.03 } },
  },
  agriculture: {
    name: 'Agriculture',
    cost: { knowledge: 180, food: 500, wood: 200, stone: 100, tools: 30 },
    minutes: 120,
    effect: 'Enter agricultural era; unlock Farm, Cottages and Granary forms.',
    description: 'Convince dinner to put down roots.',
    requires: { research: ['preparedness', 'seasonal-knowledge'] },
    effects: {},
    era: 1,
  },
  irrigation: {
    name: 'Irrigation',
    cost: { knowledge: 1200, planks: 480, blocks: 360, tools: 120 },
    minutes: 90,
    effect: 'Unlock Irrigation works.',
    description: 'Teach water a route that includes the vegetables.',
    requires: { research: ['agriculture'] },
    effects: {},
  },
  'forestry-methods': {
    name: 'Forestry methods',
    cost: { knowledge: 900, wood: 600, planks: 360, tools: 120 },
    minutes: 60,
    effect: 'Unlock Timber yard conversion.',
    description: 'A little planning saves a lot of arguing with trees.',
    requires: { research: ['agriculture'] },
    effects: {},
  },
  'stone-lifting': {
    name: 'Stone lifting',
    cost: { knowledge: 900, stone: 600, blocks: 360, tools: 120 },
    minutes: 60,
    effect: 'Unlock Stone pit conversion.',
    description: 'The rock remains heavy, but fewer people have to mention it.',
    requires: { research: ['agriculture'] },
    effects: {},
  },
  'organized-work': {
    name: 'Organized work',
    cost: { knowledge: 1500, planks: 600, blocks: 480, tools: 180 },
    minutes: 120,
    effect: 'Unlock tier-2 equipment.',
    description: 'Everyone knows which end of the job they are holding.',
    requires: { research: ['irrigation'] },
    effects: {},
  },
  'inventory-keeping': {
    name: 'Inventory keeping',
    cost: { knowledge: 1200, planks: 480, blocks: 360 },
    minutes: 90,
    effect: 'All storage thresholds \u00d71.50; full-speed offline window +4h.',
    description:
      'We have counted the piles, and some of them were surprisingly large.',
    requires: { research: ['agriculture'] },
    effects: { storage: 1.5, offlineHours: 4 },
  },
  writing: {
    name: 'Writing',
    cost: { knowledge: 3600, planks: 1200, blocks: 900, tools: 360 },
    minutes: 180,
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
    minutes: 60,
    effect: 'Unlock Town houses and Public well.',
    description:
      'Someone should probably decide where all these neighbors are going.',
    requires: { research: ['writing'] },
    effects: {},
  },
  forestry: {
    name: 'Forestry',
    cost: { knowledge: 400, planks: 150, tools: 40 },
    minutes: 45,
    effect: 'Plank workplace rates \u00d71.40; wood gathering automation +5%.',
    description: 'A proud tradition of knowing exactly what to do with a tree.',
    requires: { research: ['writing'] },
    effects: {
      specialization: { sawyer: 1.4 },
      actionAutomation: { sticks: 0.05 },
    },
    branch: 'forestry',
  },
  stonecraft: {
    name: 'Stonecraft',
    cost: { knowledge: 400, blocks: 150, tools: 40 },
    minutes: 45,
    effect: 'Block workplace rates \u00d71.40; stone gathering automation +5%.',
    description: 'Our ancestors saw rocks; we see a promising career.',
    requires: { research: ['writing'] },
    effects: {
      specialization: { mason: 1.4 },
      actionAutomation: { stone: 0.05 },
    },
    branch: 'stonecraft',
  },
  joinery: {
    name: 'Precision joinery',
    cost: { knowledge: 800, planks: 300, blocks: 150, tools: 80 },
    minutes: 90,
    effect: 'Plank and block recipes use 2 raw materials instead of 3.',
    description:
      'Measure carefully enough and even the offcuts start pulling their weight.',
    requires: { research: ['forestry'] },
    effects: { recipeReduction: { sawyer: { wood: 1 }, mason: { stone: 1 } } },
  },
  architecture: {
    name: 'Architecture',
    cost: { knowledge: 800, planks: 150, blocks: 300, tools: 80 },
    minutes: 90,
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
    minutes: 120,
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
    minutes: 60,
    effect:
      'Knowledge threshold \u00d71.50 in addition to other storage effects; full-speed offline window +4h.',
    description:
      "Tomorrow's workers would appreciate knowing what today's workers were thinking.",
    requires: { research: ['writing'] },
    effects: { resourceStorage: { knowledge: 1.5 }, offlineHours: 4 },
  },
  'ceramic-craft': {
    name: 'Ceramic craft',
    cost: { knowledge: 900, planks: 260, blocks: 220, tools: 70 },
    minutes: 75,
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
    minutes: 90,
    effect: 'Unlock Bathhouse; improve amenities and leisure.',
    description:
      'A town is easier to share when its water and washing have a plan.',
    requires: {
      research: ['ceramic-craft', 'town-planning'],
      facilities: { kiln: 1 },
    },
    effects: {},
  },
  mechanization: {
    name: 'Mechanization',
    cost: { knowledge: 2500, planks: 600, blocks: 600, tools: 200 },
    minutes: 120,
    effect:
      'Enter the industrial era; unlock mines, foundries, machine shops, and industrial storage.',
    description: 'The heavy lifting has been offered to something with gears.',
    requires: { research: ['civic-engineering', 'record-keeping'] },
    effects: {},
    era: 3,
  },
  'early-astronomy': {
    name: 'Early astronomy',
    cost: { knowledge: 300, planks: 100, blocks: 50 },
    minutes: 90,
    effect: 'Unlock Observatory.',
    description: 'The sky has been showing off for ages; time to take notes.',
    requires: { research: ['writing'], perk: 'early-astronomy' },
    effects: {},
  },
  'powered-workshops': {
    name: 'Powered workshops',
    requires: { research: ['mechanization'] },
    cost: { knowledge: 1200, metal: 100, machinery: 30 },
    minutes: 90,
    effect:
      'Unlock mechanical extraction, processing, and tool workshop forms.',
    description: 'The river has agreed to take the heavier shifts.',
    effects: {},
  },
  'precision-instruments': {
    name: 'Precision instruments',
    requires: { research: ['mechanization'] },
    cost: { knowledge: 1400, metal: 80, machinery: 20, tools: 50 },
    minutes: 90,
    effect: 'Unlock Chronometry and a controlled investigation of time.',
    description: 'The measurements have become too precise to blame the ruler.',
    effects: {},
  },
  chronometry: {
    name: 'Chronometry',
    requires: { research: ['precision-instruments'] },
    cost: { knowledge: 2000, metal: 120, machinery: 40 },
    minutes: 120,
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
    minutes: 90,
    effect: 'Toolmaker, machinist, and electronics recipe inputs \u00d70.80.',
    description: 'Even the leftovers have been given something useful to do.',
    effects: {
      recipeMultiplier: {
        toolmaker: 0.8,
        machinist: 0.8,
        'electronics-worker': 0.8,
      },
    },
  },
  'structural-systems': {
    name: 'Structural systems',
    requires: { research: ['architecture', 'mechanization'] },
    cost: { knowledge: 1800, metal: 100, machinery: 30 },
    minutes: 90,
    effect: 'Housing contribution and all storage thresholds \u00d71.20.',
    description:
      'The foundations are prepared for a rather ambitious conversation.',
    effects: { housing: 1.2, storage: 1.2 },
  },
  electronics: {
    name: 'Electronics',
    requires: { research: ['powered-workshops'] },
    cost: { knowledge: 3500, metal: 250, machinery: 80, tools: 100 },
    minutes: 180,
    effect:
      'Enter the digital era; unlock power, electronics, batteries, and data storage.',
    description: 'Let very small switches make some very big decisions.',
    effects: {},
    era: 4,
  },
  computing: {
    name: 'Computing',
    requires: { research: ['electronics'] },
    cost: { knowledge: 2500, circuits: 80, charge: 500, machinery: 40 },
    minutes: 120,
    effect:
      'Unlock Computing center, Research institute, and Technical archive.',
    description:
      'A billion small calculations have requested a room of their own.',
    effects: {},
  },
  automation: {
    name: 'Automation',
    requires: { research: ['computing'] },
    cost: { knowledge: 3500, data: 300, circuits: 150, machinery: 80 },
    minutes: 120,
    effect: 'Unlock Electric foundry and Automated machine shop.',
    description:
      'The machines have learned to leave fewer questions for the morning shift.',
    effects: {},
  },
  'distributed-records': {
    name: 'Distributed records',
    requires: { research: ['computing'] },
    cost: { knowledge: 2500, data: 300, circuits: 80 },
    minutes: 90,
    effect:
      'Full-speed offline window +4h; knowledge and data thresholds \u00d71.25.',
    description: 'Several copies of the facts have agreed to keep in touch.',
    effects: {
      offlineHours: 4,
      resourceStorage: { knowledge: 1.25, data: 1.25 },
    },
  },
  'orbital-flight': {
    name: 'Orbital flight',
    requires: { research: ['automation', 'distributed-records'] },
    cost: {
      knowledge: 5000,
      data: 800,
      machinery: 200,
      circuits: 200,
      charge: 1500,
    },
    minutes: 180,
    effect:
      'Enter space; unlock Launch complex, Orbital extractor, Habitat, Cargo depot, and Deep-space array.',
    description:
      'Falling around the world turns out to be a useful travel arrangement.',
    effects: {},
    era: 5,
  },
  'orbital-surveying': {
    name: 'Orbital surveying',
    requires: {
      research: ['orbital-flight'],
      facilities: { 'launch-complex': 1 },
    },
    cost: { knowledge: 4000, data: 600, 'exotic-material': 40, circuits: 100 },
    minutes: 120,
    effect: 'Unlock Orbital mining network; exotic extraction technology +20%.',
    description:
      'The distant rocks have been asked to describe their qualifications.',
    effects: { jobBonus: { 'orbital-worker': 0.2 } },
  },
  'solar-collection': {
    name: 'Solar collection',
    requires: { research: ['orbital-flight'] },
    cost: {
      knowledge: 3500,
      circuits: 150,
      'exotic-material': 30,
      machinery: 60,
    },
    minutes: 90,
    effect: 'Unlock Solar array: double base charge rate with no wood input.',
    description: 'The largest furnace nearby has declined to send a fuel bill.',
    effects: {},
  },
  'quantum-engineering': {
    name: 'Quantum engineering',
    requires: { research: ['orbital-surveying', 'solar-collection'] },
    cost: {
      knowledge: 7000,
      data: 1600,
      'exotic-material': 120,
      circuits: 300,
      charge: 2000,
    },
    minutes: 240,
    effect:
      'Enter the quantum era; unlock Quantum laboratory, fabricator, vault, and archives.',
    description:
      'Tiny things have strange rules, and we have started reading the instructions.',
    effects: {},
    era: 6,
  },
  'coherent-assembly': {
    name: 'Coherent assembly',
    requires: { research: ['quantum-engineering'] },
    cost: {
      knowledge: 5000,
      data: 1000,
      'quantum-components': 30,
      machinery: 100,
    },
    minutes: 120,
    effect:
      'Quantum component production technology +25%; unlock Quantum habitat.',
    description:
      'The parts work better when they agree on which experiment this is.',
    effects: { jobBonus: { 'quantum-engineer': 0.25 } },
  },
  'closed-cycle-fabrication': {
    name: 'Closed-cycle fabrication',
    requires: { research: ['lean-fabrication', 'quantum-engineering'] },
    cost: { knowledge: 6000, data: 1000, 'quantum-components': 40 },
    minutes: 120,
    effect:
      'Toolmaker, machinist, and electronics recipe inputs multiply by a further 0.85.',
    description:
      'Waste has become a temporary disagreement about where things belong.',
    effects: {
      recipeMultiplier: {
        toolmaker: 0.85,
        machinist: 0.85,
        'electronics-worker': 0.85,
      },
    },
  },
  'resilient-megastructures': {
    name: 'Resilient megastructures',
    requires: { research: ['structural-systems', 'quantum-engineering'] },
    cost: { knowledge: 6000, data: 1000, 'quantum-components': 40 },
    minutes: 120,
    effect:
      'Housing contribution and all storage thresholds multiply by a further 1.25.',
    description:
      'Even the enormous buildings have somewhere sensible to put their feet.',
    effects: { housing: 1.25, storage: 1.25 },
  },
  'causal-engineering': {
    name: 'Causal engineering',
    requires: { research: ['coherent-assembly'] },
    cost: {
      knowledge: 8000,
      data: 2000,
      'exotic-material': 200,
      'quantum-components': 120,
      charge: 3000,
    },
    minutes: 240,
    effect:
      'Enter beyond quantum; unlock Causal laboratory and Temporal vault.',
    description: 'Cause and effect have been invited to a design meeting.',
    effects: {},
    era: 7,
  },
  'stellar-synthesis': {
    name: 'Stellar synthesis',
    requires: { research: ['causal-engineering'] },
    cost: {
      knowledge: 7000,
      data: 1200,
      'causal-models': 30,
      'quantum-components': 60,
    },
    minutes: 180,
    effect:
      'Unlock Stellar foundry, a high-output metal route using exotic material and charge.',
    description:
      'The furnace has submitted a proposal involving rather more sky.',
    effects: {},
  },
  'causal-archives': {
    name: 'Causal archives',
    requires: { research: ['causal-engineering'] },
    cost: { knowledge: 7000, data: 1500, 'causal-models': 25, circuits: 200 },
    minutes: 120,
    effect:
      'Unlock Causal archive and Causal data center; full-speed offline window +4h.',
    description:
      'The records now include a carefully labeled shelf for what happens next.',
    effects: { offlineHours: 4 },
  },
  'predictive-fabrication': {
    name: 'Predictive fabrication',
    requires: { research: ['stellar-synthesis', 'causal-archives'] },
    cost: { knowledge: 10000, data: 2500, 'causal-models': 60, machinery: 250 },
    minutes: 180,
    effect:
      'Unlock Predictive machine shop; selected processing technology +20%.',
    description:
      'The workshop has finished preparing before anyone remembers to ask.',
    effects: {
      jobBonus: { machinist: 0.2, 'electronics-worker': 0.2, toolmaker: 0.2 },
    },
  },
  'causal-synthesis': {
    name: 'Causal synthesis',
    requires: { research: ['predictive-fabrication'] },
    cost: {
      knowledge: 12000,
      data: 4000,
      'causal-models': 80,
      'quantum-components': 150,
    },
    minutes: 240,
    effect:
      'Unlock Causal synthesis lab: faster models with reduced recipe inputs. Continue expanding without a final reset requirement.',
    description:
      'Cause and effect have agreed to a more productive working arrangement.',
    effects: {},
  },
}
