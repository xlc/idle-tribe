import { FOOD_TICK_MS, JOBS, OFFLINE_CAP_MS } from './constants'
import type { createFood } from './food'
import { roundResource } from './format'
import { RESOURCES } from './ids'
import { createRecord } from './records'
import type { createResources } from './resources'
import type { createSettlement } from './settlement'
import type { createSkills } from './skills'
import type { GameState } from './types'

export function createSimulation(
  state: GameState,
  resources: ReturnType<typeof createResources>,
  settlement: Pick<
    ReturnType<typeof createSettlement>,
    'canWork' | 'getJobInput' | 'getWorkerGain'
  >,
  skills: Pick<ReturnType<typeof createSkills>, 'awardActionExperience'>,
  food: Pick<ReturnType<typeof createFood>, 'getMealCost' | 'consumeMeal'>,
  syncUnlocks: () => void,
  saveProgress: () => void,
) {
  const { canAfford, pay } = resources
  const { canWork, getJobInput, getWorkerGain } = settlement
  const { awardActionExperience } = skills
  const { getMealCost, consumeMeal } = food

  function getResourceRates() {
    const rates = createRecord(RESOURCES, () => 0)
    rates.fruit = -getMealCost() / (FOOD_TICK_MS / 1000)
    for (const person of state.people) {
      if (person.job === 'idle' || !canWork(person)) continue
      const job = JOBS[person.job]
      rates[job.resource] += getWorkerGain(person) / (job.durationMs / 1000)
      const input = getJobInput(person.job)
      for (const resource of RESOURCES)
        rates[resource] -= (input[resource] ?? 0) / (job.durationMs / 1000)
    }
    return rates
  }

  // Resolve work and meal boundaries in the same order for live and offline play.
  function advanceTime(elapsed: number) {
    if (!Number.isFinite(elapsed) || elapsed <= 0) return false
    let remaining = elapsed
    let changed = false
    while (remaining > 0) {
      const workers = state.people.filter(canWork)
      let step = Math.min(remaining, FOOD_TICK_MS - state.foodElapsedMs)
      for (const person of workers) {
        if (person.job !== 'idle')
          step = Math.min(
            step,
            JOBS[person.job].durationMs - person.workElapsedMs,
          )
      }
      state.foodElapsedMs += step
      for (const person of workers) person.workElapsedMs += step
      remaining -= step
      for (const person of workers) {
        if (person.job === 'idle') continue
        const job = JOBS[person.job]
        if (person.workElapsedMs < job.durationMs) continue
        person.workElapsedMs -= job.durationMs
        if (!canAfford(getJobInput(person.job))) continue
        pay(getJobInput(person.job))
        const gain = getWorkerGain(person)
        if (job.actionId) awardActionExperience(job.actionId)
        state[job.resource] = roundResource(state[job.resource] + gain)
        changed = true
      }
      if (state.foodElapsedMs >= FOOD_TICK_MS) {
        state.foodElapsedMs -= FOOD_TICK_MS
        consumeMeal()
        changed = true
      }
    }
    syncUnlocks()
    saveProgress()
    return changed
  }

  function applyOffline(now: number) {
    const elapsed =
      state.savedAt > 0
        ? Math.min(OFFLINE_CAP_MS, Math.max(0, now - state.savedAt))
        : 0
    const before = createRecord(RESOURCES, (id) => state[id])
    advanceTime(elapsed)
    state.savedAt = now
    saveProgress()
    return {
      elapsed,
      gains: createRecord(RESOURCES, (id) => {
        const difference = state[id] - before[id]
        return Math.sign(difference) * roundResource(Math.abs(difference))
      }),
    }
  }

  return {
    getResourceRates,
    advanceTime,
    applyOffline,
  }
}
