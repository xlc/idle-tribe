import { formatDuration } from '../format'
import { RESEARCH_IDS } from '../ids'
import { allEntries, quoteProject, researchVisible } from '../research'
import { RESEARCH } from '../research-definitions'
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
              <article className="tech-card" key={id} aria-label={def.name}>
                <h3>{def.name}</h3>
                <p className="flavor">{def.description}</p>
                <p className="tech-effect">{def.effect}</p>
                <Costs session={session} cost={quote.cost} />
                {quote.blocker && (
                  <p className="requirement">{quote.blocker}</p>
                )}
                <div className="building-controls">
                  <Button
                    disabled={queued || quote.blocker === 'Other path planned'}
                    onClick={() =>
                      def.branch
                        ? confirm(
                            `Choose ${def.name}?`,
                            `${def.effect} This choice lasts for this run. The other path will be locked when research completes. Cancelling unfinished research permits changing the choice.`,
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
            <p key={id} title={RESEARCH[id].description}>
              <strong>{RESEARCH[id].name}</strong> · {RESEARCH[id].effect}
            </p>
          ))}
        </div>
      </details>
    </>
  )
}
