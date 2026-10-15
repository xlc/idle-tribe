import { ACTION_SKILL_CONFIG, RESEARCH_ITEM_KEYS, MAX_HUNGER } from './constants'
import type { GameState } from './types'

export function createDefaultState(): GameState {
return {
  fruit: 0,
  wood: 0,
  stone: 0,
  people: [{ name: "You", hunger: MAX_HUNGER, maxHunger: MAX_HUNGER }],
  actions: 0,
  explored: false,
  exploreUnlocked: false,
  stoneFound: false,
  researchUnlocked: false,
  basicTools: false,
  researchLevels: Object.fromEntries(RESEARCH_ITEM_KEYS.map((key) => [key, 0])) as GameState['researchLevels'],
  skills: Object.fromEntries(Object.entries(ACTION_SKILL_CONFIG).map(([id]) => [id, { level: 1, xp: 0 }])) as GameState['skills'],
  foodElapsedMs: 0,
};
}
