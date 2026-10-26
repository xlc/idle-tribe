import { BUILDINGS, RESEARCH } from './definitions'
import { BUILDING_IDS, RESEARCH_IDS, RESOURCES, WORKING_JOB_IDS } from './ids'
import { completeProject } from './research'
import { requirementBlocker } from './settlement'
import { createDefaultState, createPerson } from './state'
import type { GameState, JobId, ResearchId, Specialization } from './types'
export function complete(state: GameState, ...ids: ResearchId[]) {
  for (const id of ids) completeProject(state, { kind: 'research', id })
}
export function settlement(branch: Specialization = 'forestry') {
  const state = createDefaultState()
  state.discovered = { wood: true, stone: true }
  state.exploreUnlocked = true
  state.researchUnlocked = true
  for (const id of RESEARCH_IDS.slice(
    0,
    RESEARCH_IDS.indexOf('mechanization'),
  )) {
    if (
      id === 'mechanization' ||
      id === 'early-astronomy' ||
      id === (branch === 'forestry' ? 'stonecraft' : 'forestry') ||
      id === (branch === 'forestry' ? 'architecture' : 'joinery')
    )
      continue
    complete(state, id)
  }
  for (const r of RESOURCES) state.resources[r] = 5000
  for (const id of BUILDING_IDS) {
    if (
      BUILDINGS[id].unique ||
      requirementBlocker(state, BUILDINGS[id].forms[0]?.requires ?? {})
    )
      continue
    state.facilities[id].level = 2
  }
  state.welcome = false
  return state
}
export function people(state: GameState, ...jobs: JobId[]) {
  state.people = jobs.map((job, i) => ({
    ...createPerson(
      i === 0 ? 'Founder' : `Settler ${i + 1}`,
      required(WORKING_JOB_IDS.find((id) => id !== job)),
    ),
    job,
  }))
}

export function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Missing fixture value')
  return value
}

// A late-era interaction fixture. Progression itself is exercised by the visit simulation.
export function advancedSettlement(branch: Specialization = 'forestry') {
  const state = settlement(branch)
  for (const id of RESEARCH_IDS) {
    if (
      !requirementBlocker(state, RESEARCH[id].requires) &&
      (!RESEARCH[id].branch || RESEARCH[id].branch === branch)
    )
      complete(state, id)
    // Spaceflight requires a constructed launch site before orbital research.
    if (state.research['orbital-flight'])
      state.facilities['launch-complex'].level = 1
  }
  for (const id of BUILDING_IDS) {
    const def = BUILDINGS[id]
    for (const [form, value] of def.forms.entries()) {
      if (!requirementBlocker(state, value.requires)) {
        state.facilities[id] = { level: def.unique ? 1 : 2, form, equipment: 0 }
      }
    }
  }
  return state
}
