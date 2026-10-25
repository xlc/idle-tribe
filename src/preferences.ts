import { RESOURCES, type ResourceId } from './ids'

const PIN_KEY = 'primitive-tribe-resource-pins'
export const MAX_RESOURCE_PINS = 3

export function parseResourcePins(serialized: string | null): ResourceId[] {
  try {
    // Browser preferences are untrusted JSON; narrow at this boundary only.
    const value: unknown = JSON.parse(serialized ?? '[]')
    if (!Array.isArray(value)) return []
    return RESOURCES.filter((r) => value.includes(r))
      .sort((a, b) => value.indexOf(a) - value.indexOf(b))
      .slice(0, MAX_RESOURCE_PINS)
  } catch {
    return []
  }
}

export function loadResourcePins() {
  try {
    return parseResourcePins(localStorage.getItem(PIN_KEY))
  } catch {
    return []
  }
}

export function saveResourcePins(pins: readonly ResourceId[]) {
  try {
    localStorage.setItem(PIN_KEY, JSON.stringify(pins))
  } catch {
    // Storage may be unavailable; pinning still works for this session.
  }
}
