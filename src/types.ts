export type ActionId =
  | 'gather'
  | 'explore'
  | 'sticks'
  | 'explore-further'
  | 'stone'
  | 'research'
  | 'research-foraging'
  | 'research-stone-flakes'

export type ActionKey =
  | 'gather'
  | 'explore'
  | 'sticks'
  | 'exploreFurther'
  | 'stone'
  | 'research'
  | 'researchForaging'
  | 'researchStone'

export type ResearchId = 'sharpened-stick' | 'foraging-practice' | 'stone-flakes'

export interface Person {
  name: string
  hunger: number
  maxHunger: number
}

export interface Skill {
  level: number
  xp: number
}

export interface GameState {
  fruit: number
  wood: number
  stone: number
  people: Person[]
  actions: number
  explored: boolean
  exploreUnlocked: boolean
  stoneFound: boolean
  researchUnlocked: boolean
  basicTools: boolean
  researchLevels: Record<ResearchId, number>
  skills: Record<ActionId, Skill>
  foodElapsedMs: number
}

export interface ResearchCost {
  wood?: number
  fruit?: number
  stone?: number
  durationMs: number
}

export interface ResearchDefinition {
  actionId: ActionId
  name: string
  maxLevel: number
  prerequisite: () => boolean
  levels: ResearchCost[]
}

export interface Action {
  id: ActionId
  name: string
  researchId?: ResearchId
  baseDurationMs: number | (() => number)
  workingFeedback: string
  canStart?: () => boolean
  unavailableMessage?: string | (() => string)
  onStart?: () => void
  complete: () => string
}
