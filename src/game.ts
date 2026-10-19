import { createActions } from './actions'
import { createFood, getHungerEffects } from './food'
import { roundResource } from './format'
import { RESOURCES } from './ids'
import { createResearch } from './research'
import { createResources } from './resources'
import { createSettlement } from './settlement'
import { createSimulation } from './simulation'
import { createSkills } from './skills'
import type { GameState } from './types'

export function createGame(
  state: GameState,
  saveState: (snapshot: GameState) => void = () => {},
) {
  const resources = createResources(state)
  const research = createResearch(state, resources.canAfford, saveProgress)
  const skills = createSkills(state, research.getResearchLevel)
  const food = createFood(state, saveProgress)
  const settlement = createSettlement(
    state,
    resources,
    research.getResearchLevel,
    skills.getNextResourceGain,
    saveProgress,
  )
  const actionSystem = createActions(
    state,
    research,
    skills,
    resources.pay,
    saveProgress,
  )
  const simulation = createSimulation(
    state,
    resources,
    settlement,
    skills,
    food,
    actionSystem.syncUnlocks,
    saveProgress,
  )

  function saveProgress() {
    const snapshot = structuredClone(state)
    // In-flight work is cancelled on reload. Save its reserved materials so
    // interruption cannot spend resources without delivering the result.
    for (const action of [
      actionSystem.getActiveAction(),
      actionSystem.getActiveResearch(),
    ]) {
      const cost = action?.cost?.()
      for (const resource of RESOURCES) {
        snapshot[resource] = roundResource(
          snapshot[resource] + (cost?.[resource] ?? 0),
        )
      }
    }
    saveState(snapshot)
  }

  return {
    state,
    canAfford: resources.canAfford,
    isBuildingUnlocked: settlement.isBuildingUnlocked,
    getBuildingCost: settlement.getBuildingCost,
    canBuild: settlement.canBuild,
    build: settlement.build,
    getJobCapacity: settlement.getJobCapacity,
    adjustWorkers: settlement.adjustWorkers,
    getJobInput: settlement.getJobInput,
    canWork: settlement.canWork,
    applyOffline: simulation.applyOffline,
    saveProgress,
    actions: actionSystem.actions,
    syncUnlocks: actionSystem.syncUnlocks,
    startAction: actionSystem.startAction,
    finishAction: actionSystem.finishAction,
    getActiveAction: actionSystem.getActiveAction,
    getActiveResearch: actionSystem.getActiveResearch,
    advanceTime: simulation.advanceTime,
    getPopulationCapacity: settlement.getPopulationCapacity,
    canRecruit: settlement.canRecruit,
    recruitPerson: settlement.recruitPerson,
    isJobUnlocked: settlement.isJobUnlocked,
    assignJob: settlement.assignJob,
    getWorkerGain: settlement.getWorkerGain,
    consumeMeal: food.consumeMeal,
    getMealCost: food.getMealCost,
    getFeastCost: food.getFeastCost,
    canFeast: food.canFeast,
    feast: food.feast,
    getSkill: skills.getSkill,
    getResearchLevel: research.getResearchLevel,
    getResearchDefinition: research.getResearchDefinition,
    getResearchNextLevel: research.getResearchNextLevel,
    getUnreadResearch: research.getUnreadResearch,
    markResearchSeen: research.markResearchSeen,
    getResearchEffect: research.getResearchEffect,
    canAffordResearch: research.canAffordResearch,
    getActionDuration: skills.getActionDuration,
    getResourceGain: skills.getResourceGain,
    getNextResourceGain: skills.getNextResourceGain,
    getHungerEffects,
    getResourceRates: simulation.getResourceRates,
  }
}

export type Game = ReturnType<typeof createGame>
