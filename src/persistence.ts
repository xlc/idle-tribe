import { actionRequiredXp, cancelManual } from './actions'
import { BUILDINGS } from './buildings'
import { ERAS } from './constants'
import {
  ACTION_IDS,
  BUILDING_IDS,
  JOB_IDS,
  PERK_IDS,
  RESEARCH_IDS,
  RESOURCES,
  SPECIALIZATION_IDS,
  WORKING_JOB_IDS,
} from './ids'
import { createRecord } from './records'
import { QUEUES } from './research'
import { jobUnlocked } from './settlement'
import { expertiseLevel } from './skills'
import { createDefaultState } from './state'
import type {
  ActiveProject,
  Cost,
  GameState,
  Project,
  ProjectQueue,
  QueueEntry,
} from './types'
export const STORAGE_KEY = 'primitive-tribe'
// JSON is the untrusted boundary. Model its values explicitly and rebuild the
// entire current schema; incompatible or incomplete records reset atomically.
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }
type JsonObject = { [key: string]: JsonValue }
function object(v: JsonValue | undefined): JsonObject {
  if (v === null || typeof v !== 'object' || Array.isArray(v))
    throw new Error('Expected object')
  return v
}
function list(v: JsonValue | undefined): JsonValue[] {
  if (!Array.isArray(v)) throw new Error('Expected array')
  return v
}
function number(
  v: JsonValue | undefined,
  min = 0,
  max = Infinity,
  integer = false,
): number {
  if (
    typeof v !== 'number' ||
    !Number.isFinite(v) ||
    v < min ||
    v > max ||
    (integer && !Number.isSafeInteger(v))
  )
    throw new Error('Invalid number')
  return v
}
function bool(v: JsonValue | undefined): boolean {
  if (typeof v !== 'boolean') throw new Error('Invalid boolean')
  return v
}
function string(v: JsonValue | undefined): string {
  if (typeof v !== 'string') throw new Error('Invalid string')
  return v
}
function member<T extends string>(
  v: JsonValue | undefined,
  values: readonly T[],
): T {
  const result = values.find((id) => id === v)
  if (!result) throw new Error('Invalid identifier')
  return result
}
function cost(v: JsonValue | undefined): Cost {
  const o = object(v),
    result: Cost = {}
  for (const key of Object.keys(o)) {
    const r = member(key, RESOURCES)
    result[r] = number(o[r])
  }
  return result
}
function project(v: JsonValue | undefined): Project {
  const p = object(v),
    kind = member(p.kind, ['research', 'expand', 'convert', 'equip'] as const)
  if (kind === 'research') return { kind, id: member(p.id, RESEARCH_IDS) }
  const id = member(p.id, BUILDING_IDS)
  if (kind === 'equip')
    return { kind, id, target: number(p.target, 1, Infinity, true) }
  const form = number(p.form, 0, BUILDINGS[id].forms.length - 1, true)
  if (kind === 'convert') return { kind, id, form }
  return { kind, id, form, target: number(p.target, 1, Infinity, true) }
}
function entry(v: JsonValue | undefined): QueueEntry {
  const e = object(v)
  return {
    sequence: number(e.sequence, 1, Infinity, true),
    project: project(e.project),
  }
}
function active(v: JsonValue | undefined): ActiveProject | null {
  if (v === null) return null
  const a = object(v),
    total = number(a.total)
  return {
    ...entry(v),
    paid: cost(a.paid),
    total,
    progress: number(a.progress, 0, total + 1e-7),
  }
}
function queue(v: JsonValue | undefined): ProjectQueue {
  const q = object(v)
  return { active: active(q.active), waiting: list(q.waiting).map(entry) }
}
export function parseSave(serialized: string | null): GameState {
  try {
    const decoded: JsonValue = JSON.parse(serialized ?? 'null'),
      p = object(decoded),
      s = createDefaultState()
    const resources = object(p.resources),
      facilities = object(p.facilities),
      research = object(p.research),
      discovered = object(p.discovered),
      queues = object(p.queues),
      legacy = object(p.legacy),
      perks = object(legacy.perks)
    const actionSkills = object(p.actionSkills),
      actionProgress = object(p.actionProgress)
    s.actionSkills = createRecord(ACTION_IDS, (id) => {
      const skill = object(actionSkills[id])
      return {
        level: number(skill.level, 1, Infinity, true),
        xp: number(skill.xp, 0, Infinity),
      }
    })
    s.actionProgress = createRecord(ACTION_IDS, (id) =>
      number(actionProgress[id]),
    )
    for (const id of ACTION_IDS)
      if (s.actionSkills[id].xp >= actionRequiredXp(s, id))
        throw new Error('Invalid action experience')
    s.resources = createRecord(RESOURCES, (r) => number(resources[r]))
    s.research = createRecord(RESEARCH_IDS, (id) => bool(research[id]))
    s.facilities = createRecord(BUILDING_IDS, (id) => {
      const f = object(facilities[id]),
        level = number(f.level, 0, BUILDINGS[id].unique ? 1 : Infinity, true),
        form = number(f.form, 0, BUILDINGS[id].forms.length - 1, true),
        equipment = number(f.equipment, 0, Infinity, true)
      if ((!level && (form || equipment)) || (equipment && !BUILDINGS[id].job))
        throw new Error('Invalid facility')
      return { level, form, equipment }
    })
    s.discovered = {
      wood: bool(discovered.wood),
      stone: bool(discovered.stone),
    }
    s.people = list(p.people).map((v) => {
      const person = object(v),
        practice = object(person.practice)
      return {
        name: string(person.name),
        health: number(person.health, 0, 5),
        job: member(person.job, JOB_IDS),
        progress: number(person.progress, 0, 1),
        aptitude: member(person.aptitude, WORKING_JOB_IDS),
        practice: createRecord(WORKING_JOB_IDS, (job) => number(practice[job])),
      }
    })
    if (
      !s.people.length ||
      s.people.some((person) => !jobUnlocked(s, person.job))
    )
      throw new Error('Invalid people')
    s.exploreUnlocked = bool(p.exploreUnlocked)
    s.researchUnlocked = bool(p.researchUnlocked)
    s.expeditionUnlocked = bool(p.expeditionUnlocked)
    s.exploreRolls = number(p.exploreRolls, 0, Infinity, true)
    s.queues = {
      research: queue(queues.research),
      construction: queue(queues.construction),
    }
    s.nextSequence = number(p.nextSequence, 1, Infinity, true)
    const sequences = new Set<number>()
    for (const id of QUEUES) {
      const q = s.queues[id]
      for (const e of [...(q.active ? [q.active] : []), ...q.waiting]) {
        if (
          sequences.has(e.sequence) ||
          e.sequence >= s.nextSequence ||
          (e.project.kind === 'research') !== (id === 'research')
        )
          throw new Error('Invalid queue')
        sequences.add(e.sequence)
      }
    }
    if (p.manual !== null) {
      const m = object(p.manual)
      s.manual = {
        id: member(m.id, ACTION_IDS),
        paid: cost(m.paid),
        progress: number(m.progress, 0, 1),
        repeat: false,
      }
    }
    s.minuteProgress = number(p.minuteProgress, 0, 60)
    s.arrivalProgress = number(p.arrivalProgress, 0, 1)
    s.welcome = bool(p.welcome)
    s.happiness = number(p.happiness, 0, 100)
    s.era = number(p.era, 0, ERAS.length - 1, true)
    s.specialization =
      p.specialization === null
        ? null
        : member(p.specialization, SPECIALIZATION_IDS)
    s.savedAt = number(p.savedAt)
    s.completedProjects = number(p.completedProjects, 0, Infinity, true)
    s.notice = string(p.notice)
    s.legacy = {
      discovered: bool(legacy.discovered),
      lifetime: number(legacy.lifetime, 0, Infinity, true),
      points: number(legacy.points, 0, Infinity, true),
      highestEra: number(legacy.highestEra, 0, ERAS.length - 1, true),
      perks: createRecord(PERK_IDS, (id) => bool(perks[id])),
    }
    if (p.absence !== null) {
      const a = object(p.absence),
        balances = object(a.resources)
      s.absence = {
        start: number(a.start, 0, s.savedAt),
        windowHours: number(a.windowHours, 8),
        settledSeconds: number(a.settledSeconds),
        resources: createRecord(RESOURCES, (r) => number(balances[r])),
        population: number(a.population, 1, s.people.length, true),
        expertise: list(a.expertise).map((value) => {
          const levels = object(value)
          return createRecord(WORKING_JOB_IDS, (job) =>
            number(levels[job], 0, Infinity, true),
          )
        }),
        completed: number(a.completed, 0, Infinity, true),
      }
      if (
        s.absence.expertise.length !== s.absence.population ||
        s.absence.expertise.some((levels, index) =>
          WORKING_JOB_IDS.some(
            (job) =>
              levels[job] > expertiseLevel(s.people[index]?.practice[job] ?? 0),
          ),
        )
      )
        throw new Error('Invalid absence expertise')
    }
    cancelManual(s)
    return s
  } catch {
    return createDefaultState()
  }
}
export function loadState() {
  try {
    return parseSave(localStorage.getItem(STORAGE_KEY))
  } catch {
    return createDefaultState()
  }
}
export function saveState(state: GameState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* Storage can be unavailable; the current session remains playable. */
  }
}

export function wipeSave() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* Storage can be unavailable; the current session remains playable. */
  }
}
