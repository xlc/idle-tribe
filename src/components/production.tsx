import { ACTIONS, BUILDINGS } from '../definitions'
import { ACTION_IDS, BUILDING_IDS } from '../ids'
import { researchPlan } from '../research'
import { assigned, requirementBlocker } from '../settlement'
import { ActionCards } from './actions'
import type { ViewProps } from './common'
import { Facility } from './facility'

export function Production(props: ViewProps) {
  const s = props.session.game.state
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
        <div className="building-grid">
          {available.map((id) => (
            <Facility key={id} {...props} id={id} />
          ))}
        </div>
      </section>
    </section>
  )
}
