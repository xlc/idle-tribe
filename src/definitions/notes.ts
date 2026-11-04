import type { NoteId } from '../ids'

// One-time unlock notes, shown as a dialog the first time each feature
// unlocks and re-readable from Settings. Keep them terse: facts, not
// walkthroughs. Unlock conditions live in settlement.ts (noteUnlocked).
export const NOTES: Record<NoteId, { title: string; text: string }> = {
  research: {
    title: 'Research',
    text: 'Each research plan puts one idle person to work as its researcher until the plan completes or is stopped.',
  },
  jobs: {
    title: 'Jobs',
    text: 'People can take jobs at workplaces. Assign them from the People tab or a card’s + controls.',
  },
  expedition: {
    title: 'Expedition camp',
    text: 'Successful explores open the expedition camp and its encounters.',
  },
  happiness: {
    title: 'Happiness',
    text: 'Happiness tracks food, housing, and leisure, and scales everything people produce.',
  },
  paths: {
    title: 'Paths',
    text: 'Completing a branch research commits the settlement; the other branch stays closed.',
  },
  eras: {
    title: 'New era',
    text: 'A new era brings its own buildings, jobs, and research.',
  },
  'time-box': {
    title: 'Time box',
    text: 'The time box can start a new settlement, keeping legacy points and perks.',
  },
}
