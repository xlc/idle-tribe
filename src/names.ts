import { FAMILY_NAMES, GIVEN_NAMES } from './definitions/person-names'

// The longest unsuffixed pool name is 17 characters. This leaves room for a
// short collision suffix without letting names push the roster layout wider.
export const PERSON_NAME_MAX_LENGTH = 20

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
      family = FAMILY_NAMES[pair % FAMILY_NAMES.length]
    if (!given || !family) continue
    const suffix = Math.floor(offset / combinations),
      maxSuffixDigits = Math.max(1, PERSON_NAME_MAX_LENGTH - given.length - 3),
      suffixText = suffix
        ? ` ${(suffix + 1).toString().slice(-maxSuffixDigits)}`
        : '',
      familyLength = Math.max(
        1,
        PERSON_NAME_MAX_LENGTH - given.length - 1 - suffixText.length,
      ),
      name = `${given} ${family.slice(0, familyLength)}${suffixText}`
    if (!used.has(name)) return name
  }
}
