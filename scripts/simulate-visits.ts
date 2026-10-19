import { startAction } from '../src/actions'
import { beginAbsence, settleAbsence } from '../src/clock'
import { BUILDINGS, isProductionJob, JOBS } from '../src/economy'
import { BUILDING_IDS, JOB_IDS, RESEARCH_IDS, RESOURCES } from '../src/ids'
import {
  allEntries,
  enqueue,
  nextExpansion,
  quoteProject,
  researchVisible,
} from '../src/research'
import { RESEARCH } from '../src/research-definitions'
import {
  arrivalStatus,
  assigned,
  assignJob,
  jobUnlocked,
  requirementBlocker,
} from '../src/settlement'
import { advanceTime, resourceRates } from '../src/simulation'
import { createDefaultState } from '../src/state'
import type { ActionId, BuildingId, JobId, Specialization } from '../src/types'

// A reproducible player policy, not an optimal strategy or a fun score. Only
// early discoveries use clicks; no resources, workers or technology are granted.
function run(branch: Specialization) {
  const full = process.argv.includes('--full'),
    s = createDefaultState()
  let elapsed = 0
  let longestAbsenceMs = 0
  const calculationStart = performance.now()
  const milestones: Record<string, number> = {}
  function recordMilestones() {
    for (const id of RESEARCH_IDS)
      if (
        s.research[id] &&
        (RESEARCH[id].era ||
          RESEARCH[id].discoverTimeBox ||
          id === 'shelters' ||
          id === 'causal-synthesis') &&
        milestones[id] === undefined
      )
        milestones[id] = elapsed / 3600
  }
  function advance(seconds: number) {
    advanceTime(s, seconds, true)
    elapsed += seconds
    recordMilestones()
  }
  function manual(id: ActionId) {
    if (!startAction(s, id)) throw new Error(`Cannot start ${id}`)
    while (s.manual) advance(0.5)
  }
  function gather(resource: 'food' | 'wood' | 'stone', amount: number) {
    const actions = { food: 'gather', wood: 'sticks', stone: 'stone' } as const
    while (s.resources[resource] < amount) manual(actions[resource])
  }
  gather('food', 15)
  manual('explore')
  gather('wood', 10)
  gather('food', 8)
  enqueue(s, { kind: 'research', id: 'sharpened-stick' })
  advance(0)
  gather('wood', 20)
  gather('food', 25)
  while (!s.research['sharpened-stick']) advance(1)
  enqueue(s, { kind: 'research', id: 'shelters' })
  advance(0)
  gather('wood', 35)
  while (!s.research.shelters) advance(1)
  gather('food', 60)
  enqueue(s, { kind: 'expand', id: 'housing', target: 1, form: 0 })
  enqueue(s, { kind: 'expand', id: 'lumber', target: 1, form: 0 })
  assignJob(s, 0, 'builder')
  while (s.queues.construction.waiting.length || s.queues.construction.active) {
    advance(1)
    if (elapsed > 3600) throw new Error('Opening policy stalled')
  }
  assignJob(s, 0, 'forager')
  const openingMinutes = elapsed / 60
  const plan: [BuildingId, number][] = [
    ['housing', 3],
    ['foraging', 2],
    ['quarry', 1],
    ['stockyard', 1],
    ['food-store', 1],
    ['sawmill', 1],
    ['stoneworks', 1],
    ['lumber', 2],
    ['quarry', 2],
    ['housing', 5],
    ['storehouse', 1],
    ['study', 1],
    ['library', 2],
    ['tool-workshop', 1],
    ['sawmill', 2],
    ['stoneworks', 2],
    ['study', 2],
    ['tool-workshop', 2],
    ['builders-lodge', 1],
    ['supply-post', 1],
    ['farm', 1],
    ['housing', 7],
    ['library', 3],
    ['study', 3],
    ['sawmill', 3],
    ['stoneworks', 3],
    ['tool-workshop', 3],
    ['irrigation', 1],
    ['stockyard', 3],
    ['storehouse', 3],
    ['meeting-place', 2],
    ['public-well', 2],
    ['study', 5],
    ['lumber', 4],
    ['quarry', 4],
    ['tool-workshop', 4],
    ['library', 4],
    ['sawmill', 4],
    ['stoneworks', 4],
  ]
  if (full)
    plan.push(
      ['ore-mine', 2],
      ['foundry', 2],
      ['machine-shop', 2],
      ['generator', 2],
      ['electronics-plant', 2],
      ['battery-bank', 2],
      ['data-center', 2],
      ['computing-center', 2],
      ['ore-mine', 4],
      ['foundry', 4],
      ['machine-shop', 4],
      ['electronics-plant', 4],
      ['computing-center', 4],
      ['generator', 4],
      ['launch-complex', 1],
      ['cargo-depot', 2],
      ['orbital-extractor', 2],
      ['space-observatory', 2],
      ['quantum-laboratory', 2],
      ['quantum-vault', 2],
      ['quantum-fabricator', 2],
      ['orbital-extractor', 4],
      ['causal-laboratory', 2],
      ['stellar-foundry', 2],
      ['quantum-laboratory', 4],
      ['causal-laboratory', 4],
      ['battery-bank', 4],
      ['data-center', 4],
      ['meeting-place', 12],
      ['public-well', 12],
      ['farm', 4],
    )
  function decisions() {
    for (const id of RESEARCH_IDS) {
      if (
        id === 'early-astronomy' ||
        id === (branch === 'forestry' ? 'stonecraft' : 'forestry')
      )
        continue
      if (researchVisible(s, id)) enqueue(s, { kind: 'research', id })
    }
    for (const [id, target] of plan) {
      if (
        s.facilities[id].level >= target ||
        requirementBlocker(s, BUILDINGS[id].forms[0]?.requires ?? {})
      )
        continue
      if (
        allEntries(s).some(
          (e) => e.project.kind !== 'research' && e.project.id === id,
        )
      )
        continue
      if (s.queues.construction.waiting.length < 2)
        enqueue(s, nextExpansion(s, id))
    }
    for (const id of BUILDING_IDS) {
      const f = s.facilities[id],
        next = BUILDINGS[id].forms[f.form + 1]
      if (
        f.level &&
        next &&
        !requirementBlocker(s, next.requires) &&
        !allEntries(s).some(
          (e) => e.project.kind !== 'research' && e.project.id === id,
        )
      )
        enqueue(s, { kind: 'convert', id, form: f.form + 1 })
    }
    const previous = s.people.map((p) => ({ ...p }))
    for (let i = 0; i < s.people.length; i++) assignJob(s, i, 'idle')
    const food: JobId = jobUnlocked(s, 'farmer') ? 'farmer' : 'forager'
    function add(job: JobId) {
      const i = s.people.findIndex((p) => p.job === 'idle')
      return i >= 0 && assignJob(s, i, job)
    }
    add(food)
    while (
      arrivalStatus(s).foodOutput < arrivalStatus(s).required &&
      assigned(s, 'idle') > 2
    )
      add(food)
    if (allEntries(s).some((e) => e.project.kind !== 'research')) add('builder')
    const roles = JOB_IDS.filter(isProductionJob).filter(
      (job) => JOBS[job].output !== 'food',
    )
    for (const job of roles) if (jobUnlocked(s, job)) add(job)
    while (assigned(s, 'idle')) {
      const demand: Partial<Record<(typeof RESOURCES)[number], number>> = {}
      for (const q of Object.values(s.queues)) {
        const head = q.waiting[0]
        if (head) {
          const quote = quoteProject(s, head.project)
          for (const r of RESOURCES)
            demand[r] =
              (demand[r] ?? 0) +
              Math.max(0, (quote.cost[r] ?? 0) - s.resources[r])
        }
      }
      // Plan upstream supply for the assigned crew, including processors that
      // are currently stopped for ingredients. Current output alone hides demand.
      const rates = resourceRates(s, { ignoreInputs: true })
      const choices = roles.filter((job) => jobUnlocked(s, job))
      const score = (job: (typeof roles)[number]) => {
        const output = JOBS[job].output,
          building = Object.values(BUILDINGS).find((d) => d.job === job)
        return (
          (((demand[output] ?? 0) / Math.max(0.01, rates[output]) +
            (rates[output] < 0 ? 100000 : 0)) /
            (1 + assigned(s, job))) *
          (building?.forms[0]?.rate ?? 1)
        )
      }
      choices.sort((a, b) => score(b) - score(a))
      const next = choices[0]
      if (!next || !add(next)) break
    }
    while (arrivalStatus(s).foodOutput < arrivalStatus(s).required) {
      const i = s.people.findIndex(
        (p) => p.job === 'woodcutter' && assigned(s, 'woodcutter') > 1,
      )
      if (i < 0) break
      assignJob(s, i, food)
    }
    const targets = new Map(JOB_IDS.map((job) => [job, assigned(s, job)]))
    s.people = previous
    for (const job of JOB_IDS) {
      let excess = assigned(s, job) - (targets.get(job) ?? 0)
      for (let i = s.people.length - 1; i >= 0 && excess > 0; i--)
        if (s.people[i]?.job === job) {
          assignJob(s, i, 'idle')
          excess--
        }
    }
    for (const job of JOB_IDS)
      while (job !== 'idle' && assigned(s, job) < (targets.get(job) ?? 0)) {
        if (!add(job)) break
      }
  }
  const snapshots = []
  for (
    let visit = 1;
    visit <= (full ? 180 : 60) &&
    !s.research[full ? 'causal-synthesis' : 'mechanization'];
    visit++
  ) {
    const now = Date.UTC(2026, 9, 19) + elapsed * 1000,
      next = visit * 8 * 3600
    beginAbsence(s, now)
    const calculation = performance.now()
    settleAbsence(s, Date.UTC(2026, 9, 19) + next * 1000)
    longestAbsenceMs = Math.max(
      longestAbsenceMs,
      performance.now() - calculation,
    )
    s.absence = null
    elapsed = next
    recordMilestones()
    const visitStart = elapsed
    if (!s.discovered.stone) {
      manual('explore-further')
      gather('stone', 40)
    }
    while (elapsed - visitStart < 480) {
      decisions()
      advance(60)
    }
    if (full)
      console.error(
        branch,
        visit,
        s.era,
        s.people.length,
        s.queues.research.active?.project.id ??
          s.queues.research.waiting[0]?.project.id,
      )
    snapshots.push({
      day: Number((elapsed / 86400).toFixed(2)),
      people: s.people.length,
      era: s.era,
      research:
        s.queues.research.active?.project.id ??
        s.queues.research.waiting[0]?.project.id,
      resources: Object.fromEntries(
        RESOURCES.map((r) => [r, Math.floor(s.resources[r])]),
      ),
    })
  }
  return {
    branch,
    openingMinutes: Number(openingMinutes.toFixed(1)),
    observedMilestoneHours: Object.fromEntries(
      Object.entries(milestones).map(([k, v]) => [k, Number(v.toFixed(2))]),
    ),
    calculationSeconds: Number(
      ((performance.now() - calculationStart) / 1000).toFixed(2),
    ),
    longestAbsenceMs: Math.round(longestAbsenceMs),
    finalDay: Number((elapsed / 86400).toFixed(2)),
    people: s.people.length,
    completed: RESEARCH_IDS.filter((id) => s.research[id]),
    snapshots,
  }
}
const branchArg = process.argv
  .find((arg) => arg.startsWith('--branch='))
  ?.slice(9)
for (const branch of ['forestry', 'stonecraft'] as const)
  if (!branchArg || branchArg === branch)
    console.log(JSON.stringify(run(branch), null, 2))
