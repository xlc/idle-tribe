import { formatCost, formatDuration } from '../format'
import { plannedQuotes, projectName, queueBlocker } from '../research'
import { constructionSpeed } from '../settlement'
import type { QueueId } from '../types'
import { Button, Costs, type ViewProps } from './common'
export function Queue({ session, confirm, id }: { id: QueueId } & ViewProps) {
  const { game } = session,
    s = game.state,
    q = s.queues[id],
    active = q.active,
    quotes = plannedQuotes(s, id)
  const speed = id === 'research' ? 1 : constructionSpeed(s) / 60
  return (
    <section className="queue-panel" aria-label={`${id} queue`}>
      <div className="section-heading">
        <h2>{id === 'research' ? 'Research' : 'Construction'}</h2>
        <span>{q.waiting.length} planned</span>
      </div>
      {active ? (
        <div className="active-project">
          <strong>{projectName(s, active.project)}</strong>
          <div className="project-progress">
            <progress
              className="progress progress-primary"
              value={active.progress}
              max={active.total || 1}
            />
            <span>
              {speed
                ? formatDuration((active.total - active.progress) / speed)
                : 'No builders'}
            </span>
          </div>
          <div className="queue-meta">
            <small>Committed: {formatCost(active.paid)}</small>
            <Button
              onClick={() =>
                confirm(
                  'Cancel project?',
                  `Refund ${formatCost(active.paid)}. Work progress will be lost.`,
                  () => game.cancel(id, active.sequence),
                )
              }
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="small-note">{queueBlocker(s, id)}</p>
      )}
      {q.waiting.length > 0 && (
        <details className="waiting-list">
          <summary>
            Planned · {q.waiting.length}
            {!active ? ` · ${queueBlocker(s, id)}` : ''}
          </summary>
          <ol>
            {q.waiting.map((entry, index) => {
              const quote = quotes.get(entry.sequence)
              return (
                <li key={entry.sequence}>
                  <strong>{projectName(s, entry.project)}</strong>
                  {quote && (
                    <>
                      <Costs session={session} cost={quote.cost} />
                      <small>
                        {quote.blocker ||
                          `${id === 'research' ? formatDuration(quote.total) : `${quote.total.toFixed(1)} builder-min`} · estimated`}
                      </small>
                    </>
                  )}
                  <div className="inline-controls">
                    <Button
                      title="Move earlier"
                      disabled={index === 0}
                      onClick={() =>
                        session.change(() => game.move(id, entry.sequence, -1))
                      }
                    >
                      ↑
                    </Button>
                    <Button
                      title="Move later"
                      disabled={index === q.waiting.length - 1}
                      onClick={() =>
                        session.change(() => game.move(id, entry.sequence, 1))
                      }
                    >
                      ↓
                    </Button>
                    <Button
                      onClick={() =>
                        session.change(() => game.cancel(id, entry.sequence))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              )
            })}
          </ol>
        </details>
      )}
    </section>
  )
}
