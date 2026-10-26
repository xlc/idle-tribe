import { FAMILY_NAMES, GIVEN_NAMES } from './definitions/person-names'
import type { GameState } from './types'

export const PERSON_NAME_MAX_LENGTH = 40

export function normalizePersonName(value: string): string | null {
  const name = value.trim().replace(/\s+/gu, ' ')
  return name && name.length <= PERSON_NAME_MAX_LENGTH ? name : null
}

// The saved settlement seed and roster position make each draw reproducible
// across live ticks, offline progress, and reloads, without consuming game RNG.
export function generatePersonName(
  seed: number,
  existingNames: readonly string[] = [],
): string {
  let roll = Math.imul(seed ^ 0x9e3779b9, 0x21f0aaad)
  roll = Math.imul(roll ^ (roll >>> 16), 0x735a2d97)
  const start = (roll ^ (roll >>> 15)) >>> 0,
    combinations = GIVEN_NAMES.length * FAMILY_NAMES.length,
    used = new Set(existingNames)
  // Walk the pool on a collision; even a repeated draw never loops forever.
  for (let offset = 0; ; offset++) {
    const pair = (start + offset) % combinations,
      given = GIVEN_NAMES[Math.floor(pair / FAMILY_NAMES.length)],
      family = FAMILY_NAMES[pair % FAMILY_NAMES.length],
      suffix = Math.floor(offset / combinations),
      name = `${given} ${family}${suffix ? ` ${suffix + 1}` : ''}`
    if (!used.has(name)) return name
  }
}

export function renamePerson(state: GameState, index: number, value: string) {
  const person = state.people[index],
    name = normalizePersonName(value)
  if (!person || !name || person.name === name) return false
  person.name = name
  return true
}
