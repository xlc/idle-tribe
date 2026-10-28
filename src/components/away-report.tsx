import * as Toast from '@radix-ui/react-toast'
import { useRef, useState } from 'react'
import { type AwayProgress, awayHighlight } from '../clock'
import { MIN_VISIBLE_RESOURCE_CHANGE } from '../constants'
import { OCCUPATIONS, RESOURCE_INFO } from '../definitions'
import { formatDuration, formatResource } from '../format'
import { RESOURCES } from '../ids'
import { QUEUES, queueBlocker } from '../research'
import { storageMultiplier } from '../resources'
import type { GameSession, SessionNotification } from '../session'
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

export function SessionNotificationToast({
  session,
  notification,
  onDismiss,
}: {
  session: GameSession
  notification: SessionNotification
  onDismiss: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)

  const report = notification.report
  const away = notification.kind === 'away' && report
  return (
    <Toast.Root
      className="event-toast panel panel-raised"
      duration={20_000}
      onOpenChange={(open) => {
        if (!open) onDismiss()
      }}
    >
      <span className="event-toast-mark" aria-hidden="true">
        {away ? '↺' : '✦'}
      </span>
      {away ? (
        <Toast.Description asChild>
          <button
            type="button"
            className="event-toast-body"
            onClick={() => dialog.current?.showModal()}
          >
            <strong>Welcome back</strong>
            <span className="event-toast-counts">
              Away for {formatDuration(report.wallSeconds)} ·{' '}
              {awayHighlight(report)}
            </span>
          </button>
        </Toast.Description>
      ) : (
        <Toast.Description className="event-toast-body event-toast-message">
          <strong>{notification.text}</strong>
        </Toast.Description>
      )}
      <Toast.Close asChild>
        <button
          type="button"
          className="event-toast-close"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </Toast.Close>
      {away && (
        <dialog ref={dialog} className="modal away-modal panel">
          <div className="modal-box">
            <AwayReport session={session} report={report} />
            <div className="modal-action">
              <Button onClick={() => dialog.current?.close()}>Close</Button>
            </div>
          </div>
        </dialog>
      )}
    </Toast.Root>
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
      (r) => Math.abs(report.gains[r]) > MIN_VISIBLE_RESOURCE_CHANGE,
    ),
    blockers = QUEUES.flatMap((id) => {
      const blocker = queueBlocker(s, id)
      return blocker && blocker !== 'Waiting'
        ? [`${id === 'research' ? 'Research' : 'Construction'} · ${blocker}`]
        : []
    }),
    crowded = RESOURCES.filter((r) => storageMultiplier(s, r) < 1)
  return (
    <section className="away-report panel" aria-label="Offline progress">
      <button
        type="button"
        className="away-summary"
        aria-expanded={open}
        aria-controls="away-details"
        onClick={() => setOpen(!open)}
      >
        <span>
          <strong>Welcome back</strong>
          <small className="away-subtitle">
            Away for {formatDuration(report.wallSeconds)}
          </small>
        </span>
        <span className="away-summary-counts">{awayHighlight(report)}</span>
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
          {report.arrivals > 0 && (
            <div>
              <dt>Arrivals</dt>
              <dd>{report.arrivals}</dd>
            </div>
          )}
          {report.completed > 0 && (
            <div>
              <dt>Projects completed</dt>
              <dd>{report.completed}</dd>
            </div>
          )}
          {report.encounters > 0 && (
            <div>
              <dt>Expedition discoveries</dt>
              <dd>{report.encounters}</dd>
            </div>
          )}
        </dl>
        {report.effectiveSeconds < report.wallSeconds && (
          <p className="away-note">Longer absences progress more slowly.</p>
        )}
        {changedResources.length > 0 && (
          <section className="away-section" aria-label="Resource changes">
            <h3>Resource changes</h3>
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
          </section>
        )}
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
