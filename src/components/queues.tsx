import { Card } from '@radix-ui/themes'
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
  ProgressBar,
  type ViewProps,
} from './common'
import { Builders } from './workforce'

export function Construction({
  compact = false,
  ...props
}: ViewProps & { compact?: boolean }) {
  return (
    <section
      className={`construction-panel${compact ? ' compact' : ''}`}
      aria-label="Construction management"
    >
      <Queue {...props} id="construction" compact={compact} />
    </section>
  )
}

export function QueueView({ session, confirm }: ViewProps) {
  return (
    <div className="queue-view">
      <section
        className="queue-section"
        aria-labelledby="research-queue-heading"
      >
        <h2 id="research-queue-heading">Research queue</h2>
        <Queue session={session} confirm={confirm} id="research" />
      </section>
    </div>
  )
}

export function Queue({
  session,
  confirm,
  id,
  compact = false,
}: { id: QueueId; compact?: boolean } & ViewProps) {
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
    <Card asChild>
      <section
        className={`queue-panel${compact ? ' queue-panel-compact' : ''}`}
        aria-label={`${id} queue`}
      >
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
          <span className="plan-primary">
            {id === 'research' && active ? (
              <span className="plan-status">
                Researching
                {q.waiting.length > 0 && ` · ${q.waiting.length} waiting`}
              </span>
            ) : (
              <strong data-visible={Boolean(current)}>
                {current ? projectName(s, current) : '\u00a0'}
              </strong>
            )}
          </span>
          {id !== 'research' && (
            <ProgressBar
              data-visible={Boolean(current)}
              value={active?.progress ?? 0}
              max={active?.total || 1}
              label={`${id} progress`}
            />
          )}
          <span
            className="plan-status"
            data-visible={!(id === 'research' && active)}
          >
            {status}
            {q.waiting.length > 0 && <span> · {q.waiting.length} waiting</span>}
          </span>
        </button>
        {id === 'research' && (
          <article
            className="research-active"
            data-visible={Boolean(active && researchName)}
            aria-label={
              researchName ? `Researching ${researchName}` : undefined
            }
          >
            {active && researchName && (
              <>
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
              </>
            )}
          </article>
        )}
        <div className="plan-details" hidden={!open}>
          {id === 'construction' && <Builders session={session} />}
          {id === 'construction' && (
            <div className="active-project" data-visible={Boolean(active)}>
              {active && (
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
              )}
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
                            session.change(() =>
                              game.move(id, entry.sequence, 1),
                            )
                          }
                        >
                          ↓ Later
                        </Button>
                        <Button
                          onClick={() =>
                            session.change(() =>
                              game.cancel(id, entry.sequence),
                            )
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
    </Card>
  )
}
