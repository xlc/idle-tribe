import { ACTION_KEYS, RESEARCH_ITEM_KEYS } from '../ids'
import { isResearchExcluded, RESEARCH_GROUPS } from '../research-definitions'
import { ActionButton, type ActionButtonProps } from './actions'
import { Disclosure } from './common'

type TechnologyProps = Omit<ActionButtonProps, 'action'>

export function Technology(props: TechnologyProps) {
  const { game } = props.session
  const actions = ACTION_KEYS.map((key) => game.actions[key]).filter(
    (action) =>
      action.researchId && !isResearchExcluded(game.state, action.researchId),
  )
  const completed = actions.filter(
    (action) =>
      action.researchId && !game.getResearchNextLevel(action.researchId),
  )
  return (
    <>
      <div className="technology-heading">
        <h2>Technology</h2>
        <span id="technology-count">
          {
            RESEARCH_ITEM_KEYS.filter((id) => game.getResearchLevel(id) > 0)
              .length
          }{' '}
          researched
        </span>
      </div>
      <div id="research-groups">
        {RESEARCH_GROUPS.map((group) => {
          const available = actions.filter(
            (action) =>
              action.researchId &&
              game.getResearchDefinition(action.researchId).group ===
                group.id &&
              game.getResearchNextLevel(action.researchId),
          )
          if (!group.visible(game.state) || !available.length) return null
          const content = (
            <div key={group.id} className="tech-grid">
              {available.map((action) => (
                <ActionButton key={action.id} {...props} action={action} />
              ))}
            </div>
          )
          const collapsed = group.collapseWhen?.(game.state) ?? false
          return group.collapseWhen ? (
            <Disclosure
              key={group.id}
              title={group.name}
              className="tech-section"
              initiallyOpen={!collapsed}
              collapseWhen={collapsed}
            >
              {content}
            </Disclosure>
          ) : (
            <section key={group.id} className="tech-section">
              <h3>{group.name}</h3>
              {content}
            </section>
          )
        })}
      </div>
      {completed.length > 0 && (
        <Disclosure
          id="completed-research"
          summaryId="completed-count"
          title={`Completed · ${completed.length}`}
        >
          <div className="tech-grid" id="completed-list">
            {completed.map((action) => (
              <ActionButton key={action.id} {...props} action={action} />
            ))}
          </div>
        </Disclosure>
      )}
    </>
  )
}
