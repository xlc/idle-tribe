import { Card } from '@radix-ui/themes'
import { useState } from 'react'
import { RESEARCH } from '../definitions'
import { formatDuration } from '../format'
import { RESEARCH_IDS } from '../ids'
import {
  quoteProject,
  researchUpgradeVisible,
  researchVisible,
} from '../research'
import { affordability, canAfford } from '../resources'
import { firstIdlePerson } from '../settlement'
import type { Project } from '../types'
import { ViewIcon } from './art'
import {
  ActionCountdown,
  ActionProgress,
  Button,
  CostProgress,
  Costs,
  confirmStop,
  DisclosureToggle,
  SectionDisclosure,
  type ViewProps,
} from './common'

function isResearchProject(
  project: Project,
  id: (typeof RESEARCH_IDS)[number],
  target: number,
): project is Extract<Project, { kind: 'research' }> {
  return (
    project.kind === 'research' &&
    project.id === id &&
    (project.target ?? 1) === target
  )
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
    active = s.projects.research,
    activeResearch =
      active && isResearchProject(active.project, id, target) ? active : null
  const availabilityBlocker =
      !active && firstIdlePerson(s) < 0 ? 'No idle people' : '',
    blocked = Boolean(quote.blocker || availabilityBlocker),
    affordable = canAfford(s, quote.cost),
    canStart = !activeResearch && !active && !blocked && affordable
  const cancelResearch = () => {
    if (!activeResearch) return
    confirmStop(confirm, session, {
      title: `Stop ${def.name}?`,
      paid: activeResearch.paid,
      loss: 'Research',
      earned: activeResearch.progress > 10,
      run: () => session.game.cancel('research'),
    })
  }
  const runResearch = () => {
    if (def.branch) {
      confirm(
        `Start ${def.name}?`,
        `${def.branchIdentity}. Locks the other path when research completes. You can cancel unfinished research.`,
        () => session.game.start(project),
      )
      return
    }
    session.change(() => session.game.start(project))
  }

  return (
    <Card asChild>
      <article
        className="manual-action tech-card research-card"
        aria-label={def.name}
      >
        {!activeResearch && !affordable && (
          <CostProgress progress={affordability(s, quote.cost)} />
        )}
        <div className="action-row">
          <button
            type="button"
            className="manual-trigger research-trigger"
            aria-label={def.name}
            disabled={!canStart}
            onClick={runResearch}
          >
            <span className="action-icon research-icon" aria-hidden="true">
              <ViewIcon name="research" />
            </span>
            <span className="action-copy">
              <strong className="action-name">{def.name}</strong>
              <span className="action-yield research-effect">
                {effectRows(target > 1 ? def.upgrade?.effect : def.effect).map(
                  (effect) => (
                    <span className="research-effect-row" key={effect}>
                      {effect}
                    </span>
                  ),
                )}
              </span>
              {target > 1 && (
                <span className="action-skill research-level">
                  <span className="action-level">Level {target}</span>
                </span>
              )}
              <span className="action-yield">
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
            <Costs session={session} cost={quote.cost} vertical />
          </div>
        )}
      </article>
    </Card>
  )
}

export function Technology({ session, confirm }: ViewProps) {
  const s = session.game.state
  const researchEntries = RESEARCH_IDS.flatMap((id) => {
    if (researchVisible(s, id)) return [{ id, target: 1 }]
    const target = researchUpgradeVisible(s, id) ? s.research[id] + 1 : null
    return target ? [{ id, target }] : []
  })
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
          {researchEntries.map(({ id, target }) => (
            <ResearchCard
              key={`${id}-${target}`}
              session={session}
              confirm={confirm}
              id={id}
              target={target}
            />
          ))}
        </div>
      </section>
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
