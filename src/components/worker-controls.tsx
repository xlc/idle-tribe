import { formatResource } from '../format'
import { isWorkingJob } from '../ids'
import type { GameSession } from '../session'
import {
  assigned,
  jobCapacity,
  jobUnlocked,
  staffingMultiplier,
} from '../settlement'
import type { JobId } from '../types'
import { Button } from './common'

export function WorkerControls({
  session,
  job,
  assignable = true,
}: {
  session: GameSession
  job: JobId
  assignable?: boolean
}) {
  const s = session.game.state,
    n = assigned(s, job),
    cap = jobCapacity(s, job),
    available = assigned(s, 'idle')
  return (
    <div className="worker-allocation">
      <fieldset className="worker-control" aria-label={`${job} staffing`}>
        <Button
          disabled={!n}
          onClick={() => session.change(() => session.game.adjust(job, -1))}
        >
          −
        </Button>
        <output className="worker-count">{n}</output>
        <Button
          disabled={!assignable || !available || !jobUnlocked(s, job)}
          onClick={() => session.change(() => session.game.adjust(job, 1))}
        >
          +
        </Button>
        <Button
          disabled={
            !assignable || !available || n >= cap || !jobUnlocked(s, job)
          }
          onClick={() => session.change(() => session.game.fill(job))}
        >
          Fill
        </Button>
      </fieldset>
      <small className="staffing-target">{cap} efficient</small>
      {n > 0 && isWorkingJob(job) && staffingMultiplier(s, job) < 1 && (
        <small className="staffing-efficiency">
          {formatResource(staffingMultiplier(s, job) * 100)}% efficiency
        </small>
      )}
    </div>
  )
}
