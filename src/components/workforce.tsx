import { formatResource } from '../format'
import type { GameSession } from '../session'
import {
  arrivalStatus,
  assigned,
  constructionSpeed,
  happinessTarget,
  happinessUnlocked,
  housingCapacity,
} from '../settlement'
import { ViewIcon } from './art'
import { ProgressBar, SectionDisclosure } from './common'
import { WorkerControls } from './worker-controls'

export function Workforce({ session }: { session: GameSession }) {
  const s = session.game.state,
    arrival = arrivalStatus(s),
    target = happinessTarget(s),
    capacity = housingCapacity(s),
    spaceMessage =
      capacity > s.people.length
        ? `${capacity - s.people.length} available space${capacity - s.people.length === 1 ? '' : 's'}`
        : capacity === s.people.length
          ? 'Housing full'
          : `${s.people.length - capacity} over housing capacity`
  return (
    <SectionDisclosure
      className="workforce-section"
      title={
        <>
          <ViewIcon name="people" />
          Population
        </>
      }
      status={`${s.people.length} people · ${assigned(s, 'idle')} unassigned`}
      ariaLabel="Population"
    >
      <section className="workforce-bar" aria-label="Population">
        <div>
          <div className="happiness-status" data-visible={happinessUnlocked(s)}>
            <span>
              Happiness {formatResource(s.happiness)} · target{' '}
              {formatResource(target)}
            </span>
            <span className="status-meter happiness-meter">
              <meter
                min={0}
                max={100}
                value={s.happiness}
                aria-label="Happiness"
                aria-valuetext={`${formatResource(s.happiness)}, target ${formatResource(target)}`}
              />
              <span className="meter-marker" style={{ left: `${target}%` }} />
            </span>
          </div>
        </div>
        <details className="arrival-details">
          <summary>Arrivals & housing</summary>
          <p>
            {s.people.length}/{capacity} people · {spaceMessage}
          </p>
          <div className="arrival-control">
            <label>
              <input
                className="checkbox"
                type="checkbox"
                checked={s.welcome}
                onChange={() =>
                  session.change(() => {
                    s.welcome = !s.welcome
                  })
                }
              />{' '}
              Welcome arrivals
            </label>
            <small>
              {arrival.blocker ||
                `Next arrival · ${Math.ceil((1 - s.arrivalProgress) * arrival.interval)}m`}
            </small>
            <small className="arrival-supply">
              Food {formatResource(arrival.foodOutput / 60)} /{' '}
              {formatResource(arrival.required / 60)} per second
            </small>
            <ProgressBar
              value={s.arrivalProgress}
              max={1}
              label="Arrival progress"
            />
          </div>
        </details>
      </section>
    </SectionDisclosure>
  )
}
export function Builders({ session }: { session: GameSession }) {
  const s = session.game.state,
    speed = constructionSpeed(s)
  return (
    <section className="builders">
      <div>
        <h3>Builders</h3>
        <p>{formatResource(speed / 60)} work/s</p>
      </div>
      <WorkerControls session={session} job="builder" />
    </section>
  )
}
