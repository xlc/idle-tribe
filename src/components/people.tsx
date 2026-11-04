import { Card, Select } from '@radix-ui/themes'
import { actionForJob, actionOutputRate, actionWorkers } from '../actions'
import { ACTIONS, JOBS, RESOURCE_INFO } from '../definitions'
import { formatDuration, formatResource } from '../format'
import {
  ACTION_IDS,
  type ActionId,
  isWorkingJob,
  JOB_IDS,
  WORKING_JOB_IDS,
} from '../ids'
import { isProductionJob, jobRecipe } from '../jobs'
import { projectName } from '../research'
import type { GameSession } from '../session'
import {
  busyWith,
  happinessMultiplier,
  happinessTarget,
  happinessUnlocked,
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
import { ProgressBar } from './common'

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter((letter): letter is string => Boolean(letter))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// Per-person output text; `workers` maps each action to its staffed count so
// the roster does not recount the workforce per row.
function output(
  state: GameState,
  person: Person,
  workers: ReadonlyMap<ActionId, number>,
) {
  const job = person.job
  if (!isWorkingJob(job)) return 'Ready for assignment'
  const action = actionForJob(job)
  if (action) {
    const def = ACTIONS[action],
      n = workers.get(action) ?? 0
    return def.resource
      ? `${formatResource(n ? actionOutputRate(state, action, { workers: n }) / n : 0)} ${RESOURCE_INFO[def.resource].name.toLowerCase()}/s`
      : `Works ${def.name.toLowerCase()}`
  }
  if (isProductionJob(job)) {
    return `${formatResource(workerRate(state, person) / 60)} ${RESOURCE_INFO[jobRecipe(job).output].name.toLowerCase()}/s`
  }
  const rate =
    workContribution(person, job) *
    staffingMultiplier(state, job) *
    happinessMultiplier(state) *
    prestigeMultiplier(state)
  return `${formatResource(rate / 60)} work/s`
}

function activity(state: GameState, index: number): string | null {
  const run = state.manual.find((m) => m.person === index)
  if (run) return ACTIONS[run.id].name
  const active = state.queues.research.active
  if (active?.worker === index)
    return `Researching ${projectName(state, active.project)}`
  return null
}

export function PeopleView({ session }: { session: GameSession }) {
  const s = session.game.state,
    target = happinessTarget(s),
    targetText = formatResource(target),
    unlocked = JOB_IDS.filter((job) => jobUnlocked(s, job)),
    workers = new Map(ACTION_IDS.map((id) => [id, actionWorkers(s, id)]))
  return (
    <div className="people">
      {happinessUnlocked(s) && (
        <Card asChild>
          <section className="happiness-stat" aria-label="Happiness">
            <span className="stat-label">Happiness</span>
            <strong className="stat-value">
              {formatResource(s.happiness)}
            </strong>
            <span className="stat-caption">target {targetText}</span>
            <span className="status-meter happiness-meter">
              <meter
                min={0}
                max={100}
                value={s.happiness}
                aria-label="Happiness"
                aria-valuetext={`${formatResource(s.happiness)}, target ${targetText}`}
              />
              <span className="meter-marker" style={{ left: `${target}%` }} />
            </span>
          </section>
        </Card>
      )}
      <Card asChild>
        <section className="people-roster" aria-label="Settlers">
          {s.people.map((p, i) => {
            const busy = busyWith(s, i),
              doing = busy ? activity(s, i) : null,
              // Health moves fractionally with per-tick meals; show whole hearts.
              health = Math.round(p.health)
            return (
              <article
                className="person-row"
                key={p.name}
                aria-label={p.name}
                data-busy={busy}
              >
                <span className="person-avatar" aria-hidden="true">
                  {initials(p.name)}
                </span>
                <div className="person-main">
                  <p className="person-title">
                    <strong>{p.name}</strong>
                    <span
                      className="person-health"
                      role="img"
                      aria-label={`${p.name} health: ${health} of 5`}
                      data-low={health <= 2}
                    >
                      {[1, 2, 3, 4, 5].map((point) => (
                        <span
                          key={point}
                          aria-hidden="true"
                          data-filled={point <= health}
                        >
                          {point <= health ? '♥' : '♡'}
                        </span>
                      ))}
                    </span>
                  </p>
                  <p className="person-status">
                    <span className="person-output">
                      {doing ?? output(s, p, workers)}
                    </span>
                    <span className="person-aptitude">
                      · {JOBS[p.aptitude].aptitude} aptitude
                    </span>
                  </p>
                  <details
                    className="person-expertise"
                    data-visible={WORKING_JOB_IDS.some(
                      (job) => p.practice[job] > 0 || job === p.job,
                    )}
                  >
                    <summary>Expertise</summary>
                    {WORKING_JOB_IDS.filter(
                      (job) => p.practice[job] > 0 || job === p.job,
                    ).map((job) => {
                      const seconds = p.practice[job],
                        level = expertiseLevel(seconds),
                        start = practiceThreshold(level),
                        next = practiceThreshold(level + 1)
                      return (
                        <div className="job-practice" key={job}>
                          <span>
                            {JOBS[job].aptitude} · level {level}
                          </span>
                          <small>
                            +{formatResource(expertiseBonus(seconds) * 100)}%
                            expertise
                          </small>
                          <ProgressBar
                            value={Math.max(0, seconds - start)}
                            max={next - start}
                            label={`${JOBS[job].aptitude} practice`}
                          />
                          <small>
                            {formatDuration(seconds)} / {formatDuration(next)}
                          </small>
                        </div>
                      )
                    })}
                  </details>
                </div>
                <div className="person-side" data-visible={unlocked.length > 1}>
                  <Select.Root
                    value={p.job}
                    size="2"
                    disabled={busy}
                    onValueChange={(value) => {
                      const job = JOB_IDS.find((id) => id === value)
                      if (job) session.change(() => session.game.assign(i, job))
                    }}
                  >
                    <Select.Trigger aria-label={`${p.name} job`} variant="soft">
                      {isWorkingJob(p.job) ? JOBS[p.job].name : 'Unassigned'}
                    </Select.Trigger>
                    <Select.Content>
                      {unlocked.map((job) => (
                        <Select.Item key={job} value={job}>
                          {!isWorkingJob(job)
                            ? 'Unassigned'
                            : `${JOBS[job].name} · level ${expertiseLevel(p.practice[job])}`}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
              </article>
            )
          })}
        </section>
      </Card>
    </div>
  )
}
