import { ACTIONS, manualRate } from '../actions'
import { formatDuration } from '../format'
import { ACTION_IDS } from '../ids'
import { canAfford } from '../resources'
import type { GameSession } from '../session'
import { Button, Costs } from './common'
export function ManualActions({
  session,
  discoveries = false,
}: {
  session: GameSession
  discoveries?: boolean
}) {
  const s = session.game.state,
    active = s.manual
  return (
    <div className="manual-actions">
      {ACTION_IDS.filter(
        (id) =>
          ACTIONS[id].visible(s) &&
          Boolean(ACTIONS[id].discovery) === discoveries,
      ).map((id) => {
        const def = ACTIONS[id],
          running = active?.id === id
        return (
          <div className="manual-action" key={id}>
            <Button
              title={def.description}
              disabled={Boolean(active) || !canAfford(s, def.cost)}
              onClick={() => session.change(() => session.game.startAction(id))}
            >
              {def.name}
            </Button>
            {running ? (
              <div className="project-progress">
                <progress
                  className="progress progress-primary"
                  value={active.progress}
                  max={1}
                />
                <small>
                  {formatDuration((1 - active.progress) / manualRate(s))}
                </small>
              </div>
            ) : (
              <small>
                {def.resource
                  ? `+1 ${def.resource}`
                  : formatDuration(def.seconds)}
              </small>
            )}
            {discoveries && <Costs session={session} cost={def.cost} />}
          </div>
        )
      })}
    </div>
  )
}
