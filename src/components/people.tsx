import { ACTIONS, actionOutputRate, actionWorkers } from '../actions'
import { RESOURCE_INFO } from '../constants'
import { isProductionJob, JOBS, OCCUPATIONS } from '../economy'
import { feastCost } from '../food'
import { formatDuration, formatResource } from '../format'
import { ACTION_IDS, isWorkingJob, JOB_IDS, WORKING_JOB_IDS } from '../ids'
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
  if (!isWorkingJob(job)) return 'Unassigned'
  const action = ACTION_IDS.find((id) => ACTIONS[id].job === job)
  if (action) {
    const def = ACTIONS[action],
      workers = actionWorkers(state, action)
    return def.resource
      ? `${formatResource(workers ? (actionOutputRate(state, action) / workers) * 60 : 0)} ${RESOURCE_INFO[def.resource].name.toLowerCase()}/min`
      : `Works ${def.name.toLowerCase()}`
  }
  if (isProductionJob(job))
    return `${formatResource(workerRate(state, person))} ${RESOURCE_INFO[JOBS[job].output].name.toLowerCase()}/min`
  const rate =
    workContribution(person, job) *
    staffingMultiplier(state, job) *
    happinessMultiplier(state) *
    prestigeMultiplier(state)
  return `${formatResource(rate)} work/min`
}

export function People({ session }: { session: GameSession }) {
  const s = session.game.state,
    cost = feastCost(s),
    occupations = JOB_IDS.filter((job) => jobUnlocked(s, job))
  return (
    <section className="people" aria-label="People">
      <div className="section-heading people-heading">
        <h2>
          People <span>· {s.people.length}</span>
        </h2>
        <Button
          className="feast-button"
          data-missing={cost > 0 && s.resources.food < cost}
          disabled={!cost || s.resources.food < cost}
          onClick={() => session.change(() => session.game.feast())}
        >
          {cost > 0 ? `Feast · ${cost} food` : 'Full health'}
        </Button>
      </div>
      <div className="people-grid panel">
        {s.people.map((p, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: People are append-only during a run; roster positions are their stable identity.
          <article className="person-row" key={i} aria-label={p.name}>
            <div className="person-heading">
              <strong>{p.name}</strong>
              <span
                className="person-health"
                role="img"
                aria-label={`${p.name} health: ${p.health} of 5`}
                data-low={p.health <= 2}
              >
                {[1, 2, 3, 4, 5].map((point) => (
                  <span
                    key={point}
                    aria-hidden="true"
                    data-filled={point <= p.health}
                  >
                    {point <= p.health ? '♥' : '♡'}
                  </span>
                ))}
              </span>
            </div>
            {occupations.length > 1 && (
              <label className="person-occupation">
                <span>Occupation</span>
                <select
                  className="select"
                  value={p.job}
                  aria-label={`${p.name} occupation`}
                  onChange={(e) => {
                    const job = JOB_IDS.find((id) => id === e.target.value)
                    if (job) session.change(() => session.game.assign(i, job))
                  }}
                >
                  {occupations.map((job) => (
                    <option key={job} value={job}>
                      {!isWorkingJob(job)
                        ? 'Unassigned'
                        : `${OCCUPATIONS[job].name} · level ${expertiseLevel(p.practice[job])}`}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {isWorkingJob(p.job) && (
              <p className="person-output">{output(s, p)}</p>
            )}
            <p className="person-aptitude">
              {OCCUPATIONS[p.aptitude].aptitude} aptitude · +5%
            </p>
            {WORKING_JOB_IDS.some(
              (job) => p.practice[job] > 0 || job === p.job,
            ) && (
              <details className="person-expertise">
                <summary>
                  Expertise
                  {isWorkingJob(p.job)
                    ? ` · level ${expertiseLevel(p.practice[p.job])}`
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
                        +{formatResource(expertiseBonus(seconds) * 100)}%
                        expertise
                      </small>
                      <progress
                        className="progress"
                        aria-label={`${OCCUPATIONS[job].aptitude} practice`}
                        value={Math.max(0, seconds - start)}
                        max={next - start}
                      />
                      <small>
                        {formatDuration(seconds)} / {formatDuration(next)}
                      </small>
                    </div>
                  )
                })}
              </details>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
