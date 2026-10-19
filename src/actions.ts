import {
  EXPLORE_COST,
  EXPLORE_DURATION_MS,
  EXPLORE_FURTHER_COST,
  EXPLORE_FURTHER_DURATION_MS,
  EXPLORE_UNLOCK_FRUIT,
  GATHER_DURATION_MS,
  GATHER_STONE_DURATION_MS,
  GATHER_WOOD_DURATION_MS,
  RESEARCH_UNLOCK_WOOD,
} from './constants'
import { formatResource, roundResource } from './format'
import type { createResearch } from './research'
import type { createResources } from './resources'
import type { createSkills } from './skills'
import type { Action, ActionKey, GameState } from './types'

export function createActions(
  state: GameState,
  research: Pick<
    ReturnType<typeof createResearch>,
    'getResearchLevel' | 'createResearchAction'
  >,
  skills: Pick<
    ReturnType<typeof createSkills>,
    'getResourceGain' | 'getSkill' | 'awardActionExperience'
  >,
  pay: ReturnType<typeof createResources>['pay'],
  saveProgress: () => void,
) {
  let activeAction: Action | null = null
  let activeResearch: Action | null = null
  const { getResearchLevel, createResearchAction } = research
  const { getResourceGain, getSkill, awardActionExperience } = skills
  const actions: Record<ActionKey, Action> = {
    gather: {
      id: 'gather',
      name: 'Gather fruit',
      baseDurationMs: GATHER_DURATION_MS,
      complete: completeGather,
    },
    explore: {
      id: 'explore',
      name: 'Explore nearby',
      baseDurationMs: EXPLORE_DURATION_MS,
      canStart: () => !state.explored && state.fruit >= EXPLORE_COST,
      cost: () => ({ fruit: EXPLORE_COST }),
      complete: completeExplore,
    },
    exploreFurther: {
      id: 'explore-further',
      name: 'Explore farther',
      baseDurationMs: EXPLORE_FURTHER_DURATION_MS,
      canStart: () =>
        !state.stoneFound &&
        getResearchLevel('sharpened-stick') > 0 &&
        state.fruit >= EXPLORE_FURTHER_COST,
      cost: () => ({ fruit: EXPLORE_FURTHER_COST }),
      complete: completeExploreFurther,
    },
    sticks: {
      id: 'sticks',
      name: 'Gather sticks',
      baseDurationMs: GATHER_WOOD_DURATION_MS,
      canStart: () => state.explored,
      complete: completeSticks,
    },
    stone: {
      id: 'stone',
      name: 'Gather stone',
      baseDurationMs: GATHER_STONE_DURATION_MS,
      canStart: () => state.stoneFound,
      complete: completeStone,
    },
    research: createResearchAction('sharpened-stick'),
    researchForaging: createResearchAction('foraging-practice'),
    researchStone: createResearchAction('stone-flakes'),
    researchShelters: createResearchAction('shelters'),
    researchAxes: createResearchAction('stone-axes'),
    researchQuarrying: createResearchAction('quarrying'),
    researchTeamwork: createResearchAction('teamwork'),
    researchCarpentry: createResearchAction('carpentry'),
    researchMasonry: createResearchAction('masonry'),
    researchWriting: createResearchAction('writing'),
    researchForestry: createResearchAction('forestry'),
    researchStonecraft: createResearchAction('stonecraft'),
    researchJoinery: createResearchAction('joinery'),
    researchArchitecture: createResearchAction('architecture'),
    researchAgriculture: createResearchAction('agriculture'),
    researchEngineering: createResearchAction('engineering'),
  }

  function getActiveAction() {
    return activeAction
  }

  function getActiveResearch() {
    return activeResearch
  }

  function completeGather() {
    const fruitGain = getResourceGain('gather')
    state.fruit = roundResource(state.fruit + fruitGain)
    return `Gathered ${formatResource(fruitGain)} fruit.`
  }

  function completeExplore() {
    state.explored = true
    return 'Exploration complete. Wood is nearby.'
  }

  function completeExploreFurther() {
    state.stoneFound = true
    if (getResearchLevel('shelters') > 0)
      state.buildings.quarry = Math.max(1, state.buildings.quarry)
    return 'Exploration complete. Stone is nearby.'
  }

  function completeSticks() {
    const woodGain = getResourceGain('sticks')
    state.wood = roundResource(state.wood + woodGain)
    return `Gathered ${formatResource(woodGain)} wood.`
  }

  function completeStone() {
    const stoneGain = getResourceGain('stone')
    state.stone = roundResource(state.stone + stoneGain)
    return `Gathered ${formatResource(stoneGain)} stone.`
  }

  function syncUnlocks() {
    let changed = false
    if (
      !state.researchUnlocked &&
      state.explored &&
      state.wood >= RESEARCH_UNLOCK_WOOD
    ) {
      state.researchUnlocked = true
      changed = true
    }
    if (!state.exploreUnlocked && state.fruit >= EXPLORE_UNLOCK_FRUIT) {
      state.exploreUnlocked = true
      changed = true
    }
    state.basicTools = getResearchLevel('sharpened-stick') >= 1
    if (changed) saveProgress()
  }

  function startAction(action: Action) {
    if (!Object.values(actions).includes(action)) return false
    const active = action.researchId ? activeResearch : activeAction
    if (active || (action.canStart && !action.canStart())) return false
    if (action.researchId) activeResearch = action
    else activeAction = action
    const cost = action.cost?.()
    if (cost) {
      pay(cost)
      saveProgress()
    }
    return true
  }

  function finishAction(action: Action) {
    const active = action.researchId ? activeResearch : activeAction
    if (active !== action) return null
    if (activeAction === action) activeAction = null
    if (activeResearch === action) activeResearch = null
    // Award XP first: a milestone reached by this action affects its yield.
    const levelsGained = awardActionExperience(action.id)
    const result = action.complete()
    state.actions += 1
    saveProgress()
    return levelsGained > 0
      ? `${result} ${action.name} reached level ${getSkill(action.id).level}.`
      : result
  }

  return {
    actions,
    getActiveAction,
    getActiveResearch,
    syncUnlocks,
    startAction,
    finishAction,
  }
}
