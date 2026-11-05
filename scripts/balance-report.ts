import type { ResearchId, Specialization } from '../src/types'
import type { Policy } from './balance-policy'
import type { BalanceResult, Schedule } from './balance-runner'

export const REPORT_MILESTONES = [
  'shelters',
  'agriculture',
  'writing',
  'mechanization',
  'chronometry',
  'orbital-flight',
  'quantum-engineering',
  'causal-engineering',
  'causal-synthesis',
] as const satisfies readonly ResearchId[]

export interface BalancePathSummary {
  id: string
  path: number
  seed: number
  branch: Specialization
  policy: Policy
  schedule: Schedule
  goal: ResearchId
  status: BalanceResult['status']
  wallHours: number
  goalHours: number | null
  effectiveHours: number
  activeMinutes: number
  openingMinutes: number
  openingControls: number
  maxVisitControls: number
  people: number
  resets: number
  milestones: Partial<Record<ResearchId, number>>
}

export interface Distribution {
  count: number
  median: number | null
  p10: number | null
  p90: number | null
  minimum: number | null
  maximum: number | null
}

export interface BalanceGroupSummary {
  id: string
  paths: number
  completed: number
  completionRate: number
  goalHours: Distribution
  activeMinutes: Distribution
  milestoneHours: Partial<Record<ResearchId, Distribution>>
}

export function summarizePath(
  result: BalanceResult,
  path: number,
  seed: number,
): BalancePathSummary {
  const milestones: Partial<Record<ResearchId, number>> = {}
  for (const milestone of result.milestones)
    if (
      REPORT_MILESTONES.includes(
        milestone.id as (typeof REPORT_MILESTONES)[number],
      )
    )
      if (milestones[milestone.id] === undefined)
        milestones[milestone.id] = milestone.time.by / 3600

  const { branch, policy, schedule } = result.options
  const goal = result.milestones.find(
    (milestone) => milestone.id === result.options.goal,
  )
  return {
    id: `${branch}-${policy}-${schedule}-${path}`,
    path,
    seed,
    branch,
    policy,
    schedule,
    goal: result.options.goal,
    status: result.status,
    wallHours: result.wallSeconds / 3600,
    goalHours: goal ? goal.time.by / 3600 : null,
    effectiveHours: result.effectiveSeconds / 3600,
    activeMinutes: result.activeSeconds / 60,
    openingMinutes: result.openingSeconds / 60,
    openingControls: result.openingControls,
    maxVisitControls: result.maxVisitControls,
    people: result.final.people,
    resets: result.resets.length,
    milestones,
  }
}

function distribution(values: number[]): Distribution {
  const sorted = [...values].sort((a, b) => a - b)
  const percentile = (p: number) =>
    sorted.length ? (sorted[Math.floor((sorted.length - 1) * p)] ?? null) : null
  return {
    count: sorted.length,
    median: percentile(0.5),
    p10: percentile(0.1),
    p90: percentile(0.9),
    minimum: sorted[0] ?? null,
    maximum: sorted.at(-1) ?? null,
  }
}

export function summarizeGroups(paths: readonly BalancePathSummary[]) {
  const groups = new Map<string, BalancePathSummary[]>()
  for (const path of paths) {
    const id = `${path.branch}-${path.policy}-${path.schedule}-${path.goal}`
    const group = groups.get(id) ?? []
    group.push(path)
    groups.set(id, group)
  }
  return [...groups.entries()].map(([id, group]): BalanceGroupSummary => {
    const milestoneHours: Partial<Record<ResearchId, Distribution>> = {}
    for (const milestone of REPORT_MILESTONES) {
      const values = group.flatMap((path) => {
        const value = path.milestones[milestone]
        return value === undefined ? [] : [value]
      })
      milestoneHours[milestone] = distribution(values)
    }
    const completed = group.filter((path) => path.status === 'completed').length
    return {
      id,
      paths: group.length,
      completed,
      completionRate: completed / group.length,
      goalHours: distribution(
        group.flatMap((path) =>
          path.goalHours === null ? [] : [path.goalHours],
        ),
      ),
      activeMinutes: distribution(group.map((path) => path.activeMinutes)),
      milestoneHours,
    }
  })
}

function format(value: number | null, digits = 1) {
  return value === null ? '—' : value.toFixed(digits)
}

function groupRow(group: BalanceGroupSummary) {
  return `| ${group.id} | ${group.completed}/${group.paths} (${(group.completionRate * 100).toFixed(0)}%) | ${format(group.goalHours.median, 2)}h | ${format(group.activeMinutes.median)}m |`
}

function progressCount(path: BalancePathSummary) {
  return Object.keys(path.milestones).length
}

function progressOrder(a: BalancePathSummary, b: BalancePathSummary) {
  if (a.goalHours !== null && b.goalHours !== null)
    return a.goalHours - b.goalHours
  if (a.goalHours !== null) return -1
  if (b.goalHours !== null) return 1
  return progressCount(b) - progressCount(a)
}

export function renderMarkdown(
  paths: readonly BalancePathSummary[],
  groups: readonly BalanceGroupSummary[],
) {
  const ordered = [...paths].sort(progressOrder)
  const fastest = ordered.slice(0, 5)
  const slowest = [...ordered].reverse().slice(0, 5)
  const milestoneRows = REPORT_MILESTONES.map((milestone) => {
    const values = paths.flatMap((path) => {
      const value = path.milestones[milestone]
      return value === undefined ? [] : [value]
    })
    const stats = distribution(values)
    return `| ${milestone} | ${format(stats.median, 2)}h | ${format(stats.p10, 2)}h | ${format(stats.p90, 2)}h | ${stats.count}/${paths.length} |`
  }).join('\n')
  const pathRows = (items: readonly BalancePathSummary[]) =>
    items
      .map(
        (path) =>
          `| ${path.id} | ${path.seed} | ${path.status} | ${format(path.goalHours, 2)}h | ${path.activeMinutes.toFixed(1)}m | ${path.maxVisitControls} | ${path.people} |`,
      )
      .join('\n')

  return `# Balance review

Generated from ${paths.length} online paths. Path seeds and configurations are retained in \`paths.jsonl\`; rerun an outlier before changing balance values.

## Scenario groups

| Scenario | Completed | Median goal time | Median active time |
| --- | ---: | ---: | ---: |
${groups.map(groupRow).join('\n')}

## Milestones

| Milestone | Median | P10 | P90 | Reached |
| --- | ---: | ---: | ---: | ---: |
${milestoneRows}

## Least-progressed paths

| Path | Seed | Status | Goal time | Active time | Visit controls | People |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
${pathRows(slowest)}

## Most-progressed paths

| Path | Seed | Status | Goal time | Active time | Visit controls | People |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
${pathRows(fastest)}

## Review questions

- Which milestone has the widest spread or the lowest reach rate?
- Do either specialization or visit schedule create a consistent pacing disadvantage?
- Which paths require the most visit controls or show the widest milestone spread?
- Does exploratory behavior expose a dominant investment or a dead-end choice?
- What single balance change should be tested next, and which path IDs support it?
`
}
