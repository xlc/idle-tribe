import { useState } from 'react'
import { formatCost, formatDuration } from '../format'
import { plannedQuotes, projectName, queueBlocker } from '../research'
import { constructionSpeed } from '../settlement'
import type { QueueId } from '../types'
import { Button, Costs, type ViewProps } from './common'
import { Builders } from './settlement'

export function Construction(props: ViewProps) {
  const [open, setOpen] = useState(true)
  const s = props.session.game.state
  return (
    <section
      className={`construction-panel${open ? ' expanded' : ''}`}
      aria-label="Construction management"
    >
      <button
        type="button"
        className="construction-toggle"
        aria-expanded={open}
        aria-controls="construction-controls"
        onClick={() => setOpen(!open)}
      >
        <span>
          Construction
          {!open && s.queues.construction.active
            ? ` · ${projectName(s, s.queues.construction.active.project)}`
            : ''}
        </span>
        <svg
          className="construction-chevron"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="m6 3 5 5-5 5" />
        </svg>
      </button>
      <div className="construction-body" id="construction-controls">
        <Builders session={props.session} />
        <Queue {...props} id="construction" />
      </div>
    </section>
  )
}

export function Queue({ session, confirm, id }: { id: QueueId } & ViewProps) {
  const { game } = session,
    s = game.state,
    q = s.queues[id],
    active = q.active
  if (!active && !q.waiting.length) return null
  const quotes = plannedQuotes(s, id),
    speed = id === 'research' ? 1 : constructionSpeed(s) / 60
  return (
    <section className="queue-panel" aria-label={`${id} queue`}>
      <div className="section-heading">
        <h2>{id === 'research' ? 'Research' : 'Construction'}</h2>
      </div>
      {active ? (
        <div className="active-project">
          <strong>{projectName(s, active.project)}</strong>
          <div className="project-progress">
            <progress
              className="progress"
              value={active.progress}
              max={active.total || 1}
            />
            <span>
              {speed
                ? formatDuration((active.total - active.progress) / speed)
                : 'No builders'}
            </span>
          </div>
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
      ) : (
        <p className="small-note">{queueBlocker(s, id)}</p>
      )}
      {q.waiting.length > 0 && (
        <details className="waiting-list">
          <summary>Planned · {q.waiting.length}</summary>
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
                        {quote.blocker && (active || index > 0)
                          ? quote.blocker
                          : `~${id === 'research' ? formatDuration(quote.total) : `${quote.total.toFixed(1)} builder-min`}`}
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
