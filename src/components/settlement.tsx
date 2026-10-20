import { useState } from 'react'
import { ACTIONS } from '../actions'
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
    <section className="stockpile-panel" aria-label="Stockpile">
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
              <span className="resource-name">{RESOURCE_INFO[r].name}</span>
              <strong className="resource-value">
                {formatCompactResource(s.resources[r])}
              </strong>
              <div className="resource-meta">
                <span className="resource-rate" data-negative={net < 0}>
                  {net >= 0 ? '+' : ''}
                  {formatCompactResource(net)}/min
                </span>
                <small className="storage-effect" hidden={pressure >= 1}>
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
          title="Release the worker contributing least"
          disabled={!n}
          onClick={() => session.change(() => session.game.adjust(job, -1))}
        >
          −
        </Button>
        <span
          className="worker-count"
          title="Assigned people / nominal staffing target"
        >
          {n} / {cap}
        </span>
        <Button
          title="Assign the best available worker"
          disabled={!available || !jobUnlocked(s, job)}
          onClick={() => session.change(() => session.game.adjust(job, 1))}
        >
          +
        </Button>
        <Button
          title="Assign the best available people up to the staffing target"
          disabled={!available || n >= cap || !jobUnlocked(s, job)}
          onClick={() => session.change(() => session.game.fill(job))}
        >
          Fill
        </Button>
      </fieldset>
      {n > 0 && isWorkingJob(job) && staffingMultiplier(s, job) < 1 && (
        <small
          className="staffing-efficiency"
          title="Skilled workers also use workplace capacity. More people remain useful, with diminishing returns."
        >
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
        <h2 title="Every new pair of hands arrives with a matching mouth.">
          {s.people.length} people{' '}
          <small>/ {comfortablePlaces(s)} comfortable places</small>
        </h2>
        <p>{assigned(s, 'idle')} available</p>
        {happinessUnlocked(s) && (
          <div className="happiness-status">
            <span>Happiness {formatResource(s.happiness)}</span>
            <span
              className="status-meter happiness-meter"
              title={`Target ${formatResource(target)}`}
            >
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
        <small
          title={`Sustainable food ${formatResource(arrival.foodOutput)} / ${formatResource(arrival.required)} per minute required`}
        >
          {arrival.blocker ||
            `Next arrival · ${Math.ceil((1 - s.arrivalProgress) * arrival.interval)}m`}
        </small>
        <progress className="progress" value={s.arrivalProgress} max={1} />
      </div>
    </section>
  )
}
export function Builders({ session }: { session: GameSession }) {
  const s = session.game.state,
    speed = constructionSpeed(s)
  return (
    <section className="builders">
      <div>
        <h3 title="Turns everyone’s plans into things everyone can point at.">
          Builders
        </h3>
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
  const form = def.forms[f.level ? f.form : selectedForm]
  if (!form) return null
  const expansion = nextExpansion(s, id, selectedForm),
    quote = previewProject(s, expansion),
    job = def.job,
    n = job ? assigned(s, job) : 0
  const production = job
    ? s.people
        .filter((p) => p.job === job)
        .reduce((sum, p) => sum + workerRate(s, p), 0)
    : 0
  const input = job ? jobInput(s, job) : {},
    output = job && isProductionJob(job) ? JOBS[job].output : null
  const missingInputs =
    job && n > 0 && RESOURCES.some((r) => (input[r] ?? 0) > s.resources[r])
  const blocked = missingInputs
    ? 'Missing inputs'
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
      `${housing}${losses.join('; ')}${losses.length ? '. ' : ''}${job ? `${n} workers become available; ${formatResource(production)} ${output ? RESOURCE_INFO[output].name.toLowerCase() : ''}/min production removed. ` : ''}${rateChanges ? `${rateChanges}. ` : ''}Levels and equipment are lost with no refund. People and stockpiles remain.`,
      () => session.game.remove(id),
    )
  }
  return (
    <article
      className="building-card"
      data-built={f.level > 0}
      aria-label={form.name}
    >
      <div className="section-heading">
        <h3>{form.name}</h3>
        <span>
          Level {f.level}
          {f.equipment ? ` · tools ${f.equipment}` : ''}
        </span>
      </div>
      {job ? (
        <>
          <p className="building-recipe">
            {formatResource(production)}{' '}
            {output ? RESOURCE_INFO[output].name.toLowerCase() : ''}/min
            {RESOURCES.filter((r) => input[r]).map((r) => (
              <span key={r}>
                {' '}
                · −{formatResource(production * (input[r] ?? 0))}{' '}
                {RESOURCE_INFO[r].name.toLowerCase()}/min
              </span>
            ))}
          </p>
          {f.level > 0 && <WorkerControls session={session} job={job} />}
        </>
      ) : (
        <p className="building-recipe">
          {form.housing
            ? `Base +${form.housing} places/level`
            : form.storage
              ? RESOURCES.filter((r) => form.storage?.[r])
                  .map(
                    (r) =>
                      `Base +${form.storage?.[r]} ${RESOURCE_INFO[r].name.toLowerCase()} storage/level`,
                  )
                  .join(' · ')
              : def.effect}
        </p>
      )}
      {blocked && <p className="building-status">{blocked}</p>}
      {!(def.unique && f.level > 0) && (
        <>
          <Costs session={session} cost={quote.cost} />
          <div className="building-controls">
            <Button
              onClick={() =>
                session.change(() => session.game.build(id, selectedForm))
              }
            >
              {f.level ? 'Queue expansion' : 'Queue build'}
              {expansion.kind === 'expand' ? ` · ${expansion.target}` : ''}
            </Button>
            <small>{formatResource(quote.total)} work</small>
          </div>
        </>
      )}
      <details className="facility-detail">
        <summary>Details & upgrades</summary>
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
              ? `Tools ×${formatResource(equipmentMultiplier(f.equipment))}. `
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
        <h2>Facilities</h2>
      </div>
      <fieldset className="facility-filters" aria-label="Facility filters">
        {['All', 'Production', 'Storage', 'Housing & support'].map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={filter === value}
            className="btn"
            onClick={() => setFilter(value)}
          >
            {value}
          </button>
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
