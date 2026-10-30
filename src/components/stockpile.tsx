import { Card } from '@radix-ui/themes'
import { EPSILON, MIN_VISIBLE_RESOURCE_CHANGE } from '../constants'
import { ACTIONS, BUILDINGS, JOBS, RESOURCE_INFO } from '../definitions'
import { formatCompactResource, formatResource } from '../format'
import { ACTION_IDS, BUILDING_IDS, RESOURCES } from '../ids'
import { isProductionJob } from '../jobs'
import { storageCapacity, storageFull } from '../resources'
import type { GameSession } from '../session'
import { requirementBlocker } from '../settlement'
import { resourceFlows } from '../simulation'
import type { ResourceId } from '../types'
import { ResourceArt } from './art'

export function Stockpile({ session }: { session: GameSession }) {
  const s = session.game.state,
    flows = resourceFlows(s)
  const visibleResources = RESOURCES.filter(
    (r) =>
      ACTION_IDS.some(
        (id) => ACTIONS[id].resource === r && ACTIONS[id].visible(s),
      ) ||
      s.resources[r] > 0 ||
      BUILDING_IDS.some(
        (id) =>
          BUILDINGS[id].job &&
          isProductionJob(BUILDINGS[id].job) &&
          JOBS[BUILDINGS[id].job].output === r &&
          !requirementBlocker(s, BUILDINGS[id].forms[0]?.requires ?? {}),
      ),
  )
  const foodNet = flows.food.production - flows.food.inputs - flows.food.meals
  const foodShortage =
    flows.food.meals > 0 &&
    foodNet < -EPSILON &&
    s.resources.food + EPSILON < flows.food.meals
  function resource(r: ResourceId) {
    const capacity = storageCapacity(s, r),
      full = storageFull(s, r),
      flow = flows[r],
      net = flow.production - flow.inputs - flow.meals,
      effectiveNet = full && net > 0 ? 0 : net,
      rate =
        Math.abs(effectiveNet) < MIN_VISIBLE_RESOURCE_CHANGE
          ? 0
          : effectiveNet / 60,
      warning = r === 'food' && foodShortage
    return (
      <section
        className="resource"
        data-warning={warning}
        aria-label={`${RESOURCE_INFO[r].name} resource, ${formatResource(s.resources[r])} of ${formatResource(capacity)} storage${full ? ', full' : ''}${warning ? ', starving, health at risk' : ''}`}
        title={
          warning
            ? 'Starving · health at risk'
            : `Storage ${formatResource(s.resources[r])} of ${formatResource(capacity)}${full ? ' · full' : ''}`
        }
        key={r}
      >
        <ResourceArt resource={r} />
        <span className="resource-name">{RESOURCE_INFO[r].name}</span>
        {warning && (
          <span className="resource-warning-marker" aria-hidden="true">
            !
          </span>
        )}
        <strong className="resource-value">
          {formatCompactResource(s.resources[r])}
        </strong>
        <div className="resource-meta">
          <span
            className="resource-rate"
            data-negative={rate < 0}
            data-zero={rate === 0}
          >
            {rate > 0 ? '+' : ''}
            {formatCompactResource(rate)}/s
          </span>
          <small className="storage-capacity" data-full={full}>
            Cap {formatResource(capacity)}
          </small>
        </div>
      </section>
    )
  }
  return (
    <Card asChild>
      <section className="stockpile-panel" aria-label="Stockpile">
        <div className="stockpile" id="stockpile-resources">
          {visibleResources.map(resource)}
        </div>
      </section>
    </Card>
  )
}
