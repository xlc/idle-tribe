import { mkdir } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import type { Specialization } from '../src/types'
import type { Policy } from './balance-policy'
import { provenance } from './balance-provenance'
import {
  type BalancePathSummary,
  renderMarkdown,
  summarizeGroups,
  summarizePath,
} from './balance-report'
import { runBalance, type Schedule } from './balance-runner'

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    full: { type: 'boolean' },
    matrix: { type: 'boolean' },
    branch: { type: 'string' },
    policy: { type: 'string' },
    schedule: { type: 'string' },
    path: { type: 'string' },
    paths: { type: 'string', default: '1' },
    seed: { type: 'string', default: '0' },
    days: { type: 'string', default: '60' },
    out: { type: 'string', default: 'balance-results/latest' },
  },
  strict: true,
})
function select<T extends string>(
  value: string | undefined,
  choices: readonly T[],
  defaults: readonly T[],
): readonly T[] {
  if (value === undefined) return defaults
  const found = choices.find((choice) => choice === value)
  if (!found)
    throw new Error(`Expected one of ${choices.join(', ')}; got ${value}`)
  return [found]
}
const branches = select<Specialization>(
  values.branch,
  ['forestry', 'stonecraft'],
  ['forestry', 'stonecraft'],
)
const exploratoryBatch = values.path !== undefined || Number(values.paths) > 1
const policies = select<Policy>(
  values.policy,
  ['simple', 'bottleneck', 'exploratory'],
  values.matrix
    ? ['bottleneck', 'simple', 'exploratory']
    : exploratoryBatch
      ? ['exploratory']
      : ['bottleneck'],
)
const schedules = select<Schedule>(
  values.schedule,
  ['frequent', 'daily', 'concentrated'],
  values.matrix ? ['frequent', 'daily', 'concentrated'] : ['frequent'],
)
const days = Number(values.days)
if (!Number.isFinite(days) || days <= 0)
  throw new Error('--days must be positive')
const paths = Number(values.paths),
  masterSeed = Number(values.seed),
  selectedPath = values.path === undefined ? undefined : Number(values.path)
if (!Number.isInteger(paths) || paths <= 0)
  throw new Error('--paths must be a positive integer')
if (!Number.isInteger(masterSeed) || masterSeed < 0 || masterSeed > 0xffffffff)
  throw new Error('--seed must be an unsigned 32-bit integer')
if (
  selectedPath !== undefined &&
  (!Number.isInteger(selectedPath) || selectedPath < 0)
)
  throw new Error('--path must be a non-negative integer')
const pathStart = selectedPath ?? 0,
  pathCount = selectedPath === undefined ? paths : 1
await mkdir(values.out, { recursive: true })
await Bun.write(
  `${values.out}/provenance.json`,
  JSON.stringify(
    {
      ...(await provenance()),
      configuration: {
        branches,
        policies,
        schedules,
        paths,
        path: selectedPath,
        masterSeed,
        days,
        full: Boolean(values.full),
        matrix: Boolean(values.matrix),
      },
    },
    null,
    2,
  ),
)
function pathSeed(index: number) {
  let value = Math.imul(masterSeed ^ 0x9e3779b9, 0x85ebca6b)
  value = Math.imul(value ^ index, 0xc2b2ae35)
  value ^= value >>> 16
  return value >>> 0
}

const pathSummaries: BalancePathSummary[] = []
for (const branch of branches)
  for (const policy of policies)
    for (const schedule of schedules) {
      for (let offset = 0; offset < pathCount; offset++) {
        const path = pathStart + offset
        const seed = pathSeed(path),
          id = `${branch}-${policy}-${schedule}-${path}`
        try {
          const result = runBalance(
            {
              branch,
              policy,
              schedule,
              days,
              pathSeed: seed,
              ...(pathCount > 1 || selectedPath !== undefined || values.matrix
                ? { finishAtHorizon: true }
                : {}),
              goal:
                values.full || values.matrix
                  ? 'causal-synthesis'
                  : 'mechanization',
            },
            undefined,
            pathCount === 1 ? console.error : undefined,
          )
          const summary = summarizePath(result, path, seed)
          pathSummaries.push(summary)
          if (pathCount === 1 && !values.matrix)
            await Bun.write(
              `${values.out}/${branch}-${policy}-${schedule}.json`,
              JSON.stringify(result),
            )
          console.log(JSON.stringify(summary))
        } catch (error) {
          console.error({
            id,
            status: 'execution-failed',
            error: error instanceof Error ? error.message : String(error),
          })
          process.exitCode = 1
        }
      }
    }

const groups = summarizeGroups(pathSummaries)
await Bun.write(
  `${values.out}/paths.jsonl`,
  `${pathSummaries.map((path) => JSON.stringify(path)).join('\n')}\n`,
)
await Bun.write(
  `${values.out}/summary.json`,
  JSON.stringify({ paths: pathSummaries, groups }, null, 2),
)
await Bun.write(
  `${values.out}/report.md`,
  renderMarkdown(pathSummaries, groups),
)
