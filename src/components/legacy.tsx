import { Card } from '@radix-ui/themes'
import { PERKS } from '../definitions'
import { formatResource } from '../format'
import { PERK_IDS } from '../ids'
import { buyPerk, canReset, legacyReward, resetRun } from '../prestige'
import { prestigeMultiplier } from '../settlement'
import { Button, type ViewProps } from './common'

export function Legacy({
  session,
  confirm,
  onReset,
}: ViewProps & { onReset: () => void }) {
  const s = session.game.state
  return (
    <>
      <h2>Mysterious time box · {s.legacy.points} legacy points</h2>
      <p>A small box with a very unreasonable relationship to time.</p>
      <p>
        {s.legacy.lifetime} lifetime points · efficiency ×
        {formatResource(prestigeMultiplier(s))}
        <span className="legacy-reset-note" data-visible={!canReset(s)}>
          {' · Reset requires Writing'}
        </span>
      </p>
      <p className="legacy-note">
        Lifetime points improve worker, construction, and research speed for
        every settlement.
      </p>
      <Button
        disabled={!canReset(s)}
        onClick={() =>
          confirm(
            'Begin a new settlement?',
            `Gain ${legacyReward(s)} legacy points. Lose all resources, people, facilities, equipment, assignments, aptitudes, personal expertise, action levels, discoveries, research, branch choices, and queued work. Keep lifetime points, perks, settings, and the time box.`,
            () => {
              resetRun(s)
              onReset()
            },
          )
        }
      >
        Reset settlement · +{legacyReward(s)}
      </Button>
      <div className="tech-grid">
        {PERK_IDS.map((id) => (
          <Card asChild key={id}>
            <article className="tech-card">
              <h3>{PERKS[id].name}</h3>
              <p className="flavor">{PERKS[id].description}</p>
              <p>{PERKS[id].effect}</p>
              <Button
                variant="solid"
                color="grass"
                disabled={
                  s.legacy.perks[id] || s.legacy.points < PERKS[id].cost
                }
                onClick={() => session.change(() => buyPerk(s, id))}
              >
                {s.legacy.perks[id] ? 'Owned' : `${PERKS[id].cost} points`}
              </Button>
            </article>
          </Card>
        ))}
      </div>
    </>
  )
}
