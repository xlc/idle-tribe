import { RESOURCE_INFO } from '../constants'
import { isProductionJob, JOBS, OCCUPATIONS } from '../economy'
import { feastCost } from '../food'
import { formatDuration, formatResource } from '../format'
import { isWorkingJob, JOB_IDS, WORKING_JOB_IDS } from '../ids'
import type { GameSession } from '../session'
import {
  happinessMultiplier,
  jobUnlocked,
  prestigeMultiplier,
  staffingMultiplier,
  workerRate,
} from '../settlement'
import {
  expertiseBonus,
  expertiseLevel,
  practiceThreshold,
  workContribution,
} from '../skills'
import type { GameState, Person } from '../types'
import { Button } from './common'

function output(state: GameState, person: Person) {
  const job = person.job
  if (!isWorkingJob(job)) return 'Available'
  if (isProductionJob(job))
    return `${formatResource(workerRate(state, person))} ${RESOURCE_INFO[JOBS[job].output].name.toLowerCase()}/min`
  const rate =
    workContribution(person, job) *
    staffingMultiplier(state, job) *
    happinessMultiplier(state) *
    prestigeMultiplier(state)
  return `${formatResource(rate)} work/min${state.queues.construction.active ? '' : ' · Waiting'}`
}

export function People({ session }: { session: GameSession }) {
  const s = session.game.state,
    cost = feastCost(s)
  return (
    <details className="people">
      <summary>People · {s.people.length}</summary>
      {cost > 0 && (
        <div className="feast-row">
          <Button
            title="An entire settlement briefly agrees on what to do next."
            disabled={s.resources.food < cost}
            onClick={() => session.change(() => session.game.feast())}
          >
            Feast · {cost} food
          </Button>
        </div>
      )}
      {s.people.map((p, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: People are append-only during a run; roster positions are their stable identity.
        <article className="person-row" key={i} aria-label={p.name}>
          <label>
            <strong>{p.name}</strong>
            <span className="person-health">♥ {p.health}/5</span>
            <select
              className="select select-sm"
              value={p.job}
              aria-label={`${p.name} occupation`}
              onChange={(e) => {
                const job = JOB_IDS.find((id) => id === e.target.value)
                if (job) session.change(() => session.game.assign(i, job))
              }}
            >
              {JOB_IDS.filter((job) => jobUnlocked(s, job)).map((job) => (
                <option key={job} value={job}>
                  {isWorkingJob(job)
                    ? `${OCCUPATIONS[job].name} · level ${expertiseLevel(p.practice[job])}`
                    : 'Available'}
                </option>
              ))}
            </select>
          </label>
          {isWorkingJob(p.job) && (
            <p className="person-output">{output(s, p)}</p>
          )}
          <p
            className="person-aptitude"
            title="Adds 5% personal work in this occupation, subject to staffing efficiency."
          >
            {OCCUPATIONS[p.aptitude].aptitude} aptitude · +5%
          </p>
          <details className="person-expertise">
            <summary>
              Expertise
              {isWorkingJob(p.job)
                ? ` · ${expertiseLevel(p.practice[p.job]) === 1 ? 'Practiced · ' : ''}level ${expertiseLevel(p.practice[p.job])}`
                : ''}
            </summary>
            {WORKING_JOB_IDS.filter(
              (job) => p.practice[job] > 0 || job === p.job,
            ).map((job) => {
              const seconds = p.practice[job],
                level = expertiseLevel(seconds),
                start = practiceThreshold(level),
                next = practiceThreshold(level + 1)
              return (
                <div className="occupation-practice" key={job}>
                  <span>
                    {OCCUPATIONS[job].aptitude} · level {level}
                  </span>
                  <small>
                    +{formatResource(expertiseBonus(seconds) * 100)}% expertise
                  </small>
                  <progress
                    className="progress"
                    aria-label={`${OCCUPATIONS[job].aptitude} practice`}
                    value={Math.max(0, seconds - start)}
                    max={next - start}
                  />
                  <small>
                    {formatDuration(seconds)} / {formatDuration(next)} practice
                  </small>
                </div>
              )
            })}
            <p className="practice-note">
              Learn through supported work. Experience stays when changing jobs.
            </p>
          </details>
        </article>
      ))}
    </details>
  )
}
