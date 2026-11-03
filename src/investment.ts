import {
  actionRate,
  automationFactor,
  buildingActions,
  buildingResource,
} from './actions'
import { offlineWindow } from './clock'
import { MIN_VISIBLE_RESOURCE_CHANGE } from './constants'
import { BUILDINGS, JOBS, RESOURCE_INFO } from './definitions'
import { RESOURCES } from './ids'
import { isProductionJob } from './jobs'
import { completeProject, constructionPlan } from './research'
import { storageCapacity } from './resources'
import {
  buildingJobs,
  craftingJob,
  crewSize,
  equipmentMultiplier,
  housingCapacity,
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
    Math.abs(afterValue - beforeValue) > MIN_VISIBLE_RESOURCE_CHANGE
      ? { label, before: beforeValue, after: afterValue }
      : null
  const job = BUILDINGS[project.id].job,
    actions = buildingActions(project.id)
  if (job) {
    if (actions.length) {
      const rate = (s: GameState) =>
        actions.reduce((sum, id) => sum + actionRate(s, id), 0)
      const resource = buildingResource(project.id)
      const outcome = compare(
        `${resource ? RESOURCE_INFO[resource].name : 'Explores'}/s`,
        rate(state),
        rate(after),
      )
      if (outcome) return outcome
      for (const id of actions) {
        const automation = compare(
          'Automation %',
          automationFactor(state, id) * 100,
          automationFactor(after, id) * 100,
        )
        if (automation) return automation
      }
    } else {
      const craft = craftingJob(project.id)
      if (craft && isProductionJob(craft)) {
        const rate = (s: GameState) =>
          s.people
            .filter((p) => p.job === craft)
            .reduce(
              (sum, p) => sum + workerRate(s, p, { ignoreInputs: true }) / 60,
              0,
            )
        const outcome = compare(
          `${RESOURCE_INFO[JOBS[craft].output].name}/s`,
          rate(state),
          rate(after),
        )
        if (outcome) return outcome
        const base = compare(
          `${RESOURCE_INFO[JOBS[craft].output].name}/s base`,
          (BUILDINGS[project.id].forms[state.facilities[project.id].form]
            ?.rate ?? 0) / 60,
          (BUILDINGS[project.id].forms[after.facilities[project.id].form]
            ?.rate ?? 0) / 60,
        )
        if (base) return base
        const tools = compare(
          'Worker output ×',
          equipmentMultiplier(state.facilities[project.id].equipment),
          equipmentMultiplier(after.facilities[project.id].equipment),
        )
        if (tools) return tools
      }
    }
    const jobs = buildingJobs(project.id)
    const capacity = compare(
      'Work slots',
      jobs.reduce((sum, j) => sum + jobCapacity(state, j), 0),
      jobs.reduce((sum, j) => sum + jobCapacity(after, j), 0),
    )
    if (capacity) return capacity
  }
  const housing = compare(
    'Housing capacity',
    housingCapacity(state),
    housingCapacity(after),
  )
  if (housing) return housing
  for (const r of RESOURCES) {
    const storage = compare(
      `${RESOURCE_INFO[r].name} storage`,
      storageCapacity(state, r),
      storageCapacity(after, r),
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
      `${RESOURCE_INFO[r].name}/s`,
      beforeRates[r] / 60,
      afterRates[r] / 60,
    )
    if (outcome) return outcome
  }
  return null
}
