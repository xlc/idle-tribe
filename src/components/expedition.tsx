import { Card } from '@radix-ui/themes'
import { EXPEDITION_ENCOUNTERS } from '../definitions/tribal/exploration'
import { formatResource, formatResourceGain } from '../format'
import type { GameSession } from '../session'
import type { EncounterOption } from '../types'
import { Button } from './common'

function effectSummary(option: EncounterOption) {
  const effect = option.effect
  if (effect.kind === 'resources') return formatResourceGain(effect.amount)
  if (effect.kind === 'happiness')
    return `+${formatResource(effect.amount)} happiness`
  return `Arrival progress +${formatResource(effect.amount * 100)}%`
}

export function ExpeditionEncounter({ session }: { session: GameSession }) {
  const state = session.game.state,
    id = state.pendingEncounter
  if (!id) return null
  const encounter = EXPEDITION_ENCOUNTERS[id]
  if (!encounter) return null
  return (
    <Card asChild>
      <article
        className="expedition-encounter"
        aria-label="Expedition report"
        role="alert"
      >
        <div className="expedition-encounter-copy">
          <span className="action-status action-status-ready">
            Expedition report
          </span>
          <h2>{encounter.title}</h2>
          <p>{encounter.description}</p>
          <p className="expedition-choice-prompt">Choose one response.</p>
        </div>
        <div className="expedition-options">
          {encounter.options.map((option, index) => {
            const summary = effectSummary(option)
            return (
              <Button
                key={option.label}
                color={index === 0 ? 'grass' : 'gray'}
                variant={index === 0 ? 'solid' : 'soft'}
                onClick={() =>
                  session.change(() =>
                    session.game.resolveEncounter(index === 0 ? 0 : 1),
                  )
                }
              >
                <strong>{option.label}</strong>
                <small className="expedition-effect">{summary}</small>
                {option.description !== summary && (
                  <small>{option.description}</small>
                )}
              </Button>
            )
          })}
        </div>
      </article>
    </Card>
  )
}
