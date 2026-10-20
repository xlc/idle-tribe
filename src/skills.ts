import { EPSILON } from './constants'
import { healthMultiplier } from './food'
import type { Person, WorkingJob } from './types'

export function practiceThreshold(level: number) {
  return 15 * 60 * level ** 2
}
export function expertiseLevel(seconds: number) {
  return Math.floor(Math.sqrt((seconds + EPSILON) / (15 * 60)))
}
export function expertiseBonus(seconds: number) {
  return 0.05 * Math.sqrt(expertiseLevel(seconds))
}
export function personalWork(person: Person, job: WorkingJob) {
  return (
    1 +
    expertiseBonus(person.practice[job]) +
    (person.aptitude === job ? 0.05 : 0)
  )
}
export function workContribution(
  person: Person,
  job: WorkingJob,
  health = healthMultiplier(person),
) {
  return health * personalWork(person, job)
}
