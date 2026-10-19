import { BUILDING_IDS, PERK_IDS, RESEARCH_IDS, RESOURCES } from './ids'
import { createRecord } from './records'
import type { GameState, Person } from './types'
export function createPerson(name: string): Person {
  return { name, health: 5, job: 'idle', progress: 0 }
}
export function createDefaultState(): GameState {
  return {
    version: 5,
    resources: createRecord(RESOURCES, () => 0),
    facilities: createRecord(BUILDING_IDS, () => ({
      level: 0,
      form: 0,
      equipment: 0,
    })),
    research: createRecord(RESEARCH_IDS, () => false),
    mastery: createRecord(['food', 'wood', 'stone'] as const, () => ({
      level: 1,
      xp: 0,
    })),
    people: [createPerson('You')],
    discovered: { wood: false, stone: false },
    exploreUnlocked: false,
    researchUnlocked: false,
    queues: {
      research: { active: null, waiting: [] },
      construction: { active: null, waiting: [] },
    },
    nextSequence: 1,
    manual: null,
    minuteProgress: 0,
    arrivalProgress: 0,
    welcome: true,
    happiness: 50,
    era: 0,
    specialization: null,
    savedAt: 0,
    absence: null,
    completedProjects: 0,
    notice: '',
    legacy: {
      discovered: false,
      lifetime: 0,
      points: 0,
      highestEra: 0,
      perks: createRecord(PERK_IDS, () => false),
    },
  }
}
