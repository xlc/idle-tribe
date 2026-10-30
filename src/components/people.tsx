import { Card, Select } from '@radix-ui/themes'
import { actionOutputRate, actionWorkers } from '../actions'
import { ACTIONS, JOBS, OCCUPATIONS, RESOURCE_INFO } from '../definitions'
import { formatDuration, formatResource } from '../format'
import { ACTION_IDS, isWorkingJob, JOB_IDS, WORKING_JOB_IDS } from '../ids'
import { isProductionJob } from '../jobs'
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
import { ViewIcon } from './art'
import { ProgressBar, SectionDisclosure } from './common'

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter((letter): letter is string => Boolean(letter))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function output(state: GameState, person: Person) {
  const job = person.job
  if (!isWorkingJob(job)) return 'Unassigned'
  const action = ACTION_IDS.find((id) => ACTIONS[id].job === job)
  if (action) {
    const def = ACTIONS[action],
      workers = actionWorkers(state, action)
    return def.resource
      ? `${formatResource(workers ? actionOutputRate(state, action) / workers : 0)} ${RESOURCE_INFO[def.resource].name.toLowerCase()}/s`
      : `Works ${def.name.toLowerCase()}`
  }
  if (isProductionJob(job)) {
    return `${formatResource(workerRate(state, person) / 60)} ${RESOURCE_INFO[JOBS[job].output].name.toLowerCase()}/s`
  }
  const rate =
    workContribution(person, job) *
    staffingMultiplier(state, job) *
    happinessMultiplier(state) *
    prestigeMultiplier(state)
  return `${formatResource(rate / 60)} work/s`
}

export function People({ session }: { session: GameSession }) {
  const s = session.game.state,
    occupations = JOB_IDS.filter((job) => jobUnlocked(s, job))
  return (
    <SectionDisclosure
      className="people"
      title={
        <>
          <ViewIcon name="people" />
          People
        </>
      }
      status={`· ${s.people.length}`}
      ariaLabel="People"
    >
      <Card asChild>
        <div className="people-grid">
          {s.people.map((p, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: People are append-only during a run; roster positions are their stable identity.
            <article className="person-card" key={i} aria-label={p.name}>
              <div className="person-heading">
                <div className="person-identity">
                  <span className="person-avatar" aria-hidden="true">
                    {initials(p.name)}
                  </span>
                  <div className="person-name-block">
                    <strong>{p.name}</strong>
                    <span className="person-role">
                      {isWorkingJob(p.job)
                        ? OCCUPATIONS[p.job].name
                        : 'Available for assignment'}
                    </span>
                  </div>
                </div>
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
              <label
                className="person-occupation"
                htmlFor={`occupation-${i}`}
                data-visible={occupations.length > 1}
              >
                <span className="person-field-label">Assign occupation</span>
                <Select.Root
                  value={p.job}
                  size="2"
                  onValueChange={(value) => {
                    const job = JOB_IDS.find((id) => id === value)
                    if (job) session.change(() => session.game.assign(i, job))
                  }}
                >
                  <Select.Trigger
                    id={`occupation-${i}`}
                    aria-label={`${p.name} occupation`}
                  />
                  <Select.Content>
                    {occupations.map((job) => (
                      <Select.Item key={job} value={job}>
                        {!isWorkingJob(job)
                          ? 'Unassigned'
                          : `${OCCUPATIONS[job].name} · level ${expertiseLevel(p.practice[job])}`}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </label>
              <div className="person-meta">
                <p className="person-output">
                  {isWorkingJob(p.job) ? output(s, p) : 'Ready for assignment'}
                </p>
                <p className="person-aptitude">
                  {OCCUPATIONS[p.aptitude].aptitude} aptitude · +5%
                </p>
              </div>
              <details
                className="person-expertise"
                data-visible={WORKING_JOB_IDS.some(
                  (job) => p.practice[job] > 0 || job === p.job,
                )}
              >
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
                      <ProgressBar
                        value={Math.max(0, seconds - start)}
                        max={next - start}
                        label={`${OCCUPATIONS[job].aptitude} practice`}
                      />
                      <small>
                        {formatDuration(seconds)} / {formatDuration(next)}
                      </small>
                    </div>
                  )
                })}
              </details>
            </article>
          ))}
        </div>
      </Card>
    </SectionDisclosure>
  )
}
