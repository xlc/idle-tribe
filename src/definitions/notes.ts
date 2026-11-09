import type { NoteId } from '../ids'

// One-time unlock notes, shown as a dialog the first time each feature
// unlocks and re-readable from Settings. Keep them terse: facts, not
// walkthroughs. Unlock conditions live in settlement.ts (noteUnlocked).
export const NOTES: Record<NoteId, { title: string; text: string }> = {
  research: {
    title: 'Research',
    text: 'Manual actions and manual research each require an idle worker. The worker stays busy until the action or research completes or you stop it.',
  },
  jobs: {
    title: 'Jobs',
    text: 'Review population and settlement output from the Stats tab.',
  },
  expedition: {
    title: 'Expedition camp',
    text: 'A successful explore unlocks the expedition camp and its encounters.',
  },
  happiness: {
    title: 'Happiness',
    text: 'Food, housing, and leisure shape happiness, which scales everything people produce.',
  },
  paths: {
    title: 'Paths',
    text: 'Completing one branch of research commits the settlement and closes the other branch.',
  },
  eras: {
    title: 'New era',
    text: 'Each new era brings its own buildings, jobs, and research.',
  },
  'time-box': {
    title: 'Time box',
    text: 'The time box starts a new settlement while keeping your legacy points and perks.',
  },
}
