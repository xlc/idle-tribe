import { mkdir } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { BUILDINGS } from '../src/buildings'
import {
  beginAbsence,
  effectiveOfflineSeconds,
  offlineWindow,
  settleAbsence,
} from '../src/clock'
import { createGame } from '../src/game'
import { PERK_IDS, RESOURCES } from '../src/ids'
import { isProductionJob, JOBS } from '../src/jobs'
import { buyPerk, resetRun } from '../src/prestige'
import {
  cancelProject,
  nextEquipment,
  nextExpansion,
  QUEUES,
  quoteProject,
} from '../src/research'
import { effectiveStaff, equipmentMultiplier } from '../src/settlement'
import { advanceTime } from '../src/simulation'
import type {
  BuildingId,
  GameState,
  Project,
  ResearchId,
  Specialization,
} from '../src/types'
import { allocationKey, makeDecisions } from './balance-policy'
import { provenance } from './balance-provenance'
import { type Checkpoint, runBalance, snapshot } from './balance-runner'

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    out: { type: 'string', default: 'balance-results/experiments' },
    branch: { type: 'string', default: 'forestry' },
  },
  strict: true,
})
const branch: Specialization =
  values.branch === 'forestry'
    ? 'forestry'
    : values.branch === 'stonecraft'
      ? 'stonecraft'
      : (() => {
          throw new Error('Invalid branch')
        })()
await mkdir(values.out, { recursive: true })
await Bun.write(
  `${values.out}/provenance.json`,
  JSON.stringify(await provenance(), null, 2),
)
const seed = runBalance(
  {
    branch,
    policy: 'bottleneck',
    schedule: 'frequent',
    days: 60,
    goal: 'causal-synthesis',
  },
  undefined,
  console.error,
)
await Bun.write(`${values.out}/${branch}-seed.json`, JSON.stringify(seed))
function checkpoint(id: ResearchId): Checkpoint {
  const found = seed.checkpoints[id]
  if (!found) throw new Error(`Ordinary progression did not reach ${id}`)
  return found
}
function clearPlans(state: GameState) {
  // Ordinary cancellation in every arm: exact paid refunds, no granted stock.
  for (const queue of QUEUES) {
    const q = state.queues[queue]
    if (q.active) cancelProject(state, queue, q.active.sequence)
    for (const entry of [...q.waiting])
      cancelProject(state, queue, entry.sequence)
  }
}
const pairs = []
const cases: {
  milestone: ResearchId
  workplace: BuildingId
  storage: BuildingId
}[] = [
  {
    milestone: 'agriculture',
    workplace: 'tool-workshop',
    storage: 'storehouse',
  },
  { milestone: 'writing', workplace: 'lumber', storage: 'stockyard' },
  {
    milestone: 'causal-engineering',
    workplace: 'quantum-laboratory',
    storage: 'quantum-vault',
  },
]
for (const scenario of cases) {
  const base = structuredClone(checkpoint(scenario.milestone).state)
  clearPlans(base)
  const def = BUILDINGS[scenario.workplace],
    facility = base.facilities[scenario.workplace]
  const candidates: { name: string; project?: Project; staff?: true }[] = [
    { name: 'hold' },
    { name: 'expand', project: nextExpansion(base, scenario.workplace) },
    { name: 'equip', project: nextEquipment(base, scenario.workplace) },
    { name: 'storage', project: nextExpansion(base, scenario.storage) },
    { name: 'staff', staff: true },
  ]
  if (def.forms[facility.form + 1])
    candidates.push({
      name: 'convert',
      project: {
        kind: 'convert',
        id: scenario.workplace,
        form: facility.form + 1,
      },
    })
  for (const candidate of candidates) {
    const state = structuredClone(base),
      game = createGame(state)
    const quote = candidate.project
      ? quoteProject(state, candidate.project)
      : null
    if (quote?.blocker) {
      pairs.push({
        scenario,
        candidate: candidate.name,
        unavailable: quote.blocker,
      })
      continue
    }
    if (candidate.project) game.enqueue(candidate.project)
    if (candidate.staff) {
      const i = state.people.findIndex((p) => p.job === 'idle')
      if (!def.job || i < 0 || !game.assign(i, def.job)) {
        pairs.push({
          scenario,
          candidate: candidate.name,
          unavailable: 'No idle worker at this checkpoint',
        })
        continue
      }
    }
    advanceTime(state, 0)
    const initial = snapshot(base),
      observations = []
    beginAbsence(state, 1)
    for (const hours of [8, 24]) {
      settleAbsence(state, 1 + hours * 3600000)
      observations.push({
        hours,
        state: snapshot(state),
        resourceChange: Object.fromEntries(
          RESOURCES.map((r) => [r, state.resources[r] - base.resources[r]]),
        ),
      })
    }
    pairs.push({
      scenario,
      candidate: candidate.name,
      quote,
      initial,
      observations,
    })
  }
}
await Bun.write(
  `${values.out}/${branch}-investments.json`,
  JSON.stringify(pairs),
)

const recoveries = []
for (const mistake of ['food', 'consumers', 'queue', 'week-away'] as const) {
  const start = structuredClone(checkpoint('writing'))
  const game = createGame(start.state)
  let controls = 0
  if (mistake === 'food') {
    start.state.people.forEach((p, i) => {
      if (
        isProductionJob(p.job) &&
        JOBS[p.job].output === 'food' &&
        game.assign(i, 'idle')
      )
        controls++
    })
  }
  if (mistake === 'consumers') {
    start.state.people.forEach((p, i) => {
      if (p.job === 'woodcutter' && game.assign(i, 'sawyer')) controls += 2
    })
  }
  if (mistake === 'queue') {
    clearPlans(start.state)
    const p = nextExpansion(start.state, 'housing')
    game.enqueue(p)
    start.state.people.forEach((person, index) => {
      if (person.job === 'builder' && game.assign(index, 'idle')) controls++
    })
  }
  const beforeMistake = snapshot(start.state)
  beginAbsence(start.state, 1)
  const absence = (mistake === 'week-away' ? 168 : 8) * 3600
  const away = settleAbsence(start.state, 1 + absence * 1000)
  start.state.absence = null
  start.wallSeconds += absence
  start.effectiveSeconds += away?.effectiveSeconds ?? 0
  const beforeRecovery = snapshot(start.state)
  controls = 0

  const recovery = []
  let allocation = ''
  for (let minute = 0; minute < 60; minute++) {
    const key = allocationKey(start.state)
    makeDecisions(
      start.state,
      branch,
      'bottleneck',
      {
        plan(project) {
          const changed = game.enqueue(project)
          if (changed) {
            controls++
            game.advanceTime(0, true)
          }
          return changed
        },
        assign(index, job) {
          const previous = start.state.people[index]?.job
          const changed = game.assign(index, job)
          if (changed) {
            controls += previous !== 'idle' && job !== 'idle' ? 2 : 1
            game.advanceTime(0, true)
          }
          return changed
        },
      },
      key !== allocation,
    )
    allocation = key
    advanceTime(start.state, 60, true)
    recovery.push({
      minute: minute + 1,
      healthy: start.state.people.filter((p) => p.health === 5).length,
      people: start.state.people.length,
      food: start.state.resources.food,
    })
  }
  recoveries.push({
    mistake,
    controls,
    afterMistake: beforeMistake,
    beforeRecovery,
    recovery,
    after: snapshot(start.state),
  })
}
await Bun.write(
  `${values.out}/${branch}-recovery.json`,
  JSON.stringify(recoveries),
)

// Every alternative begins at the same earned discovery and gets 30 MORE days.
const prestige = []
for (const resetAt of [
  undefined,
  'writing',
  'chronometry',
  'orbital-flight',
] as const) {
  const result = runBalance(
    {
      branch,
      policy: 'bottleneck',
      schedule: 'frequent',
      days: 30,
      goal: 'causal-synthesis',
      finishAtHorizon: true,
      ...(resetAt ? { resetAt, perk: 'efficient-instruction' as const } : {}),
    },
    checkpoint('chronometry'),
    console.error,
  )
  const name = resetAt ?? 'continue'
  await Bun.write(
    `${values.out}/${branch}-prestige-${name}.json`,
    JSON.stringify(result),
  )
  prestige.push({
    strategy: name,
    resets: result.resets,
    wallSeconds: result.wallSeconds,
    activeSeconds:
      result.activeSeconds - checkpoint('chronometry').activeSeconds,
    lifetime: result.finalCheckpoint.state.legacy.lifetime,
    era: result.final.era,
    highestEraThisExperiment: result.finalCheckpoint.state.legacy.highestEra,
    controls: result.actions.reduce((n, a) => n + a.controls, 0),
    milestones: result.milestones,
  })
}
await Bun.write(
  `${values.out}/${branch}-prestige-summary.json`,
  JSON.stringify(prestige, null, 2),
)

const perks = []
for (const perk of [undefined, ...PERK_IDS]) {
  const start = structuredClone(checkpoint('chronometry'))
  if (!resetRun(start.state))
    throw new Error('Earned discovery could not reset')
  if (perk && !buyPerk(start.state, perk))
    throw new Error(`First reset cannot afford ${perk}`)
  const result = runBalance(
    {
      branch,
      policy: 'bottleneck',
      schedule: 'frequent',
      days: 21,
      goal: 'chronometry',
    },
    start,
  )
  perks.push({
    perk: perk ?? 'none',
    effectiveHoursAfter24HoursAway:
      effectiveOfflineSeconds(86400, offlineWindow(start.state)) / 3600,
    status: result.status,
    wallHours: (result.wallSeconds - start.wallSeconds) / 3600,
    activeMinutes: (result.activeSeconds - start.activeSeconds) / 60,
    milestones: result.milestones,
  })
  await Bun.write(
    `${values.out}/${branch}-perk-${perk ?? 'none'}.json`,
    JSON.stringify(result),
  )
}
await Bun.write(
  `${values.out}/${branch}-perks.json`,
  JSON.stringify(perks, null, 2),
)

// Synthetic curve probes are arithmetic, not evidence that these states are reachable.
const curves = [1, 2, 4, 10, 25, 100, 1000].map((level) => ({
  level,
  staffing: [1, 2, 4, 8].map((ratio) => ({
    ratio,
    output: effectiveStaff(level * 2 * ratio, level * 2),
    marginalWorker:
      effectiveStaff(level * 2 * ratio + 1, level * 2) -
      effectiveStaff(level * 2 * ratio, level * 2),
  })),
  equipment: equipmentMultiplier(level),
  equipmentGain:
    equipmentMultiplier(level + 1) / equipmentMultiplier(level) - 1,
}))
await Bun.write(`${values.out}/curves.json`, JSON.stringify(curves, null, 2))
console.log(
  JSON.stringify({
    branch,
    pairs: pairs.length,
    recoveries: recoveries.length,
    prestige: prestige.map((p) => ({
      strategy: p.strategy,
      resets: p.resets.length,
      lifetime: p.lifetime,
      era: p.era,
      activeMinutes: p.activeSeconds / 60,
    })),
  }),
)
