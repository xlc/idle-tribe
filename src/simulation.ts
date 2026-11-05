import {
  actionCost,
  actionDuration,
  actionForJob,
  actionJobActive,
  actionOutputRate,
  actionRequiredXp,
  actionWorkers,
  actionYield,
  automationFactor,
  baseActionDuration,
  completeAction,
  exploreExpectedRewards,
  finishManual,
  grantActionXp,
  isRateMode,
  syncUnlocks,
  xpFactor,
} from './actions'
import { EPSILON } from './constants'
import { ACTIONS, JOBS, RESEARCH } from './definitions'
import { automatedWorkAllowed, consumeMealTick, mealCost } from './food'
import {
  ACTION_IDS,
  type ActionId,
  isActionJob,
  isWorkingJob,
  JOB_IDS,
  RESOURCES,
  WORKING_JOB_IDS,
} from './ids'
import { isProductionJob, jobRecipe } from './jobs'
import { createRecord } from './records'
import { completeProject, projectName, QUEUES, startQueues } from './research'
import { addResources, canAfford, pay, storageCapacity } from './resources'
import {
  constructionSpeed,
  happinessMultiplier,
  happinessTarget,
  happinessUnlocked,
  jobInput,
  releaseBuilders,
  staffingMultiplier,
  workerRates,
} from './settlement'
import { expertiseLevel, practiceThreshold } from './skills'
import type { GameState, ResourceId } from './types'

function settleEvents(state: GameState, visible: boolean) {
  let changed = false
  if (!automatedWorkAllowed(state) && releaseBuilders(state)) changed = true
  for (const p of state.people)
    if (isProductionJob(p.job) && p.progress >= 1 - EPSILON) {
      const input = jobInput(state, p.job)
      if (canAfford(state, input)) {
        pay(state, input)
        p.progress = Math.max(0, p.progress - 1)
        addResources(state, { [jobRecipe(p.job).output]: 1 })
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
  if (visible && state.manual.length) {
    let done = false
    for (const entry of [...state.manual])
      if (entry.progress >= 1 - EPSILON) {
        finishManual(state, entry)
        done = true
      }
    changed = done || changed
  }
  // Automated actions run whether or not the settlement is visible.
  for (const id of ACTION_IDS) {
    const progress = state.actionProgress[id]
    if (
      progress < 1 - EPSILON ||
      (ACTIONS[id].resource && isRateMode(state, id))
    )
      continue
    const completions = Math.floor(progress + EPSILON)
    let done = 0
    while (done < completions && completeAction(state, id)) done++
    if (done > 0) {
      state.actionProgress[id] = Math.max(0, progress - done)
      changed = true
    }
  }
  syncUnlocks(state)
  if (state.minuteProgress >= 60 - EPSILON) {
    state.minuteProgress = Math.max(0, state.minuteProgress - 60)
    changed = true
    if (happinessUnlocked(state))
      state.happiness += Math.max(
        -2,
        Math.min(2, happinessTarget(state) - state.happiness),
      )
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
// Structure and expertise bonuses change at discrete events. Keep stock,
// commitment and cycle-progress checks live between those events.
type ActionRule = {
  id: ActionId
  // Completion speed is independent of storage. Outputs are capped when they
  // reach their resource capacity.
  speed: number
  // Fast resource actions accrue output and XP continuously instead of
  // creating one simulation event per completion.
  rateMode: boolean
  outputPerCompletion: number
  xpPerCompletion: number
}
function actionRules(state: GameState): ActionRule[] {
  return ACTION_IDS.flatMap((id): ActionRule[] => {
    const def = ACTIONS[id],
      n = actionWorkers(state, id)
    if (
      n < 1 ||
      !def.visible(state) ||
      (id === 'explore' && state.pendingEncounter)
    )
      return []
    const base = baseActionDuration(state, id),
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
        xpPerCompletion: xpFactor(state, id) * (ACTIONS[id].xp ?? 1),
      },
    ]
  })
}
function intervalRules(state: GameState) {
  return {
    rates: workerRates(state, { ignoreInputs: true }),
    staffing: createRecord(WORKING_JOB_IDS, (job) =>
      staffingMultiplier(state, job),
    ),
    inputs: createRecord(JOB_IDS, (job) => jobInput(state, job)),
    capacities: createRecord(RESOURCES, (resource) =>
      storageCapacity(state, resource),
    ),
    construction: constructionSpeed(state) / 60,
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
  // Jobs cannot change within one advance; only held jobs need input checks,
  // which keeps substeps cheap when few of many jobs are staffed.
  const held = [...new Set(state.people.map((p) => p.job))]
  while (remaining > EPSILON) {
    const available = createRecord(held, (job) =>
      canAfford(state, rules.inputs[job]),
    )
    const rates = state.people.map((person, index) =>
      isProductionJob(person.job) &&
      automatedWorkAllowed(state) &&
      available[person.job] &&
      person.progress < 1 - EPSILON
        ? (rules.rates[index] ?? 0) / 60
        : 0,
    )
    // actionJobActive depends only on (state, action), not the person; share
    // one evaluation per action across the roster within a substep.
    const activeJobs = new Map<ActionId, boolean>()
    const actionWorking = (id: ActionId) => {
      let active = activeJobs.get(id)
      if (active === undefined) {
        active = actionJobActive(state, id)
        activeJobs.set(id, active)
      }
      return active
    }
    const practiceRates = state.people.map((person, index) => {
      const job = person.job
      if (!isWorkingJob(job)) return 0
      const definition = JOBS[job]
      // Staffed actions practice like production jobs while their costs are
      // available; surplus output is discarded at the storage cap.
      const action = isActionJob(job) ? actionForJob(job) : undefined
      const working =
        definition.learning === 'production'
          ? action
            ? actionWorking(action)
            : (rates[index] ?? 0) > 0
          : Boolean(state.queues.construction.active && rules.construction > 0)
      if (!working) return 0
      return automatedWorkAllowed(state) ? rules.staffing[job] : 0
    })
    // Costs remain live: producers can fund a paused action, and a completed
    // trip can exhaust its inputs, between structural changes.
    const activeActions = rules.actions.filter(({ id }) =>
      actionJobActive(state, id),
    )
    const { construction } = rules
    // Durations are fixed within a substep; they only change at level-ups and
    // completions, which refresh the rules loop anyway.
    const manual = visible
      ? state.manual.map((entry) => ({
          entry,
          duration: actionDuration(state, entry.id),
        }))
      : []
    let step = Math.min(remaining, 60 - state.minuteProgress)
    if (
      automatedWorkAllowed(state) &&
      (state.people.some((person) => person.job !== 'idle') ||
        QUEUES.some((id) => state.queues[id].active))
    ) {
      const foodRate = mealCost(state) / 60
      if (foodRate > 0) step = Math.min(step, state.resources.food / foodRate)
    }
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
        rate = automatedWorkAllowed(state)
          ? id === 'research'
            ? 1
            : construction
          : 0
      if (active && rate > 0)
        step = Math.min(
          step,
          Math.max(0, active.total - active.progress) / rate,
        )
    }
    for (const { entry, duration } of manual)
      step = Math.min(step, Math.max(0, 1 - entry.progress) * duration)
    for (const action of activeActions) {
      const rate = action.speed
      if (rate <= 0) continue
      if (action.rateMode) {
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
    for (const { entry, duration } of manual) entry.progress += step / duration
    for (const action of activeActions) {
      const resource = ACTIONS[action.id].resource,
        rate = action.speed
      if (action.rateMode) {
        if (resource)
          addResources(
            state,
            { [resource]: rate * action.outputPerCompletion * step },
            rules.capacities,
          )
        const previousLevel = state.actionSkills[action.id].level
        grantActionXp(state, action.id, rate * action.xpPerCompletion * step)
        learned =
          state.actionSkills[action.id].level !== previousLevel || learned
        state.actionProgress[action.id] =
          (state.actionProgress[action.id] + rate * step) % 1
      } else state.actionProgress[action.id] += rate * step
    }
    consumeMealTick(state, step)
    state.minuteProgress += step
    remaining -= step
    if (settleEvents(state, visible) || learned) rules = intervalRules(state)
  }
}
export interface ResourceFlowEntry {
  label: string
  amount: number
  kind: 'production' | 'input' | 'meal'
}
// Per-minute flows grouped by named source: jobs and actions produce, recipes
// and action costs consume, meals drain food. Zero entries are omitted.
export function resourceFlowEntries(
  state: GameState,
  options: { ignoreInputs?: boolean } = {},
) {
  const entries = createRecord(RESOURCES, () => [] as ResourceFlowEntry[])
  const add = (
    r: ResourceId,
    label: string,
    amount: number,
    kind: ResourceFlowEntry['kind'],
  ) => {
    if (amount <= 0) return
    const list = entries[r]
    const existing = list.find((e) => e.label === label && e.kind === kind)
    if (existing) existing.amount += amount
    else list.push({ label, amount, kind })
  }
  const rates = workerRates(state, options)
  for (const [index, p] of state.people.entries())
    if (isProductionJob(p.job)) {
      const rate = rates[index] ?? 0
      add(jobRecipe(p.job).output, JOBS[p.job].name, rate, 'production')
      const input = jobInput(state, p.job)
      for (const r of RESOURCES)
        add(r, JOBS[p.job].name, rate * (input[r] ?? 0), 'input')
    }
  for (const id of ACTION_IDS) {
    const def = ACTIONS[id]
    if (def.resource) {
      add(
        def.resource,
        def.name,
        actionOutputRate(state, id) * 60,
        'production',
      )
      continue
    }
    const n = actionWorkers(state, id)
    const cost = actionCost(state, id)
    if (
      n < 1 ||
      !def.visible(state) ||
      (id === 'explore' && state.pendingEncounter) ||
      !canAfford(state, cost)
    )
      continue
    const rate = (n / actionDuration(state, id)) * 60
    for (const r of RESOURCES) add(r, def.name, rate * (cost[r] ?? 0), 'input')
    if (def.kind !== 'exploration') continue
    const expected = exploreExpectedRewards(state)
    for (const r of RESOURCES)
      add(r, def.name, rate * (expected[r] ?? 0), 'production')
  }
  add('food', 'Meals', mealCost(state), 'meal')
  return entries
}
export function resourceFlows(
  state: GameState,
  options: { ignoreInputs?: boolean } = {},
) {
  const entries = resourceFlowEntries(state, options)
  return createRecord(RESOURCES, (r) => {
    const flows = { production: 0, inputs: 0, meals: 0 }
    for (const entry of entries[r]) {
      if (entry.kind === 'production') flows.production += entry.amount
      else if (entry.kind === 'input') flows.inputs += entry.amount
      else flows.meals += entry.amount
    }
    return flows
  })
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
