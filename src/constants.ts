import type { ResourceId } from './ids'
export const EPSILON = 1e-9
export const RESOURCE_INFO: Record<
  ResourceId,
  { name: string; description: string; threshold: number }
> = {
  food: {
    name: 'Food',
    description: 'The one resource everyone insists on consuming.',
    threshold: 120,
  },
  wood: {
    name: 'Wood',
    description: 'Future homes, currently shaped like trees.',
    threshold: 60,
  },
  stone: {
    name: 'Stone',
    description:
      'The settlement’s oldest and least flexible building material.',
    threshold: 60,
  },
  planks: {
    name: 'Planks',
    description: 'Wood persuaded to take a more useful shape.',
    threshold: 20,
  },
  blocks: {
    name: 'Blocks',
    description: 'Stone with its corners finally in order.',
    threshold: 20,
  },
  tools: {
    name: 'Tools',
    description: 'An excellent way to stop doing everything the hard way.',
    threshold: 10,
  },
  knowledge: {
    name: 'Knowledge',
    description: 'Useful ideas that survived being explained to someone else.',
    threshold: 20,
  },
  ore: {
    name: 'Ore',
    description: 'Rock with a more ambitious job hidden inside.',
    threshold: 100,
  },
  metal: {
    name: 'Metal',
    description: 'Shiny proof that the furnace was worth the trouble.',
    threshold: 50,
  },
  machinery: {
    name: 'Machinery',
    description: 'Several moving parts that have agreed to move together.',
    threshold: 10,
  },
  charge: {
    name: 'Charge',
    description: 'Stored energy, impatient for something to switch on.',
    threshold: 100,
  },
  circuits: {
    name: 'Circuits',
    description: 'Tiny roads for decisions that happen much too quickly.',
    threshold: 20,
  },
  data: {
    name: 'Data',
    description: 'Facts gathered faster than anyone can nod thoughtfully.',
    threshold: 50,
  },
  'exotic-material': {
    name: 'Exotic material',
    description:
      'Matter that makes the old textbooks look a little embarrassed.',
    threshold: 10,
  },
  'quantum-components': {
    name: 'Quantum components',
    description: 'Small parts with unusually complicated working arrangements.',
    threshold: 5,
  },
  'causal-models': {
    name: 'Causal models',
    description:
      'Careful diagrams of why things happened, or might insist on happening.',
    threshold: 5,
  },
}
export const ERAS = [
  {
    name: 'Tribal',
    description:
      'Civilization begins with lunch and a fairly optimistic stick.',
  },
  {
    name: 'Agricultural',
    description: 'Dinner has put down roots, and so have we.',
  },
  {
    name: 'Town',
    description:
      'A settlement large enough for everyone to have opinions about it.',
  },
  {
    name: 'Industrial',
    description: 'The settlement has discovered a louder way to work.',
  },
  {
    name: 'Digital',
    description: 'The blinking lights insist everything is under control.',
  },
  { name: 'Space', description: 'The roof was becoming a limitation.' },
  {
    name: 'Quantum',
    description: 'Very small things are making very large demands.',
  },
  {
    name: 'Beyond quantum',
    description: 'The laws of physics have received your suggested edits.',
  },
]
