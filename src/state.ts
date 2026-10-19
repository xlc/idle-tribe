import {
  ACTION_SKILL_CONFIG,
  MAX_HUNGER,
  RESEARCH_ITEM_KEYS,
} from './constants'
import type { GameState } from './types'

export function createDefaultState(): GameState {
  return {
    version: 2,
    fruit: 0,
    wood: 0,
    stone: 0,
    people: [
      {
        name: 'You',
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
    researchLevels: Object.fromEntries(
      RESEARCH_ITEM_KEYS.map((key) => [key, 0]),
    ) as GameState['researchLevels'],
    seenResearchLevels: Object.fromEntries(
      RESEARCH_ITEM_KEYS.map((key) => [key, 0]),
    ) as GameState['seenResearchLevels'],
    skills: Object.fromEntries(
      Object.entries(ACTION_SKILL_CONFIG).map(([id]) => [
        id,
        { level: 1, xp: 0 },
      ]),
    ) as GameState['skills'],
    foodElapsedMs: 0,
  }
}
