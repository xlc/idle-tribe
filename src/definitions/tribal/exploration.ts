import type { GameState, ResourceId } from '../../types'

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
