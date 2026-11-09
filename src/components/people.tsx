import { Card, Flex } from '@radix-ui/themes'
import { JOBS } from '../definitions'
import { formatResource } from '../format'
import { isWorkingJob, JOB_IDS, type WorkingJob } from '../ids'
import type { GameSession } from '../session'
import {
  assigned,
  availablePeople,
  happinessMultiplier,
  happinessTarget,
  happinessUnlocked,
  jobCapacity,
  jobUnlocked,
  prestigeMultiplier,
  staffingMultiplier,
} from '../settlement'
import type { GameState, JobId } from '../types'
import { Button } from './common'

function jobOutput(state: GameState, job: JobId) {
  if (!isWorkingJob(job)) return 'Unassigned'
  const workingJob = job as WorkingJob
  return `${formatResource(staffingMultiplier(state, workingJob) * happinessMultiplier(state) * prestigeMultiplier(state))} work/s`
}

export function PeopleView({ session }: { session: GameSession }) {
  const state = session.game.state
  const target = happinessTarget(state)
  const jobs = JOB_IDS.filter(
    (job): job is JobId => isWorkingJob(job) && jobUnlocked(state, job),
  )
  const idle = availablePeople(state)
  return (
    <div className="people">
      {happinessUnlocked(state) && (
        <Card asChild>
          <section className="happiness-stat" aria-label="Happiness">
            <span className="stat-label">Happiness</span>
            <strong className="stat-value">
              {formatResource(state.happiness)}
            </strong>
            <span className="stat-caption">
              target {formatResource(target)}
            </span>
            <meter
              min={0}
              max={100}
              value={state.happiness}
              aria-label="Happiness"
            />
          </section>
        </Card>
      )}
      <Card asChild>
        <section className="people-roster" aria-label="Workforce">
          <header className="people-summary">
            <strong>{state.people.length} population</strong>
            <span>
              {idle} available · {state.people.length - idle} occupied
            </span>
          </header>
          {jobs.map((job) => {
            const workingJob = job as WorkingJob
            const count = assigned(state, job)
            const capacity = jobCapacity(state, job)
            return (
              <article
                className="person-row"
                key={job}
                aria-label={JOBS[workingJob].name}
              >
                <div className="person-main">
                  <p className="person-title">
                    <strong>{JOBS[workingJob as WorkingJob].name}</strong>
                  </p>
                  <p className="person-status">
                    <span>
                      {count} / {capacity} assigned
                    </span>
                    <span> · {jobOutput(state, job)}</span>
                  </p>
                </div>
                <Flex gap="1" align="center">
                  <Button
                    variant="soft"
                    aria-label={`Remove ${JOBS[workingJob as WorkingJob].name}`}
                    disabled={count === 0}
                    onClick={() =>
                      session.change(() => session.game.adjust(job, -1))
                    }
                  >
                    −
                  </Button>
                  <Button
                    variant="soft"
                    aria-label={`Assign ${JOBS[workingJob as WorkingJob].name}`}
                    disabled={count >= capacity || idle === 0}
                    onClick={() =>
                      session.change(() => session.game.adjust(job, 1))
                    }
                  >
                    +
                  </Button>
                </Flex>
              </article>
            )
          })}
        </section>
      </Card>
    </div>
  )
}
