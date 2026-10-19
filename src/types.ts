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
  | 'research-carpentry'
  | 'research-masonry'
  | 'research-writing'
  | 'research-forestry'
  | 'research-stonecraft'
  | 'research-joinery'
  | 'research-architecture'
  | 'research-agriculture'
  | 'research-engineering'

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
  | 'researchCarpentry'
  | 'researchMasonry'
  | 'researchWriting'
  | 'researchForestry'
  | 'researchStonecraft'
  | 'researchJoinery'
  | 'researchArchitecture'
  | 'researchAgriculture'
  | 'researchEngineering'

export type ResearchId =
  | 'sharpened-stick'
  | 'foraging-practice'
  | 'stone-flakes'
  | 'shelters'
  | 'stone-axes'
  | 'quarrying'
  | 'teamwork'
  | 'carpentry'
  | 'masonry'
  | 'writing'
  | 'forestry'
  | 'stonecraft'
  | 'joinery'
  | 'architecture'
  | 'agriculture'
  | 'engineering'

export type JobId =
  | 'idle'
  | 'forager'
  | 'woodcutter'
  | 'stoneworker'
  | 'sawyer'
  | 'mason'
  | 'scholar'
export type ResourceId =
  | 'fruit'
  | 'wood'
  | 'stone'
  | 'planks'
  | 'blocks'
  | 'knowledge'
export type Cost = Partial<Record<ResourceId, number>>
export type BuildingId =
  | 'foraging-camp'
  | 'lumber-camp'
  | 'quarry'
  | 'sawmill'
  | 'stoneworks'
  | 'study'
  | 'houses'
  | 'great-hall'
export type Specialization = 'forestry' | 'stonecraft'

export interface Person {
  job: JobId
  isPlayer: boolean
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
  version: 4
  fruit: number
  planks: number
  blocks: number
  knowledge: number
  buildings: Record<BuildingId, number>
  specialization: Specialization | null
  savedAt: number
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

export interface ResearchCost extends Cost {
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
  cost?: () => Cost | null
  complete: () => string
}
