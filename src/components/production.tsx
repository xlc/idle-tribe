import { useState } from 'react'
import { ACTIONS, BUILDINGS } from '../definitions'
import { ACTION_IDS, BUILDING_IDS } from '../ids'
import { researchPlan } from '../research'
import { assigned, requirementBlocker } from '../settlement'
import { ActionCards } from './actions'
import { Button, type ViewProps } from './common'
import { Facility } from './facility'

export function Production(props: ViewProps) {
  const s = props.session.game.state
  const [filter, setFilter] = useState('Production')
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
  const actions = ACTION_IDS.filter(
    (id) => ACTIONS[id].visible(s) && !available.includes(ACTIONS[id].building),
  )
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
          <h2>Workplaces</h2>
        </div>
        <fieldset className="facility-filters" aria-label="Facility filters">
          {['All', 'Production', 'Storage', 'Housing & support'].map(
            (value) => (
              <Button
                key={value}
                aria-pressed={filter === value}
                variant={filter === value ? 'solid' : 'soft'}
                onClick={() => setFilter(value)}
              >
                {value}
              </Button>
            ),
          )}
        </fieldset>
        <div className="building-grid">
          {available
            .filter(
              (id) =>
                filter === 'All' ||
                (filter === 'Production'
                  ? BUILDINGS[id].job
                  : filter === 'Storage'
                    ? BUILDINGS[id].forms.some((form) => form.storage)
                    : !BUILDINGS[id].job &&
                      !BUILDINGS[id].forms.some((form) => form.storage)),
            )
            .map((id) => (
              <Facility key={id} {...props} id={id} />
            ))}
        </div>
      </section>
    </section>
  )
}
