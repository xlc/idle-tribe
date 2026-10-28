import { useState } from 'react'
import { RESEARCH } from '../definitions'
import { formatCost, formatDuration } from '../format'
import { RESEARCH_IDS } from '../ids'
import { allEntries, quoteProject, researchVisible } from '../research'
import { automationUnlocked } from '../settlement'
import { ViewIcon } from './art'
import { Costs, DisclosureToggle, type ViewProps } from './common'
import { Queue } from './queues'

function ResearchCard({
  session,
  confirm,
  id,
}: ViewProps & { id: (typeof RESEARCH_IDS)[number] }) {
  const [expanded, setExpanded] = useState(false)
  const s = session.game.state
  const def = RESEARCH[id]
  const quote = quoteProject(s, { kind: 'research', id })
  const queued = allEntries(s).some(
    (entry) => entry.project.kind === 'research' && entry.project.id === id,
  )
  const blocked = Boolean(quote.blocker)
  const queue = () => session.game.enqueue({ kind: 'research', id })
  const queueLabel = queued
    ? 'Planned'
    : quote.blocker
      ? quote.blocker
      : def.branch
        ? 'Choose path'
        : 'Queue research'

  return (
    <article
      className="manual-action tech-card research-card panel"
      aria-label={def.name}
      data-action-state={queued ? 'planned' : blocked ? 'blocked' : 'ready'}
    >
      <div className="action-row">
        <button
          type="button"
          className="manual-trigger research-trigger"
          disabled={queued || blocked}
          onClick={() =>
            def.branch
              ? confirm(
                  `Choose ${def.name}?`,
                  `${def.branchIdentity}. Locks the other path when research completes. You can cancel unfinished research.`,
                  queue,
                )
              : session.change(queue)
          }
        >
          <span className="action-icon research-icon" aria-hidden="true">
            <ViewIcon name="research" />
          </span>
          <span className="action-copy">
            <strong className="action-name">{def.name}</strong>
            <span className="action-yield">
              {formatCost(quote.cost)} · {formatDuration(quote.total)}
            </span>
          </span>
          <span className="research-plan-status">{queueLabel}</span>
        </button>
        <DisclosureToggle
          expanded={expanded}
          controls={`${id}-details`}
          label={`${def.name} details`}
          onToggle={() => setExpanded((value) => !value)}
        />
      </div>
      {expanded && (
        <div className="action-details" id={`${id}-details`}>
          <p className="action-description">{def.description}</p>
          <p className="research-effect">{def.effect}</p>
          {def.branchIdentity && (
            <p className="branch-identity">{def.branchIdentity}</p>
          )}
          <Costs session={session} cost={quote.cost} />
          {quote.blocker && <p className="requirement">{quote.blocker}</p>}
        </div>
      )}
    </article>
  )
}

export function Technology({ session, confirm }: ViewProps) {
  const s = session.game.state
  return (
    <>
      {!automationUnlocked(s) && (
        <Queue session={session} confirm={confirm} id="research" />
      )}
      <section className="tech-section">
        <div className="tech-grid research-list">
          {RESEARCH_IDS.filter((id) => researchVisible(s, id)).map((id) => (
            <ResearchCard
              key={id}
              session={session}
              confirm={confirm}
              id={id}
            />
          ))}
        </div>
      </section>
      <details>
        <summary>
          Completed research ·{' '}
          {RESEARCH_IDS.filter((id) => s.research[id]).length}
        </summary>
        <div className="completed-research">
          {RESEARCH_IDS.filter((id) => s.research[id]).map((id) => (
            <p key={id}>
              <strong>{RESEARCH[id].name}</strong> · {RESEARCH[id].effect}
              <small className="completed-research-description">
                {RESEARCH[id].description}
              </small>
            </p>
          ))}
        </div>
      </details>
    </>
  )
}
