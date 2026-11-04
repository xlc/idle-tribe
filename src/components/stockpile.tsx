import { Card, Dialog, Flex } from '@radix-ui/themes'
import { useState } from 'react'
import { EPSILON, MIN_VISIBLE_RESOURCE_CHANGE } from '../constants'
import { ACTIONS, BUILDINGS, JOBS, RESOURCE_INFO } from '../definitions'
import { formatCompactResource, formatResource } from '../format'
import { ACTION_IDS, BUILDING_IDS, RESOURCES } from '../ids'
import { isProductionJob } from '../jobs'
import { storageCapacity, storageFull } from '../resources'
import type { GameSession } from '../session'
import {
  availablePeople,
  craftingJob,
  housingCapacity,
  requirementBlocker,
} from '../settlement'
import type { ResourceFlowEntry } from '../simulation'
import { resourceFlowEntries, resourceFlows } from '../simulation'
import type { GameState, ResourceId } from '../types'
import { ResourceArt, ViewIcon } from './art'
import { Button } from './common'

export function Stockpile({ session }: { session: GameSession }) {
  const [open, setOpen] = useState(false)
  const s = session.game.state,
    flows = resourceFlows(s),
    entries = resourceFlowEntries(s)
  const visibleResources = RESOURCES.filter(
    (r) =>
      ACTION_IDS.some(
        (id) => ACTIONS[id].resource === r && ACTIONS[id].visible(s),
      ) ||
      s.resources[r] > 0 ||
      BUILDING_IDS.some((id) => {
        const crafting = craftingJob(id)
        return (
          crafting &&
          isProductionJob(crafting) &&
          JOBS[crafting].output === r &&
          !requirementBlocker(s, BUILDINGS[id].forms[0]?.requires ?? {})
        )
      }),
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
        key={r}
      >
        <ResourceArt resource={r} />
        <span className="resource-name">{RESOURCE_INFO[r].name}</span>
        <strong className="resource-value" data-full={full}>
          {formatCompactResource(s.resources[r])} /{' '}
          {formatCompactResource(capacity)}
        </strong>
        <div className="resource-meta">
          {rate !== 0 && (
            <span className="resource-rate" data-negative={rate < 0}>
              {rate > 0 ? '+' : ''}
              {formatCompactResource(rate)}/s
            </span>
          )}
        </div>
      </section>
    )
  }
  return (
    <>
      <Card asChild>
        <section className="stockpile-panel" aria-label="Stockpile">
          <div className="stockpile-row">
            <button
              type="button"
              className="stockpile-open"
              aria-haspopup="dialog"
              aria-label="Resource details"
              onClick={() => setOpen(true)}
            >
              <div className="stockpile" id="stockpile-resources">
                {visibleResources.map(resource)}
              </div>
            </button>
            <section
              className="resource stockpile-people"
              aria-label={`People, ${s.people.length} of ${housingCapacity(s)} housing, ${availablePeople(s)} idle`}
            >
              <span className="people-icon" aria-hidden="true">
                <ViewIcon name="people" />
              </span>
              <span className="resource-name">People</span>
              <strong className="resource-value">
                {s.people.length} / {housingCapacity(s)}
              </strong>
              <div className="resource-meta">
                <span>{availablePeople(s)} idle</span>
              </div>
            </section>
          </div>
        </section>
      </Card>
      {open && (
        <Dialog.Root open onOpenChange={(o) => !o && setOpen(false)}>
          <Dialog.Content className="stockpile-modal" size="3">
            <Dialog.Title>Resources</Dialog.Title>
            <div className="stockpile-details">
              {visibleResources.map((r) => (
                <ResourceDetails
                  key={r}
                  resource={r}
                  state={s}
                  flow={flows[r]}
                  entries={entries[r]}
                  warning={r === 'food' && foodShortage}
                />
              ))}
            </div>
            <Flex justify="end" mt="4">
              <Button onClick={() => setOpen(false)}>Close</Button>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
      )}
    </>
  )
}

function ResourceDetails({
  resource: r,
  state: s,
  flow,
  entries,
  warning,
}: {
  resource: ResourceId
  state: GameState
  flow: { production: number; inputs: number; meals: number }
  entries: ResourceFlowEntry[]
  warning: boolean
}) {
  const full = storageFull(s, r),
    net = flow.production - flow.inputs - flow.meals,
    effectiveNet = full && net > 0 ? 0 : net,
    rate =
      Math.abs(effectiveNet) < MIN_VISIBLE_RESOURCE_CHANGE
        ? 0
        : effectiveNet / 60,
    visible = entries
      .filter((e) => e.amount >= MIN_VISIBLE_RESOURCE_CHANGE)
      .sort((a, b) => rank(a) - rank(b))
  return (
    <section
      className="stockpile-detail"
      aria-label={`${RESOURCE_INFO[r].name} details`}
    >
      <header className="stockpile-detail-header">
        <ResourceArt resource={r} />
        <strong>{RESOURCE_INFO[r].name}</strong>
        <span>
          {formatResource(s.resources[r])} /{' '}
          {formatResource(storageCapacity(s, r))}
          {full ? ' · full' : ''}
        </span>
        {rate !== 0 && (
          <span className="resource-rate" data-negative={rate < 0}>
            {rate > 0 ? '+' : ''}
            {formatCompactResource(rate)}/s
          </span>
        )}
      </header>
      {(warning || full) && (
        <p className="stockpile-detail-warning">
          {warning ? 'Starving · health at risk' : 'Storage full'}
        </p>
      )}
      {visible.length > 0 && (
        <ul className="stockpile-detail-flows">
          {visible.map((entry) => (
            <li key={`${entry.label}:${entry.kind}`}>
              <span>{entry.label}</span>
              <span
                className="resource-rate"
                data-negative={entry.kind !== 'production'}
              >
                {entry.kind === 'production' ? '+' : '−'}
                {formatCompactResource(entry.amount / 60)}/s
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const KIND_RANK = { production: 0, input: 1, meal: 2 } as const
function rank(entry: ResourceFlowEntry) {
  return KIND_RANK[entry.kind]
}
