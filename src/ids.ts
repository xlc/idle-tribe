export const ACTION_IDS = [
  'gather',
  'explore',
  'sticks',
  'explore-further',
  'stone',
  'research',
  'research-foraging',
  'research-stone-flakes',
  'research-shelters',
  'research-axes',
  'research-quarrying',
  'research-teamwork',
  'research-carpentry',
  'research-masonry',
  'research-writing',
  'research-forestry',
  'research-stonecraft',
  'research-joinery',
  'research-architecture',
  'research-agriculture',
  'research-engineering',
] as const
export type ActionId = (typeof ACTION_IDS)[number]

export const ACTION_KEYS = [
  'gather',
  'explore',
  'exploreFurther',
  'sticks',
  'stone',
  'research',
  'researchForaging',
  'researchStone',
  'researchShelters',
  'researchAxes',
  'researchQuarrying',
  'researchTeamwork',
  'researchCarpentry',
  'researchMasonry',
  'researchWriting',
  'researchForestry',
  'researchStonecraft',
  'researchJoinery',
  'researchArchitecture',
  'researchAgriculture',
  'researchEngineering',
] as const
export type ActionKey = (typeof ACTION_KEYS)[number]

export const RESEARCH_ITEM_KEYS = [
  'sharpened-stick',
  'foraging-practice',
  'stone-flakes',
  'shelters',
  'stone-axes',
  'quarrying',
  'teamwork',
  'carpentry',
  'masonry',
  'writing',
  'forestry',
  'stonecraft',
  'joinery',
  'architecture',
  'agriculture',
  'engineering',
] as const
export type ResearchId = (typeof RESEARCH_ITEM_KEYS)[number]

export const JOB_IDS = [
  'idle',
  'forager',
  'woodcutter',
  'sawyer',
  'mason',
  'scholar',
  'stoneworker',
] as const
export type JobId = (typeof JOB_IDS)[number]

export const RESOURCES = [
  'fruit',
  'wood',
  'stone',
  'planks',
  'blocks',
  'knowledge',
] as const
export type ResourceId = (typeof RESOURCES)[number]

export const BUILDING_IDS = [
  'foraging-camp',
  'lumber-camp',
  'quarry',
  'sawmill',
  'stoneworks',
  'study',
  'houses',
  'great-hall',
] as const
export type BuildingId = (typeof BUILDING_IDS)[number]

export function isJobId(value: unknown): value is JobId {
  return JOB_IDS.some((id) => id === value)
}
