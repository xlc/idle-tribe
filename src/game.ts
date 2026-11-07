import {
  cancelManual,
  resolveEncounter,
  startAction,
  syncUnlocks,
} from './actions'
import {
  cancelProject,
  nextEquipment,
  nextExpansion,
  startProject,
} from './research'
import { addResources } from './resources'
import {
  adjustWorkers,
  assignJob,
  buildingJobs,
  fillWorkers,
} from './settlement'
import { advanceTime } from './simulation'
import type {
  BuildingId,
  EncounterOptionIndex,
  GameState,
  JobId,
  Project,
  ProjectSlot,
} from './types'
export function removeFacility(state: GameState, id: BuildingId) {
  const f = state.facilities[id],
    active = state.projects.construction
  if (!f.level || active?.project.id === id) return false
  const jobs = buildingJobs(id)
  if (jobs.length)
    for (const p of state.people)
      if (jobs.includes(p.job)) {
        p.job = 'idle'
        p.progress = 0
      }
  state.facilities[id] = { level: 0, equipment: 0 }
  return true
}
export function createGame(state: GameState) {
  syncUnlocks(state)
  return {
    state,
    advanceTime: (seconds: number, visible = false) =>
      advanceTime(state, seconds, visible),
    start: (project: Project) => startProject(state, project),
    build: (id: BuildingId) => startProject(state, nextExpansion(state, id)),
    equip: (id: BuildingId) => startProject(state, nextEquipment(state, id)),
    remove: (id: BuildingId) => removeFacility(state, id),
    cancel: (slot: ProjectSlot) => cancelProject(state, slot),
    assign: (index: number, job: JobId) => assignJob(state, index, job),
    adjust: (job: JobId, n: number) => adjustWorkers(state, job, n),
    fill: (job: JobId) => fillWorkers(state, job),
    startAction: (id: import('./ids').ActionId) => startAction(state, id),
    cancelAction: (id?: import('./ids').ActionId) => cancelManual(state, id),
    grantResources: (amount: import('./types').Cost) =>
      addResources(state, amount),
    resolveEncounter: (option: EncounterOptionIndex) =>
      resolveEncounter(state, option),
  }
}
export type Game = ReturnType<typeof createGame>
