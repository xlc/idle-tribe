import { JOBS } from './definitions'
import { isActionJob, type JobId, type ProductionJob } from './ids'
import type { Cost, ResourceId } from './types'

export function isProductionJob(job: JobId): job is ProductionJob {
  return job !== 'idle' && job !== 'builder' && !isActionJob(job)
}

// Every production job defines a recipe; the other jobs do not.
export function jobRecipe(job: ProductionJob): {
  output: ResourceId
  input: Cost
} {
  return JOBS[job] as { output: ResourceId; input: Cost }
}
