import { FOOD_TICK_MS, JOBS, MAX_HUNGER } from './constants'
import { isJobUnlocked } from './economy'
import { roundResource } from './format'
import {
  ACTION_IDS,
  BUILDING_IDS,
  isJobId,
  RESEARCH_ITEM_KEYS,
  RESOURCES,
} from './ids'
import { isResearchExcluded, RESEARCH_CONFIG } from './research-definitions'
import { createDefaultState } from './state'
import type { GameState, JobId } from './types'

export const STORAGE_KEY = 'primitive-tribe-v1'

// JSON.parse produces only JSON values; missing object properties add undefined.
type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]
type JsonObject = { [key: string]: JsonValue }

function record(value: JsonValue | undefined): JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
}

function array(value: JsonValue | undefined): JsonValue[] {
  return Array.isArray(value) ? value : []
}

function finite(value: JsonValue | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function parseSave(serialized: string | null): GameState {
  const state = createDefaultState()
  try {
    const decoded: JsonValue = JSON.parse(serialized ?? 'null')
    const parsed = record(decoded)
    if (parsed.version !== state.version) return state
    const savedSkills = record(parsed.skills)
    for (const id of ACTION_IDS) {
      const saved = record(savedSkills[id])
      state.skills[id] = {
        level: Math.max(1, Math.floor(finite(saved.level, 1))),
        xp: Math.max(0, Math.floor(finite(saved.xp))),
      }
    }
    const savedResearch = record(parsed.researchLevels)
    const savedSeenResearch = record(parsed.seenResearchLevels)
    for (const key of RESEARCH_ITEM_KEYS) {
      state.researchLevels[key] = Math.min(
        RESEARCH_CONFIG[key].levels.length,
        Math.max(0, Math.floor(finite(savedResearch[key]))),
      )
    }
    for (const id of RESOURCES) state[id] = roundResource(finite(parsed[id]))
    const savedBuildings = record(parsed.buildings)
    for (const id of BUILDING_IDS)
      state.buildings[id] = Math.max(0, Math.floor(finite(savedBuildings[id])))
    const choices = RESEARCH_ITEM_KEYS.filter(
      (id) => RESEARCH_CONFIG[id].specialization?.kind === 'choice',
    )
    const chosen =
      choices.find(
        (id) =>
          RESEARCH_CONFIG[id].specialization?.id === parsed.specialization,
      ) ?? choices.find((id) => state.researchLevels[id] > 0)
    state.specialization = chosen
      ? (RESEARCH_CONFIG[chosen].specialization?.id ?? null)
      : null
    if (chosen) state.researchLevels[chosen] = 1
    for (const id of RESEARCH_ITEM_KEYS) {
      if (isResearchExcluded(state, id)) state.researchLevels[id] = 0
    }
    for (const key of RESEARCH_ITEM_KEYS) {
      // Completed levels are always read; newly unlocked levels remain unread.
      state.seenResearchLevels[key] = Math.min(
        RESEARCH_CONFIG[key].levels.length,
        Math.max(
          state.researchLevels[key],
          Math.floor(finite(savedSeenResearch[key])),
        ),
      )
    }
    state.savedAt = Math.max(0, finite(parsed.savedAt))
    state.explored = parsed.explored === true
    state.stoneFound = parsed.stoneFound === true
    const people = array(parsed.people)
    if (people.length) {
      const playerIndex = Math.max(
        0,
        people.findIndex((value) => record(value).isPlayer === true),
      )
      state.people = people.map((value, index) => {
        const person = record(value)
        const maxHunger = Math.max(1, finite(person.maxHunger, MAX_HUNGER))
        const requestedJob = person.job
        let job: JobId = 'idle'
        if (
          typeof requestedJob === 'string' &&
          isJobId(requestedJob) &&
          isJobUnlocked(state, requestedJob)
        )
          job = requestedJob

        return {
          job,
          isPlayer: index === playerIndex,
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
    state.exploreUnlocked = parsed.exploreUnlocked === true || state.explored
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
