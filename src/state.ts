import {
  ACTION_IDS,
  BUILDING_IDS,
  EXPEDITION_ENCOUNTER_IDS,
  NOTE_IDS,
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
    job: 'idle',
    progress: 0,
    aptitude,
    practice: createRecord(WORKING_JOB_IDS, () => 0),
  }
}
export function createDefaultState(nameSeed = 0): GameState {
  const resources = createRecord(RESOURCES, () => 0)
  return {
    actionSkills: createRecord(ACTION_IDS, () => ({ level: 1, xp: 0 })),
    actionProgress: createRecord(ACTION_IDS, () => 0),
    resources,
    facilities: createRecord(BUILDING_IDS, () => ({
      level: 0,
      equipment: 0,
    })),
    research: createRecord(RESEARCH_IDS, () => 0),
    nameSeed,
    // The player starts as the settlement's first person.
    people: [createPerson(generatePersonName(nameSeed))],
    discovered: { wood: false, stone: false },
    exploreUnlocked: false,
    researchUnlocked: false,
    expeditionUnlocked: false,
    exploreRolls: 0,
    pendingEncounter: null,
    completedEncounters: createRecord(EXPEDITION_ENCOUNTER_IDS, () => false),
    seenNotes: createRecord(NOTE_IDS, () => false),
    projects: { research: null, construction: null },
    manual: [],
    minuteProgress: 0,
    happiness: 50,
    era: 0,
    specialization: null,
    savedAt: 0,
    absence: null,
    completedProjects: 0,
    notice: '',
    lastExploreOutcome: null,
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
  preserved: Pick<GameState, 'legacy' | 'savedAt'>,
) {
  const fresh = createDefaultState((state.nameSeed + 1) >>> 0)
  state.actionSkills = fresh.actionSkills
  state.actionProgress = fresh.actionProgress
  state.resources = fresh.resources
  state.facilities = fresh.facilities
  state.research = fresh.research
  state.people = fresh.people
  state.nameSeed = fresh.nameSeed
  state.discovered = fresh.discovered
  state.exploreUnlocked = fresh.exploreUnlocked
  state.researchUnlocked = fresh.researchUnlocked
  state.expeditionUnlocked = fresh.expeditionUnlocked
  state.exploreRolls = fresh.exploreRolls
  state.pendingEncounter = fresh.pendingEncounter
  state.completedEncounters = fresh.completedEncounters
  state.projects = fresh.projects
  state.manual = fresh.manual
  state.minuteProgress = fresh.minuteProgress
  state.happiness = fresh.happiness
  state.era = fresh.era
  state.specialization = fresh.specialization
  state.savedAt = preserved.savedAt
  state.absence = fresh.absence
  state.completedProjects = fresh.completedProjects
  state.notice = fresh.notice
  state.lastExploreOutcome = fresh.lastExploreOutcome
  state.legacy = preserved.legacy
}
