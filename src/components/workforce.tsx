import { formatResource } from '../format'
import type { GameSession } from '../session'
import {
  arrivalStatus,
  assigned,
  comfortablePlaces,
  constructionSpeed,
  happinessTarget,
  happinessUnlocked,
} from '../settlement'
import { ProgressBar } from './common'
import { WorkerControls } from './worker-controls'

export function Workforce({
  session,
  compact = false,
}: {
  session: GameSession
  compact?: boolean
}) {
  const s = session.game.state,
    arrival = arrivalStatus(s),
    target = happinessTarget(s),
    rooms = comfortablePlaces(s),
    roomMessage =
      rooms > s.people.length
        ? `${rooms - s.people.length} free room${rooms - s.people.length === 1 ? '' : 's'}`
        : rooms === s.people.length
          ? 'No free rooms'
          : `${s.people.length - rooms} over room capacity`
  return (
    <section
      className={`workforce-bar${compact ? ' workforce-compact' : ''}`}
      aria-label="Population"
    >
      <div>
        <h2>{s.people.length} people</h2>
        <p>{assigned(s, 'idle')} unassigned</p>
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
          {s.people.length}/{rooms} people · {roomMessage}
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
