import { JOBS, MAX_HUNGER, RECRUIT_COST } from './constants'
import {
  BUILDINGS,
  isBuildingUnlocked as buildingUnlocked,
  JOB_BUILDING,
  isJobUnlocked as jobUnlocked,
} from './economy'
import { getHungerEffects } from './food'
import { roundResource } from './format'
import { BUILDING_IDS, RESEARCH_ITEM_KEYS, RESOURCES } from './ids'
import { RESEARCH_CONFIG } from './research-definitions'
import type { createResources } from './resources'
import type { createSkills } from './skills'
import type { BuildingId, Cost, GameState, JobId, Person } from './types'

export function createSettlement(
  state: GameState,
  resources: ReturnType<typeof createResources>,
  getNextResourceGain: ReturnType<typeof createSkills>['getNextResourceGain'],
  saveProgress: () => void,
) {
  const { canAfford, pay } = resources

  function getPopulationCapacity() {
    return Math.max(
      state.people.length,
      1 +
        RESEARCH_ITEM_KEYS.reduce(
          (capacity, id) =>
            capacity +
            (RESEARCH_CONFIG[id].populationCapacity?.(
              state.researchLevels[id],
            ) ?? 0),
          0,
        ) +
        BUILDING_IDS.reduce(
          (capacity, id) =>
            capacity +
            state.buildings[id] *
              (BUILDINGS[id].populationCapacity?.(state) ?? 0),
          0,
        ),
    )
  }

  function canRecruit() {
    return (
      state.people.length < getPopulationCapacity() &&
      state.fruit >= RECRUIT_COST
    )
  }

  function recruitPerson() {
    if (!canRecruit()) return false
    let number = 1
    while (
      state.people.some((person) => person.name === `Tribe member ${number}`)
    )
      number++
    state.fruit = roundResource(state.fruit - RECRUIT_COST)
    state.people.push({
      name: `Tribe member ${number}`,
      isPlayer: false,
      hunger: MAX_HUNGER,
      maxHunger: MAX_HUNGER,
      job: 'idle',
      workElapsedMs: 0,
    })
    saveProgress()
    return true
  }

  function isBuildingUnlocked(id: BuildingId) {
    return buildingUnlocked(state, id)
  }

  function getBuildingCost(id: BuildingId): Cost {
    const level = state.buildings[id]
    const cost: Cost = {}
    for (const resource of RESOURCES) {
      const base = BUILDINGS[id].cost[resource]
      const expansion = BUILDINGS[id].expansionCost?.[resource] ?? 0
      if (base || expansion)
        cost[resource] =
          Math.ceil((base ?? 0) * 1.65 ** level) + expansion * level
    }
    return cost
  }

  function canBuild(id: BuildingId) {
    return (
      isBuildingUnlocked(id) &&
      state.buildings[id] < BUILDINGS[id].maxLevel &&
      canAfford(getBuildingCost(id))
    )
  }

  function build(id: BuildingId) {
    if (!canBuild(id)) return false
    pay(getBuildingCost(id))
    state.buildings[id] += 1
    saveProgress()
    return true
  }

  function getJobCapacity(job: JobId) {
    return job === 'idle'
      ? state.people.length
      : state.buildings[JOB_BUILDING[job]] * 2
  }

  function isJobUnlocked(job: JobId) {
    return jobUnlocked(state, job)
  }

  function assignJob(person: Person, job: JobId) {
    if (!state.people.includes(person) || !isJobUnlocked(job)) return false
    if (person.job === job) return true
    if (
      job !== 'idle' &&
      state.people.filter((p) => p.job === job).length >= getJobCapacity(job)
    )
      return false
    person.job = job
    person.workElapsedMs = 0
    saveProgress()
    return true
  }

  function adjustWorkers(job: Exclude<JobId, 'idle'>, amount: 1 | -1) {
    const person =
      amount === 1
        ? state.people.find((p) => p.job === 'idle')
        : [...state.people].reverse().find((p) => p.job === job)
    return person ? assignJob(person, amount === 1 ? job : 'idle') : false
  }

  function getJobInput(job: JobId): Cost {
    return job === 'idle' ? {} : (JOBS[job].input?.(state) ?? {})
  }

  function canWork(person: Person) {
    return (
      person.job !== 'idle' &&
      isJobUnlocked(person.job) &&
      canAfford(getJobInput(person.job))
    )
  }

  function getWorkerGain(
    person: Pick<Person, 'job' | 'hunger' | 'maxHunger'>,
    preview = false,
  ) {
    if (person.job === 'idle' || (!preview && !isJobUnlocked(person.job)))
      return 0
    const job = JOBS[person.job]
    let gain = job.actionId ? getNextResourceGain(job.actionId) * 2 : 1
    gain *=
      1 + (Math.max(1, state.buildings[JOB_BUILDING[person.job]]) - 1) * 0.5
    if (job.specialization && state.specialization === job.specialization)
      gain *= 1.6
    for (const multiplier of job.outputMultipliers?.(state) ?? [])
      gain *= multiplier
    // Combine settlement-wide bonuses before applying them to preserve yield rounding.
    const researchMultiplier = RESEARCH_ITEM_KEYS.reduce(
      (multiplier, id) =>
        multiplier *
        (RESEARCH_CONFIG[id].workerMultiplier?.(state.researchLevels[id]) ?? 1),
      1,
    )
    gain *= researchMultiplier
    return roundResource(gain * getHungerEffects(person).outputMultiplier)
  }

  return {
    getPopulationCapacity,
    canRecruit,
    recruitPerson,
    isBuildingUnlocked,
    getBuildingCost,
    canBuild,
    build,
    getJobCapacity,
    isJobUnlocked,
    assignJob,
    adjustWorkers,
    getJobInput,
    canWork,
    getWorkerGain,
  }
}
