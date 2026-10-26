import { useState } from 'react'
import {
  ACTION_BALANCE,
  actionCompletionDuration,
  actionJobActive,
  actionOutputRate,
  actionSlots,
  automationFactor,
} from '../actions'
import { MIN_VISIBLE_RESOURCE_CHANGE } from '../constants'
import { ACTIONS, BUILDINGS, JOBS, RESOURCE_INFO } from '../definitions'
import { formatCost, formatResource } from '../format'
import { removeFacility } from '../game'
import { ACTION_IDS, RESOURCES } from '../ids'
import { investmentOutcome } from '../investment'
import { isProductionJob } from '../jobs'
import {
  allEntries,
  nextEquipment,
  nextExpansion,
  previewProject,
  researchPlan,
} from '../research'
import { storageMultiplier, threshold } from '../resources'
import {
  assigned,
  comfortablePlaces,
  equipmentMultiplier,
  jobInput,
  requirementBlocker,
  workerRate,
} from '../settlement'
import { resourceRates } from '../simulation'
import type { BuildingId, GameState, Project } from '../types'
import { ActionCard } from './actions'
import { BuildingArt } from './art'
import { Button, Costs, type ViewProps } from './common'
import { WorkerControls } from './worker-controls'

function InvestmentChange({
  state,
  project,
}: {
  state: GameState
  project: Project
}) {
  const outcome = investmentOutcome(state, project)
  return (
    outcome && (
      <p className="investment-change">
        {outcome.label} · {formatResource(outcome.before)} →{' '}
        {formatResource(outcome.after)}
      </p>
    )
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
    action = def.job
      ? ACTION_IDS.find((id) => ACTIONS[id].job === def.job)
      : undefined
  if (!form) return null
  const expansion = nextExpansion(s, id, selectedForm),
    quote = previewProject(s, expansion),
    job = def.job,
    n = job ? assigned(s, job) : 0
  const actionDefinition = action ? ACTIONS[action] : undefined
  const production =
    action && actionDefinition
      ? actionDefinition.resource
        ? actionOutputRate(s, action) * 60
        : actionJobActive(s, action)
          ? 60 / actionCompletionDuration(s, action)
          : 0
      : job
        ? s.people
            .filter((p) => p.job === job)
            .reduce((sum, p) => sum + workerRate(s, p), 0)
        : 0
  const input = actionDefinition?.cost ?? (job ? jobInput(s, job) : {}),
    output = job && isProductionJob(job) ? JOBS[job].output : null
  const missingInputs = RESOURCES.filter(
    (r) => n > 0 && (input[r] ?? 0) > s.resources[r],
  )
  const blocked =
    actionDefinition && !actionDefinition.visible(s)
      ? 'Retired'
      : missingInputs.length
        ? `Paused · Missing ${missingInputs.map((r) => RESOURCE_INFO[r].name.toLowerCase()).join(', ')}`
        : output && storageMultiplier(s, output) < 1
          ? 'Crowded storage'
          : !f.level
            ? ''
            : job && !n
              ? 'No workers'
              : ''
  const active = s.queues.construction.active?.project.id === id
  const equipment = nextEquipment(s, id),
    equipmentQuote = previewProject(s, equipment)
  const remove = () => {
    const after = structuredClone(s)
    removeFacility(after, id)
    const losses = RESOURCES.filter(
      (r) => threshold(s, r) !== threshold(after, r),
    ).map(
      (r) =>
        `${RESOURCE_INFO[r].name} comfort ${threshold(s, r)} → ${threshold(after, r)}; production pressure ×${formatResource(storageMultiplier(s, r))} → ×${formatResource(storageMultiplier(after, r))}`,
    )
    const beforeRates = resourceRates(s),
      afterRates = resourceRates(after)
    const rateChanges = RESOURCES.filter(
      (r) =>
        Math.abs(beforeRates[r] - afterRates[r]) > MIN_VISIBLE_RESOURCE_CHANGE,
    )
      .map(
        (r) =>
          `${RESOURCE_INFO[r].name} net ${formatResource(beforeRates[r])} → ${formatResource(afterRates[r])}/min`,
      )
      .join('; ')
    const housing =
      comfortablePlaces(s) !== comfortablePlaces(after)
        ? `Housing comfort ${comfortablePlaces(s)} → ${comfortablePlaces(after)}. `
        : ''
    confirm(
      `Remove ${form.name}?`,
      `${housing}${losses.join('; ')}${losses.length ? '. ' : ''}${job ? `${n} workers become unassigned;${output ? ` ${formatResource(production)} ${RESOURCE_INFO[output].name.toLowerCase()}/min production removed. ` : ' '}` : ''}${rateChanges ? `${rateChanges}. ` : ''}Levels and equipment are lost with no refund. People and stockpiles remain.`,
      () => session.game.remove(id),
    )
  }
  const investment = !(def.unique && f.level > 0) && (
    <div className="facility-investment">
      <Costs session={session} cost={quote.cost} />
      <InvestmentChange state={s} project={expansion} />
      <div className="building-controls">
        <Button
          variant="solid"
          color="grass"
          onClick={() =>
            session.change(() => session.game.build(id, selectedForm))
          }
        >
          {f.level ? 'Queue expansion' : 'Queue build'}
          {expansion.kind === 'expand' ? ` · ${expansion.target}` : ''}
        </Button>
        <small>{formatResource(quote.total)} work</small>
      </div>
    </div>
  )
  return (
    <article
      className={`building-card panel${action ? ' action-facility' : ''}`}
      data-built={f.level > 0}
      aria-label={form.name}
    >
      {action && actionDefinition?.visible(s) ? (
        <>
          <ActionCard session={session} id={action} />
          <small className="action-workplace">
            {form.name} · {f.level ? `Level ${f.level}` : 'Not built'}
          </small>
        </>
      ) : (
        <div className="facility-overview">
          <BuildingArt building={id} />
          <div className="facility-info">
            <h3>{form.name}</h3>
            <span className="facility-level">
              {f.level ? `Level ${f.level}` : 'Not built'}
              {f.equipment ? ` · tools ${f.equipment}` : ''}
            </span>
            {action && actionDefinition ? (
              <div className="building-recipe">
                <span className="recipe-output" data-zero={production === 0}>
                  +{formatResource(production)}{' '}
                  {actionDefinition.resource ?? 'explores'}/min
                </span>
                <span className="recipe-input">
                  {n}/{actionSlots(s, action)} slots · automation{' '}
                  {Math.round(automationFactor(s, action) * 100)}%
                </span>
              </div>
            ) : job ? (
              <div className="building-recipe">
                <span className="recipe-output" data-zero={production === 0}>
                  +{formatResource(production)}{' '}
                  {output ? RESOURCE_INFO[output].name.toLowerCase() : 'work'}
                  /min
                </span>
                {RESOURCES.filter((r) => input[r]).map((r) => (
                  <span className="recipe-input" key={r}>
                    −{formatResource(production * (input[r] ?? 0))}{' '}
                    {RESOURCE_INFO[r].name.toLowerCase()}/min
                  </span>
                ))}
              </div>
            ) : (
              <p className="building-recipe">
                {form.housing
                  ? `Base +${form.housing} places/level`
                  : form.storage
                    ? RESOURCES.filter((r) => form.storage?.[r])
                        .map(
                          (r) =>
                            `Base +${form.storage?.[r]} ${RESOURCE_INFO[r].name.toLowerCase()} storage`,
                        )
                        .join(' · ')
                    : def.effect}
              </p>
            )}
            {blocked && <p className="building-status">{blocked}</p>}
          </div>
          {job && f.level > 0 && (
            <WorkerControls
              session={session}
              job={job}
              assignable={!actionDefinition || actionDefinition.visible(s)}
            />
          )}
        </div>
      )}
      {!f.level && investment}
      <details className="facility-detail">
        <summary>Details & upgrades</summary>
        {f.level > 0 && investment}
        <p className="flavor">{form.description}</p>
        {job && output && RESOURCES.some((r) => input[r]) && (
          <p>
            {formatCost(input)} → 1 {RESOURCE_INFO[output].name.toLowerCase()}
          </p>
        )}
        {(form.rate || (job && f.equipment) || quote.blocker) && (
          <p>
            {form.rate ? `Base ${form.rate}/min per worker. ` : ''}
            {job && f.equipment
              ? action
                ? `Tools +${formatResource(ACTION_BALANCE.automationPerEquipment * f.equipment * 100)}pp automation. `
                : `Tools ×${formatResource(equipmentMultiplier(f.equipment))}. `
              : ''}
            {quote.blocker}
          </p>
        )}
        {!f.level && def.forms.length > 1 && (
          <label>
            Build form{' '}
            <select
              className="select"
              value={selectedForm}
              onChange={(e) => setSelectedForm(Number(e.target.value))}
            >
              {def.forms.map(
                (v, i) =>
                  !requirementBlocker(researchPlan(s), v.requires) && (
                    <option key={v.name} value={i}>
                      {v.name}
                    </option>
                  ),
              )}
            </select>
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
                    {v.rate ? `${v.rate}/min per worker before bonuses. ` : ''}
                    {v.housing ? `${v.housing} base places per level. ` : ''}
                    {v.storage
                      ? `Base storage: ${formatCost(v.storage)}. `
                      : ''}
                    {v.offlineHours
                      ? `Offline window +${v.offlineHours} × √level hours. `
                      : ''}
                    {job && output
                      ? `Recipe: ${formatCost(jobInput({ ...s, facilities: { ...s.facilities, [id]: { ...f, form: i } } }, job))} → 1 ${RESOURCE_INFO[output].name.toLowerCase()}.`
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
        {job && f.level > 0 && s.research.toolmaking && (
          <div>
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
        {f.level > 0 && (
          <Button disabled={active} onClick={remove}>
            Remove facility
          </Button>
        )}
      </details>
    </article>
  )
}
