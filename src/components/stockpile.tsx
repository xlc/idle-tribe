import { useRef, useState } from 'react'
import { ACTIONS } from '../actions'
import { BUILDINGS } from '../buildings'
import { MIN_VISIBLE_RESOURCE_CHANGE, RESOURCE_INFO } from '../constants'
import { formatCompactResource, formatResource } from '../format'
import { ACTION_IDS, BUILDING_IDS, RESOURCES } from '../ids'
import { isProductionJob, JOBS } from '../jobs'
import {
  loadResourcePins,
  MAX_RESOURCE_PINS,
  saveResourcePins,
} from '../preferences'
import { storageMultiplier } from '../resources'
import type { GameSession } from '../session'
import { requirementBlocker } from '../settlement'
import { resourceFlows } from '../simulation'
import type { ResourceId } from '../types'
import { ResourceArt } from './art'
import { Button } from './common'

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
  const [pins, setPins] = useState(loadResourcePins)
  const picker = useRef<HTMLDialogElement>(null)
  const visiblePins = pins.filter((r) => visibleResources.includes(r))
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
      <div className="stockpile-bar">
        <div
          className="stockpile"
          id="stockpile-resources"
          data-pinned={visiblePins.length > 0}
        >
          {(visiblePins.length ? visiblePins : visibleResources).map(resource)}
        </div>
        <button
          type="button"
          className="resource-picker"
          aria-label="All resources and pins"
          onClick={() => picker.current?.showModal()}
        >
          <span aria-hidden="true">≡</span>
        </button>
      </div>
      <dialog ref={picker} className="modal resource-dialog panel">
        <div className="modal-box">
          <h2>Resources</h2>
          <p className="resource-pin-count">
            Pinned · {visiblePins.length}/{MAX_RESOURCE_PINS}
          </p>
          <div className="resource-choices">
            {visibleResources.map((r) => (
              <div className="resource-choice" key={r}>
                <label className="resource-pin">
                  <input
                    type="checkbox"
                    aria-label={`Pin ${RESOURCE_INFO[r].name.toLowerCase()}`}
                    checked={visiblePins.includes(r)}
                    disabled={
                      !visiblePins.includes(r) &&
                      visiblePins.length >= MAX_RESOURCE_PINS
                    }
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...visiblePins, r]
                        : visiblePins.filter((pin) => pin !== r)
                      setPins(next)
                      saveResourcePins(next)
                    }}
                  />
                </label>
                {resource(r)}
              </div>
            ))}
          </div>
          <div className="modal-action">
            <Button onClick={() => picker.current?.close()}>Close</Button>
          </div>
        </div>
      </dialog>
    </section>
  )
}
