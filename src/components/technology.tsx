import { RESEARCH } from '../definitions'
import { formatDuration } from '../format'
import { RESEARCH_IDS } from '../ids'
import { allEntries, quoteProject, researchVisible } from '../research'
import { automationUnlocked } from '../settlement'
import { Button, Costs, type ViewProps } from './common'
import { Queue } from './queues'
export function Technology({ session, confirm }: ViewProps) {
  const s = session.game.state
  return (
    <>
      {!automationUnlocked(s) && (
        <Queue session={session} confirm={confirm} id="research" />
      )}
      <section className="tech-section">
        <div className="tech-grid">
          {RESEARCH_IDS.filter((id) => researchVisible(s, id)).map((id) => {
            const def = RESEARCH[id],
              quote = quoteProject(s, { kind: 'research', id }),
              queued = allEntries(s).some(
                (e) => e.project.kind === 'research' && e.project.id === id,
              )
            const queue = () => session.game.enqueue({ kind: 'research', id })
            return (
              <article
                className="tech-card panel"
                key={id}
                aria-label={def.name}
              >
                <h3>{def.name}</h3>
                {def.branchIdentity && (
                  <p className="branch-identity">{def.branchIdentity}</p>
                )}
                <p className="flavor">{def.description}</p>
                <p className="tech-effect">{def.effect}</p>
                <Costs session={session} cost={quote.cost} />
                {quote.blocker && (
                  <p className="requirement">{quote.blocker}</p>
                )}
                <div className="building-controls">
                  <Button
                    variant="solid"
                    color="grass"
                    disabled={queued || quote.blocker === 'Other path planned'}
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
                    {queued
                      ? 'Planned'
                      : def.branch
                        ? 'Choose path'
                        : 'Queue research'}
                  </Button>
                  <small>{formatDuration(quote.total)}</small>
                </div>
              </article>
            )
          })}
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
