import { MAX_HUNGER, RESEARCH_ITEM_KEYS } from './constants'
import { ACTION_IDS, BUILDING_IDS } from './ids'
import { createRecord } from './records'
import type { GameState } from './types'

export function createDefaultState(): GameState {
  return {
    version: 4,
    fruit: 0,
    planks: 0,
    blocks: 0,
    knowledge: 0,
    buildings: createRecord(BUILDING_IDS, () => 0),
    specialization: null,
    savedAt: 0,
    wood: 0,
    stone: 0,
    people: [
      {
        name: 'You',
        isPlayer: true,
        hunger: MAX_HUNGER,
        maxHunger: MAX_HUNGER,
        job: 'idle',
        workElapsedMs: 0,
      },
    ],
    actions: 0,
    explored: false,
    exploreUnlocked: false,
    stoneFound: false,
    researchUnlocked: false,
    basicTools: false,
    researchLevels: createRecord(RESEARCH_ITEM_KEYS, () => 0),
    seenResearchLevels: createRecord(RESEARCH_ITEM_KEYS, () => 0),
    skills: createRecord(ACTION_IDS, () => ({ level: 1, xp: 0 })),
    foodElapsedMs: 0,
  }
}
