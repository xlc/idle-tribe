export const EPSILON = 1e-9
export const RESOURCE_DISPLAY_DECIMALS = 3
// Half the smallest displayed unit: suppress changes that round to zero.
export const MIN_VISIBLE_RESOURCE_CHANGE =
  0.5 * 10 ** -RESOURCE_DISPLAY_DECIMALS

export const WORKERS_PER_BUILDING_LEVEL = 2
