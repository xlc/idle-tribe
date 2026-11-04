import { actionForJob, actionOutputRate, cancelManual } from './actions'
import { WORKERS_PER_BUILDING_LEVEL } from './constants'
import { ACTIONS, BUILDINGS, JOBS, PERKS, RESEARCH } from './definitions'
import {
  ACTION_IDS,
  BUILDING_IDS,
  type BuildingId,
  isActionJob,
  isWorkingJob,
  type NoteId,
  type ProductionJob,
  RESEARCH_IDS,
  RESOURCES,
  WORKING_JOB_IDS,
} from './ids'
import { isProductionJob } from './jobs'
import { hasResearch, researchEffects } from './research-effects'
import { canAfford } from './resources'
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
  if (req.expedition && !state.expeditionUnlocked)
    return 'Requires a successful expedition'
  for (const id of BUILDING_IDS)
    if (state.facilities[id].level < (req.facilities?.[id] ?? 0))
      return `Requires ${BUILDINGS[id].forms[0]?.name} level ${req.facilities?.[id]}`
  if (req.perk && !state.legacy.perks[req.perk])
    return `Requires permanent ${PERKS[req.perk].name} perk`
  const missing = req.research?.filter((id) => !hasResearch(state, id)) ?? []
  if (missing.length)
    return `Requires ${missing.map((id) => RESEARCH[id].name).join(', ')}`
  if (req.anyResearch && !req.anyResearch.some((id) => hasResearch(state, id)))
    return `Requires ${req.anyResearch.map((id) => RESEARCH[id].name).join(' or ')}`
  return ''
}
export function automationUnlocked(state: GameState) {
  return RESEARCH_IDS.some((id) => hasResearch(state, id) && RESEARCH[id].grant)
}
export function happinessUnlocked(state: GameState) {
  return RESEARCH_IDS.some(
    (id) => hasResearch(state, id) && RESEARCH[id].unlockHappiness,
  )
}
// Whether a one-time unlock note's feature is unlocked; the UI marks the
// note seen when its dialog is dismissed.
export function noteUnlocked(state: GameState, id: NoteId) {
  switch (id) {
    case 'research':
      return state.researchUnlocked
    case 'jobs':
      return automationUnlocked(state)
    case 'expedition':
      return state.expeditionUnlocked
    case 'happiness':
      return happinessUnlocked(state)
    case 'paths':
      return state.specialization !== null
    case 'eras':
      return state.era >= 1
    case 'time-box':
      return state.legacy.discovered
  }
}
export function happinessMultiplier(state: GameState) {
  return happinessUnlocked(state) ? 0.75 + 0.005 * state.happiness : 1
}
export function prestigeMultiplier(state: GameState) {
  return 1 + 0.02 * Math.sqrt(state.legacy.lifetime)
}
export function effectiveStaff(x: number, capacity: number) {
  return Math.min(x, capacity)
}
export function equipmentMultiplier(tier: number) {
  return [1, 1.2, 1.45, 1.75][tier] ?? 1.75 + 0.5 * (Math.sqrt(tier - 2) - 1)
}
// Gathering camps host several jobs; every other workplace names one.
export function buildingJobs(id: BuildingId): readonly JobId[] {
  const def = BUILDINGS[id].job
  return typeof def === 'string' ? [def] : (def ?? [])
}
// A single named job is a production recipe; arrays are gathering camps.
export function craftingJob(id: BuildingId): JobId | undefined {
  const def = BUILDINGS[id].job
  return typeof def === 'string' ? def : undefined
}
const WORKPLACE_BY_JOB = new Map<JobId, BuildingId>()
for (const id of BUILDING_IDS)
  for (const job of buildingJobs(id))
    if (!WORKPLACE_BY_JOB.has(job)) WORKPLACE_BY_JOB.set(job, id)
export function workplace(job: JobId) {
  return WORKPLACE_BY_JOB.get(job)
}
// Jobs hosted by one workplace share its worker slots; a job without a
// workplace (builders) keeps its own crew.
export function workplaceJobs(job: JobId): readonly JobId[] {
  const id = workplace(job)
  return id ? buildingJobs(id) : [job]
}
export function workplaceStaff(state: GameState, job: JobId) {
  const hosted = workplaceJobs(job)
  return state.people.filter(
    (p) => isWorkingJob(p.job) && hosted.includes(p.job),
  ).length
}
export function assigned(state: GameState, job: JobId) {
  return state.people.filter((p) => p.job === job).length
}
export function crewSize(state: GameState) {
  return (
    1 +
    RESEARCH_IDS.reduce(
      (n, id) =>
        n +
        (hasResearch(state, id) ? (researchEffects(state, id).crew ?? 0) : 0),
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
  return isWorkingJob(job) && JOBS[job].learning === 'construction'
    ? crewSize(state)
    : id
      ? WORKERS_PER_BUILDING_LEVEL * state.facilities[id].level
      : 0
}
export function jobUnlocked(state: GameState, job: JobId) {
  return (
    job === 'idle' ||
    (JOBS[job].learning === 'construction'
      ? automationUnlocked(state)
      : jobCapacity(state, job) > 0)
  )
}
export function assignJob(state: GameState, index: number, job: JobId) {
  const person = state.people[index]
  if (
    !person ||
    !jobUnlocked(state, job) ||
    person.job === job ||
    busyWith(state, index)
  )
    return false
  person.job = job
  person.progress = 0
  // Staffing an action's job supersedes any manual runs of it.
  const action = actionForJob(job)
  if (action) cancelManual(state, action)
  return true
}
// A person occupied by manual work or the active research project. Busy
// people keep the idle job; they simply cannot take another assignment.
export function busyWith(state: GameState, index: number) {
  return (
    state.manual.some((m) => m.person === index) ||
    state.queues.research.active?.worker === index
  )
}
export function firstIdlePerson(state: GameState) {
  return state.people.findIndex(
    (person, index) => person.job === 'idle' && !busyWith(state, index),
  )
}
export function availablePeople(state: GameState) {
  return state.people.filter(
    (person, index) => person.job === 'idle' && !busyWith(state, index),
  ).length
}
export function workerCandidate(state: GameState, job: JobId, release = false) {
  if (!isWorkingJob(job)) return -1
  let best = -1
  let score = release ? Infinity : -Infinity
  for (const [index, person] of state.people.entries()) {
    if (person.job !== (release ? job : 'idle')) continue
    if (!release && busyWith(state, index)) continue
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
  // Aptitudes do nothing on action assignments, so arrivals draw from real
  // jobs only.
  const eligible = WORKING_JOB_IDS.filter(
    (job) => !isActionJob(job) && jobUnlocked(state, job),
  )
  const aptitude = eligible[Math.floor(roll * eligible.length)]
  if (!aptitude) throw new Error('Arrival requires an available job')
  return aptitude
}
export function fillWorkers(state: GameState, job: JobId) {
  return adjustWorkers(
    state,
    job,
    Math.max(0, jobCapacity(state, job) - workplaceStaff(state, job)),
  )
}
export function jobInput(state: GameState, job: JobId): Cost {
  if (!isProductionJob(job)) return {}
  const id = workplace(job)
  const facility = id ? state.facilities[id] : null
  const form = id && facility ? BUILDINGS[id].forms[facility.form] : null
  const input = { ...(form?.input ?? JOBS[job].input) }
  for (const id of RESEARCH_IDS)
    if (hasResearch(state, id)) {
      const reduction = researchEffects(state, id).recipeReduction?.[job]
      if (reduction)
        for (const r of RESOURCES)
          input[r] = Math.max(0, (input[r] ?? 0) - (reduction[r] ?? 0))
    }
  for (const id of RESEARCH_IDS)
    if (hasResearch(state, id)) {
      const multiplier = researchEffects(state, id).recipeMultiplier?.[job]
      if (multiplier === undefined) continue
      for (const resource of RESOURCES)
        if (input[resource])
          input[resource] = (input[resource] ?? 0) * multiplier
    }
  return input
}
interface RateOptions {
  happiness?: number
  ignoreInputs?: boolean
}
export function staffingMultiplier(state: GameState, job: WorkingJob) {
  // Shared slots: capacity counts workers; extras at the workplace are idle.
  const n = workplaceStaff(state, job)
  const capacity = jobCapacity(state, job)
  return n && capacity ? Math.min(n, capacity) / n : 0
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
    if (hasResearch(state, tech)) {
      const effects = researchEffects(state, tech)
      technology += effects.jobBonus?.[job] ?? 0
      specialization *= effects.specialization?.[job] ?? 1
    }
  // Facility effects are declared by the owning building; consumers use roles.
  for (const b of BUILDING_IDS) {
    technology +=
      (BUILDINGS[b].jobBonus?.[job] ?? 0) * Math.sqrt(state.facilities[b].level)
  }
  return (
    (def.rate ?? 0) *
    (1 + 0.1 * (f.level - 1)) *
    staffingMultiplier(state, job) *
    equipmentMultiplier(f.equipment) *
    technology *
    specialization *
    (options.happiness ?? happinessMultiplier(state)) *
    prestigeMultiplier(state)
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
export function housingCapacity(state: GameState) {
  let housing = 0,
    multiplier = 1
  for (const id of BUILDING_IDS) {
    const f = state.facilities[id]
    housing += (BUILDINGS[id].forms[f.form]?.housing ?? 0) * f.level
  }
  for (const id of RESEARCH_IDS)
    if (hasResearch(state, id))
      multiplier *= researchEffects(state, id).housing ?? 1
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
      0.2 * clamp((housingCapacity(state) - n) / Math.max(1, 0.2 * n)) +
      0.2 * clamp(amenities / n) +
      0.2 * clamp(leisure / n))
  )
}
const FOOD_ACTION_IDS = ACTION_IDS.filter(
  (id) => ACTIONS[id].resource === 'food',
)
export function arrivalStatus(state: GameState) {
  const next = state.people.length + 1,
    buffer = 10 * next,
    town = happinessUnlocked(state)
  let foodOutput = 0,
    recipeDemand = 0
  // Wild gathering covers food until farms outproduce it.
  for (const id of FOOD_ACTION_IDS)
    foodOutput +=
      actionOutputRate(state, id, {
        happiness: town ? 0.75 : 1,
      }) * 60
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
          ignoreInputs: true,
        })
    if (input)
      recipeDemand +=
        input *
        workers.reduce((sum, worker) => sum + personalWork(worker, job), 0) *
        workplaceRate(state, job, {
          happiness: town ? 1.25 : 1,
          ignoreInputs: true,
        })
  }
  const required = 1.1 * (next + recipeDemand)
  // Food abundance draws newcomers faster: twice the required sustainable
  // food halves the wait, capped at a 3x speedup.
  const abundance = Math.min(3, foodOutput / required)
  const interval =
    (5 * Math.max(1, next / housingCapacity(state)) ** 2) /
    (abundance * (town ? 0.5 + state.happiness / 100 : 1))
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
      : housingCapacity(state) <= state.people.length
        ? 'Housing full · build housing'
        : state.resources.food < buffer
          ? `Needs ${buffer} food buffer`
          : foodOutput < required
            ? 'Needs sustainable food production'
            : ''
}
