import { expect, test } from 'bun:test'
import { BUILDINGS, EQUIPMENT, ERA_DEFINITIONS } from './definitions'
import type { EraDefinition } from './definitions/types'
import {
  ACTION_IDS,
  BUILDING_IDS,
  PERK_IDS,
  RESEARCH_IDS,
  RESOURCES,
  WORKING_JOB_IDS,
} from './ids'
import type { Requirements } from './types'

const catalogs: {
  name: string
  ids: readonly string[]
  entries: (era: EraDefinition) => string[]
}[] = [
  {
    name: 'resources',
    ids: RESOURCES,
    entries: (era) => Object.keys(era.resources),
  },
  {
    name: 'buildings',
    ids: BUILDING_IDS,
    entries: (era) => Object.keys(era.buildings),
  },
  {
    name: 'research',
    ids: RESEARCH_IDS,
    entries: (era) => Object.keys(era.research),
  },
  {
    name: 'occupations',
    ids: WORKING_JOB_IDS,
    entries: (era) => [
      ...Object.keys(era.jobs),
      ...Object.keys(era.occupations),
    ],
  },
  {
    name: 'actions',
    ids: ACTION_IDS,
    entries: (era) => Object.keys(era.actions),
  },
  {
    name: 'perks',
    ids: PERK_IDS,
    entries: (era) => Object.keys(era.perks),
  },
]

test.each(catalogs)(
  '$name definitions belong to exactly one era',
  (catalog) => {
    const ids = ERA_DEFINITIONS.flatMap(catalog.entries)
    expect(ids.sort()).toEqual([...catalog.ids].sort())
  },
)

const researchEras = new Map(
  ERA_DEFINITIONS.flatMap((era, index) =>
    Object.keys(era.research).map((id) => [id, index] as const),
  ),
)
const buildingEras = new Map(
  ERA_DEFINITIONS.flatMap((era, index) =>
    Object.keys(era.buildings).map((id) => [id, index] as const),
  ),
)

function requirementEra(requirements: Requirements) {
  return Math.max(
    0,
    ...(requirements.research ?? []).map((id) => researchEras.get(id) ?? 0),
    ...(requirements.anyResearch?.length
      ? [
          Math.min(
            ...requirements.anyResearch.map((id) => researchEras.get(id) ?? 0),
          ),
        ]
      : []),
    ...BUILDING_IDS.filter((id) => requirements.facilities?.[id]).map(
      (id) => buildingEras.get(id) ?? 0,
    ),
  )
}

test('research and building forms are owned by the era that unlocks them', () => {
  ERA_DEFINITIONS.forEach((era, index) => {
    for (const definition of Object.values(era.research))
      expect(
        Math.max(definition.era ?? 0, requirementEra(definition.requires)),
      ).toBe(index)
    for (const definition of Object.values(era.buildings))
      for (const form of definition.forms)
        expect(requirementEra(form.requires)).toBe(index)
    for (const [id, forms] of Object.entries(era.buildingUpgrades)) {
      expect(buildingEras.get(id)).toBeLessThan(index)
      for (const form of forms)
        expect(requirementEra(form.requires)).toBe(index)
    }
  })
})

test('jobs and resources are owned by their first production era', () => {
  for (const [index, era] of ERA_DEFINITIONS.entries()) {
    for (const job of Object.keys(era.jobs)) {
      const workplace = BUILDING_IDS.find((id) => BUILDINGS[id].job === job)
      expect(workplace && buildingEras.get(workplace)).toBe(index)
    }
    for (const resource of Object.keys(era.resources)) {
      const sources = ERA_DEFINITIONS.flatMap((sourceEra, sourceIndex) => [
        ...Object.values(sourceEra.actions)
          .filter((definition) => definition.resource === resource)
          .map(() => sourceIndex),
        ...Object.values(sourceEra.jobs)
          .filter((definition) => definition.output === resource)
          .map(() => sourceIndex),
      ])
      expect(Math.min(...sources)).toBe(index)
    }
  }
})

test('equipment tiers follow era order and their unlocking research', () => {
  expect(EQUIPMENT.length).toBeGreaterThan(0)
  const research = new Set<string>()
  for (const [index, era] of ERA_DEFINITIONS.entries())
    for (const equipment of era.equipment) {
      expect(researchEras.get(equipment.research)).toBe(index)
      expect(research.has(equipment.research)).toBe(false)
      research.add(equipment.research)
    }
})
