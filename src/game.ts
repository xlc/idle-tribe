import {
  cancelManual,
  resolveEncounter,
  startAction,
  syncUnlocks,
} from './actions'
import { BUILDINGS } from './definitions'
import { feast } from './food'
import {
  cancelProject,
  enqueue,
  moveProject,
  nextEquipment,
  nextExpansion,
} from './research'
import { adjustWorkers, assignJob, fillWorkers } from './settlement'
import { advanceTime } from './simulation'
import type {
  BuildingId,
  EncounterOptionIndex,
  GameState,
  JobId,
  Project,
  QueueId,
} from './types'
export function removeFacility(state: GameState, id: BuildingId) {
  const f = state.facilities[id],
    active = state.queues.construction.active
  if (!f.level || active?.project.id === id) return false
  const job = BUILDINGS[id].job
  if (job)
    for (const p of state.people)
      if (p.job === job) {
        p.job = 'idle'
        p.progress = 0
      }
  state.facilities[id] = { level: 0, form: 0, equipment: 0 }
  return true
}
export function createGame(state: GameState) {
  syncUnlocks(state)
  return {
    state,
    advanceTime: (seconds: number, visible = false) =>
      advanceTime(state, seconds, visible),
    enqueue: (project: Project) => enqueue(state, project),
    build: (id: BuildingId, form = state.facilities[id].form) =>
      enqueue(state, nextExpansion(state, id, form)),
    equip: (id: BuildingId) => enqueue(state, nextEquipment(state, id)),
    convert: (id: BuildingId, form: number) =>
      enqueue(state, { kind: 'convert', id, form }),
    remove: (id: BuildingId) => removeFacility(state, id),
    cancel: (id: QueueId, seq: number) => cancelProject(state, id, seq),
    move: (id: QueueId, seq: number, direction: number) =>
      moveProject(state, id, seq, direction),
    assign: (index: number, job: JobId) => assignJob(state, index, job),
    adjust: (job: JobId, n: number) => adjustWorkers(state, job, n),
    fill: (job: JobId) => fillWorkers(state, job),
    startAction: (id: import('./ids').ActionId) => startAction(state, id),
    cancelAction: () => cancelManual(state),
    resolveEncounter: (option: EncounterOptionIndex) =>
      resolveEncounter(state, option),
    feast: () => feast(state),
  }
}
export type Game = ReturnType<typeof createGame>
