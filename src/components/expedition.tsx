import { EXPEDITION_ENCOUNTERS } from '../definitions/tribal/exploration'
import type { GameSession } from '../session'
import type { EncounterOptionIndex, GameState } from '../types'
import { Button } from './common'

function optionIndex(value: number): EncounterOptionIndex {
  return value === 0 ? 0 : 1
}

export function ExpeditionEncounter({ session }: { session: GameSession }) {
  const state: GameState = session.game.state,
    id = state.pendingEncounter
  if (!id) return null
  const encounter = EXPEDITION_ENCOUNTERS[id]
  if (!encounter) return null
  return (
    <article
      className="expedition-encounter panel"
      aria-label="Expedition report"
    >
      <div className="expedition-encounter-copy">
        <span className="action-status action-status-ready">
          Expedition report
        </span>
        <h2>{encounter.title}</h2>
        <p>{encounter.description}</p>
      </div>
      <div className="expedition-options">
        {encounter.options.map((option, index) => (
          <Button
            key={option.label}
            color={index === 0 ? 'grass' : 'gray'}
            variant={index === 0 ? 'solid' : 'soft'}
            onClick={() =>
              session.change(() =>
                session.game.resolveEncounter(optionIndex(index)),
              )
            }
          >
            <span>{option.label}</span>
            <small>{option.description}</small>
          </Button>
        ))}
      </div>
    </article>
  )
}
