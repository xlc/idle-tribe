import { BUILDINGS, EQUIPMENT, RESEARCH } from './definitions'
import { RESEARCH_IDS, RESOURCES } from './ids'
import { hasResearch } from './research-effects'
import {
  canAfford,
  capital,
  difference,
  marginal,
  pay,
  refund,
} from './resources'
import {
  assignJob,
  constructionSpeed,
  firstIdlePerson,
  jobUnlocked,
  prestigeMultiplier,
  requirementBlocker,
} from './settlement'
import type { Cost, GameState, Project, ProjectSlot } from './types'

export function projectSlot(project: Project): ProjectSlot {
  return project.kind === 'research' ? 'research' : 'construction'
}

export function activeProjects(state: GameState) {
  return Object.values(state.projects).filter(
    (project): project is NonNullable<typeof project> => project !== null,
  )
}

export function projectName(_state: GameState, project: Project) {
  if (project.kind === 'research') {
    const level = project.target ?? 1
    return `${RESEARCH[project.id].name}${level > 1 ? ` · level ${level}` : ''}`
  }
  const name = BUILDINGS[project.id].name
  return `${name}${project.kind === 'equip' ? ` · tools ${project.target}` : ` · level ${project.target}`}`
}

export function quoteProject(
  state: GameState,
  project: Project,
): { cost: Cost; total: number; blocker: string; obsolete: boolean } {
  if (project.kind === 'research') {
    const def = RESEARCH[project.id],
      current = state.research[project.id],
      target = project.target ?? 1,
      upgrade = def.upgrade,
      isUpgrade = target > 1,
      scale = isUpgrade && upgrade ? upgrade.costMultiplier ** (target - 1) : 1,
      timeScale =
        isUpgrade && upgrade ? upgrade.timeMultiplier ** (target - 1) : 1
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
    f = state.facilities[project.id]
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
          ? 'Requires building'
          : f.equipment !== tier - 1
            ? `Requires tools ${tier - 1}`
            : requirementBlocker(state, { research: [milestone.research] }),
    }
  }
  const target = project.target
  return {
    cost: difference(capital(def.cost, target), capital(def.cost, target - 1)),
    total: def.work * marginal(target - 1),
    obsolete: f.level >= target || Boolean(def.unique && f.level),
    blocker:
      def.unique && target > 1
        ? 'Unique milestone'
        : f.level !== target - 1
          ? `Requires level ${target - 1}`
          : requirementBlocker(state, def.requires),
  }
}

// Surfaces why a build cannot start.
export function buildBlocker(state: GameState) {
  if (state.projects.construction) return 'Construction in progress'
  return constructionSpeed(state) > 0 ||
    (jobUnlocked(state, 'builder') && firstIdlePerson(state) >= 0)
    ? ''
    : 'No builders'
}

export function startProject(state: GameState, project: Project) {
  const normalized =
    project.kind === 'research' && project.target === undefined
      ? { ...project, target: 1 }
      : project
  const slot = projectSlot(normalized)
  if (state.projects[slot]) return false
  const quote = quoteProject(state, normalized)
  if (quote.obsolete || quote.blocker || !canAfford(state, quote.cost))
    return false
  if (normalized.kind === 'research') {
    const worker = firstIdlePerson(state)
    if (worker < 0) return false
    pay(state, quote.cost)
    state.projects.research = {
      project: normalized,
      paid: { ...quote.cost },
      progress: 0,
      total: quote.total,
      worker,
    }
    return true
  }
  if (!constructionSpeed(state)) {
    const person = firstIdlePerson(state)
    if (person < 0 || !assignJob(state, person, 'builder')) return false
  }
  pay(state, quote.cost)
  state.projects.construction = {
    project: normalized,
    paid: { ...quote.cost },
    progress: 0,
    total: quote.total,
  }
  return true
}

export function cancelProject(state: GameState, slot: ProjectSlot) {
  const active = state.projects[slot]
  if (!active) return false
  refund(state, active.paid)
  state.projects[slot] = null
  return true
}

export function completeProject(state: GameState, project: Project) {
  if (project.kind === 'research') {
    const def = RESEARCH[project.id],
      previous = state.research[project.id],
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
  } else {
    const f = state.facilities[project.id]
    if (project.kind === 'expand') f.level = project.target
    if (project.kind === 'equip') f.equipment = project.target
  }
}

export function nextExpansion(
  state: GameState,
  id: import('./ids').BuildingId,
): Project {
  const active = state.projects.construction?.project
  const target =
    active?.kind === 'expand' && active.id === id
      ? active.target + 1
      : state.facilities[id].level + 1
  return { kind: 'expand', id, target }
}

export function nextEquipment(
  state: GameState,
  id: import('./ids').BuildingId,
): Project {
  const active = state.projects.construction?.project
  const target =
    active?.kind === 'equip' && active.id === id
      ? active.target + 1
      : state.facilities[id].equipment + 1
  return { kind: 'equip', id, target }
}

export function researchPlan(state: GameState) {
  const projected = structuredClone(state)
  const active = projected.projects.research
  if (active) completeProject(projected, active.project)
  return projected
}

export function constructionPlan(state: GameState) {
  const projected = researchPlan(state)
  const active = projected.projects.construction
  if (active) completeProject(projected, active.project)
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
    !requirementBlocker(state, def.requires)
  )
}

export function researchUpgradeVisible(
  state: GameState,
  id: import('./ids').ResearchId,
) {
  const def = RESEARCH[id],
    level = state.research[id],
    upgrade = def.upgrade
  if (!upgrade || level < 1 || level >= upgrade.maxLevel) return false
  return !requirementBlocker(state, upgrade.requires)
}

export function completedTechnologies(state: GameState) {
  return RESEARCH_IDS.filter((id) => hasResearch(state, id)).length
}
