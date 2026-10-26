import { BUILDINGS } from './buildings'
import { MIN_VISIBLE_RESOURCE_CHANGE, RESOURCE_INFO } from './constants'
import { formatCompactResource } from './format'
import { BUILDING_IDS, RESEARCH_IDS, RESOURCES, WORKING_JOB_IDS } from './ids'
import { createRecord } from './records'
import { RESEARCH } from './research-definitions'
import { advanceTime } from './simulation'
import { expertiseLevel } from './skills'
import type { GameState, ResourceId } from './types'
export function offlineWindow(state: GameState) {
  let hours = 8 + (state.legacy.perks['longer-preparations'] ? 2 : 0)
  for (const id of BUILDING_IDS)
    hours +=
      ((BUILDINGS[id].offlineHours ?? 0) +
        (BUILDINGS[id].forms[state.facilities[id].form]?.offlineHours ?? 0)) *
      Math.sqrt(state.facilities[id].level)
  for (const id of RESEARCH_IDS)
    if (state.research[id]) hours += RESEARCH[id].effects.offlineHours ?? 0
  return hours
}
export function effectiveOfflineSeconds(
  wallSeconds: number,
  windowHours: number,
) {
  const b = windowHours * 3600,
    t = Math.max(0, wallSeconds)
  return t <= b ? t : b * (2 * Math.sqrt(t / b) - 1)
}
export function beginAbsence(state: GameState, time: number) {
  if (state.manual) state.manual.repeat = false
  if (state.absence) return
  state.absence = {
    start: time,
    windowHours: offlineWindow(state),
    settledSeconds: 0,
    resources: { ...state.resources },
    population: state.people.length,
    expertise: state.people.map((p) =>
      createRecord(WORKING_JOB_IDS, (job) => expertiseLevel(p.practice[job])),
    ),
    completed: state.completedProjects,
  }
}
export function settleAbsence(state: GameState, time: number) {
  const a = state.absence
  if (!a) return null
  const wall = Math.max(0, (time - a.start) / 1000),
    effective = effectiveOfflineSeconds(wall, a.windowHours)
  advanceTime(state, Math.max(0, effective - a.settledSeconds))
  a.settledSeconds = Math.max(a.settledSeconds, effective)
  state.savedAt = Math.max(state.savedAt, time)
  return {
    wallSeconds: wall,
    effectiveSeconds: a.settledSeconds,
    gains: createRecord(RESOURCES, (r) => state.resources[r] - a.resources[r]),
    arrivals: state.people.length - a.population,
    completed: state.completedProjects - a.completed,
    expertise: state.people.flatMap((person, index) => {
      const gains = WORKING_JOB_IDS.flatMap((job) => {
        const before = a.expertise[index]?.[job] ?? 0
        const after = expertiseLevel(person.practice[job])
        return after > before ? [{ job, before, after }] : []
      })
      return gains.length ? [{ index, name: person.name, gains }] : []
    }),
  }
}
export type AwayProgress = NonNullable<ReturnType<typeof settleAbsence>>
export function awaySummary(report: AwayProgress) {
  return `${report.arrivals} ${report.arrivals === 1 ? 'arrival' : 'arrivals'} · ${report.completed} ${report.completed === 1 ? 'project' : 'projects'} completed`
}

export function awayHighlight(report: AwayProgress) {
  const milestones = [
    ...(report.completed
      ? [
          `${report.completed} ${report.completed === 1 ? 'project' : 'projects'} completed`,
        ]
      : []),
    ...(report.arrivals
      ? [
          `${report.arrivals} ${report.arrivals === 1 ? 'new settler' : 'new settlers'}`,
        ]
      : []),
  ]
  if (milestones.length) return milestones.join(' · ')
  const levels = report.expertise.reduce(
    (total, person) =>
      total +
      person.gains.reduce((sum, gain) => sum + gain.after - gain.before, 0),
    0,
  )
  if (levels) return `+${levels} expertise ${levels === 1 ? 'level' : 'levels'}`
  const best = RESOURCES.reduce<ResourceId | null>(
    (chosen, r) =>
      report.gains[r] >
      Math.max(MIN_VISIBLE_RESOURCE_CHANGE, chosen ? report.gains[chosen] : 0)
        ? r
        : chosen,
    null,
  )
  return best
    ? `+${formatCompactResource(report.gains[best])} ${RESOURCE_INFO[best].name.toLowerCase()}`
    : 'Settlement saved'
}
