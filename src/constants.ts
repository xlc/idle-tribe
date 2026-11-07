export const EPSILON = 1e-9
export const RESOURCE_DISPLAY_DECIMALS = 2
// Half the smallest displayed unit: suppress changes that round to zero.
export const MIN_VISIBLE_RESOURCE_CHANGE =
  0.5 * 10 ** -RESOURCE_DISPLAY_DECIMALS

export const WORKERS_PER_BUILDING_LEVEL = 2
// Building upgrades become increasingly expensive while level 1 remains equal
// to the definition's base cost. The same curve also increases storage gains.
export const BUILDING_LEVEL_GROWTH = 0.35
// Construction work keeps its established pacing while material costs rise
// faster at higher levels.
export const BUILDING_WORK_GROWTH = 0.25
// Each additional level improves staffed production and automated action output.
export const BUILDING_OUTPUT_PER_LEVEL = 0.15
