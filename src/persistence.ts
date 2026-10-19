import {
  ACTION_SKILL_CONFIG,
  FOOD_TICK_MS,
  JOBS,
  MAX_HUNGER,
  RESEARCH_ITEM_KEYS,
} from './constants'
import { roundResource } from './format'
import { createDefaultState } from './state'
import type { ActionId, GameState, JobId } from './types'

export const STORAGE_KEY = 'primitive-tribe-v1'

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {}
}

function finite(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

// Version 1 had no job assignments. Give every existing person an idle job
// without changing population, hunger, discoveries, resources, or skills.
function migrateSave(parsed: Record<string, unknown>) {
  if (parsed.version === 2) return parsed
  return {
    ...parsed,
    version: 2,
    people: Array.isArray(parsed.people)
      ? parsed.people.map((value: unknown) => ({
          ...record(value),
          job: 'idle',
          workElapsedMs: 0,
        }))
      : parsed.people,
  }
}

export function parseSave(serialized: string | null): GameState {
  const state = createDefaultState()
  try {
    const parsed = migrateSave(record(JSON.parse(serialized ?? 'null')))
    const savedSkills = record(parsed.skills)
    for (const id of Object.keys(ACTION_SKILL_CONFIG) as ActionId[]) {
      const saved = record(savedSkills[id])
      state.skills[id] = {
        level: Math.max(1, Math.floor(finite(saved.level, 1))),
        xp: Math.max(0, Math.floor(finite(saved.xp))),
      }
    }
    const savedResearch = record(parsed.researchLevels)
    const savedSeenResearch = record(parsed.seenResearchLevels)
    for (const key of RESEARCH_ITEM_KEYS) {
      const legacyLevel =
        key === 'sharpened-stick' && parsed.basicTools === true ? 1 : 0
      state.researchLevels[key] = Math.min(
        3,
        Math.max(legacyLevel, Math.floor(finite(savedResearch[key]))),
      )
      // Older saves have seen completed levels; their next unlock is unread.
      state.seenResearchLevels[key] = Math.min(
        3,
        Math.max(
          state.researchLevels[key],
          Math.floor(finite(savedSeenResearch[key])),
        ),
      )
    }
    state.fruit = roundResource(finite(parsed.fruit))
    state.wood = roundResource(finite(parsed.wood))
    state.stone = roundResource(finite(parsed.stone))
    if (Array.isArray(parsed.people) && parsed.people.length) {
      state.people = parsed.people.map((value: unknown) => {
        const person = record(value)
        const maxHunger = Math.max(1, finite(person.maxHunger, MAX_HUNGER))
        const requestedJob = person.job
        let job: JobId = 'idle'
        if (state.researchLevels.shelters > 0) {
          if (requestedJob === 'forager') job = requestedJob
          if (requestedJob === 'woodcutter' && parsed.explored === true)
            job = requestedJob
          if (requestedJob === 'stoneworker' && parsed.stoneFound === true)
            job = requestedJob
        }
        return {
          job,
          workElapsedMs:
            job === 'idle'
              ? 0
              : Math.max(0, finite(person.workElapsedMs)) %
                JOBS[job].durationMs,
          name: typeof person.name === 'string' ? person.name : 'Person',
          maxHunger,
          hunger: Math.max(
            0,
            Math.min(maxHunger, finite(person.hunger, maxHunger)),
          ),
        }
      })
    }
    state.actions = Math.max(0, Math.floor(finite(parsed.actions)))
    state.explored = parsed.explored === true
    state.exploreUnlocked = parsed.exploreUnlocked === true || state.explored
    state.stoneFound = parsed.stoneFound === true
    state.researchUnlocked = parsed.researchUnlocked === true
    state.basicTools =
      parsed.basicTools === true || state.researchLevels['sharpened-stick'] >= 1
    state.foodElapsedMs = Math.max(
      0,
      finite(parsed.foodElapsedMs) % FOOD_TICK_MS,
    )
    return state
  } catch {
    return createDefaultState()
  }
}

export function loadState(): GameState {
  try {
    return parseSave(localStorage.getItem(STORAGE_KEY))
  } catch {
    return createDefaultState()
  }
}

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage may be disabled or full; gameplay should still work for this session.
  }
}
