import type { EXPEDITION_ENCOUNTER_IDS } from '../../ids'
import type { ExpeditionEncounter, GameState, ResourceId } from '../../types'

export type Discovery = keyof GameState['discovered']
export const EXPLORE_DISCOVERIES: Discovery[] = ['wood', 'stone']
type ExploreFind = {
  resource: ResourceId
  amount: (level: number) => number
  discovery?: Discovery
}
export const EXPLORE_FINDS: ExploreFind[] = [
  { resource: 'food', amount: (level) => 2 + level },
  { resource: 'wood', amount: (level) => 1 + level, discovery: 'wood' },
  { resource: 'stone', amount: (level) => 1 + level, discovery: 'stone' },
]

export const EXPEDITION_ENCOUNTERS: Record<
  (typeof EXPEDITION_ENCOUNTER_IDS)[number],
  ExpeditionEncounter
> = {
  'abandoned-cache': {
    id: 'abandoned-cache',
    title: 'An abandoned cache',
    description: 'Someone left useful supplies beneath a flat stone.',
    minimumLevel: 5,
    weight: 1,
    automatedOption: 0,
    options: [
      {
        label: 'Take the supplies',
        description: '+30 wood · +20 stone',
        effect: { kind: 'resources', amount: { wood: 30, stone: 20 } },
      },
      {
        label: 'Study the markings',
        description: '+25 knowledge',
        effect: { kind: 'resources', amount: { knowledge: 25 } },
      },
    ],
  },
  'ridge-travelers': {
    id: 'ridge-travelers',
    title: 'Travelers on the ridge',
    description: 'A small group is looking for a settlement worth joining.',
    minimumLevel: 5,
    weight: 1,
    automatedOption: 0,
    options: [
      {
        label: 'Invite them onward',
        description: 'Bring the next arrival closer',
        effect: { kind: 'arrival-progress', amount: 0.35 },
      },
      {
        label: 'Share a meal',
        description: '+10 happiness',
        effect: { kind: 'happiness', amount: 10 },
      },
    ],
  },
  'old-waystone': {
    id: 'old-waystone',
    title: 'An old waystone',
    description: 'The worn symbols describe a route beyond the familiar hills.',
    minimumLevel: 7,
    weight: 1,
    automatedOption: 1,
    options: [
      {
        label: 'Map the route',
        description: '+40 knowledge',
        effect: { kind: 'resources', amount: { knowledge: 40 } },
      },
      {
        label: 'Mark it for later',
        description: '+15 wood · +15 stone',
        effect: { kind: 'resources', amount: { wood: 15, stone: 15 } },
      },
    ],
  },
  'quiet-grove': {
    id: 'quiet-grove',
    title: 'A quiet grove',
    description: 'The grove is safe, shaded, and full of food-bearing plants.',
    minimumLevel: 9,
    weight: 1,
    automatedOption: 0,
    options: [
      {
        label: 'Gather carefully',
        description: '+45 food',
        effect: { kind: 'resources', amount: { food: 45 } },
      },
      {
        label: 'Rest and return',
        description: '+8 happiness',
        effect: { kind: 'happiness', amount: 8 },
      },
    ],
  },
}
