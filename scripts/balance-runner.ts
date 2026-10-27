import { startAction } from '../src/actions'
import { beginAbsence, settleAbsence } from '../src/clock'
import { RESEARCH } from '../src/definitions'
import { createGame } from '../src/game'
import { JOB_IDS, RESEARCH_IDS, RESOURCES } from '../src/ids'
import { isProductionJob } from '../src/jobs'
import { buyPerk, canReset, legacyReward, resetRun } from '../src/prestige'
import { queueBlocker } from '../src/research'
import {
  canAfford,
  committed,
  storageMultiplier,
  threshold,
} from '../src/resources'
import { arrivalStatus, assigned, jobInput } from '../src/settlement'
import { resourceRates } from '../src/simulation'
import { createDefaultState } from '../src/state'
import type {
  ActionId,
  GameState,
  PerkId,
  ResearchId,
  Specialization,
} from '../src/types'
import {
  allocationKey,
  type Controls,
  makeDecisions,
  type Policy,
} from './balance-policy'

export const SCHEDULES = {
  frequent: { intervalHours: 8, minutes: 8 },
  daily: { intervalHours: 24, minutes: 8 },
  concentrated: { intervalHours: 24, minutes: 24 },
} as const
export type Schedule = keyof typeof SCHEDULES
export interface RunOptions {
  branch: Specialization
  policy: Policy
  schedule: Schedule
  days: number
  goal: ResearchId
  resetAt?: ResearchId
  perk?: PerkId
  skipVisit?: number
  absenceHours?: number
  finishAtHorizon?: boolean
}
export interface Checkpoint {
  state: GameState
  wallSeconds: number
  effectiveSeconds: number
  activeSeconds: number
}
export interface Observation {
  // A milestone occurred in (after, by], except already-complete starting state.
  after: number
  by: number
}
export interface ActionRecord {
  wallSeconds: number
  kind: 'manual' | 'plan' | 'assign' | 'reset' | 'perk'
  detail: string
  controls: number
}
export function snapshot(state: GameState) {
  return {
    era: state.era,
    people: state.people.length,
    healthy: state.people.filter((p) => p.health === 5).length,
    happiness: state.happiness,
    arrivals: arrivalStatus(state),
    workers: Object.fromEntries(
      JOB_IDS.map((job) => [job, assigned(state, job)]),
    ),
    resources: { ...state.resources },
    // These are instantaneous estimates, never integrated as realized output.
    netRates: resourceRates(state),
    pressure: Object.fromEntries(
      RESOURCES.map((r) => [r, storageMultiplier(state, r)]),
    ),
    comfort: Object.fromEntries(RESOURCES.map((r) => [r, threshold(state, r)])),
    commitments: Object.fromEntries(
      RESOURCES.map((r) => [r, committed(state, r)]),
    ),
    queues: Object.fromEntries(
      Object.entries(state.queues).map(([id, q]) => [
        id,
        {
          active: structuredClone(q.active),
          waiting: structuredClone(q.waiting),
          blocker: queueBlocker(
            state,
            id === 'research' ? 'research' : 'construction',
          ),
        },
      ]),
    ),
    inputBlockedWorkers: state.people.filter(
      (p) =>
        isProductionJob(p.job) && !canAfford(state, jobInput(state, p.job)),
    ).length,
    completedProjects: state.completedProjects,
  }
}

export function runBalance(
  options: RunOptions,
  start?: Checkpoint,
  progress?: (message: string) => void,
) {
  const state = start ? structuredClone(start.state) : createDefaultState()
  const game = createGame(state)
  const schedule = SCHEDULES[options.schedule]
  const epoch = Date.UTC(2026, 9, 19)
  let wall = start?.wallSeconds ?? 0
  let effective = start?.effectiveSeconds ?? 0
  let active = start?.activeSeconds ?? 0
  const startedAt = wall
  const horizon = startedAt + options.days * 86400
  let lastObserved = wall
  let run = 0
  const milestones: { run: number; id: ResearchId; time: Observation }[] = []
  const checkpoints: Partial<Record<ResearchId, Checkpoint>> = {}
  const actions: ActionRecord[] = []
  const resets: { wallSeconds: number; reward: number; lifetime: number }[] = []
  const visits: {
    wallSeconds: number
    durationSeconds: number
    controls: number
    before: ReturnType<typeof snapshot>
    after: ReturnType<typeof snapshot>
  }[] = []
  const decisions: {
    wallSeconds: number
    state: ReturnType<typeof snapshot>
  }[] = []
  let observed = new Set(RESEARCH_IDS.filter((id) => state.research[id]))
  let longestAbsenceMs = 0
  const calculationStart = performance.now()
  function checkpoint(): Checkpoint {
    return {
      state: structuredClone(state),
      wallSeconds: wall,
      effectiveSeconds: effective,
      activeSeconds: active,
    }
  }
  function observe() {
    for (const id of RESEARCH_IDS) {
      if (!state.research[id] || observed.has(id)) continue
      milestones.push({ run, id, time: { after: lastObserved, by: wall } })
      observed.add(id)
      if (
        (RESEARCH[id].era !== undefined || RESEARCH[id].discoverTimeBox) &&
        !checkpoints[id]
      )
        checkpoints[id] = checkpoint()
    }
    lastObserved = wall
  }
  function advance(seconds: number) {
    const step = Math.min(seconds, Math.max(0, horizon - wall))
    game.advanceTime(step, true)
    wall += step
    active += step
    effective += step
    observe()
  }
  const controls: Controls = {
    plan(project) {
      if (wall >= horizon || !game.enqueue(project)) return false
      game.advanceTime(0, true)
      actions.push({
        wallSeconds: wall,
        kind: 'plan',
        detail: JSON.stringify(project),
        controls:
          project.kind === 'research' && RESEARCH[project.id].branch ? 2 : 1,
      })
      return true
    },
    assign(index, job) {
      const previous = state.people[index]?.job
      if (wall >= horizon || !game.assign(index, job)) return false
      game.advanceTime(0, true)
      // Workplace UI needs a minus and plus to move an employed person.
      actions.push({
        wallSeconds: wall,
        kind: 'assign',
        detail: `${index}:${previous}->${job}`,
        controls: previous !== 'idle' && job !== 'idle' ? 2 : 1,
      })
      return true
    },
  }
  function manual(id: ActionId, deadline = horizon) {
    if (wall >= deadline || !startAction(state, id)) return false
    actions.push({ wallSeconds: wall, kind: 'manual', detail: id, controls: 1 })
    while (state.manual && wall < Math.min(deadline, horizon))
      advance(Math.min(0.5, deadline - wall))
    return !state.manual
  }
  function gather(
    resource: 'food' | 'wood' | 'stone',
    amount: number,
    deadline = horizon,
  ) {
    const action = { food: 'gather', wood: 'sticks', stone: 'stone' } as const
    while (state.resources[resource] < amount && wall < deadline)
      if (!manual(action[resource], deadline)) break
  }
  function opening() {
    const deadline = Math.min(horizon, wall + 3600)
    // Exploration can take several attempts before the first discovery; keep
    // enough provisions on hand so a dry streak cannot deadlock the opening.
    gather('food', 60, deadline)
    while (!state.discovered.wood && wall < deadline)
      if (!manual('explore', deadline)) break
    gather('wood', 10, deadline)
    gather('food', 8, deadline)
    controls.plan({ kind: 'research', id: 'sharpened-stick' })
    advance(0)
    gather('wood', 20, deadline)
    gather('food', 25, deadline)
    while (!state.research['sharpened-stick'] && wall < deadline) advance(1)
    controls.plan({ kind: 'research', id: 'shelters' })
    advance(0)
    gather('wood', 35, deadline)
    while (!state.research.shelters && wall < deadline) advance(1)
    gather('food', 60, deadline)
    controls.plan({ kind: 'expand', id: 'housing', target: 1, form: 0 })
    controls.plan({ kind: 'expand', id: 'lumber', target: 1, form: 0 })
    controls.assign(0, 'builder')
    while (
      (state.queues.construction.waiting.length ||
        state.queues.construction.active) &&
      wall < deadline
    )
      advance(1)
    controls.assign(0, 'forager')
    if (
      wall < horizon &&
      (!state.facilities.housing.level || !state.facilities.lumber.level)
    )
      throw new Error(
        'Opening policy did not establish its settlement within one hour',
      )
  }
  if (!start) opening()
  const openingSeconds = start ? 0 : active
  const openingControls = actions.reduce((n, a) => n + a.controls, 0)
  let visit = 0
  let nextVisit = start ? wall : schedule.intervalHours * 3600
  while (
    nextVisit < horizon &&
    (options.finishAtHorizon ||
      options.resetAt ||
      !state.research[options.goal])
  ) {
    visit++
    progress?.(
      `${options.branch}/${options.policy}/${options.schedule} visit ${visit}, day ${(wall / 86400).toFixed(2)}, era ${state.era}, people ${state.people.length}`,
    )
    if (options.skipVisit === visit) {
      nextVisit += (options.absenceHours ?? schedule.intervalHours) * 3600
    }
    const returnAt = Math.min(nextVisit, horizon)
    beginAbsence(state, epoch + wall * 1000)
    const calculation = performance.now()
    const away = settleAbsence(state, epoch + returnAt * 1000)
    longestAbsenceMs = Math.max(
      longestAbsenceMs,
      performance.now() - calculation,
    )
    effective += away?.effectiveSeconds ?? 0
    state.absence = null
    wall = returnAt
    observe()
    const before = snapshot(state),
      visitStart = wall,
      actionStart = actions.length
    const deadline = Math.min(horizon, visitStart + schedule.minutes * 60)
    while (!state.discovered.stone && wall < deadline)
      if (!manual('explore', deadline)) break
    if (state.discovered.stone && !state.facilities.quarry.level)
      gather('stone', 40, deadline)
    let previousAllocation = ''
    while (wall < deadline) {
      if (
        options.resetAt &&
        state.research[options.resetAt] &&
        canReset(state)
      ) {
        const reward = legacyReward(state)
        resetRun(state)
        resets.push({
          wallSeconds: wall,
          reward,
          lifetime: state.legacy.lifetime,
        })
        actions.push({
          wallSeconds: wall,
          kind: 'reset',
          detail: String(reward),
          controls: 2,
        })
        if (options.perk && buyPerk(state, options.perk))
          actions.push({
            wallSeconds: wall,
            kind: 'perk',
            detail: options.perk,
            controls: 1,
          })
        run++
        observed = new Set()
        lastObserved = wall
        break
      }
      // A reset's manual opening is deliberately a separate session below.
      if (!state.research.shelters) break
      const key = allocationKey(state)
      makeDecisions(
        state,
        options.branch,
        options.policy,
        controls,
        key !== previousAllocation,
      )
      previousAllocation = key
      advance(0)
      decisions.push({ wallSeconds: wall, state: snapshot(state) })
      advance(Math.min(60, deadline - wall))
    }
    visits.push({
      wallSeconds: visitStart,
      durationSeconds: wall - visitStart,
      controls: actions.slice(actionStart).reduce((n, a) => n + a.controls, 0),
      before,
      after: snapshot(state),
    })
    if (!state.research.shelters && wall < horizon) {
      // Account for all manual and automated action work; never hide it in an
      // 8-minute visit.
      const resetStart = wall,
        resetActions = actions.length,
        beforeOpening = snapshot(state)
      opening()
      visits.push({
        wallSeconds: resetStart,
        durationSeconds: wall - resetStart,
        controls: actions
          .slice(resetActions)
          .reduce((n, a) => n + a.controls, 0),
        before: beforeOpening,
        after: snapshot(state),
      })
    }
    nextVisit = returnAt + schedule.intervalHours * 3600
  }
  // Equal-horizon comparisons settle the final partial absence, without decisions.
  if (
    (options.finishAtHorizon ||
      options.resetAt ||
      !state.research[options.goal]) &&
    wall < horizon
  ) {
    beginAbsence(state, epoch + wall * 1000)
    const away = settleAbsence(state, epoch + horizon * 1000)
    effective += away?.effectiveSeconds ?? 0
    state.absence = null
    wall = horizon
    observe()
  }
  return {
    options,
    status: state.research[options.goal]
      ? 'completed'
      : ('unfinished' as 'completed' | 'unfinished'),
    openingSeconds,
    openingControls,
    wallSeconds: wall,
    effectiveSeconds: effective,
    activeSeconds: active,
    calculationSeconds: (performance.now() - calculationStart) / 1000,
    longestAbsenceMs,
    milestones,
    resets,
    actions,
    visits,
    decisions,
    final: snapshot(state),
    finalCheckpoint: checkpoint(),
    checkpoints,
  }
}
export type BalanceResult = ReturnType<typeof runBalance>
