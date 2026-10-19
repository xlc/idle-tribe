import { useState } from 'react'
import { ACTIONS } from '../actions'
import { RESOURCE_INFO } from '../constants'
import { BUILDINGS, isProductionJob, JOBS } from '../economy'
import { feastCost } from '../food'
import { formatCompactResource, formatCost, formatResource } from '../format'
import { removeFacility } from '../game'
import { ACTION_IDS, BUILDING_IDS, JOB_IDS, RESOURCES } from '../ids'
import {
  allEntries,
  nextEquipment,
  nextExpansion,
  previewProject,
  researchPlan,
} from '../research'
import { committed, storageMultiplier, threshold } from '../resources'
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
  workerRate,
} from '../settlement'
import { resourceRates } from '../simulation'
import type { BuildingId, JobId } from '../types'
import { Button, Costs, type ViewProps } from './common'
export function Stockpile({ session }: { session: GameSession }) {
  const s = session.game.state,
    rates = resourceRates(s)
  return (
    <section className="stockpile" aria-label="Stockpile">
      {RESOURCES.filter(
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
      ).map((r) => {
        const k = threshold(s, r),
          pressure = storageMultiplier(s, r),
          reserved = committed(s, r)
        return (
          <div
            className={`resource resource-${r}`}
            key={r}
            title={`${RESOURCE_INFO[r].description}\nComfortable storage ${formatResource(k)}; production ×${formatResource(pressure)}${reserved ? `\nCommitted ${formatResource(reserved)}` : ''}`}
          >
            <span className="resource-name">
              {RESOURCE_INFO[r].icon} {RESOURCE_INFO[r].name}
            </span>
            <strong className="resource-value">
              {formatCompactResource(s.resources[r])}
            </strong>
            <span className="resource-rate" data-negative={rates[r] < 0}>
              {rates[r] >= 0 ? '+' : ''}
              {formatCompactResource(rates[r])}/min
            </span>
            <small className={pressure < 1 ? 'pressure' : ''}>
              {formatCompactResource(k)} comfort
              {reserved ? ` · ${formatCompactResource(reserved)} held` : ''}
            </small>
          </div>
        )
      })}
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
    <fieldset className="worker-control" aria-label={`${job} staffing`}>
      <Button
        title="Release worker"
        disabled={!n}
        onClick={() => session.change(() => session.game.adjust(job, -1))}
      >
        −
      </Button>
      <span className="worker-count" title="Assigned / efficient staffing">
        {n} / {cap}
      </span>
      <Button
        title="Assign worker"
        disabled={!available || !jobUnlocked(s, job)}
        onClick={() => session.change(() => session.game.adjust(job, 1))}
      >
        +
      </Button>
      <Button
        title="Assign available people up to efficient staffing"
        disabled={!available || n >= cap || !jobUnlocked(s, job)}
        onClick={() => session.change(() => session.game.fill(job))}
      >
        Fill
      </Button>
    </fieldset>
  )
}
export function Workforce({ session }: { session: GameSession }) {
  const s = session.game.state,
    arrival = arrivalStatus(s)
  return (
    <section className="workforce-bar" aria-label="Population">
      <div>
        <h2 title="Every new pair of hands arrives with a matching mouth.">
          {s.people.length} people{' '}
          <small>/ {comfortablePlaces(s)} comfortable places</small>
        </h2>
        <p>
          {assigned(s, 'idle')} available
          {happinessUnlocked(s)
            ? ` · Happiness ${formatResource(s.happiness)} / 100`
            : ''}
        </p>
        {happinessUnlocked(s) && (
          <small title="Happiness moves up to two points per minute.">
            Happiness target {formatResource(happinessTarget(s))}
          </small>
        )}
      </div>
      <div className="arrival-control">
        <label>
          <input
            className="checkbox checkbox-sm"
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
        <p>
          {formatResource(speed)} work/min ·{' '}
          {s.queues.construction.active ? 'Building' : 'Waiting'}
        </p>
        <small>
          Next healthy builder: +
          {formatResource(constructionSpeed(s, 1) - speed)} work/min
        </small>
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
        ? 'Not built'
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
      className="building-card card"
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
      <p className="flavor">{form.description}</p>
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
            ? `Base housing: ${form.housing} places per level`
            : form.storage
              ? RESOURCES.filter((r) => form.storage?.[r])
                  .map(
                    (r) =>
                      `+${form.storage?.[r]} ${RESOURCE_INFO[r].name.toLowerCase()} base storage`,
                  )
                  .join(' · ')
              : def.effect}
        </p>
      )}
      <p className="building-status">
        {blocked || (job ? 'Producing' : 'In use')}
      </p>
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
        {job && output && (
          <p>
            Recipe: {formatCost(input)} → 1{' '}
            {RESOURCE_INFO[output].name.toLowerCase()}
          </p>
        )}
        <p>
          {form.rate
            ? `${form.rate}/min per healthy worker before bonuses. `
            : ''}
          {job
            ? `Installed tools ×${formatResource(equipmentMultiplier(f.equipment))}. `
            : ''}
          {quote.blocker}
        </p>
        {!f.level && def.forms.length > 1 && (
          <label>
            Build form{' '}
            <select
              className="select select-sm"
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
        <span>One settlement, room to grow</span>
      </div>
      <fieldset className="facility-filters" aria-label="Facility filters">
        {['All', 'Production', 'Storage', 'Housing & support'].map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={filter === value}
            className="btn btn-sm"
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
export function People({ session }: { session: GameSession }) {
  const s = session.game.state,
    cost = feastCost(s)
  return (
    <details>
      <summary>People · {s.people.length}</summary>
      {cost > 0 && (
        <div className="feast-row">
          <Button
            title="An entire settlement briefly agrees on what to do next."
            disabled={s.resources.food < cost}
            onClick={() => session.change(() => session.game.feast())}
          >
            Feast · {cost} food
          </Button>
        </div>
      )}
      {s.people.map((p, i) => (
        <div className="person-row" key={p.name}>
          <label>
            {p.name} <span className="person-health">♥ {p.health}/5</span>
            <select
              className="select select-sm"
              value={p.job}
              onChange={(e) => {
                const job = JOB_IDS.find((id) => id === e.target.value)
                if (job) session.change(() => session.game.assign(i, job))
              }}
            >
              {JOB_IDS.filter((job) => jobUnlocked(s, job)).map((job) => (
                <option key={job} value={job}>
                  {job === 'idle'
                    ? 'Available'
                    : job === 'builder'
                      ? 'Builder'
                      : JOBS[job].name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ))}
    </details>
  )
}
