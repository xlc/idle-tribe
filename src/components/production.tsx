import type { ReactNode } from 'react'
import { buildingActions } from '../actions'
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
    // Hide a camp whose every action is still locked and unstaffed.
    const actions = buildingActions(id)
    if (
      actions.length &&
      !actions.some((a) => ACTIONS[a].visible(s) || assigned(s, ACTIONS[a].job))
    )
      return false
    return (
      s.facilities[id].level > 0 ||
      !requirementBlocker(planned, BUILDINGS[id].requires)
    )
  })
  // Keep action placement stable; facility cards describe the building.
  const actions = ACTION_IDS.filter((id) => ACTIONS[id].visible(s))
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
            <ViewIcon name="buildings" />
            Buildings
          </>
        }
        ariaLabel="Buildings"
      >
        <div className="building-grid">
          {available.map((id) => (
            <Facility key={id} {...props} id={id} />
          ))}
        </div>
      </SectionDisclosure>
    </section>
  )
}
