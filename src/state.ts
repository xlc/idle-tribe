import {
  ACTION_IDS,
  BUILDING_IDS,
  PERK_IDS,
  RESEARCH_IDS,
  RESOURCES,
  WORKING_JOB_IDS,
} from './ids'
import { generatePersonName } from './names'
import { createRecord } from './records'
import type { GameState, Person, WorkingJob } from './types'
export function createPerson(
  name: string,
  aptitude: WorkingJob = 'forager',
): Person {
  return {
    name,
    health: 5,
    job: 'idle',
    progress: 0,
    aptitude,
    practice: createRecord(WORKING_JOB_IDS, () => 0),
  }
}
export function createDefaultState(nameSeed = 0): GameState {
  return {
    actionSkills: createRecord(ACTION_IDS, () => ({ level: 1, xp: 0 })),
    actionProgress: createRecord(ACTION_IDS, () => 0),
    resources: createRecord(RESOURCES, () => 0),
    facilities: createRecord(BUILDING_IDS, () => ({
      level: 0,
      form: 0,
      equipment: 0,
    })),
    research: createRecord(RESEARCH_IDS, () => false),
    nameSeed,
    people: [createPerson(generatePersonName(nameSeed))],
    discovered: { wood: false, stone: false },
    exploreUnlocked: false,
    researchUnlocked: false,
    expeditionUnlocked: false,
    exploreRolls: 0,
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

export function resetState(
  state: GameState,
  preserved: Pick<GameState, 'legacy' | 'welcome' | 'savedAt'>,
) {
  const fresh = createDefaultState((state.nameSeed + 1) >>> 0)
  Object.assign(state, fresh, preserved)
}
