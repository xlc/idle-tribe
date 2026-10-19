export type ActionId =
  | 'gather'
  | 'explore'
  | 'sticks'
  | 'explore-further'
  | 'stone'
  | 'research'
  | 'research-foraging'
  | 'research-stone-flakes'
  | 'research-shelters'
  | 'research-axes'
  | 'research-quarrying'
  | 'research-teamwork'

export type ActionKey =
  | 'gather'
  | 'explore'
  | 'sticks'
  | 'exploreFurther'
  | 'stone'
  | 'research'
  | 'researchForaging'
  | 'researchStone'
  | 'researchShelters'
  | 'researchAxes'
  | 'researchQuarrying'
  | 'researchTeamwork'

export type ResearchId =
  | 'sharpened-stick'
  | 'foraging-practice'
  | 'stone-flakes'
  | 'shelters'
  | 'stone-axes'
  | 'quarrying'
  | 'teamwork'

export type JobId = 'idle' | 'forager' | 'woodcutter' | 'stoneworker'

export interface Person {
  job: JobId
  workElapsedMs: number
  name: string
  hunger: number
  maxHunger: number
}

export interface Skill {
  level: number
  xp: number
}

export interface GameState {
  version: 2
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
  seenResearchLevels: Record<ResearchId, number>
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
  cost?: () => Pick<ResearchCost, 'fruit' | 'wood' | 'stone'> | null
  complete: () => string
}
