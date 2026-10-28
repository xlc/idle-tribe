import { BUILDINGS, JOBS, RESEARCH } from '../src/definitions'
import { BUILDING_IDS, JOB_IDS, RESEARCH_IDS, RESOURCES } from '../src/ids'
import { isProductionJob } from '../src/jobs'
import {
  allEntries,
  nextExpansion,
  quoteProject,
  researchVisible,
} from '../src/research'
import { canAfford } from '../src/resources'
import {
  arrivalStatus,
  assigned,
  assignJob,
  jobCapacity,
  jobUnlocked,
  requirementBlocker,
  workerCandidate,
} from '../src/settlement'
import { resourceRates } from '../src/simulation'
import type {
  BuildingId,
  GameState,
  JobId,
  Project,
  Specialization,
} from '../src/types'

export type Policy = 'simple' | 'bottleneck'
export interface Controls {
  plan: (project: Project) => boolean
  assign: (index: number, job: JobId) => boolean
}
// A player's published build order, not game rules. Targets are policy choices,
// not facility limits. Both policies share this order to isolate allocation.
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
  ['observatory', 1],
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

export function makeDecisions(
  s: GameState,
  branch: Specialization,
  policy: Policy,
  controls: Controls,
  rebalance = true,
) {
  for (const id of RESEARCH_IDS) {
    if (RESEARCH[id].branch && RESEARCH[id].branch !== branch) continue
    if (researchVisible(s, id)) controls.plan({ kind: 'research', id })
  }
  function priority(id: BuildingId) {
    const job = BUILDINGS[id].job
    if (!job) return 0
    // A crew spending most of its people on food should invest in food capacity
    // before more downstream factories. This is a player heuristic, not a cap.
    if (
      isProductionJob(job) &&
      JOBS[job].output === 'food' &&
      assigned(s, job) > s.people.length / 2
    )
      return 2
    return Number(!s.facilities[id].level)
  }
  const priorities =
    policy === 'bottleneck'
      ? [...plan].sort(([a], [b]) => priority(b) - priority(a))
      : plan
  for (const [id, target] of priorities) {
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
    const project = nextExpansion(s, id)
    const cost = quoteProject(s, project).cost
    // Do not place a material sink ahead of its first source. Existing or earlier
    // queued workplaces count; manually gathering the quarry's seed stone is
    // handled in the opening. This is a policy constraint, not a game rule.
    const supplied = RESOURCES.every(
      (resource) =>
        s.resources[resource] >= (cost[resource] ?? 0) ||
        BUILDING_IDS.some((source) => {
          const job = BUILDINGS[source].job
          return (
            job &&
            isProductionJob(job) &&
            JOBS[job].output === resource &&
            (s.facilities[source].level > 0 ||
              allEntries(s).some(
                (entry) =>
                  entry.project.kind === 'expand' &&
                  entry.project.id === source,
              ))
          )
        }),
    )
    if (s.queues.construction.waiting.length < 2 && supplied)
      controls.plan(project)
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
      controls.plan({ kind: 'convert', id, form: f.form + 1 })
  }
  if (!rebalance) return
  const actual = s
  s = structuredClone(s)
  for (let i = 0; i < s.people.length; i++) assignJob(s, i, 'idle')
  const food: JobId = jobUnlocked(s, 'farmer') ? 'farmer' : 'forager'
  function add(job: JobId) {
    const i = workerCandidate(s, job)
    return i >= 0 && assignJob(s, i, job)
  }
  add(food)
  while (
    arrivalStatus(s).foodOutput < arrivalStatus(s).required &&
    assigned(s, 'idle') > 2
  )
    if (!add(food)) break
  const constructionHead = s.queues.construction.active
    ? s.queues.construction.active.project
    : s.queues.construction.waiting[0]?.project
  const constructionReady = constructionHead
    ? s.queues.construction.active !== null ||
      (() => {
        const quote = quoteProject(s, constructionHead)
        return !quote.blocker && canAfford(s, quote.cost)
      })()
    : false
  if (constructionReady) {
    // Keep one worker available for the construction queue before staffing
    // optional gathering and production roles. Without this reservation, a
    // three-person settlement can fill food, wood, and stone roles and leave
    // every queued building permanently blocked by "No builders".
    add('builder')
    // The deliberate planner uses the displayed efficient crew size, just as
    // Fill does. The simple policy keeps one builder and more producers.
    if (policy === 'bottleneck')
      while (
        assigned(s, 'builder') < jobCapacity(s, 'builder') &&
        assigned(s, 'idle') > 1
      )
        if (!add('builder')) break
  }
  // Gathering workplaces use action jobs rather than production definitions;
  // keep their discovered sources staffed so the policy can fund its queues.
  for (const job of ['woodcutter', 'stoneworker'] as const)
    if (jobUnlocked(s, job)) add(job)
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
        (((policy === 'bottleneck'
          ? (demand[output] ?? 0) / Math.max(0.01, rates[output])
          : 1) +
          (rates[output] < 0 ? 100000 : 0)) /
          (1 + assigned(s, job))) *
        (policy === 'simple' ? 1 : (building?.forms[0]?.rate ?? 1))
      )
    }
    choices.sort((a, b) => score(b) - score(a))
    const next = choices[0]
    if (!next || !add(next)) break
  }
  while (arrivalStatus(s).foodOutput < arrivalStatus(s).required) {
    const i = s.people.findIndex(
      (p) =>
        p.job !== food &&
        p.job !== 'builder' &&
        p.job !== 'idle' &&
        assigned(s, p.job) > 1,
    )
    if (i < 0) break
    assignJob(s, i, food)
  }
  const targets = new Map(JOB_IDS.map((job) => [job, assigned(s, job)]))
  s = actual
  for (const job of JOB_IDS) {
    while (job !== 'idle' && assigned(s, job) > (targets.get(job) ?? 0)) {
      const index = workerCandidate(s, job, true)
      if (index < 0 || !controls.assign(index, 'idle')) break
    }
  }
  for (const job of JOB_IDS)
    while (job !== 'idle' && assigned(s, job) < (targets.get(job) ?? 0)) {
      const i = workerCandidate(s, job)
      if (i < 0 || !controls.assign(i, job)) break
    }
}

// Reallocate when a visit starts or the workforce/technology changes. Stock
// fluctuations alone do not justify discarding partial worker cycles each minute.
export function allocationKey(s: GameState) {
  return JSON.stringify([
    s.people.map((p) => p.health),
    s.facilities,
    s.research,
  ])
}
