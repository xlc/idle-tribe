import { useRef, useState } from 'react'
import {
  ACTIONS,
  actionCompletionDuration,
  actionJobActive,
  actionOutputRate,
  actionSlots,
  automationFactor,
} from '../actions'
import { RESOURCE_INFO } from '../constants'
import { BUILDINGS, isProductionJob, JOBS } from '../economy'
import { formatCompactResource, formatCost, formatResource } from '../format'
import { removeFacility } from '../game'
import { ACTION_IDS, BUILDING_IDS, RESOURCES } from '../ids'
import { investmentOutcome } from '../investment'
import {
  loadResourcePins,
  MAX_RESOURCE_PINS,
  saveResourcePins,
} from '../preferences'
import {
  allEntries,
  nextEquipment,
  nextExpansion,
  previewProject,
  researchPlan,
} from '../research'
import { storageMultiplier, threshold } from '../resources'
import type { GameSession } from '../session'
import {
  arrivalStatus,
  assigned,
  comfortablePlaces,
  constructionSpeed,
  equipmentMultiplier,
  happinessTarget,
  happinessUnlocked,
  jobInput,
  requirementBlocker,
  workerRate,
} from '../settlement'
import { resourceFlows, resourceRates } from '../simulation'
import type { BuildingId, GameState, Project, ResourceId } from '../types'
import { ActionCard } from './actions'
import { BuildingArt, ResourceArt } from './art'
import { Button, Costs, type ViewProps } from './common'
import { WorkerControls } from './worker-controls'
export function Stockpile({ session }: { session: GameSession }) {
  const s = session.game.state,
    flows = resourceFlows(s)
  const visibleResources = RESOURCES.filter(
    (r) =>
      ACTION_IDS.some(
        (id) => ACTIONS[id].resource === r && ACTIONS[id].visible(s),
      ) ||
      s.resources[r] > 0 ||
      BUILDING_IDS.some(
        (id) =>
          BUILDINGS[id].job &&
          isProductionJob(BUILDINGS[id].job) &&
          JOBS[BUILDINGS[id].job].output === r &&
          !requirementBlocker(s, BUILDINGS[id].forms[0]?.requires ?? {}),
      ),
  )
  const [pins, setPins] = useState(loadResourcePins)
  const picker = useRef<HTMLDialogElement>(null)
  const visiblePins = pins.filter((r) => visibleResources.includes(r))
  function resource(r: ResourceId) {
    const pressure = storageMultiplier(s, r),
      flow = flows[r],
      net = flow.production - flow.inputs - flow.meals,
      rate = Math.abs(net) < 0.0005 ? 0 : net
    return (
      <section
        className="resource"
        aria-label={`${RESOURCE_INFO[r].name} resource`}
        key={r}
      >
        <ResourceArt resource={r} />
        <span className="resource-name">{RESOURCE_INFO[r].name}</span>
        <strong className="resource-value">
          {formatCompactResource(s.resources[r])}
        </strong>
        <div className="resource-meta">
          <span
            className="resource-rate"
            data-negative={rate < 0}
            data-zero={rate === 0}
          >
            {rate > 0 ? '+' : ''}
            {formatCompactResource(rate)}/min
          </span>
          <small className="storage-effect" data-idle={pressure >= 1}>
            Storage ×{formatResource(pressure)}
          </small>
        </div>
      </section>
    )
  }
  return (
    <section className="stockpile-panel panel" aria-label="Stockpile">
      <div className="stockpile-bar">
        <div
          className="stockpile"
          id="stockpile-resources"
          data-pinned={visiblePins.length > 0}
        >
          {(visiblePins.length ? visiblePins : visibleResources).map(resource)}
        </div>
        <button
          type="button"
          className="resource-picker"
          aria-label="All resources and pins"
          onClick={() => picker.current?.showModal()}
        >
          <span aria-hidden="true">≡</span>
        </button>
      </div>
      <dialog ref={picker} className="modal resource-dialog panel">
        <div className="modal-box">
          <h2>Resources</h2>
          <p className="resource-pin-count">
            Pinned · {visiblePins.length}/{MAX_RESOURCE_PINS}
          </p>
          <div className="resource-choices">
            {visibleResources.map((r) => (
              <div className="resource-choice" key={r}>
                <label className="resource-pin">
                  <input
                    type="checkbox"
                    aria-label={`Pin ${RESOURCE_INFO[r].name.toLowerCase()}`}
                    checked={visiblePins.includes(r)}
                    disabled={
                      !visiblePins.includes(r) &&
                      visiblePins.length >= MAX_RESOURCE_PINS
                    }
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...visiblePins, r]
                        : visiblePins.filter((pin) => pin !== r)
                      setPins(next)
                      saveResourcePins(next)
                    }}
                  />
                </label>
                {resource(r)}
              </div>
            ))}
          </div>
          <div className="modal-action">
            <Button onClick={() => picker.current?.close()}>Close</Button>
          </div>
        </div>
      </dialog>
    </section>
  )
}

export function Workforce({ session }: { session: GameSession }) {
  const s = session.game.state,
    arrival = arrivalStatus(s),
    target = happinessTarget(s)
  return (
    <section className="workforce-bar" aria-label="Population">
      <div>
        <h2>{s.people.length} people</h2>
        <p>{assigned(s, 'idle')} unassigned</p>
        {happinessUnlocked(s) && (
          <div className="happiness-status">
            <span>
              Happiness {formatResource(s.happiness)} · target{' '}
              {formatResource(target)}
            </span>
            <span className="status-meter happiness-meter">
              <meter
                min={0}
                max={100}
                value={s.happiness}
                aria-label="Happiness"
                aria-valuetext={`${formatResource(s.happiness)}, target ${formatResource(target)}`}
              />
              <span className="meter-marker" style={{ left: `${target}%` }} />
            </span>
          </div>
        )}
      </div>
      <details className="arrival-details">
        <summary>Arrivals & housing</summary>
        <p>{comfortablePlaces(s)} comfortable places</p>
        <div className="arrival-control">
          <label>
            <input
              className="checkbox"
              type="checkbox"
              checked={s.welcome}
              onChange={() =>
                session.change(() => {
                  s.welcome = !s.welcome
                })
              }
            />{' '}
            Welcome arrivals
          </label>
          <small>
            {arrival.blocker ||
              `Next arrival · ${Math.ceil((1 - s.arrivalProgress) * arrival.interval)}m`}
          </small>
          <small className="arrival-supply">
            Food {formatResource(arrival.foodOutput)} /{' '}
            {formatResource(arrival.required)} per minute
          </small>
          <progress className="progress" value={s.arrivalProgress} max={1} />
        </div>
      </details>
    </section>
  )
}
export function Builders({ session }: { session: GameSession }) {
  const s = session.game.state,
    speed = constructionSpeed(s)
  return (
    <section className="builders">
      <div>
        <h3>Builders</h3>
        <p>{formatResource(speed)} work/min</p>
      </div>
      <WorkerControls session={session} job="builder" />
    </section>
  )
}
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

function Facility({ session, confirm, id }: ViewProps & { id: BuildingId }) {
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
      (r) => Math.abs(beforeRates[r] - afterRates[r]) > 0.0005,
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
                ? `Tools +${formatResource(0.05 * f.equipment * 100)}pp automation. `
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
export function Production(props: ViewProps) {
  const s = props.session.game.state
  const [filter, setFilter] = useState('Production')
  const planned = researchPlan(s)
  const available = BUILDING_IDS.filter((id) => {
    const action = ACTION_IDS.find((a) => ACTIONS[a].building === id)
    if (
      action &&
      !ACTIONS[action].visible(s) &&
      !assigned(s, ACTIONS[action].job)
    )
      return false
    return (
      s.facilities[id].level > 0 ||
      BUILDINGS[id].forms.some((f) => !requirementBlocker(planned, f.requires))
    )
  })
  return (
    <section>
      <div className="section-heading">
        <h2>Workplaces</h2>
      </div>
      <fieldset className="facility-filters" aria-label="Facility filters">
        {['All', 'Production', 'Storage', 'Housing & support'].map((value) => (
          <Button
            key={value}
            aria-pressed={filter === value}
            variant={filter === value ? 'solid' : 'soft'}
            onClick={() => setFilter(value)}
          >
            {value}
          </Button>
        ))}
      </fieldset>
      <div className="building-grid">
        {(filter === 'All' || filter === 'Production') &&
          ACTION_IDS.filter(
            (id) =>
              ACTIONS[id].visible(s) &&
              !available.includes(ACTIONS[id].building),
          ).map((id) => (
            <ActionCard key={id} session={props.session} id={id} />
          ))}
        {available
          .filter(
            (id) =>
              filter === 'All' ||
              (filter === 'Production'
                ? BUILDINGS[id].job
                : filter === 'Storage'
                  ? BUILDINGS[id].forms.some((form) => form.storage)
                  : !BUILDINGS[id].job &&
                    !BUILDINGS[id].forms.some((form) => form.storage)),
          )
          .map((id) => (
            <Facility key={id} {...props} id={id} />
          ))}
      </div>
    </section>
  )
}
