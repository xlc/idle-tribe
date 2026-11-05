import { Card, Select } from '@radix-ui/themes'
import { useState } from 'react'
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
  allEntries,
  buildBlocker,
  nextEquipment,
  nextExpansion,
  previewProject,
  projectName,
  researchPlan,
} from '../research'
import { affordability, canAfford, storageCapacity } from '../resources'
import {
  assigned,
  buildingJobs,
  constructionSpeed,
  equipmentMultiplier,
  housingCapacity,
  jobInput,
  requirementBlocker,
  workerRate,
} from '../settlement'
import { resourceRates } from '../simulation'
import type { BuildingId, GameState, Project } from '../types'
import { BuildingArt } from './art'
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
    [selectedForm, setSelectedForm] = useState(f.form)
  const form = def.forms[f.level ? f.form : selectedForm],
    jobs = buildingJobs(id),
    actions = buildingActions(id),
    visibleActions = actions.filter((a) => ACTIONS[a].visible(s))
  if (!form) return null
  const expansion = nextExpansion(s, id, selectedForm),
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
  const missingInputs = RESOURCES.filter(
    (r) => n > 0 && (input[r] ?? 0) > s.resources[r],
  )
  const blocked =
    actions.length > 0 && visibleActions.length === 0
      ? 'Retired'
      : missingInputs.length
        ? `Paused · Missing ${missingInputs.map((r) => RESOURCE_INFO[r].name.toLowerCase()).join(', ')}`
        : !f.level
          ? ''
          : jobs.length && !n
            ? 'No workers'
            : ''
  const activeEntry =
      s.queues.construction.active?.project.id === id
        ? s.queues.construction.active
        : null,
    waitingIndex = s.queues.construction.waiting.findIndex(
      (entry) => entry.project.id === id,
    ),
    speed = constructionSpeed(s) / 60,
    blocker = activeEntry ? '' : buildBlocker(s)
  const facilityType = form.housing
    ? 'Housing'
    : form.storage
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
    : `Build ${form.name}`
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
      `Remove ${form.name}?`,
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
      run: () => session.game.cancel('construction', activeEntry.sequence),
    })
  }
  const investment = activeEntry ? (
    <div
      className="research-active facility-construction"
      data-running={speed > 0}
    >
      <span className="action-icon facility-art" aria-hidden="true">
        <BuildingArt building={id} />
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
          onClick={() =>
            session.change(() => session.game.build(id, selectedForm))
          }
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
        data-action-state={
          activeEntry
            ? 'constructing'
            : missingBuildCost
              ? 'missing-cost'
              : blocked
                ? 'blocked'
                : undefined
        }
        aria-label={form.name}
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
              <h3>{form.name}</h3>
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
                {form.housing
                  ? `Adds +${form.housing} housing capacity per level`
                  : form.storage
                    ? RESOURCES.filter((r) => form.storage?.[r])
                        .map(
                          (r) =>
                            `Adds +${form.storage?.[r]} ${RESOURCE_INFO[r].name.toLowerCase()} storage`,
                        )
                        .join(' · ')
                    : def.effect}
              </p>
            )}
            <p
              className="action-status building-status"
              data-visible={Boolean(blocked || blocker || waitingIndex >= 0)}
            >
              {blocked ||
                blocker ||
                (waitingIndex >= 0
                  ? `Queued · position ${waitingIndex + 1}`
                  : '') ||
                '\u00a0'}
            </p>
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
          <p className="flavor">{form.description}</p>
          {craftingJob && output && RESOURCES.some((r) => input[r]) && (
            <p>
              {formatCost(input)} → 1 {RESOURCE_INFO[output].name.toLowerCase()}
            </p>
          )}
          {(form.rate || (jobs && f.equipment) || quote.blocker) && (
            <p>
              {form.rate
                ? `Base ${formatResource(form.rate / 60)}/s per worker. `
                : ''}
              {jobs && f.equipment
                ? actions.length
                  ? `Tools +${formatResource(ACTION_BALANCE.automationPerEquipment * f.equipment * 100)}pp automation. `
                  : `Tools ×${formatResource(equipmentMultiplier(f.equipment))}. `
                : ''}
              {quote.blocker}
            </p>
          )}
          {!f.level && def.forms.length > 1 && (
            <label htmlFor={`build-form-${id}`}>
              Build form{' '}
              <Select.Root
                value={String(selectedForm)}
                size="2"
                onValueChange={(value) => setSelectedForm(Number(value))}
              >
                <Select.Trigger
                  id={`build-form-${id}`}
                  aria-label="Build form"
                />
                <Select.Content>
                  {def.forms.map(
                    (v, i) =>
                      !requirementBlocker(researchPlan(s), v.requires) && (
                        <Select.Item key={v.name} value={String(i)}>
                          {v.name}
                        </Select.Item>
                      ),
                  )}
                </Select.Content>
              </Select.Root>
            </label>
          )}
          {f.level > 0 &&
            def.forms.map(
              (v, i) =>
                i > f.form &&
                !requirementBlocker(researchPlan(s), v.requires) && (
                  <div key={v.name}>
                    <p>
                      {v.name} · {v.description}
                    </p>
                    <p>
                      {v.rate
                        ? `${formatResource(v.rate / 60)}/s per worker before bonuses. `
                        : ''}
                      {v.housing
                        ? `${v.housing} housing capacity per level. `
                        : ''}
                      {v.storage
                        ? `Base storage: ${formatCost(v.storage)}. `
                        : ''}
                      {v.offlineHours
                        ? `Offline window +${v.offlineHours} × √level hours. `
                        : ''}
                      {craftingJob && output
                        ? `Recipe: ${formatCost(jobInput({ ...s, facilities: { ...s.facilities, [id]: { ...f, form: i } } }, craftingJob))} → 1 ${RESOURCE_INFO[output].name.toLowerCase()}.`
                        : ''}
                    </p>
                    <Costs
                      session={session}
                      cost={
                        previewProject(s, { kind: 'convert', id, form: i }).cost
                      }
                    />
                    <InvestmentChange
                      state={s}
                      project={{ kind: 'convert', id, form: i }}
                    />
                    <Button
                      disabled={allEntries(s).some(
                        (e) =>
                          e.project.kind === 'convert' &&
                          e.project.id === id &&
                          e.project.form === i,
                      )}
                      onClick={() =>
                        session.change(() => session.game.convert(id, i))
                      }
                    >
                      Convert to {v.name}
                    </Button>
                  </div>
                ),
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
                onClick={() => session.change(() => session.game.equip(id))}
              >
                Queue tools {equipment.kind === 'equip' ? equipment.target : ''}
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
