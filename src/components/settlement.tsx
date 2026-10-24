import { useState } from 'react'
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
import { ACTION_IDS, BUILDING_IDS, isWorkingJob, RESOURCES } from '../ids'
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
  jobCapacity,
  jobInput,
  jobUnlocked,
  requirementBlocker,
  staffingMultiplier,
  workerRate,
} from '../settlement'
import { resourceFlows, resourceRates } from '../simulation'
import type { BuildingId, JobId } from '../types'
import { BuildingArt, ResourceArt } from './art'
import { Button, Costs, type ViewProps } from './common'
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
  return (
    <section className="stockpile-panel panel" aria-label="Stockpile">
      <div className="stockpile" id="stockpile-resources">
        {visibleResources.map((r) => {
          const pressure = storageMultiplier(s, r),
            flow = flows[r],
            net = flow.production - flow.inputs - flow.meals
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
                  data-negative={net < 0}
                  data-zero={net === 0}
                >
                  {net > 0 ? '+' : ''}
                  {formatCompactResource(net)}/min
                </span>
                <small className="storage-effect" data-idle={pressure >= 1}>
                  Storage ×{formatResource(pressure)}
                </small>
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}
export function WorkerControls({
  session,
  job,
}: {
  session: GameSession
  job: JobId
}) {
  const s = session.game.state,
    n = assigned(s, job),
    cap = jobCapacity(s, job),
    available = assigned(s, 'idle')
  return (
    <div className="worker-allocation">
      <fieldset className="worker-control" aria-label={`${job} staffing`}>
        <Button
          disabled={!n}
          onClick={() => session.change(() => session.game.adjust(job, -1))}
        >
          −
        </Button>
        <output className="worker-count">{n}</output>
        <Button
          disabled={!available || !jobUnlocked(s, job)}
          onClick={() => session.change(() => session.game.adjust(job, 1))}
        >
          +
        </Button>
        <Button
          disabled={!available || n >= cap || !jobUnlocked(s, job)}
          onClick={() => session.change(() => session.game.fill(job))}
        >
          Fill
        </Button>
      </fieldset>
      <small className="staffing-target">{cap} efficient</small>
      {n > 0 && isWorkingJob(job) && staffingMultiplier(s, job) < 1 && (
        <small className="staffing-efficiency">
          {formatResource(staffingMultiplier(s, job) * 100)}% efficiency
        </small>
      )}
    </div>
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
  const blocked = missingInputs.length
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
      className="building-card panel"
      data-built={f.level > 0}
      aria-label={form.name}
    >
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
                {output ? RESOURCE_INFO[output].name.toLowerCase() : 'work'}/min
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
        {job && f.level > 0 && <WorkerControls session={session} job={job} />}
      </div>
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
  const [filter, setFilter] = useState('All')
  const planned = researchPlan(s)
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
        {BUILDING_IDS.filter(
          (id) =>
            (filter === 'All' ||
              (filter === 'Production'
                ? BUILDINGS[id].job
                : filter === 'Storage'
                  ? BUILDINGS[id].forms.some((form) => form.storage)
                  : !BUILDINGS[id].job &&
                    !BUILDINGS[id].forms.some((form) => form.storage))) &&
            (s.facilities[id].level > 0 ||
              BUILDINGS[id].forms.some(
                (f) => !requirementBlocker(planned, f.requires),
              )),
        ).map((id) => (
          <Facility key={id} {...props} id={id} />
        ))}
      </div>
    </section>
  )
}
