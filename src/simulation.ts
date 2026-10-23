import {
  ACTIONS,
  actionDuration,
  actionOutputRate,
  actionRequiredXp,
  actionWorkers,
  actionYield,
  automationFactor,
  completeAction,
  exploreExpectedRewards,
  finishManual,
  grantActionXp,
  isRateMode,
  manualRate,
  syncActions,
  syncUnlocks,
  xpFactor,
} from './actions'
import { EPSILON } from './constants'
import { isProductionJob, JOBS, OCCUPATIONS } from './economy'
import { consumeMeal, healthMultiplier, mealCost } from './food'
import {
  ACTION_IDS,
  type ActionId,
  isWorkingJob,
  JOB_IDS,
  RESOURCES,
  WORKING_JOB_IDS,
} from './ids'
import { createRecord } from './records'
import { completeProject, projectName, QUEUES, startQueues } from './research'
import { RESEARCH } from './research-definitions'
import { canAfford, pay, storageMultiplier, threshold } from './resources'
import {
  arrivalAptitude,
  arrivalBlocker,
  arrivalStatus,
  constructionSpeed,
  happinessMultiplier,
  happinessTarget,
  happinessUnlocked,
  jobInput,
  staffingMultiplier,
  workerRates,
} from './settlement'
import { expertiseLevel, practiceThreshold } from './skills'
import { createPerson } from './state'
import type { GameState } from './types'

function settleEvents(state: GameState, visible: boolean) {
  let changed = false
  for (const p of state.people)
    if (isProductionJob(p.job) && p.progress >= 1 - EPSILON) {
      const input = jobInput(state, p.job)
      if (canAfford(state, input)) {
        pay(state, input)
        p.progress = Math.max(0, p.progress - 1)
        const def = JOBS[p.job]
        state.resources[def.output]++
      } else p.progress = 1
    }
  for (const id of QUEUES) {
    const q = state.queues[id],
      active = q.active
    if (active && active.progress >= active.total - EPSILON) {
      changed = true
      q.active = null
      completeProject(state, active.project)
      state.completedProjects++
      state.notice =
        active.project.kind === 'research' &&
        RESEARCH[active.project.id].discoverTimeBox
          ? 'Discovered a mysterious time box. Its controls can begin a new settlement.'
          : `Completed ${projectName(state, active.project)}`
    }
  }
  if (visible && state.manual && state.manual.progress >= 1 - EPSILON) {
    finishManual(state)
    changed = true
  }
  // Automated actions run whether or not the settlement is visible.
  for (const id of ACTION_IDS) {
    const progress = state.actionProgress[id]
    if (progress < 1 || (ACTIONS[id].resource && isRateMode(state, id)))
      continue
    const completions = Math.floor(progress)
    let done = 0
    if (ACTIONS[id].resource && !isRateMode(state, id)) {
      done = completeAction(state, id, completions) ? completions : 0
    } else {
      while (done < completions && completeAction(state, id)) done++
    }
    if (done > 0) {
      state.actionProgress[id] = progress - done
      changed = true
    }
  }
  syncUnlocks(state)
  syncActions(state)
  if (state.minuteProgress >= 60 - EPSILON) {
    state.minuteProgress = Math.max(0, state.minuteProgress - 60)
    changed = true
    consumeMeal(state)
    if (happinessUnlocked(state))
      state.happiness += Math.max(
        -2,
        Math.min(2, happinessTarget(state) - state.happiness),
      )
  }
  if (state.arrivalProgress >= 1 - EPSILON && !arrivalStatus(state).blocker) {
    changed = true
    state.people.push(
      createPerson(
        `Settler ${state.people.length + 1}`,
        arrivalAptitude(state),
      ),
    )
    state.arrivalProgress = 0
  }
  const active = QUEUES.map((id) => state.queues[id].active?.sequence)
  startQueues(state)
  return (
    changed ||
    QUEUES.some(
      (id, index) => state.queues[id].active?.sequence !== active[index],
    )
  )
}
// Structure, health and expertise bonuses change at discrete events. Keep stock,
// commitment and cycle-progress checks live between those events.
type ActionRule = {
  id: ActionId
  // Storage-free completion speed (workers × 1 / base duration); storage
  // pressure applies live in the loop, exactly like worker rates.
  speed: number
  // Fast resource actions accrue output and XP continuously instead of
  // creating one simulation event per completion.
  rateMode: boolean
  outputPerCompletion: number
  xpPerCompletion: number
  // Explore always completes discretely (cost + rolls); batch its progress
  // so deep rate-mode explore cannot shrink the event step to 0.1s.
  stepCap: number
}
function actionRules(state: GameState): ActionRule[] {
  return ACTION_IDS.flatMap((id): ActionRule[] => {
    const def = ACTIONS[id],
      n = actionWorkers(state, id)
    if (n < 1 || !def.visible(state) || !canAfford(state, def.cost)) return []
    const base = def.seconds * 0.98 ** (state.actionSkills[id].level - 1),
      speed = n / base,
      rateMode = isRateMode(state, id)
    return [
      {
        id,
        speed,
        rateMode,
        outputPerCompletion: def.resource
          ? actionYield(state, id) *
            automationFactor(state, id) *
            happinessMultiplier(state)
          : 0,
        xpPerCompletion: xpFactor(state, id),
        stepCap: id === 'explore' ? 64 * (base / n) : Infinity,
      },
    ]
  })
}
function intervalRules(state: GameState) {
  return {
    rates: workerRates(state, { storage: 1, ignoreInputs: true }),
    staffing: createRecord(WORKING_JOB_IDS, (job) =>
      staffingMultiplier(state, job),
    ),
    inputs: createRecord(JOB_IDS, (job) => jobInput(state, job)),
    comfort: createRecord(RESOURCES, (resource) => threshold(state, resource)),
    construction: constructionSpeed(state) / 60,
    arrival: arrivalStatus(state),
    actions: actionRules(state),
  }
}
export function advanceTime(
  state: GameState,
  seconds: number,
  visible = false,
) {
  if (!Number.isFinite(seconds) || seconds < 0) return
  settleEvents(state, visible)
  let remaining = seconds
  let rules = intervalRules(state)
  while (remaining > EPSILON) {
    const available = createRecord(JOB_IDS, (job) =>
      canAfford(state, rules.inputs[job]),
    )
    const pressure = createRecord(RESOURCES, (resource) =>
      storageMultiplier(
        state,
        resource,
        state.resources[resource],
        rules.comfort[resource],
      ),
    )
    const rates = state.people.map((person, index) =>
      isProductionJob(person.job) &&
      available[person.job] &&
      person.progress < 1 - EPSILON
        ? ((rules.rates[index] ?? 0) * pressure[JOBS[person.job].output]) / 60
        : 0,
    )
    const practiceRates = state.people.map((person, index) => {
      const job = person.job
      if (!isWorkingJob(job)) return 0
      const definition = OCCUPATIONS[job]
      const working =
        definition.learning === 'production'
          ? (rates[index] ?? 0) > 0
          : Boolean(state.queues.construction.active && rules.construction > 0)
      if (!working) return 0
      const storage = isProductionJob(job) ? pressure[JOBS[job].output] : 1
      return healthMultiplier(person) * rules.staffing[job] * storage
    })
    const { construction, arrival } = rules
    const manual = visible ? manualRate(state) : 0
    const immigration = arrivalBlocker(state, arrival)
      ? 0
      : 1 / (arrival.interval * 60)
    let step = Math.min(remaining, 60 - state.minuteProgress)
    state.people.forEach((p, i) => {
      const rate = rates[i] ?? 0
      if (rate > 0) step = Math.min(step, Math.max(0, 1 - p.progress) / rate)
      const practice = practiceRates[i] ?? 0
      if (isWorkingJob(p.job) && practice > 0) {
        const next = practiceThreshold(expertiseLevel(p.practice[p.job]) + 1)
        step = Math.min(step, (next - p.practice[p.job]) / practice)
      }
    })
    for (const id of QUEUES) {
      const active = state.queues[id].active,
        rate = id === 'research' ? 1 : construction
      if (active && rate > 0)
        step = Math.min(
          step,
          Math.max(0, active.total - active.progress) / rate,
        )
    }
    if (manual && state.manual)
      step = Math.min(step, Math.max(0, 1 - state.manual.progress) / manual)
    for (const action of rules.actions) {
      const resource = ACTIONS[action.id].resource,
        rate = resource
          ? action.speed * (pressure[resource] ?? 1)
          : action.speed
      if (rate <= 0) continue
      if (action.id === 'explore') {
        step = Math.min(step, action.stepCap)
      } else if (action.rateMode) {
        // Keep level-ups as event boundaries so rules refresh with skill.
        const gap =
          actionRequiredXp(state, action.id) - state.actionSkills[action.id].xp
        if (gap > EPSILON)
          step = Math.min(step, gap / (rate * action.xpPerCompletion))
      } else {
        step = Math.min(
          step,
          Math.max(0, 1 - state.actionProgress[action.id]) / rate,
        )
      }
    }
    if (immigration)
      step = Math.min(
        step,
        Math.max(0, 1 - state.arrivalProgress) / immigration,
      )
    // A zero-work conversion can complete without advancing the timeline.
    if (step <= EPSILON) {
      if (settleEvents(state, visible)) rules = intervalRules(state)
      step = Math.min(remaining, EPSILON)
    }
    let learned = false
    state.people.forEach((p, i) => {
      p.progress = Math.min(1, p.progress + (rates[i] ?? 0) * step)
      if (isWorkingJob(p.job)) {
        const previous = expertiseLevel(p.practice[p.job])
        p.practice[p.job] += (practiceRates[i] ?? 0) * step
        learned = expertiseLevel(p.practice[p.job]) !== previous || learned
      }
    })
    for (const id of QUEUES) {
      const active = state.queues[id].active
      if (active)
        active.progress += step * (id === 'research' ? 1 : construction)
    }
    if (state.manual) state.manual.progress += manual * step
    for (const action of rules.actions) {
      const resource = ACTIONS[action.id].resource,
        rate = resource
          ? action.speed * (pressure[resource] ?? 1)
          : action.speed
      if (action.rateMode) {
        if (resource)
          state.resources[resource] += rate * action.outputPerCompletion * step
        grantActionXp(state, action.id, rate * action.xpPerCompletion * step)
        state.actionProgress[action.id] =
          (state.actionProgress[action.id] + rate * step) % 1
      } else state.actionProgress[action.id] += rate * step
    }
    state.arrivalProgress = Math.min(
      1,
      state.arrivalProgress + immigration * step,
    )
    state.minuteProgress += step
    remaining -= step
    if (settleEvents(state, visible) || learned) rules = intervalRules(state)
  }
}
export function resourceFlows(
  state: GameState,
  options: { ignoreInputs?: boolean } = {},
) {
  const flows = createRecord(RESOURCES, () => ({
    production: 0,
    inputs: 0,
    meals: 0,
  }))
  const production = workerRates(state, options)
  for (const [index, p] of state.people.entries())
    if (isProductionJob(p.job)) {
      const rate = production[index] ?? 0
      flows[JOBS[p.job].output].production += rate
      const input = jobInput(state, p.job)
      for (const r of RESOURCES) flows[r].inputs += rate * (input[r] ?? 0)
    }
  for (const id of ACTION_IDS) {
    const def = ACTIONS[id]
    if (def.resource) {
      flows[def.resource].production += actionOutputRate(state, id) * 60
      continue
    }
    const n = actionWorkers(state, id)
    if (n < 1 || !def.visible(state) || !canAfford(state, def.cost)) continue
    const rate = (n / actionDuration(state, id)) * 60
    for (const r of RESOURCES) flows[r].inputs += rate * (def.cost[r] ?? 0)
    const expected = exploreExpectedRewards(state)
    for (const r of RESOURCES) flows[r].production += rate * (expected[r] ?? 0)
  }
  flows.food.meals = mealCost(state)
  return flows
}
export function resourceRates(
  state: GameState,
  options: { ignoreInputs?: boolean } = {},
) {
  const flows = resourceFlows(state, options)
  return createRecord(RESOURCES, (r) => {
    const flow = flows[r]
    return flow.production - flow.inputs - flow.meals
  })
}
