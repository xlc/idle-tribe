import { Card } from '@radix-ui/themes'
import { formatResource } from '../format'
import type { GameSession } from '../session'
import {
  happinessTarget,
  happinessUnlocked,
  housingCapacity,
} from '../settlement'

export function StatsView({ session }: { session: GameSession }) {
  const state = session.game.state
  const population = state.people.length
  const target = happinessTarget(state)
  return (
    <div className="stats">
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
        <section className="stats-card" aria-label="Settlement statistics">
          <header className="people-summary">
            <strong>{population} population</strong>
            <span>{housingCapacity(state)} housing capacity</span>
          </header>
          <p className="stats-note">
            Population is shared automatically across the settlement. Food,
            housing, and buildings determine how much work the town can sustain.
          </p>
        </section>
      </Card>
    </div>
  )
}
