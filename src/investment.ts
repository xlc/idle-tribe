import {
  ACTIONS,
  actionCompletionDuration,
  actionJobActive,
  actionOutputRate,
  automationFactor,
} from './actions'
import { offlineWindow } from './clock'
import { RESOURCE_INFO } from './constants'
import { BUILDINGS, isProductionJob, JOBS } from './economy'
import { ACTION_IDS, RESOURCES } from './ids'
import { completeProject, constructionPlan } from './research'
import { threshold } from './resources'
import {
  comfortablePlaces,
  crewSize,
  equipmentMultiplier,
  jobCapacity,
  workerRate,
} from './settlement'
import { resourceRates } from './simulation'
import type { GameState, Project } from './types'

export interface InvestmentOutcome {
  label: string
  before: number
  after: number
}

// Quote one consequence using the same rules as production. Inputs are ignored
// for output comparisons so a temporary shortage does not hide an upgrade.
export function investmentOutcome(
  current: GameState,
  project: Project,
): InvestmentOutcome | null {
  if (project.kind === 'research') return null
  const state = constructionPlan(current)
  const after = structuredClone(state)
  completeProject(after, project)
  const compare = (label: string, beforeValue: number, afterValue: number) =>
    Math.abs(afterValue - beforeValue) > 0.0005
      ? { label, before: beforeValue, after: afterValue }
      : null
  const job = BUILDINGS[project.id].job
  if (job) {
    const action = ACTION_IDS.find((id) => ACTIONS[id].job === job)
    if (action) {
      const def = ACTIONS[action]
      const rate = (s: GameState) =>
        def.resource
          ? actionOutputRate(s, action) * 60
          : actionJobActive(s, action)
            ? 60 / actionCompletionDuration(s, action)
            : 0
      const outcome = compare(
        `${def.resource ? RESOURCE_INFO[def.resource].name : 'Explores'}/min`,
        rate(state),
        rate(after),
      )
      if (outcome) return outcome
      const automation = compare(
        'Automation %',
        automationFactor(state, action) * 100,
        automationFactor(after, action) * 100,
      )
      if (automation) return automation
    } else if (isProductionJob(job)) {
      const rate = (s: GameState) =>
        s.people
          .filter((p) => p.job === job)
          .reduce((sum, p) => sum + workerRate(s, p, { ignoreInputs: true }), 0)
      const outcome = compare(
        `${RESOURCE_INFO[JOBS[job].output].name}/min`,
        rate(state),
        rate(after),
      )
      if (outcome) return outcome
      const base = compare(
        `${RESOURCE_INFO[JOBS[job].output].name}/min base`,
        BUILDINGS[project.id].forms[state.facilities[project.id].form]?.rate ??
          0,
        BUILDINGS[project.id].forms[after.facilities[project.id].form]?.rate ??
          0,
      )
      if (base) return base
      const tools = compare(
        'Worker output ×',
        equipmentMultiplier(state.facilities[project.id].equipment),
        equipmentMultiplier(after.facilities[project.id].equipment),
      )
      if (tools) return tools
    }
    const capacity = compare(
      'Efficient places',
      jobCapacity(state, job),
      jobCapacity(after, job),
    )
    if (capacity) return capacity
  }
  const housing = compare(
    'Comfortable places',
    comfortablePlaces(state),
    comfortablePlaces(after),
  )
  if (housing) return housing
  for (const r of RESOURCES) {
    const storage = compare(
      `${RESOURCE_INFO[r].name} storage`,
      threshold(state, r),
      threshold(after, r),
    )
    if (storage) return storage
  }
  const crew = compare('Builder crew', crewSize(state), crewSize(after))
  if (crew) return crew
  for (const [label, coverage] of [
    ['Amenity coverage', BUILDINGS[project.id].amenities],
    ['Leisure coverage', BUILDINGS[project.id].leisure],
  ] as const) {
    if (!coverage) continue
    const outcome = compare(
      label,
      coverage * state.facilities[project.id].level,
      coverage * after.facilities[project.id].level,
    )
    if (outcome) return outcome
  }
  const offline = compare(
    'Offline hours',
    offlineWindow(state),
    offlineWindow(after),
  )
  if (offline) return offline
  const beforeRates = resourceRates(state, { ignoreInputs: true }),
    afterRates = resourceRates(after, { ignoreInputs: true })
  for (const r of RESOURCES) {
    const outcome = compare(
      `${RESOURCE_INFO[r].name}/min`,
      beforeRates[r],
      afterRates[r],
    )
    if (outcome) return outcome
  }
  return null
}
