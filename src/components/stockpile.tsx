import { MIN_VISIBLE_RESOURCE_CHANGE } from '../constants'
import { ACTIONS, BUILDINGS, JOBS, RESOURCE_INFO } from '../definitions'
import { formatCompactResource, formatResource } from '../format'
import { ACTION_IDS, BUILDING_IDS, RESOURCES } from '../ids'
import { isProductionJob } from '../jobs'
import { storageMultiplier } from '../resources'
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
  function resource(r: ResourceId) {
    const pressure = storageMultiplier(s, r),
      flow = flows[r],
      net = flow.production - flow.inputs - flow.meals,
      rate = Math.abs(net) < MIN_VISIBLE_RESOURCE_CHANGE ? 0 : net
    return (
      <section
        className="resource"
        aria-label={`${RESOURCE_INFO[r].name} resource`}
        key={r}
      >
        <ResourceArt resource={r} />
        <span className="resource-name">{RESOURCE_INFO[r].name}</span>
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
            {formatCompactResource(rate)}/min
          </span>
          <small className="storage-effect" data-idle={pressure >= 1}>
            Storage ×{formatResource(pressure)}
          </small>
        </div>
      </section>
    )
  }
  return (
    <section className="stockpile-panel panel" aria-label="Stockpile">
      <div className="stockpile" id="stockpile-resources">
        {visibleResources.map(resource)}
      </div>
    </section>
  )
}
