import type { ReactNode } from 'react'
import { ACTIONS, BUILDINGS } from '../definitions'
import { ACTION_IDS, BUILDING_IDS } from '../ids'
import { researchPlan } from '../research'
import { assigned, requirementBlocker } from '../settlement'
import { ActionCards } from './actions'
import { ViewIcon } from './art'
import { SectionDisclosure, type ViewProps } from './common'
import { Facility } from './facility'

export function Production({
  middle,
  ...props
}: ViewProps & { middle?: ReactNode }) {
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
        <SectionDisclosure
          title={
            <>
              <ViewIcon name="actions" />
              Actions
            </>
          }
          ariaLabel="Actions"
        >
          <ActionCards {...props} ids={actions} />
        </SectionDisclosure>
      )}
      {middle}
      <SectionDisclosure
        title={
          <>
            <ViewIcon name="workplaces" />
            Workplaces
          </>
        }
        status={`${built} built · ${available.length} available`}
        ariaLabel="Workplaces"
      >
        <p className="section-description">
          Build spaces that turn people, time, and materials into progress.
        </p>
        <div className="building-grid">
          {available.map((id) => (
            <Facility key={id} {...props} id={id} />
          ))}
        </div>
      </SectionDisclosure>
    </section>
  )
}
