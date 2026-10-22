import { useEffect, useRef, useState } from 'react'
import { type AwayProgress, awaySummary } from '../clock'
import { RESOURCE_INFO } from '../constants'
import { OCCUPATIONS } from '../economy'
import { formatDuration, formatResource } from '../format'
import { RESOURCES } from '../ids'
import { QUEUES, queueBlocker } from '../research'
import { storageMultiplier } from '../resources'
import type { GameSession } from '../session'
import { Button } from './common'

function ExpertiseGains({ people }: { people: AwayProgress['expertise'] }) {
  return (
    <ul className="away-milestones">
      {people.map((person) => (
        <li key={person.index}>
          <strong>{person.name}</strong>
          <span>
            {person.gains
              .map(
                (gain) =>
                  `${OCCUPATIONS[gain.job].aptitude} ${gain.before} → ${gain.after}`,
              )
              .join(' · ')}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function AwayNotification({
  session,
  report,
}: {
  session: GameSession
  report: AwayProgress
}) {
  const [seen, setSeen] = useState(report)
  const [shown, setShown] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  if (report !== seen) {
    setSeen(report)
    setShown(true)
  }
  useEffect(() => {
    if (!shown || dialogOpen) return
    const timer = setTimeout(() => setShown(false), 20000)
    return () => clearTimeout(timer)
  }, [shown, dialogOpen])
  if (!shown) return null
  return (
    <div className="away-toast" role="status">
      <button
        type="button"
        className="away-toast-body"
        onClick={() => {
          dialog.current?.showModal()
          setDialogOpen(true)
        }}
      >
        <strong>Away · {formatDuration(report.wallSeconds)}</strong>
        <span className="away-toast-counts">{awaySummary(report)}</span>
      </button>
      <button
        type="button"
        className="away-toast-close"
        aria-label="Dismiss away report"
        onClick={() => setShown(false)}
      >
        ×
      </button>
      <dialog
        ref={dialog}
        className="modal away-modal"
        onClose={() => setDialogOpen(false)}
      >
        <div className="modal-box">
          <AwayReport session={session} report={report} />
          <div className="modal-action">
            <Button onClick={() => dialog.current?.close()}>Close</Button>
          </div>
        </div>
      </dialog>
    </div>
  )
}

export function AwayReport({
  session,
  report,
}: {
  session: GameSession
  report: AwayProgress
}) {
  const [open, setOpen] = useState(false)
  const s = session.game.state,
    changedResources = RESOURCES.filter(
      (r) => Math.abs(report.gains[r]) > 0.0005,
    ),
    blockers = QUEUES.flatMap((id) => {
      const blocker = queueBlocker(s, id)
      return blocker && blocker !== 'Waiting'
        ? [`${id === 'research' ? 'Research' : 'Construction'} · ${blocker}`]
        : []
    }),
    crowded = RESOURCES.filter((r) => storageMultiplier(s, r) < 1)
  return (
    <section className="away-report" aria-label="Offline progress">
      <button
        type="button"
        className="away-summary"
        aria-expanded={open}
        aria-controls="away-details"
        onClick={() => setOpen(!open)}
      >
        <span>
          <strong>Away · {formatDuration(report.wallSeconds)}</strong>
          <small className="away-subtitle">While you were away</small>
        </span>
        <span className="away-summary-counts">
          {report.arrivals} {report.arrivals === 1 ? 'arrival' : 'arrivals'} ·{' '}
          {report.completed} {report.completed === 1 ? 'project' : 'projects'}
        </span>
        <span className="away-chevron" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>
      <div id="away-details" className="away-details" hidden={!open}>
        <dl className="away-stats">
          <div>
            <dt>Time away</dt>
            <dd>{formatDuration(report.wallSeconds)}</dd>
          </div>
          <div>
            <dt>Simulated</dt>
            <dd>{formatDuration(report.effectiveSeconds)}</dd>
          </div>
          <div>
            <dt>Arrivals</dt>
            <dd>{report.arrivals}</dd>
          </div>
          <div>
            <dt>Projects completed</dt>
            <dd>{report.completed}</dd>
          </div>
        </dl>
        {report.effectiveSeconds < report.wallSeconds && (
          <p className="away-note">Longer absences progress more slowly.</p>
        )}
        <section className="away-section" aria-label="Resource changes">
          <h3>Resource changes</h3>
          {changedResources.length ? (
            <ul className="away-resources">
              {changedResources.map((r) => (
                <li key={r} data-negative={report.gains[r] < 0}>
                  <span>{RESOURCE_INFO[r].name}</span>
                  <strong>
                    {report.gains[r] >= 0 ? '+' : '−'}
                    {formatResource(Math.abs(report.gains[r]))}
                  </strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="away-note">No net resource change.</p>
          )}
        </section>
        {report.expertise.length > 0 && (
          <section className="away-section" aria-label="Growing expertise">
            <h3>Growing expertise</h3>
            <ExpertiseGains people={report.expertise.slice(0, 5)} />
            {report.expertise.length > 5 && (
              <details>
                <summary>{report.expertise.length - 5} more people</summary>
                <ExpertiseGains people={report.expertise.slice(5)} />
              </details>
            )}
          </section>
        )}
        {(blockers.length > 0 || crowded.length > 0) && (
          <section
            className="away-section away-attention"
            aria-label="Needs attention"
          >
            <h3>Needs attention</h3>
            {blockers.length > 0 && (
              <ul>
                {blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            )}
            {crowded.length > 0 && (
              <p className="away-storage">
                <strong>Crowded storage</strong>
                <span>
                  {crowded.map((r) => RESOURCE_INFO[r].name).join(' · ')}
                </span>
              </p>
            )}
          </section>
        )}
      </div>
    </section>
  )
}
