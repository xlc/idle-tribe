import { SegmentedControl } from '@radix-ui/themes'
import { useState } from 'react'
import { ACTIONS, BUILDINGS } from '../definitions'
import { ACTION_IDS, BUILDING_IDS } from '../ids'
import { researchPlan } from '../research'
import { assigned, requirementBlocker } from '../settlement'
import { ActionCards } from './actions'
import type { ViewProps } from './common'
import { Facility } from './facility'

const facilityFilters = [
  'All',
  'Production',
  'Storage',
  'Housing & support',
] as const
type FacilityFilter = (typeof facilityFilters)[number]

export function Production(props: ViewProps) {
  const s = props.session.game.state
  const [filter, setFilter] = useState<FacilityFilter>('Production')
  const planned = researchPlan(s)
  const available = BUILDING_IDS.filter((id) => {
    const action = ACTION_IDS.find((a) => ACTIONS[a].building === id)
    if (
      action &&
      !ACTIONS[action].visible(s) &&
      !assigned(s, ACTIONS[action].job)
    )
      return false
    return (
      s.facilities[id].level > 0 ||
      BUILDINGS[id].forms.some((f) => !requirementBlocker(planned, f.requires))
    )
  })
  // Keep action placement stable; workplaces only describe the facility.
  const actions = ACTION_IDS.filter((id) => ACTIONS[id].visible(s))
  const filtered = available.filter(
    (id) =>
      filter === 'All' ||
      (filter === 'Production'
        ? BUILDINGS[id].job
        : filter === 'Storage'
          ? BUILDINGS[id].forms.some((form) => form.storage)
          : !BUILDINGS[id].job &&
            !BUILDINGS[id].forms.some((form) => form.storage)),
  )
  const built = available.filter((id) => s.facilities[id].level > 0).length
  return (
    <section className="production-view">
      {actions.length > 0 && (
        <section className="action-section" aria-label="Actions">
          <div className="section-heading">
            <h2>Actions</h2>
          </div>
          <ActionCards session={props.session} ids={actions} />
        </section>
      )}
      <section className="workplace-section" aria-label="Workplaces">
        <div className="section-heading">
          <div>
            <h2>Workplaces</h2>
            <p className="section-description">
              Build spaces that turn people, time, and materials into progress.
            </p>
          </div>
          <span className="workplace-count">
            {built} built · {available.length} available
          </span>
        </div>
        <SegmentedControl.Root
          className="facility-filters"
          aria-label="Facility filters"
          value={filter}
          onValueChange={(value) => {
            const next = facilityFilters.find((option) => option === value)
            if (next) setFilter(next)
          }}
          size="2"
          variant="surface"
        >
          {facilityFilters.map((value) => (
            <SegmentedControl.Item key={value} value={value}>
              {value}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl.Root>
        <div className="building-grid">
          {filtered.map((id) => (
            <Facility key={id} {...props} id={id} />
          ))}
          {filtered.length === 0 && (
            <p className="workplace-empty">
              No workplaces in this group are available yet.
            </p>
          )}
        </div>
      </section>
    </section>
  )
}
