import { Card } from '@radix-ui/themes'
import { useState } from 'react'
import { RESEARCH } from '../definitions'
import { formatCost, formatDuration } from '../format'
import { RESEARCH_IDS } from '../ids'
import {
  allEntries,
  quoteProject,
  researchQueueUnlocked,
  researchUpgradeVisible,
  researchVisible,
} from '../research'
import { ViewIcon } from './art'
import {
  ActionCountdown,
  ActionProgress,
  Button,
  Costs,
  DisclosureToggle,
  SectionDisclosure,
  type ViewProps,
} from './common'

function queuedResearchTarget(
  entries: ReturnType<typeof allEntries>,
  id: (typeof RESEARCH_IDS)[number],
  current: number,
) {
  const entry = entries.find(
    (candidate) =>
      candidate.project.kind === 'research' &&
      candidate.project.id === id &&
      (candidate.project.target ?? 1) > 1 &&
      (candidate.project.target ?? 1) > current,
  )
  return entry?.project.kind === 'research' ? (entry.project.target ?? 1) : null
}

function effectRows(effect: string | readonly string[] | undefined) {
  if (!effect) return []
  return Array.isArray(effect) ? effect : [effect]
}

function ResearchCard({
  session,
  confirm,
  id,
  target = 1,
}: ViewProps & { id: (typeof RESEARCH_IDS)[number]; target?: number }) {
  const [expanded, setExpanded] = useState(false)
  const s = session.game.state,
    def = RESEARCH[id],
    project = { kind: 'research' as const, id, target },
    quote = quoteProject(s, project),
    q = s.queues.research,
    active = q.active,
    activeResearch =
      active?.project.kind === 'research' &&
      active.project.id === id &&
      (active.project.target ?? 1) === target
        ? active
        : null
  const queued = allEntries(s).some(
    (entry) =>
      entry.project.kind === 'research' &&
      entry.project.id === id &&
      (entry.project.target ?? 1) === target,
  )
  const blocked = Boolean(quote.blocker),
    anotherResearchActive = Boolean(active && !activeResearch),
    queueBusy = Boolean(active || q.waiting.length),
    queueUnlocked = researchQueueUnlocked(s),
    waitingForQueue = q.waiting.length > 0 && !queued,
    canStart = !queued && !queueBusy && !blocked
  const cancelResearch = () => {
    if (!activeResearch) return
    const run = () => session.game.cancel('research', activeResearch.sequence)
    if (activeResearch.progress > 10) {
      confirm(
        `Stop ${def.name}?`,
        `Refund ${formatCost(activeResearch.paid)}. Research progress will be lost.`,
        run,
      )
    } else session.change(run)
  }
  const runResearch = (action: 'start' | 'queue') => {
    if (def.branch) {
      confirm(
        `${action === 'start' ? 'Start' : 'Queue'} ${def.name}?`,
        `${def.branchIdentity}. Locks the other path when research completes. You can cancel unfinished research.`,
        () => session.game.enqueue(project),
      )
      return
    }
    session.change(() => session.game.enqueue(project))
  }

  return (
    <Card asChild>
      <article
        className="manual-action tech-card research-card"
        aria-label={def.name}
        data-running={Boolean(activeResearch)}
        data-action-state={
          activeResearch
            ? 'running'
            : queued
              ? 'planned'
              : blocked || anotherResearchActive || waitingForQueue
                ? 'blocked'
                : 'ready'
        }
      >
        <div className="action-row">
          <button
            type="button"
            className="manual-trigger research-trigger"
            aria-label={def.name}
            disabled={!canStart}
            onClick={() => runResearch('start')}
          >
            <span className="action-icon research-icon" aria-hidden="true">
              <ViewIcon name="research" />
            </span>
            <span className="action-copy">
              <strong className="action-name">
                {def.name}
                {target > 1 ? ` · level ${target}` : ''}
              </strong>
              <span className="action-yield research-effect">
                {effectRows(target > 1 ? def.upgrade?.effect : def.effect).map(
                  (effect) => (
                    <span className="research-effect-row" key={effect}>
                      {effect}
                    </span>
                  ),
                )}
              </span>
              <span className="action-yield">
                <Costs session={session} cost={quote.cost} inline /> ·{' '}
                {formatDuration(quote.total)}
              </span>
            </span>
            <span
              className="project-progress"
              data-running={Boolean(activeResearch)}
            >
              <ActionProgress
                session={session}
                duration={activeResearch?.total ?? quote.total}
                label={`${def.name} progress`}
                value={
                  activeResearch
                    ? activeResearch.progress / activeResearch.total
                    : 0
                }
                running={Boolean(activeResearch)}
              />
              <small>
                <ActionCountdown
                  session={session}
                  duration={activeResearch?.total ?? quote.total}
                  value={
                    activeResearch
                      ? activeResearch.progress / activeResearch.total
                      : 0
                  }
                  running={Boolean(activeResearch)}
                />
              </small>
            </span>
          </button>
          {activeResearch && (
            <Button
              className="action-stop"
              color="red"
              aria-label={`Stop ${def.name}`}
              title={`Stop ${def.name}`}
              onClick={cancelResearch}
            >
              Stop
            </Button>
          )}
          {queueUnlocked &&
            queueBusy &&
            !activeResearch &&
            !queued &&
            !quote.blocker && (
              <Button
                className="research-inline-control"
                variant="solid"
                color="grass"
                aria-label="Add research to queue"
                title="Add research to queue"
                onClick={() => runResearch('queue')}
              >
                Queue
              </Button>
            )}
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
            {def.branchIdentity && (
              <p className="branch-identity">{def.branchIdentity}</p>
            )}
            <p className="requirement" data-visible={Boolean(quote.blocker)}>
              {quote.blocker || '\u00a0'}
            </p>
          </div>
        )}
      </article>
    </Card>
  )
}

export function Technology({ session, confirm }: ViewProps) {
  const s = session.game.state
  const entries = allEntries(s).filter(
    (entry) => entry.project.kind === 'research',
  )
  const queuedUpgradeIds = RESEARCH_IDS.filter(
    (id) => queuedResearchTarget(entries, id, s.research[id]) !== null,
  )
  return (
    <SectionDisclosure
      className="technology-panel"
      title={
        <>
          <ViewIcon name="research" />
          Technology
        </>
      }
      ariaLabel="Technology"
    >
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
      {(RESEARCH_IDS.some((id) => researchUpgradeVisible(s, id)) ||
        queuedUpgradeIds.length > 0) && (
        <section className="tech-section">
          <h2>Research upgrades</h2>
          <div className="tech-grid research-list">
            {RESEARCH_IDS.filter(
              (id) =>
                researchUpgradeVisible(s, id) || queuedUpgradeIds.includes(id),
            ).map((id) => (
              <ResearchCard
                key={`${id}-upgrade`}
                session={session}
                confirm={confirm}
                id={id}
                target={
                  queuedResearchTarget(entries, id, s.research[id]) ??
                  s.research[id] + 1
                }
              />
            ))}
          </div>
        </section>
      )}
      <details>
        <summary>
          Completed research ·{' '}
          {RESEARCH_IDS.filter((id) => s.research[id] > 0).length}
        </summary>
        <div className="completed-research">
          {RESEARCH_IDS.filter((id) => s.research[id] > 0).map((id) => (
            <Card asChild key={id}>
              <article
                className="tech-card completed-research-card"
                aria-label={RESEARCH[id].name}
              >
                <div className="completed-research-row">
                  <span
                    className="action-icon research-icon"
                    aria-hidden="true"
                  >
                    <ViewIcon name="research" />
                  </span>
                  <span className="action-copy">
                    <strong className="action-name">
                      {RESEARCH[id].name}
                      {RESEARCH[id].upgrade
                        ? ` · level ${s.research[id]}/${RESEARCH[id].upgrade.maxLevel}`
                        : ''}
                    </strong>
                    <span className="action-yield research-effect">
                      {effectRows(RESEARCH[id].effect).map((effect) => (
                        <span className="research-effect-row" key={effect}>
                          {effect}
                        </span>
                      ))}
                    </span>
                    <small className="completed-research-description">
                      {RESEARCH[id].description}
                    </small>
                  </span>
                </div>
              </article>
            </Card>
          ))}
        </div>
      </details>
    </SectionDisclosure>
  )
}
