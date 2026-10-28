import type { BuildingId, ResourceId } from '../ids'

// Positions in the painted atlas, read left to right in six equal columns.
// Ceramics has no atlas tile; ResourceArt draws it as an inline SVG instead.
const resources: Record<Exclude<ResourceId, 'ceramics'>, number> = {
  food: 0,
  wood: 1,
  stone: 2,
  planks: 3,
  blocks: 4,
  tools: 5,
  knowledge: 6,
  ore: 7,
  metal: 8,
  machinery: 9,
  charge: 10,
  circuits: 11,
  data: 12,
  'exotic-material': 13,
  'quantum-components': 14,
  'causal-models': 15,
}
const buildings: Record<BuildingId, number> = {
  housing: 16,
  foraging: 17,
  'expedition-camp': 17,
  lumber: 18,
  quarry: 19,
  'food-store': 20,
  stockyard: 21,
  sawmill: 22,
  stoneworks: 23,
  storehouse: 20,
  'tool-workshop': 24,
  study: 25,
  library: 26,
  'builders-lodge': 27,
  'supply-post': 28,
  farm: 29,
  irrigation: 30,
  'meeting-place': 31,
  'public-well': 30,
  kiln: 34,
  bathhouse: 26,
  'great-hall': 31,
  observatory: 32,
  'ore-mine': 33,
  foundry: 34,
  'machine-shop': 24,
  generator: 10,
  'electronics-plant': 11,
  'computing-center': 12,
  'battery-bank': 10,
  'data-center': 12,
  'launch-complex': 32,
  'orbital-extractor': 13,
  'cargo-depot': 28,
  'space-observatory': 32,
  'quantum-laboratory': 35,
  'quantum-fabricator': 14,
  'quantum-vault': 14,
  'causal-laboratory': 35,
  'stellar-foundry': 34,
}

function PaintedArt({ tile }: { tile: number }) {
  return (
    <span
      className="painted-art"
      aria-hidden="true"
      style={{
        backgroundPosition: `${(tile % 6) * 20}% ${Math.floor(tile / 6) * 20}%`,
      }}
    />
  )
}
export function ResourceArt({ resource }: { resource: ResourceId }) {
  if (resource === 'ceramics')
    return (
      <span className="painted-art ceramics-art" aria-hidden="true">
        <svg viewBox="0 0 48 48" role="presentation">
          <path
            d="M14 10h20l-2 8v16a8 8 0 0 1-16 0V18l-2-8Z"
            fill="#c47b54"
            stroke="#70452f"
            strokeWidth="2"
          />
          <path d="M12 10h24" stroke="#70452f" strokeWidth="3" />
          <path d="M18 24h12" stroke="#eab08a" strokeWidth="2" />
        </svg>
      </span>
    )
  return <PaintedArt tile={resources[resource]} />
}
export function BuildingArt({ building }: { building: BuildingId }) {
  return <PaintedArt tile={buildings[building]} />
}

const symbols = {
  settlement: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
  research: 'M12 6v15M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2Z',
  queue: 'M4 5h16M4 12h16M4 19h16',
  people:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  legacy: 'M4 8h16v13H4ZM3 4h18v4H3ZM12 4v17M9 12h6',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z',
} as const
export function ViewIcon({ name }: { name: keyof typeof symbols }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={symbols[name]} />
    </svg>
  )
}
