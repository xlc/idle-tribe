import { mkdir } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import type { Specialization } from '../src/types'
import type { Policy } from './balance-policy'
import { provenance } from './balance-provenance'
import { runBalance, type Schedule } from './balance-runner'

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    full: { type: 'boolean' },
    matrix: { type: 'boolean' },
    branch: { type: 'string' },
    policy: { type: 'string' },
    schedule: { type: 'string' },
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
const policies = select<Policy>(
  values.policy,
  ['simple', 'bottleneck'],
  values.matrix ? ['bottleneck', 'simple'] : ['bottleneck'],
)
const schedules = select<Schedule>(
  values.schedule,
  ['frequent', 'daily', 'concentrated'],
  values.matrix ? ['frequent', 'daily', 'concentrated'] : ['frequent'],
)
const days = Number(values.days)
if (!Number.isFinite(days) || days <= 0)
  throw new Error('--days must be positive')
await mkdir(values.out, { recursive: true })
await Bun.write(
  `${values.out}/provenance.json`,
  JSON.stringify(await provenance(), null, 2),
)
const summaries = []
for (const branch of branches)
  for (const policy of policies)
    for (const schedule of schedules) {
      const id = `${branch}-${policy}-${schedule}`
      try {
        const result = runBalance(
          {
            branch,
            policy,
            schedule,
            days,
            goal:
              values.full || values.matrix
                ? 'causal-synthesis'
                : 'mechanization',
          },
          undefined,
          console.error,
        )
        await Bun.write(`${values.out}/${id}.json`, JSON.stringify(result))
        const summary = {
          id,
          status: result.status,
          wallHours: result.wallSeconds / 3600,
          effectiveHours: result.effectiveSeconds / 3600,
          activeMinutes: result.activeSeconds / 60,
          openingMinutes: result.openingSeconds / 60,
          openingControls: result.openingControls,
          maxVisitControls: Math.max(
            0,
            ...result.visits.map((v) => v.controls),
          ),
          minHealthyFractionAtReturns: Math.min(
            1,
            ...result.visits.map((v) => v.before.healthy / v.before.people),
          ),
          milestones: Object.fromEntries(
            result.milestones
              .filter((m) =>
                [
                  'shelters',
                  'agriculture',
                  'writing',
                  'mechanization',
                  'chronometry',
                  'electronics',
                  'orbital-flight',
                  'quantum-engineering',
                  'causal-engineering',
                  'causal-synthesis',
                ].includes(m.id),
              )
              .map((m) => [
                m.id,
                { afterHours: m.time.after / 3600, byHours: m.time.by / 3600 },
              ]),
          ),
          people: result.final.people,
          calculationSeconds: result.calculationSeconds,
          longestAbsenceMs: result.longestAbsenceMs,
        }
        summaries.push(summary)
        console.log(JSON.stringify(summary))
      } catch (error) {
        const failure = {
          id,
          status: 'execution-failed',
          error: error instanceof Error ? error.message : String(error),
        }
        summaries.push(failure)
        console.error(failure)
        process.exitCode = 1
      }
      await Bun.write(
        `${values.out}/summary.json`,
        JSON.stringify(summaries, null, 2),
      )
    }
