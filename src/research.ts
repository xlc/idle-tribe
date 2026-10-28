import { BUILDINGS, EQUIPMENT, RESEARCH } from './definitions'
import { RESEARCH_IDS, RESOURCES } from './ids'
import { hasResearch, researchLevel } from './research-effects'
import {
  canAfford,
  capital,
  cumulative,
  difference,
  marginal,
  pay,
  refund,
} from './resources'
import {
  constructionSpeed,
  prestigeMultiplier,
  requirementBlocker,
} from './settlement'
import type { Cost, GameState, Project, QueueId } from './types'
export const QUEUES: QueueId[] = ['research', 'construction']
export function projectName(state: GameState, project: Project) {
  if (project.kind === 'research') {
    const level = project.target ?? 1
    return `${RESEARCH[project.id].name}${level > 1 ? ` · level ${level}` : ''}`
  }
  const def = BUILDINGS[project.id],
    f = state.facilities[project.id]
  const form =
    def.forms[
      project.kind === 'convert' || (project.kind === 'expand' && !f.level)
        ? project.form
        : f.form
    ]
  return `${form?.name ?? project.id}${project.kind === 'equip' ? ` · tools ${project.target}` : project.kind === 'expand' ? ` · level ${project.target}` : ' · conversion'}`
}
export function quoteProject(
  state: GameState,
  project: Project,
): { cost: Cost; total: number; blocker: string; obsolete: boolean } {
  if (project.kind === 'research') {
    const def = RESEARCH[project.id],
      current = researchLevel(state, project.id),
      target = project.target ?? 1,
      upgrade = def.upgrade,
      isUpgrade = target > 1,
      scale = isUpgrade && upgrade ? upgrade.costMultiplier ** (target - 1) : 1,
      timeScale =
        isUpgrade && upgrade ? upgrade.timeMultiplier ** (target - 1) : 1
    const otherBranchPlanned =
      def.branch &&
      allEntries(state).some(
        (entry) =>
          entry.project.kind === 'research' &&
          RESEARCH[entry.project.id].branch &&
          RESEARCH[entry.project.id].branch !== def.branch,
      )
    const cost = Object.fromEntries(
      RESOURCES.filter((r) => def.cost[r]).map((r) => [
        r,
        Math.ceil(
          (def.cost[r] ?? 0) *
            scale *
            (state.legacy.perks['efficient-instruction'] ? 0.9 : 1),
        ),
      ]),
    )
    const blocker =
      target > (upgrade?.maxLevel ?? 1)
        ? `Maximum level ${upgrade?.maxLevel ?? 1}`
        : current !== target - 1
          ? `Requires level ${target - 1}`
          : requirementBlocker(
              state,
              isUpgrade ? (upgrade?.requires ?? {}) : def.requires,
            )
    return {
      cost,
      total: (def.seconds * timeScale) / prestigeMultiplier(state),
      blocker:
        (otherBranchPlanned ? 'Other path planned' : '') ||
        blocker ||
        (def.branch &&
        state.specialization &&
        state.specialization !== def.branch
          ? 'Other path chosen'
          : ''),
      obsolete: current >= target,
    }
  }
  const def = BUILDINGS[project.id],
    f = state.facilities[project.id],
    form = def.forms[f.form]
  if (!form) throw new Error('Invalid facility form')
  if (project.kind === 'equip') {
    const tier = project.target
    const milestone = EQUIPMENT[Math.min(EQUIPMENT.length, tier) - 1]
    if (!milestone) throw new Error('Invalid equipment tier')
    const refinement = tier > EQUIPMENT.length
    const factor = refinement ? (tier / EQUIPMENT.length) ** 2 : 1
    return {
      cost: refinement
        ? Object.fromEntries(
            RESOURCES.filter((r) => milestone.cost[r]).map((r) => [
              r,
              Math.ceil((milestone.cost[r] ?? 0) * factor),
            ]),
          )
        : milestone.cost,
      total: milestone.work * factor,
      obsolete: f.equipment >= tier,
      blocker: !def.job
        ? 'Not a production facility'
        : !f.level
          ? 'Requires workplace'
          : f.equipment !== tier - 1
            ? `Requires tools ${tier - 1}`
            : requirementBlocker(state, { research: [milestone.research] }),
    }
  }
  const target =
    def.forms[project.kind === 'convert' || !f.level ? project.form : f.form]
  if (!target) throw new Error('Invalid target form')
  if (project.kind === 'convert')
    return {
      cost: difference(
        capital(target.cost, f.level),
        capital(form.cost, f.level),
      ),
      total: Math.max(0, target.work - form.work) * cumulative(f.level),
      obsolete: f.form >= project.form,
      blocker: !f.level
        ? 'Requires workplace'
        : requirementBlocker(state, target.requires),
    }
  return {
    cost: difference(
      capital(target.cost, project.target),
      capital(target.cost, project.target - 1),
    ),
    total: target.work * marginal(project.target - 1),
    obsolete: f.level >= project.target || Boolean(def.unique && f.level),
    blocker:
      def.unique && project.target > 1
        ? 'Unique milestone'
        : f.level !== project.target - 1
          ? `Requires level ${project.target - 1}`
          : requirementBlocker(state, target.requires),
  }
}
export function allEntries(state: GameState) {
  return QUEUES.flatMap((id) => {
    const q = state.queues[id]
    return [...(q.active ? [q.active] : []), ...q.waiting]
  })
}
function sameProject(a: Project, b: Project) {
  return (
    a.kind === b.kind &&
    a.id === b.id &&
    (a.kind === 'research'
      ? (a.target ?? 1)
      : 'target' in a
        ? a.target
        : undefined) ===
      (b.kind === 'research'
        ? (b.target ?? 1)
        : 'target' in b
          ? b.target
          : undefined) &&
    ('form' in a ? a.form : undefined) === ('form' in b ? b.form : undefined)
  )
}
export function enqueue(state: GameState, project: Project) {
  const normalized =
    project.kind === 'research' && project.target === undefined
      ? { ...project, target: 1 }
      : project
  const queue: QueueId =
    normalized.kind === 'research' ? 'research' : 'construction'
  const quote = quoteProject(state, normalized)
  if (
    quote.obsolete ||
    (normalized.kind === 'research' &&
      normalized.target !== undefined &&
      normalized.target > (RESEARCH[normalized.id].upgrade?.maxLevel ?? 1))
  )
    return false
  if (allEntries(state).some((e) => sameProject(e.project, normalized)))
    return false
  if (normalized.kind === 'research') {
    const branch = RESEARCH[normalized.id].branch
    if (
      branch &&
      ((state.specialization && state.specialization !== branch) ||
        allEntries(state).some(
          (e) =>
            e.project.kind === 'research' &&
            RESEARCH[e.project.id].branch &&
            RESEARCH[e.project.id].branch !== branch,
        ))
    )
      return false
  }
  state.queues[queue].waiting.push({
    sequence: state.nextSequence++,
    project: normalized,
  })
  return true
}
export function queueBlocker(state: GameState, id: QueueId) {
  const q = state.queues[id]
  if (q.active)
    return id === 'construction' && !constructionSpeed(state)
      ? 'No builders'
      : ''
  const entry = q.waiting[0]
  if (!entry) return 'Waiting'
  const quote = quoteProject(state, entry.project)
  return (
    quote.blocker ||
    (id === 'construction' && !constructionSpeed(state) ? 'No builders' : '') ||
    (!canAfford(state, quote.cost) ? 'Waiting for materials' : '')
  )
}
export function startQueues(state: GameState) {
  for (const id of QUEUES) {
    const q = state.queues[id]
    while (
      !q.active &&
      q.waiting[0] &&
      quoteProject(state, q.waiting[0].project).obsolete
    ) {
      const removed = q.waiting.shift()
      if (removed)
        state.notice = `Removed completed plan: ${projectName(state, removed.project)}`
    }
  }
  const order = [...QUEUES].sort(
    (a, b) =>
      (state.queues[a].waiting[0]?.sequence ?? Infinity) -
      (state.queues[b].waiting[0]?.sequence ?? Infinity),
  )
  for (const id of order) {
    const q = state.queues[id]
    if (q.active || queueBlocker(state, id)) continue
    const entry = q.waiting.shift()
    if (!entry) continue
    const quote = quoteProject(state, entry.project)
    pay(state, quote.cost)
    q.active = {
      ...entry,
      paid: { ...quote.cost },
      progress: 0,
      total: quote.total,
    }
  }
}
export function cancelProject(state: GameState, id: QueueId, sequence: number) {
  const q = state.queues[id]
  if (q.active?.sequence === sequence) {
    refund(state, q.active.paid)
    q.active = null
    return true
  }
  const i = q.waiting.findIndex((e) => e.sequence === sequence)
  if (i < 0) return false
  q.waiting.splice(i, 1)
  return true
}
export function moveProject(
  state: GameState,
  id: QueueId,
  sequence: number,
  direction: number,
) {
  const q = state.queues[id],
    i = q.waiting.findIndex((e) => e.sequence === sequence),
    entry = q.waiting[i]
  if (!entry || i + direction < 0 || i + direction >= q.waiting.length)
    return false
  q.waiting.splice(i, 1)
  q.waiting.splice(i + direction, 0, entry)
  return true
}
export function completeProject(state: GameState, project: Project) {
  if (project.kind === 'research') {
    const def = RESEARCH[project.id],
      previous = researchLevel(state, project.id),
      target = project.target ?? 1,
      firstCompletion = previous === 0
    state.research[project.id] = Math.max(previous, target)
    if (firstCompletion && def.branch) state.specialization = def.branch
    if (firstCompletion && def.era) {
      state.era = Math.max(state.era, def.era)
      state.legacy.highestEra = Math.max(state.era, state.legacy.highestEra)
    }
    if (firstCompletion && def.unlockHappiness) state.happiness = 50
    if (firstCompletion && def.discoverTimeBox) state.legacy.discovered = true
    if (firstCompletion && def.grant) {
      const f = state.facilities[def.grant.building]
      f.level = Math.max(1, f.level)
      const player = state.people[0]
      if (player?.job === 'idle') {
        player.job = def.grant.job
        player.progress = 0
      }
    }
  } else {
    const f = state.facilities[project.id]
    if (project.kind === 'expand') {
      if (!f.level) f.form = project.form
      f.level = project.target
    }
    if (project.kind === 'convert') f.form = project.form
    if (project.kind === 'equip') f.equipment = project.target
  }
}
// Quotes project the preceding plans only; actual payment is always recalculated at start.
export function plannedQuotes(state: GameState, id: QueueId) {
  const projected =
      id === 'construction' ? researchPlan(state) : structuredClone(state),
    q = state.queues[id],
    result = new Map<number, ReturnType<typeof quoteProject>>()
  if (q.active) completeProject(projected, q.active.project)
  for (const entry of q.waiting) {
    const quote = quoteProject(projected, entry.project)
    result.set(entry.sequence, quote)
    if (!quote.blocker && !quote.obsolete)
      completeProject(projected, entry.project)
  }
  return result
}
export function nextExpansion(
  state: GameState,
  id: import('./ids').BuildingId,
  form = state.facilities[id].form,
): Project {
  const targets = allEntries(state).flatMap((e) =>
    e.project.kind === 'expand' && e.project.id === id
      ? [e.project.target]
      : [],
  )
  let target = state.facilities[id].level + 1
  while (targets.includes(target)) target++
  return {
    kind: 'expand',
    id,
    target,
    form,
  }
}
export function nextEquipment(
  state: GameState,
  id: import('./ids').BuildingId,
): Project {
  const targets = allEntries(state).flatMap((e) =>
    e.project.kind === 'equip' && e.project.id === id ? [e.project.target] : [],
  )
  let target = state.facilities[id].equipment + 1
  while (targets.includes(target)) target++
  return {
    kind: 'equip',
    id,
    target,
  }
}
export function researchPlan(state: GameState) {
  const projected = structuredClone(state)
  for (const entry of allEntries(state))
    if (entry.project.kind === 'research')
      completeProject(projected, entry.project)
  return projected
}
export function constructionPlan(state: GameState) {
  const projected = researchPlan(state)
  const q = state.queues.construction
  for (const entry of [...(q.active ? [q.active] : []), ...q.waiting]) {
    const quote = quoteProject(projected, entry.project)
    if (!quote.blocker && !quote.obsolete)
      completeProject(projected, entry.project)
  }
  return projected
}
export function previewProject(state: GameState, project: Project) {
  return quoteProject(constructionPlan(state), project)
}
export function researchVisible(
  state: GameState,
  id: import('./ids').ResearchId,
) {
  const def = RESEARCH[id]
  return (
    !hasResearch(state, id) &&
    (!def.branch ||
      !state.specialization ||
      def.branch === state.specialization) &&
    !requirementBlocker(researchPlan(state), def.requires)
  )
}
export function researchUpgradeVisible(
  state: GameState,
  id: import('./ids').ResearchId,
) {
  const def = RESEARCH[id],
    level = researchLevel(state, id),
    upgrade = def.upgrade
  if (!upgrade || level < 1 || level >= upgrade.maxLevel) return false
  const target = level + 1
  if (
    allEntries(state).some(
      (entry) =>
        entry.project.kind === 'research' &&
        entry.project.id === id &&
        (entry.project.target ?? 1) >= target,
    )
  )
    return false
  return !requirementBlocker(researchPlan(state), upgrade.requires)
}
export function completedTechnologies(state: GameState) {
  return RESEARCH_IDS.filter((id) => hasResearch(state, id)).length
}
