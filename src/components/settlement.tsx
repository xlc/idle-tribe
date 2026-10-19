import { useLayoutEffect, useRef } from 'react'
import { JOBS, RECRUIT_COST } from '../constants'
import { BUILDINGS, isAutomationUnlocked, JOB_BUILDING } from '../economy'
import {
  formatCompactResource,
  formatResearchCost,
  formatResource,
} from '../format'
import { BUILDING_IDS, isJobId, JOB_IDS, RESOURCES } from '../ids'
import { RESOURCE_DEFINITIONS } from '../resources'
import type { GameSession } from '../session'
import type { BuildingId, Person } from '../types'
import { Costs, Disclosure } from './common'

export function Stockpile({ session }: { session: GameSession }) {
  const { game } = session
  const rates = game.getResourceRates(null)
  return (
    <section className="stockpile" id="resource-list" aria-label="Stockpile">
      {RESOURCES.filter(
        (id) =>
          RESOURCE_DEFINITIONS[id].visible(game.state) || game.state[id] > 0,
      ).map((id) => {
        const value = game.state[id]
        const rate = rates[id] * 60
        return (
          <div key={id} className={`resource resource-${id}`}>
            <span className="resource-name">
              {RESOURCE_DEFINITIONS[id].name}
            </span>
            <output
              className="resource-value"
              title={formatResource(value)}
              aria-label={`${formatResource(value)} ${id}`}
            >
              {formatCompactResource(value)}
            </output>
            <span
              className="resource-rate"
              data-negative={rate < 0}
              title="Current net production per minute, including processing and meals."
            >
              {Math.abs(rate) < 0.05
                ? '—'
                : `${rate > 0 ? '+' : '−'}${formatCompactResource(Math.abs(rate))}/min`}
            </span>
          </div>
        )
      })}
    </section>
  )
}

export function Workforce({ session }: { session: GameSession }) {
  const { game } = session
  const { state } = game
  const automated = isAutomationUnlocked(state)
  const idle = state.people.filter((person) => person.job === 'idle').length
  const capacity = game.getPopulationCapacity()
  return (
    <section className="workforce-bar" aria-label="Workforce">
      <div>
        <h2 id="population-count">
          {state.people.length} / {capacity}{' '}
          {state.people.length === 1 ? 'person' : 'people'}
        </h2>
        {automated && (
          <p id="camp-summary">
            {state.people.length - idle} working · {idle} available
          </p>
        )}
      </div>
      {automated && (
        <div className="recruit-control">
          <button
            className="btn btn-primary btn-sm min-h-11"
            id="recruit-button"
            type="button"
            disabled={!game.canRecruit()}
            aria-label={`Invite a person. ${RECRUIT_COST} fruit`}
            onClick={() =>
              session.change(
                game.recruitPerson,
                Date.now(),
                'A new person joined the tribe.',
              )
            }
          >
            Invite a person{' '}
            <span className="font-normal opacity-85">{RECRUIT_COST} fruit</span>
          </button>
          <span className="small-note" id="recruit-status">
            {state.people.length >= capacity ? 'More shelter needed' : ''}
          </span>
        </div>
      )}
    </section>
  )
}

function BuildingCard({
  session,
  id,
}: {
  session: GameSession
  id: BuildingId
}) {
  const { game } = session
  const { state } = game
  const definition = BUILDINGS[id]
  const level = state.buildings[id]
  if (
    (!game.isBuildingUnlocked(id) && !level) ||
    (definition.milestone && level > 0)
  )
    return null
  const job = definition.job
  const people = job ? state.people.filter((person) => person.job === job) : []
  const worker = people[0] ?? { job: job ?? 'idle', hunger: 5, maxHunger: 5 }
  const gain = game.getWorkerGain({ ...worker, hunger: worker.maxHunger }, true)
  const input = job ? game.getJobInput(job) : {}
  const recipe = job
    ? `${Object.keys(input).length ? `${formatResearchCost({ ...input, durationMs: 0 })} → ` : '+'}${formatResource(gain)} ${JOBS[job].resource} / ${JOBS[job].durationMs / 1000}s per worker`
    : (definition.description?.(state) ?? '')
  const status = !job
    ? level && definition.milestone
      ? 'Established'
      : ''
    : !level
      ? 'Build to assign workers'
      : !people.length
        ? 'No workers assigned'
        : !people.some(game.canWork)
          ? `Waiting for ${Object.keys(input).join(', ')}`
          : people.some((person) => person.hunger <= 3)
            ? 'Food shortage · reduced output'
            : 'Producing'
  const capacity = job ? game.getJobCapacity(job) : 0
  const idle = state.people.some((person) => person.job === 'idle')
  const maxed = level >= definition.maxLevel
  return (
    <article
      id={`building-${id}`}
      className="building-card card card-border border-base-300 bg-base-100 min-w-0 p-4"
      data-built={level > 0}
    >
      <div className="card-title justify-between items-baseline text-sm">
        <h3>{definition.name}</h3>
        <span className="level-label">
          {level ? `Lv ${level}` : 'Not built'}
        </span>
      </div>
      <p className="building-recipe">{recipe}</p>
      <p className="building-status">{status}</p>
      {job && people.length > 0 && (
        <progress
          className="progress progress-accent h-1 mt-2 mb-3"
          max={100}
          value={
            (Math.max(...people.map((person) => person.workElapsedMs)) /
              JOBS[job].durationMs) *
            100
          }
          aria-label={`${definition.name} production cycle`}
        />
      )}
      <div className="building-controls">
        {job && (
          <div className="worker-control">
            <button
              type="button"
              className="btn btn-sm btn-square min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 text-lg"
              aria-label={`Remove worker from ${definition.name}`}
              disabled={!people.length}
              onClick={() =>
                session.change(() => game.adjustWorkers(job, -1), Date.now())
              }
            >
              −
            </button>
            <output
              className="worker-count"
              aria-label={`${people.length} workers, capacity ${capacity}`}
            >
              {people.length} / {capacity}
            </output>
            <button
              type="button"
              className="btn btn-sm btn-square min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 text-lg"
              aria-label={`Assign worker to ${definition.name}`}
              disabled={
                !idle || !game.isJobUnlocked(job) || people.length >= capacity
              }
              onClick={() =>
                session.change(() => game.adjustWorkers(job, 1), Date.now())
              }
            >
              +
            </button>
          </div>
        )}
        {!maxed && (
          <button
            type="button"
            className="btn btn-primary btn-soft btn-sm min-h-11 sm:min-h-9"
            aria-label={`${level ? 'Expand' : 'Build'} ${definition.name}`}
            disabled={!game.canBuild(id)}
            onClick={() =>
              session.change(
                () => game.build(id),
                Date.now(),
                definition.milestone?.message ??
                  `${definition.name} ${level ? 'expanded' : 'built'}.`,
              )
            }
          >
            {level ? 'Expand' : 'Build'}
          </button>
        )}
      </div>
      {!maxed && <Costs cost={game.getBuildingCost(id)} state={state} />}
    </article>
  )
}

export function Production({ session }: { session: GameSession }) {
  return (
    <section
      id="production-section"
      aria-labelledby="production-heading"
      hidden={!isAutomationUnlocked(session.game.state)}
    >
      <div className="section-heading">
        <h2 id="production-heading">Production</h2>
      </div>
      <div className="building-grid" id="building-list">
        {BUILDING_IDS.map((id) => (
          <BuildingCard key={id} session={session} id={id} />
        ))}
      </div>
    </section>
  )
}

function PersonRow({
  session,
  person,
}: {
  session: GameSession
  person: Person
}) {
  const { game } = session
  return (
    <div className="person-row">
      <span>{person.name}</span>
      <span
        className="person-health"
        data-hungry={person.hunger <= 3}
        title={`${person.hunger <= 3 ? 'Hungry · reduced output' : 'Fed'} · 1 fruit per person each minute when fed`}
      >
        {formatResource(person.hunger)}/{formatResource(person.maxHunger)}
      </span>
      {isAutomationUnlocked(game.state) && (
        <select
          className="select select-sm col-span-full w-full min-h-11 sm:min-h-9"
          aria-label={`Workplace for ${person.name}`}
          value={person.job}
          onChange={(event) => {
            const job = event.currentTarget.value
            if (isJobId(job))
              session.change(() => game.assignJob(person, job), Date.now())
          }}
        >
          {JOB_IDS.map((job) => (
            <option
              key={job}
              value={job}
              disabled={
                !game.isJobUnlocked(job) ||
                (job !== 'idle' &&
                  job !== person.job &&
                  game.state.people.filter((candidate) => candidate.job === job)
                    .length >= game.getJobCapacity(job))
              }
            >
              {job === 'idle' ? 'Available' : BUILDINGS[JOB_BUILDING[job]].name}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

export function People({ session }: { session: GameSession }) {
  const { game } = session
  const hungry = game.state.people.filter((person) => person.hunger <= 3).length
  const cost = game.getFeastCost()
  return (
    <Disclosure
      id="people-details"
      title={
        <>
          People{' '}
          <span
            className="float-right text-[10px] text-neutral font-normal"
            id="food-summary"
          >
            {hungry ? `${hungry} hungry` : 'Fed'}
          </span>
        </>
      }
    >
      <div id="tribe-list">
        {game.state.people.map((person, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: People are append-only and never reordered during a session.
          <PersonRow key={index} session={session} person={person} />
        ))}
      </div>
      <div className="feast-row">
        <button
          className="btn btn-sm btn-ghost min-h-11 sm:min-h-9"
          id="feast-button"
          type="button"
          disabled={!game.canFeast()}
          onClick={() =>
            session.change(game.feast, Date.now(), 'The tribe shared a feast.')
          }
        >
          Feast
        </button>
        <span className="small-note" id="feast-cost">
          {cost ? `${cost} fruit · restore everyone` : 'Everyone is fed'}
        </span>
      </div>
    </Disclosure>
  )
}

export function Milestone({
  session,
  id,
}: {
  session: GameSession
  id: BuildingId
}) {
  const milestone = BUILDINGS[id].milestone
  const built = session.game.state.buildings[id] > 0
  const section = useRef<HTMLElement>(null)
  const wasBuilt = useRef(built)
  useLayoutEffect(() => {
    if (built && !wasBuilt.current) {
      section.current?.scrollIntoView({ block: 'start' })
      section.current?.focus({ preventScroll: true })
    }
    wasBuilt.current = built
  }, [built])
  if (!milestone) return null
  return (
    <section
      ref={section}
      className="village-complete card bg-success/10 p-5"
      id={milestone.target}
      tabIndex={-1}
      aria-labelledby={`${milestone.target}-title`}
      hidden={!built}
    >
      <span className="eyebrow">{BUILDINGS[id].name} complete</span>
      <h2 id={`${milestone.target}-title`}>A village of your own.</h2>
      <p>Your workshops keep working. Your tribe keeps growing.</p>
    </section>
  )
}
