import { isActionJob, type JobId, type ProductionJob } from './ids'

export function isProductionJob(job: JobId): job is ProductionJob {
  return job !== 'idle' && job !== 'builder' && !isActionJob(job)
}
