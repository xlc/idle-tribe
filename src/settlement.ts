import {
  BUILDINGS,
  isProductionJob,
  JOBS,
  OCCUPATIONS,
  type ProductionJob,
} from './economy'
import { healthMultiplier } from './food'
import {
  BUILDING_IDS,
  isWorkingJob,
  RESEARCH_IDS,
  RESOURCES,
  WORKING_JOB_IDS,
} from './ids'
import { RESEARCH } from './research-definitions'
import { canAfford, storageMultiplier } from './resources'
import { personalWork, workContribution } from './skills'
import type {
  Cost,
  GameState,
  JobId,
  Person,
  Requirements,
  WorkingJob,
} from './types'
export function requirementBlocker(
  state: GameState,
  req: Requirements,
): string {
  if (req.discovery && !state.discovered[req.discovery])
    return `Discover ${req.discovery}`
  for (const id of BUILDING_IDS)
    if (state.facilities[id].level < (req.facilities?.[id] ?? 0))
      return `Requires ${BUILDINGS[id].forms[0]?.name} level ${req.facilities?.[id]}`
  if (req.perk && !state.legacy.perks[req.perk])
    return 'Requires permanent Early astronomy perk'
  const missing = req.research?.filter((id) => !state.research[id]) ?? []
  if (missing.length)
    return `Requires ${missing.map((id) => RESEARCH[id].name).join(', ')}`
  if (req.anyResearch && !req.anyResearch.some((id) => state.research[id]))
    return `Requires ${req.anyResearch.map((id) => RESEARCH[id].name).join(' or ')}`
  return ''
}
export function automationUnlocked(state: GameState) {
  return RESEARCH_IDS.some((id) => state.research[id] && RESEARCH[id].grant)
}
export function happinessUnlocked(state: GameState) {
  return RESEARCH_IDS.some(
    (id) => state.research[id] && RESEARCH[id].unlockHappiness,
  )
}
export function happinessMultiplier(state: GameState) {
  return happinessUnlocked(state) ? 0.75 + 0.005 * state.happiness : 1
}
export function prestigeMultiplier(state: GameState) {
  return 1 + 0.02 * Math.sqrt(state.legacy.lifetime)
}
export function effectiveStaff(x: number, capacity: number) {
  return x <= capacity ? x : capacity * (1 + Math.log(x / capacity))
}
export function equipmentMultiplier(tier: number) {
  return [1, 1.2, 1.45, 1.75][tier] ?? 1.75 + 0.5 * (Math.sqrt(tier - 2) - 1)
}
export function workplace(job: JobId) {
  return BUILDING_IDS.find((id) => BUILDINGS[id].job === job)
}
export function assigned(state: GameState, job: JobId) {
  return state.people.filter((p) => p.job === job).length
}
export function crewSize(state: GameState) {
  return (
    1 +
    RESEARCH_IDS.reduce(
      (n, id) =>
        n + (state.research[id] ? (RESEARCH[id].effects.crew ?? 0) : 0),
      0,
    ) +
    BUILDING_IDS.reduce(
      (n, id) => n + (BUILDINGS[id].crew ?? 0) * state.facilities[id].level,
      0,
    )
  )
}
export function jobCapacity(state: GameState, job: JobId) {
  const id = workplace(job)
  return isWorkingJob(job) && OCCUPATIONS[job].learning === 'construction'
    ? crewSize(state)
    : id
      ? 2 * state.facilities[id].level
      : 0
}
export function jobUnlocked(state: GameState, job: JobId) {
  return (
    job === 'idle' ||
    (OCCUPATIONS[job].learning === 'construction'
      ? automationUnlocked(state)
      : jobCapacity(state, job) > 0)
  )
}
export function assignJob(state: GameState, index: number, job: JobId) {
  const person = state.people[index]
  if (!person || !jobUnlocked(state, job) || person.job === job) return false
  person.job = job
  person.progress = 0
  return true
}
export function workerCandidate(state: GameState, job: JobId, release = false) {
  if (!isWorkingJob(job)) return -1
  let best = -1
  let score = release ? Infinity : -Infinity
  for (const [index, person] of state.people.entries()) {
    if (person.job !== (release ? job : 'idle')) continue
    const contribution = workContribution(person, job)
    if (release ? contribution < score : contribution > score) {
      best = index
      score = contribution
    }
  }
  return best
}
export function adjustWorkers(state: GameState, job: JobId, change: number) {
  let changed = false
  for (let n = 0; n < Math.abs(change); n++) {
    const index = workerCandidate(state, job, change < 0)
    if (!assignJob(state, index, change > 0 ? job : 'idle')) break
    changed = true
  }
  return changed
}
// A reproducible draw per arrival keeps live, sliced, and reloaded timelines
// identical without persisting a second random-state ledger.
export function arrivalAptitude(state: GameState, draw?: number): WorkingJob {
  let seed = Math.imul(state.people.length ^ 0x9e3779b9, 0x21f0aaad)
  seed = Math.imul(seed ^ (seed >>> 16), 0x735a2d97)
  const roll = draw ?? ((seed ^ (seed >>> 15)) >>> 0) / 4294967296
  const eligible = WORKING_JOB_IDS.filter((job) => jobUnlocked(state, job))
  const aptitude = eligible[Math.floor(roll * eligible.length)]
  if (!aptitude) throw new Error('Arrival requires an available occupation')
  return aptitude
}
export function fillWorkers(state: GameState, job: JobId) {
  return adjustWorkers(
    state,
    job,
    Math.max(0, jobCapacity(state, job) - assigned(state, job)),
  )
}
export function jobInput(state: GameState, job: JobId): Cost {
  if (!isProductionJob(job)) return {}
  const id = workplace(job)
  const facility = id ? state.facilities[id] : null
  const form = id && facility ? BUILDINGS[id].forms[facility.form] : null
  const input = { ...(form?.input ?? JOBS[job].input) }
  for (const id of RESEARCH_IDS)
    if (state.research[id]) {
      const reduction = RESEARCH[id].effects.recipeReduction?.[job]
      if (reduction)
        for (const r of RESOURCES)
          input[r] = Math.max(0, (input[r] ?? 0) - (reduction[r] ?? 0))
    }
  for (const id of RESEARCH_IDS)
    if (state.research[id]) {
      const multiplier = RESEARCH[id].effects.recipeMultiplier?.[job]
      if (multiplier === undefined) continue
      for (const resource of RESOURCES)
        if (input[resource])
          input[resource] = (input[resource] ?? 0) * multiplier
    }
  return input
}
interface RateOptions {
  happiness?: number
  storage?: number
  ignoreInputs?: boolean
  fullHealthCrew?: boolean
}
export function staffingMultiplier(
  state: GameState,
  job: WorkingJob,
  fullHealth = false,
) {
  const x = state.people
    .filter((p) => p.job === job)
    .reduce(
      (sum, p) =>
        sum + workContribution(p, job, fullHealth ? 1 : healthMultiplier(p)),
      0,
    )
  const capacity = jobCapacity(state, job)
  return x && capacity ? effectiveStaff(x, capacity) / x : 0
}
function workplaceRate(
  state: GameState,
  job: ProductionJob,
  options: RateOptions,
) {
  const id = workplace(job)
  if (!id) return 0
  const f = state.facilities[id],
    def = BUILDINGS[id].forms[f.form]
  if (
    !f.level ||
    !def ||
    (!options.ignoreInputs && !canAfford(state, jobInput(state, job)))
  )
    return 0
  let technology = 1,
    specialization = 1
  for (const tech of RESEARCH_IDS)
    if (state.research[tech]) {
      technology += RESEARCH[tech].effects.jobBonus?.[job] ?? 0
      specialization *= RESEARCH[tech].effects.specialization?.[job] ?? 1
    }
  // Facility effects are declared by the owning building; consumers use roles.
  for (const b of BUILDING_IDS) {
    technology +=
      (BUILDINGS[b].jobBonus?.[job] ?? 0) * Math.sqrt(state.facilities[b].level)
  }
  return (
    (def.rate ?? 0) *
    (1 + 0.1 * (f.level - 1)) *
    staffingMultiplier(state, job, options.fullHealthCrew) *
    equipmentMultiplier(f.equipment) *
    technology *
    specialization *
    (options.happiness ?? happinessMultiplier(state)) *
    prestigeMultiplier(state) *
    (options.storage ?? storageMultiplier(state, JOBS[job].output))
  )
}
export function workerRate(
  state: GameState,
  person: Person,
  options: RateOptions = {},
) {
  if (!isProductionJob(person.job)) return 0
  return (
    workplaceRate(state, person.job, options) *
    workContribution(person, person.job)
  )
}
// Cache workplace factors only; health and expertise belong to each person.
export function workerRates(state: GameState, options: RateOptions = {}) {
  const shared = new Map<JobId, number>()
  return state.people.map((person) => {
    if (!isProductionJob(person.job)) return 0
    let rate = shared.get(person.job)
    if (rate === undefined) {
      rate = workplaceRate(state, person.job, options)
      shared.set(person.job, rate)
    }
    return rate * workContribution(person, person.job)
  })
}
export function constructionSpeed(state: GameState, extra = 0) {
  const x = Math.max(
    0,
    state.people
      .filter((p) => p.job === 'builder')
      .reduce((n, p) => n + workContribution(p, 'builder'), 0) + extra,
  )
  return (
    effectiveStaff(x, crewSize(state)) *
    happinessMultiplier(state) *
    prestigeMultiplier(state)
  )
}
export function comfortablePlaces(state: GameState) {
  let housing = 0,
    multiplier = 1
  for (const id of BUILDING_IDS) {
    const f = state.facilities[id]
    housing += (BUILDINGS[id].forms[f.form]?.housing ?? 0) * f.level
  }
  for (const id of RESEARCH_IDS)
    if (state.research[id]) multiplier *= RESEARCH[id].effects.housing ?? 1
  return 1 + Math.floor(housing * multiplier)
}
export function happinessTarget(state: GameState) {
  const n = state.people.length
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  let amenities = 0,
    leisure = 0
  for (const id of BUILDING_IDS) {
    amenities += (BUILDINGS[id].amenities ?? 0) * state.facilities[id].level
    leisure += (BUILDINGS[id].leisure ?? 0) * state.facilities[id].level
  }
  return (
    100 *
    (0.4 * clamp(state.resources.food / (30 * n)) +
      0.2 * clamp((comfortablePlaces(state) - n) / Math.max(1, 0.2 * n)) +
      0.2 * clamp(amenities / n) +
      0.2 * clamp(leisure / n))
  )
}
export function arrivalStatus(state: GameState) {
  const next = state.people.length + 1,
    buffer = 20 * next,
    town = happinessUnlocked(state)
  let foodOutput = 0,
    recipeDemand = 0
  const checked = new Set<ProductionJob>()
  for (const p of state.people) {
    const job = p.job
    if (!isProductionJob(job) || checked.has(job)) continue
    checked.add(job)
    const food = JOBS[job].output === 'food'
    const input = jobInput(state, job).food ?? 0
    if (!food && !input) continue
    const workers = state.people.filter((worker) => worker.job === job)
    if (food)
      foodOutput +=
        workers.reduce(
          (sum, worker) => sum + workContribution(worker, job),
          0,
        ) *
        workplaceRate(state, job, {
          happiness: town ? 0.75 : 1,
          storage: storageMultiplier(state, 'food', buffer),
          ignoreInputs: true,
        })
    if (input)
      recipeDemand +=
        input *
        workers.reduce((sum, worker) => sum + personalWork(worker, job), 0) *
        workplaceRate(state, job, {
          fullHealthCrew: true,
          happiness: town ? 1.25 : 1,
          storage: 1,
          ignoreInputs: true,
        })
  }
  const required = 1.1 * (next + recipeDemand)
  const interval =
    (5 * Math.max(1, next / comfortablePlaces(state)) ** 2) /
    (town ? 0.5 + state.happiness / 100 : 1)
  return {
    blocker: arrivalBlocker(state, { buffer, foodOutput, required }),
    buffer,
    foodOutput,
    required,
    interval,
  }
}

export function arrivalBlocker(
  state: GameState,
  {
    buffer,
    foodOutput,
    required,
  }: { buffer: number; foodOutput: number; required: number },
) {
  return !automationUnlocked(state)
    ? 'Requires Shelters'
    : !state.welcome
      ? 'Arrivals paused'
      : state.resources.food < buffer
        ? `Needs ${buffer} food buffer`
        : foodOutput < required
          ? 'Needs sustainable food production'
          : ''
}
