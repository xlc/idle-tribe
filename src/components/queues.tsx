import { useState } from 'react'
import { formatCost, formatDuration } from '../format'
import { plannedQuotes, projectName, queueBlocker } from '../research'
import { constructionSpeed } from '../settlement'
import type { QueueId } from '../types'
import { ViewIcon } from './art'
import {
  ActionCountdown,
  ActionProgress,
  Button,
  Costs,
  type ViewProps,
} from './common'
import { Builders } from './workforce'

export function Construction(props: ViewProps) {
  return (
    <section
      className="construction-panel"
      aria-label="Construction management"
    >
      <Queue {...props} id="construction" />
    </section>
  )
}

export function Queue({ session, confirm, id }: { id: QueueId } & ViewProps) {
  const { game } = session,
    s = game.state,
    q = s.queues[id],
    active = q.active
  const [open, setOpen] = useState(false)
  const quotes = plannedQuotes(s, id),
    speed = id === 'research' ? 1 : constructionSpeed(s) / 60,
    current = active?.project ?? q.waiting[0]?.project,
    status = active
      ? speed
        ? formatDuration((active.total - active.progress) / speed)
        : 'No builders'
      : q.waiting.length
        ? queueBlocker(s, id)
        : 'No project'
  const researchName =
    id === 'research' && active ? projectName(s, active.project) : undefined
  return (
    <section className="queue-panel panel" aria-label={`${id} queue`}>
      <button
        type="button"
        className="plan-toggle"
        aria-label={id === 'research' ? 'Research plans' : 'Construction'}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="plan-category">
          {id === 'research' ? 'Research' : 'Construction'}
          <span className="plan-chevron" aria-hidden="true">
            {open ? '⌃' : '⌄'}
          </span>
        </span>
        {id === 'research' && active ? (
          <span className="plan-status">
            Researching
            {q.waiting.length > 0 && ` · ${q.waiting.length} waiting`}
          </span>
        ) : (
          current && <strong>{projectName(s, current)}</strong>
        )}
        {id !== 'research' && current && (
          <progress
            className="progress"
            value={active?.progress ?? 0}
            max={active?.total || 1}
            aria-label={`${id} progress`}
          />
        )}
        {!(id === 'research' && active) && (
          <span className="plan-status">
            {status}
            {q.waiting.length > 0 && <span> · {q.waiting.length} waiting</span>}
          </span>
        )}
      </button>
      {id === 'research' && active && researchName && (
        <article
          className="research-active"
          data-running="true"
          aria-label={`Researching ${researchName}`}
        >
          <span className="action-icon research-icon">
            <ViewIcon name="research" />
          </span>
          <span className="action-copy">
            <strong className="action-name">{researchName}</strong>
            <span className="action-yield">
              <ActionCountdown
                session={session}
                duration={active.total}
                value={active.progress / active.total}
                running
              />{' '}
              remaining
            </span>
          </span>
          <Button
            className="research-active-cancel"
            onClick={() =>
              confirm(
                'Cancel research?',
                `Refund ${formatCost(active.paid)}. Research progress will be lost.`,
                () => game.cancel(id, active.sequence),
              )
            }
          >
            Cancel
          </Button>
          <span
            className="project-progress research-progress"
            data-running="true"
          >
            <ActionProgress
              session={session}
              duration={active.total}
              label="Research progress"
              value={active.progress / active.total}
              running
            />
          </span>
        </article>
      )}
      <div className="plan-details" hidden={!open}>
        {id === 'construction' && <Builders session={session} />}
        {active && id === 'construction' && (
          <div className="active-project">
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
                        disabled={index === 0}
                        onClick={() =>
                          session.change(() =>
                            game.move(id, entry.sequence, -1),
                          )
                        }
                      >
                        ↑ Earlier
                      </Button>
                      <Button
                        disabled={index === q.waiting.length - 1}
                        onClick={() =>
                          session.change(() => game.move(id, entry.sequence, 1))
                        }
                      >
                        ↓ Later
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
      </div>
    </section>
  )
}
