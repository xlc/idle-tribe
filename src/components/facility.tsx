import { Card } from '@radix-ui/themes'
import {
  ACTION_BALANCE,
  actionCost,
  actionRate,
  buildingActions,
  buildingResource,
} from '../actions'
import {
  MIN_VISIBLE_RESOURCE_CHANGE,
  WORKERS_PER_BUILDING_LEVEL,
} from '../constants'
import { ACTIONS, BUILDINGS, JOBS, RESOURCE_INFO } from '../definitions'
import { formatCost, formatResource } from '../format'
import { removeFacility } from '../game'
import { RESOURCES } from '../ids'
import { investmentOutcome } from '../investment'
import { isProductionJob } from '../jobs'
import {
  buildBlocker,
  nextEquipment,
  nextExpansion,
  previewProject,
  projectName,
} from '../research'
import { affordability, canAfford, storageCapacity } from '../resources'
import {
  assigned,
  buildingJobs,
  constructionSpeed,
  equipmentMultiplier,
  housingCapacity,
  jobInput,
  workerRate,
} from '../settlement'
import { resourceRates } from '../simulation'
import type { BuildingId, GameState, Project } from '../types'
import { BuildingArt, ViewIcon } from './art'
import {
  ActionCountdown,
  ActionProgress,
  Button,
  CostProgress,
  Costs,
  confirmStop,
  type ViewProps,
} from './common'
import { WorkerControls } from './worker-controls'

function InvestmentChange({
  state,
  project,
}: {
  state: GameState
  project: Project
}) {
  const outcome = investmentOutcome(state, project)
  if (!outcome) return null
  return (
    <p className="investment-change">
      {`${outcome.label} · ${formatResource(outcome.before)} → ${formatResource(outcome.after)}`}
    </p>
  )
}

export function Facility({
  session,
  confirm,
  id,
}: ViewProps & { id: BuildingId }) {
  const s = session.game.state,
    def = BUILDINGS[id],
    f = s.facilities[id],
    jobs = buildingJobs(id),
    actions = buildingActions(id),
    visibleActions = actions.filter((a) => ACTIONS[a].visible(s))
  const expansion = nextExpansion(s, id),
    quote = previewProject(s, expansion),
    n = jobs.reduce((sum, job) => sum + assigned(s, job), 0)
  const singleAction = actions.length === 1 ? actions[0] : undefined,
    craftingJob = jobs.length && actions.length === 0 ? jobs[0] : undefined
  const production =
    actions.length > 0
      ? visibleActions.reduce((sum, a) => sum + actionRate(s, a), 0)
      : craftingJob
        ? s.people
            .filter((p) => p.job === craftingJob)
            .reduce((sum, p) => sum + workerRate(s, p) / 60, 0)
        : 0
  const output =
      craftingJob && isProductionJob(craftingJob)
        ? JOBS[craftingJob].output
        : null,
    input = singleAction
      ? actionCost(s, singleAction)
      : craftingJob
        ? jobInput(s, craftingJob)
        : {}
  const slots = WORKERS_PER_BUILDING_LEVEL * f.level
  const activeEntry =
      s.projects.construction?.project.id === id
        ? s.projects.construction
        : null,
    speed = constructionSpeed(s) / 60,
    blocker = activeEntry
      ? ''
      : buildBlocker(s) ||
        quote.blocker ||
        (!canAfford(s, quote.cost) ? 'Waiting for materials' : '')
  const facilityType = def.housing
    ? 'Housing'
    : def.storage
      ? 'Storage'
      : actions.length
        ? 'Gathering'
        : craftingJob
          ? 'Crafting'
          : 'Support'
  const buildLabel = f.level
    ? expansion.kind === 'expand'
      ? `Expand to level ${expansion.target}`
      : 'Upgrade workplace'
    : `Build ${def.name}`
  const missingBuildCost = !canAfford(s, quote.cost)
  const equipment = nextEquipment(s, id),
    equipmentQuote = previewProject(s, equipment)
  const remove = () => {
    const after = structuredClone(s)
    removeFacility(after, id)
    const losses = RESOURCES.filter(
      (r) => storageCapacity(s, r) !== storageCapacity(after, r),
    ).map(
      (r) =>
        `${RESOURCE_INFO[r].name} storage ${storageCapacity(s, r)} → ${storageCapacity(after, r)}`,
    )
    const beforeRates = resourceRates(s),
      afterRates = resourceRates(after)
    const rateChanges = RESOURCES.filter(
      (r) =>
        Math.abs(beforeRates[r] - afterRates[r]) > MIN_VISIBLE_RESOURCE_CHANGE,
    )
      .map(
        (r) =>
          `${RESOURCE_INFO[r].name} net ${formatResource(beforeRates[r] / 60)} → ${formatResource(afterRates[r] / 60)}/s`,
      )
      .join('; ')
    const housing =
      housingCapacity(s) !== housingCapacity(after)
        ? `Housing capacity ${housingCapacity(s)} → ${housingCapacity(after)}. `
        : ''
    confirm(
      `Remove ${def.name}?`,
      `${housing}${losses.join('; ')}${losses.length ? '. ' : ''}${jobs.length ? `${n} workers become unassigned;${output ? ` ${formatResource(production)} ${RESOURCE_INFO[output].name.toLowerCase()}/s production removed. ` : ' '}` : ''}${rateChanges ? `${rateChanges}. ` : ''}Levels and equipment are lost with no refund. People and stockpiles remain.`,
      () => session.game.remove(id),
    )
  }
  const stopConstruction = () => {
    if (!activeEntry) return
    confirmStop(confirm, session, {
      title: 'Cancel project?',
      paid: activeEntry.paid,
      loss: 'Work',
      earned: activeEntry.progress > 10,
      run: () => session.game.cancel('construction'),
    })
  }
  const investment = activeEntry ? (
    <div
      className="research-active facility-construction"
      data-running={speed > 0}
    >
      <span className="action-icon construction-icon" aria-hidden="true">
        <ViewIcon name="buildings" />
      </span>
      <span className="action-copy">
        <strong className="action-name">
          {projectName(s, activeEntry.project)}
        </strong>
        <span className="action-yield">
          {speed > 0 ? (
            <>
              <ActionCountdown
                session={session}
                duration={activeEntry.total / speed}
                value={activeEntry.progress / activeEntry.total}
                running
              />{' '}
              remaining
            </>
          ) : s.resources.food <= 0 ? (
            'Paused · Gather food'
          ) : (
            'No builders'
          )}
        </span>
      </span>
      <Button
        className="action-stop"
        color="red"
        aria-label="Stop construction"
        title="Stop construction"
        onClick={stopConstruction}
      >
        Stop
      </Button>
      <span className="project-progress research-progress">
        <ActionProgress
          session={session}
          duration={speed > 0 ? activeEntry.total / speed : Infinity}
          label="Construction progress"
          value={activeEntry.progress / activeEntry.total}
          running={speed > 0}
        />
      </span>
    </div>
  ) : def.unique && f.level > 0 ? null : (
    <div className="action-details facility-investment">
      <div className="facility-investment-heading">
        <span>{f.level ? 'Next upgrade' : 'Build this workplace'}</span>
        <small>{formatResource(quote.total)} work</small>
      </div>
      <Costs session={session} cost={quote.cost} />
      <InvestmentChange state={s} project={expansion} />
      <div className="building-controls">
        <Button
          variant="solid"
          color="grass"
          disabled={Boolean(blocker)}
          onClick={() => session.change(() => session.game.build(id))}
        >
          {buildLabel}
        </Button>
      </div>
    </div>
  )
  return (
    <Card asChild>
      <article
        className="manual-action building-card"
        data-built={f.level > 0}
        aria-label={def.name}
      >
        {missingBuildCost && !activeEntry && (
          <CostProgress progress={affordability(s, quote.cost)} />
        )}
        <div className="action-row facility-overview">
          <span className="action-icon facility-art" aria-hidden="true">
            <BuildingArt building={id} />
          </span>
          <div className="action-copy facility-info">
            <div className="facility-title-row">
              <h3>{def.name}</h3>
              <span className="facility-type">{facilityType}</span>
            </div>
            <span className="facility-level">
              {f.level ? `Level ${f.level}` : 'Ready to build'}
              {f.equipment ? ` · tools ${f.equipment}` : ''}
            </span>
            {actions.length > 0 ? (
              <div className="building-recipe">
                <span className="recipe-output" data-zero={production === 0}>
                  +{formatResource(production)}{' '}
                  {buildingResource(id) ?? 'explores'}
                  /s
                </span>
                <span className="recipe-input">
                  Staff {n}/{slots}
                </span>
              </div>
            ) : craftingJob ? (
              <div className="building-recipe">
                <span className="recipe-output" data-zero={production === 0}>
                  +{formatResource(production)}{' '}
                  {output ? RESOURCE_INFO[output].name.toLowerCase() : 'work'}
                  /s
                </span>
                {RESOURCES.filter((r) => input[r]).map((r) => (
                  <span className="recipe-input" key={r}>
                    Uses {formatResource(production * (input[r] ?? 0))}{' '}
                    {RESOURCE_INFO[r].name.toLowerCase()}/s
                  </span>
                ))}
              </div>
            ) : (
              <p className="building-recipe">
                {def.housing
                  ? `Adds +${def.housing} housing capacity per level`
                  : def.storage
                    ? RESOURCES.filter((r) => def.storage?.[r])
                        .map(
                          (r) =>
                            `Adds +${def.storage?.[r]} ${RESOURCE_INFO[r].name.toLowerCase()} storage`,
                        )
                        .join(' · ')
                    : def.effect}
              </p>
            )}
          </div>
          {craftingJob && (
            <div className="facility-worker-slot" data-visible={f.level > 0}>
              <span className="facility-worker-label">Staff</span>
              <WorkerControls
                session={session}
                job={craftingJob}
                assignable={!singleAction || ACTIONS[singleAction].visible(s)}
              />
            </div>
          )}
        </div>
        {investment}
        <details className="facility-detail">
          <summary>More details & upgrades</summary>
          <p className="flavor">{def.description}</p>
          {craftingJob && output && RESOURCES.some((r) => input[r]) && (
            <p>
              {formatCost(input)} → 1 {RESOURCE_INFO[output].name.toLowerCase()}
            </p>
          )}
          {(def.rate || (jobs && f.equipment) || quote.blocker) && (
            <p>
              {def.rate
                ? `Base ${formatResource(def.rate / 60)}/s per worker. `
                : ''}
              {jobs && f.equipment
                ? actions.length
                  ? `Tools +${formatResource(ACTION_BALANCE.automationPerEquipment * f.equipment * 100)}pp automation. `
                  : `Tools ×${formatResource(equipmentMultiplier(f.equipment))}. `
                : ''}
              {quote.blocker}
            </p>
          )}
          {jobs && f.level > 0 && (
            <div
              className="facility-equipment-slot"
              data-visible={s.research.toolmaking > 0}
            >
              <Costs session={session} cost={equipmentQuote.cost} />
              <InvestmentChange state={s} project={equipment} />
              <small>
                {equipmentQuote.blocker ||
                  `${formatResource(equipmentQuote.total)} work`}
              </small>
              <Button
                disabled={Boolean(
                  s.projects.construction ||
                    equipmentQuote.blocker ||
                    !canAfford(s, equipmentQuote.cost),
                )}
                onClick={() => session.change(() => session.game.equip(id))}
              >
                Start tools {equipment.kind === 'equip' ? equipment.target : ''}
              </Button>
            </div>
          )}
          <div className="facility-remove-slot" data-visible={f.level > 0}>
            <Button
              disabled={!f.level || Boolean(activeEntry)}
              onClick={remove}
            >
              Remove facility
            </Button>
          </div>
        </details>
      </article>
    </Card>
  )
}
