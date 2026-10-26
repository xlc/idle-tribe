import { type ActionJob, isActionJob, type JobId } from './ids'
import type { JobDefinition, OccupationDefinition, WorkingJob } from './types'

export type ProductionJob = Exclude<JobId, 'idle' | 'builder' | ActionJob>
export const JOBS: Record<ProductionJob, JobDefinition> = {
  farmer: {
    name: 'Farmer',
    aptitude: 'Farming',
    learning: 'production',
    description: 'Persuades plants to keep regular working hours.',
    output: 'food',
    input: {},
  },
  sawyer: {
    name: 'Sawyer',
    aptitude: 'Sawing',
    learning: 'production',
    description: 'Helps trees settle into a flatter line of work.',
    output: 'planks',
    input: { wood: 3 },
  },
  mason: {
    name: 'Mason',
    aptitude: 'Masonry',
    learning: 'production',
    description: 'Makes stone look like it was expecting to become a building.',
    output: 'blocks',
    input: { stone: 3 },
  },
  potter: {
    name: 'Potter',
    aptitude: 'Pottery',
    learning: 'production',
    description: 'Turns clay, heat, and a little patience into useful vessels.',
    output: 'ceramics',
    input: { blocks: 2, wood: 1 },
  },
  toolmaker: {
    name: 'Toolmaker',
    aptitude: 'Toolmaking',
    learning: 'production',
    description: 'Equips everyone else to complain less about their equipment.',
    output: 'tools',
    input: { planks: 2, blocks: 1 },
  },
  scholar: {
    name: 'Scholar',
    aptitude: 'Scholarship',
    learning: 'production',
    description: 'Turns a full stomach into difficult questions.',
    output: 'knowledge',
    input: { food: 1 },
  },
  miner: {
    name: 'Miner',
    aptitude: 'Mining',
    learning: 'production',
    description: 'Finds promising metal before it has stopped being a rock.',
    output: 'ore',
    input: {},
  },
  smelter: {
    name: 'Smelter',
    aptitude: 'Smelting',
    learning: 'production',
    description: 'Helps ore reconsider its commitment to being inconvenient.',
    output: 'metal',
    input: { ore: 3, wood: 1 },
  },
  machinist: {
    name: 'Machinist',
    aptitude: 'Machining',
    learning: 'production',
    description:
      'Builds the moving parts that make everyone else look organized.',
    output: 'machinery',
    input: { metal: 3, tools: 1 },
  },
  'power-worker': {
    name: 'Power worker',
    aptitude: 'Power generation',
    learning: 'production',
    description: 'Keeps the switches supplied with reasons to switch on.',
    output: 'charge',
    input: { wood: 0.5 },
  },
  'electronics-worker': {
    name: 'Electronics worker',
    aptitude: 'Electronics',
    learning: 'production',
    description:
      'Connects tiny parts with impressively strong opinions about direction.',
    output: 'circuits',
    input: { metal: 2, charge: 3 },
  },
  analyst: {
    name: 'Analyst',
    aptitude: 'Analysis',
    learning: 'production',
    description:
      'Asks the machines to turn an interesting question into several files.',
    output: 'data',
    input: { knowledge: 1, circuits: 1, charge: 2 },
  },
  'orbital-worker': {
    name: 'Orbital worker',
    aptitude: 'Orbital extraction',
    learning: 'production',
    description:
      'Gathers useful material a rather long way from the lunch room.',
    output: 'exotic-material',
    input: { charge: 4 },
  },
  'quantum-engineer': {
    name: 'Quantum engineer',
    aptitude: 'Quantum engineering',
    learning: 'production',
    description:
      'Keeps very small parts on unusually complicated speaking terms.',
    output: 'quantum-components',
    input: { 'exotic-material': 2, data: 5, charge: 10 },
  },
  'causal-researcher': {
    name: 'Causal researcher',
    aptitude: 'Causal research',
    learning: 'production',
    description:
      'Files the results carefully enough to remember which happened first.',
    output: 'causal-models',
    input: { 'quantum-components': 2, data: 10, charge: 20 },
  },
  'stellar-worker': {
    name: 'Stellar worker',
    aptitude: 'Stellar production',
    learning: 'production',
    description:
      'Works beside a furnace with an unusually ambitious job description.',
    output: 'metal',
    input: { 'exotic-material': 0.1, charge: 2 },
  },
}
export function isProductionJob(job: JobId): job is ProductionJob {
  return job !== 'idle' && job !== 'builder' && !isActionJob(job)
}

// Gathering is automated through the action system; these entries remain as
// inert display labels for the assignment markers (people are interchangeable
// on actions, so no aptitude or practice effects apply).
export const OCCUPATIONS: Record<WorkingJob, OccupationDefinition> = {
  ...JOBS,
  builder: { name: 'Builder', aptitude: 'Building', learning: 'construction' },
  forager: { name: 'Forager', aptitude: 'Foraging', learning: 'production' },
  woodcutter: {
    name: 'Woodcutter',
    aptitude: 'Woodcutting',
    learning: 'production',
  },
  stoneworker: {
    name: 'Stoneworker',
    aptitude: 'Stoneworking',
    learning: 'production',
  },
  explorer: {
    name: 'Explorer',
    aptitude: 'Exploration',
    learning: 'production',
  },
}
