import {
  ACTION_SKILL_CONFIG,
  FOOD_TICK_MS,
  JOBS,
  MAX_HUNGER,
  RESEARCH_ITEM_KEYS,
  RESOURCES,
} from './constants'
import { BUILDING_IDS, BUILDINGS, JOB_BUILDING } from './economy'
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

function migrateSave(parsed: Record<string, unknown>) {
  if (parsed.version === 4) return parsed
  const people = Array.isArray(parsed.people)
    ? parsed.people.map((value: unknown) => {
        const person = record(value)
        return parsed.version === 2 || parsed.version === 3
          ? person
          : { ...person, job: 'idle', workElapsedMs: 0 }
      })
    : []
  const playerIndex = Math.max(
    0,
    people.findIndex((person) =>
      parsed.version === 3 ? person.isPlayer === true : person.name === 'You',
    ),
  )
  const levels = record(parsed.researchLevels)
  const buildings = { ...createDefaultState().buildings }
  if (finite(levels.shelters) > 0) {
    buildings['foraging-camp'] = 1
    buildings['lumber-camp'] = 1
    if (parsed.stoneFound === true) buildings.quarry = 1
    for (const job of ['forager', 'woodcutter', 'stoneworker'] as const) {
      buildings[JOB_BUILDING[job]] = Math.max(
        buildings[JOB_BUILDING[job]],
        Math.ceil(people.filter((p) => p.job === job).length / 2),
      )
    }
  }
  return {
    ...parsed,
    version: 4,
    savedAt: 0,
    buildings,
    people: people.map((person, index) => ({
      ...person,
      isPlayer: index === playerIndex,
    })),
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
        [
          'sharpened-stick',
          'foraging-practice',
          'stone-flakes',
          'shelters',
          'stone-axes',
          'quarrying',
          'teamwork',
        ].includes(key)
          ? 3
          : 1,
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
    for (const id of RESOURCES) state[id] = roundResource(finite(parsed[id]))
    const savedBuildings = record(parsed.buildings)
    for (const id of BUILDING_IDS)
      state.buildings[id] = Math.max(0, Math.floor(finite(savedBuildings[id])))
    const chosen =
      parsed.specialization === 'forestry' ||
      parsed.specialization === 'stonecraft'
        ? parsed.specialization
        : state.researchLevels.forestry
          ? 'forestry'
          : state.researchLevels.stonecraft
            ? 'stonecraft'
            : null
    state.specialization = chosen
    if (chosen) {
      state.researchLevels[chosen] = 1
      const other = chosen === 'forestry' ? 'stonecraft' : 'forestry'
      state.researchLevels[other] = 0
      state.researchLevels[chosen === 'forestry' ? 'architecture' : 'joinery'] =
        0
    }
    state.savedAt = Math.max(0, finite(parsed.savedAt))
    if (Array.isArray(parsed.people) && parsed.people.length) {
      const playerIndex = Math.max(
        0,
        parsed.people.findIndex(
          (value: unknown) => record(value).isPlayer === true,
        ),
      )
      state.people = parsed.people.map((value: unknown, index: number) => {
        const person = record(value)
        const maxHunger = Math.max(1, finite(person.maxHunger, MAX_HUNGER))
        const requestedJob = person.job
        let job: JobId = 'idle'
        if (
          typeof requestedJob === 'string' &&
          Object.hasOwn(JOBS, requestedJob) &&
          finite(savedResearch.shelters) > 0
        ) {
          const candidate = requestedJob as Exclude<JobId, 'idle'>
          const building = JOB_BUILDING[candidate]
          const tech = BUILDINGS[building].technology
          if (
            state.buildings[building] > 0 &&
            (!tech || state.researchLevels[tech] > 0) &&
            (candidate !== 'woodcutter' || parsed.explored === true) &&
            (candidate !== 'stoneworker' || parsed.stoneFound === true)
          )
            job = candidate
        }

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
