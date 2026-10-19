import { JOBS, MAX_HUNGER, RECRUIT_COST, RESOURCES } from './constants'
import { BUILDINGS, JOB_BUILDING } from './economy'
import { getHungerEffects } from './food'
import { roundResource } from './format'
import type { createResearch } from './research'
import type { createResources } from './resources'
import type { createSkills } from './skills'
import type { BuildingId, Cost, GameState, JobId, Person } from './types'

export function createSettlement(
  state: GameState,
  resources: ReturnType<typeof createResources>,
  getResearchLevel: ReturnType<typeof createResearch>['getResearchLevel'],
  getNextResourceGain: ReturnType<typeof createSkills>['getNextResourceGain'],
  saveProgress: () => void,
) {
  const { canAfford, pay } = resources

  function getPopulationCapacity() {
    return Math.max(
      state.people.length,
      1 +
        getResearchLevel('shelters') * 2 +
        state.buildings.houses * (getResearchLevel('architecture') ? 4 : 2),
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
    if (!getResearchLevel('shelters')) return false
    const definition = BUILDINGS[id]
    if (id === 'quarry' && !state.stoneFound) return false
    if (id === 'lumber-camp' && !state.explored) return false
    return !definition.technology || getResearchLevel(definition.technology) > 0
  }

  function getBuildingCost(id: BuildingId): Cost {
    const level = state.buildings[id]
    const cost: Cost = {}
    for (const resource of RESOURCES) {
      const base = BUILDINGS[id].cost[resource]
      if (base) cost[resource] = Math.ceil(base * 1.65 ** level)
    }
    if (level > 0 && BUILDINGS[id].job) {
      cost.planks = (cost.planks ?? 0) + level * 4
      cost.blocks = (cost.blocks ?? 0) + level * 2
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
    if (job === 'idle') return true
    return isBuildingUnlocked(JOB_BUILDING[job]) && getJobCapacity(job) > 0
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
    const rawCost = getResearchLevel('joinery') ? 2 : 3
    if (job === 'sawyer') return { wood: rawCost }
    if (job === 'mason') return { stone: rawCost }
    if (job === 'scholar') return { fruit: 1 }
    return {}
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
    if (
      state.specialization === 'forestry' &&
      (person.job === 'woodcutter' || person.job === 'sawyer')
    )
      gain *= 1.6
    if (
      state.specialization === 'stonecraft' &&
      (person.job === 'stoneworker' || person.job === 'mason')
    )
      gain *= 1.6
    if (person.job === 'mason' && getResearchLevel('architecture')) gain *= 1.5
    if (person.job === 'forager') {
      gain *= 1 + getResearchLevel('foraging-practice') * 0.25
      if (getResearchLevel('agriculture')) gain *= 2
    }
    gain *=
      (1 + getResearchLevel('teamwork') * 0.25) *
      (getResearchLevel('engineering') ? 1.25 : 1)
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
