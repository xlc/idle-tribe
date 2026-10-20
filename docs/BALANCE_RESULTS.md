# Balance testing and tuning

This report separates economic measurements from player-experience judgments. The runner uses the real game rules, ordinary purchases and assignments, and the same absence accounting as the game. The harness does not inject materials, workers, research, or completed facilities during progression runs. Checkpoint experiments and synthetic arithmetic probes are explicitly identified below.

## Measured results — 20 October 2026

The final frequent-visit bottleneck runs establish the prepared settlement in **14.18 minutes with 60 individual-control equivalents**, compared with **14.00 minutes and 159 controls** in the matched reference. That is 99 fewer opening controls without increasing the base gathering rate. Both branches observe Agriculture at 48 hours and Writing at 104 hours. The recorded bounds place the agricultural phase between **48.13 and 63.87 hours**; subtracting only the observation times gives a less precise 56-hour estimate.

The reference retains expertise and the corrected policy, but restores single-unit gathering, the original agricultural prices, and Writing without the farm prerequisite. It is a controlled counterfactual, not a replay of the old shared-mastery release.

| Milestone, frequent bottleneck policy | Reference Forestry | Tuned Forestry | Reference Stonecraft | Tuned Stonecraft |
| --- | ---: | ---: | ---: | ---: |
| Agriculture | 48 h | 48 h | 48 h | 48 h |
| Writing | 64 h | 104 h | 64 h | 104 h |
| Mechanization | 88 h | 128 h | 96 h | 120 h |
| Chronometry | 120 h | 152 h | 120 h | 144 h |
| Orbital flight | 184 h | 200 h | 184 h | 192 h |
| Causal synthesis | 360 h | 320 h | 352 h | 288 h |

Times in the table are observation upper bounds, not exact completion times. The later bottlenecks shift with investment and staffing: higher early prices do not imply every later milestone must move later. No branch needs prestige to finish.

All **12 of 12** final progression scenarios complete within the 60-day observation horizon, without a prestige reset. Every sampled return has a fully healthy population. The following are Causal-synthesis observation times in wall-clock days:

| Policy | Schedule | Forestry | Stonecraft |
| --- | --- | ---: | ---: |
| Bottleneck | Frequent | 13.33 | 12.00 |
| Bottleneck | Daily | 35.00 | 35.00 |
| Bottleneck | Concentrated | 24.00 | 23.00 |
| Simple | Frequent | 16.67 | 22.33 |
| Simple | Daily | 38.00 | 35.00 |
| Simple | Concentrated | 31.00 | 30.00 |

More frequent decisions generally accelerate progression. The simpler allocation policy still finishes, with lower effort in most visits. Peak individual-control equivalents range from 54 to 572 across these runs; the maximum is in a 24-minute visit. Fill can reduce actual staffing clicks, but these action counts do not prove that every simulated visit feels comfortable to a human. Inspect allocation traces rather than interpreting the allowance as measured usability.

## Reproduce a run

Commands and setup are maintained in [README](../README.md#development). Generated artifacts go to the ignored `balance-results/` directory. Each run records its options, source fingerprint, runtime, successful actions, milestone bounds, observations, and resumable states. Keep the corresponding provenance file with results: a Git revision alone does not identify an uncommitted economy.

There are two deterministic player policies. Both protect food supply and use a published construction order. The simple policy spreads workers across available production jobs and keeps one builder. The bottleneck policy prioritizes first workplaces and food capacity when more than half the workforce produces food, uses the efficient builder crew, and directs spare workers toward shortages and the next queued costs. It is a heuristic, not an optimizer. Assignments change at visits and when the workforce, completed facilities, or technologies change; stock fluctuations alone do not trigger continuous reassignment. Worker choices follow the game's staffing selector.

The matrix crosses both specializations, both policies, and three attendance schedules:

| Schedule | Return interval | Visible session allowance |
| --- | --- | --- |
| Frequent | 8 hours | 8 minutes |
| Daily | 24 hours | 8 minutes |
| Concentrated | 24 hours | 24 minutes |

The opening is measured separately. Visible time is a simulation allowance, not a measurement of human decision speed. Control counts are conservative equivalents of individual controls, without compressing staffing into Fill operations. They include successful manual actions, project plans, branch confirmations, and worker transfers. They omit navigation, reading, and thinking. Worker transfers can require two controls. Prestige comparisons explicitly account for additional opening sessions instead of hiding them inside an eight-minute return.

## Measurement contracts

- A milestone's `after` and `by` fields bound its completion in wall-clock seconds. An offline completion is observed on return; it is not assigned an invented exact timestamp. Derive era-duration bounds from both milestone intervals, not just their upper bounds.
- Wall time, effective simulated time, and visible time are separate. Each absence retains its departure window; improvements completed away affect the next absence. No worker assignments or new plans are issued while absent; previously queued projects can start, pay, and complete.
- Rates, pressure, health, and queue blockers are snapshots. They do not establish sustained output or time spent blocked. Investment experiments use actual resource changes, including paid costs, recipes, and meals.
- Reaching the frontier proves a route under that policy. An unfinished 60-day run is reported as unfinished, with its final state; it is not automatically an economic dead end. Execution errors are reported separately and fail the command.
- Policies can make poor investments. Diagnose the action trace before changing prices. In particular, storage must not strand the first material source, and construction should not be assessed only with a single builder when more efficient staffing is available.

## Changes under test

Manual gathering now returns three units per action over three times the previous base duration. Base throughput is unchanged; the purpose is fewer repetitive opening clicks. It continues to pause while hidden. Discovery actions retain their existing duration and costs.

Writing requires one completed Farm. The five agricultural investments and Writing cost six times their original materials; their timers are unchanged. This makes agricultural production, conversions, storage, and equipment relevant before town growth. It prevents a preloaded research queue from passing through the entire agricultural economy before the player constructs its defining workplace.

Worker expertise is a concurrent feature described in [Villager expertise](VILLAGER_EXPERTISE.md). Final comparisons must hold that system and the player policy constant when attributing changes to balance tuning. Earlier runs with shared mastery are historical evidence only.

The initial fourfold-cost trial still traversed agriculture in about 40 observed hours with expertise. The sixfold trial lengthened that phase through material investments rather than longer fixed research timers. It retained the 14.2-minute opening and 48-hour Agriculture observation. These are policy-dependent measurements, not promises for every player.

A later trial exposed a policy error: Stonecraft could leave nearly its entire workforce on a level-one farm while expanding downstream industry. Prioritizing crowded food capacity resolved that wait through an existing inexpensive investment. That policy correction is applied to both sides of the final matched comparison. No late-game prices or branch bonuses were changed to compensate for the planner's mistake.

## Focused comparisons

Investment arms start from the same earned checkpoint. Existing plans are cancelled through ordinary controls in every arm, with exact refunds. Compare holding resources, assigning an existing idle worker, expanding, equipping, storing, and converting when available. Observe each arm after eight and 24 hours of the same absence. Report every resource's change; additional output alone does not establish payback across different inputs. Unavailable alternatives are recorded rather than silently granted.

Recovery cases remove food staffing, overcommit processing relative to its raw-material supply, leave construction without builders, and miss a week. Damage is produced through gameplay and elapsed time. Recovery uses ordinary assignments and planning; its duration and control count are reported. The one-hour recovery observation is a test horizon, not an imposed gameplay deadline.

Prestige comparisons begin at the same earned Chronometry checkpoint and run for an additional 30 days. Compare continuing, repeated Writing resets, repeated Chronometry resets, and Orbital-flight resets. Record legacy, frontier reached, active effort, reset count, and repeated opening work. The four first-purchase perks are also tested separately against saving the points. Offline preparation is evaluated with the actual offline curve; it is not expected to accelerate absences shorter than the existing full-speed window.

Arithmetic probes examine staffing and equipment at increasing levels, including values far beyond ordinary progression. These check finite, positive marginal benefits and diminishing returns; they do not prove those synthetic states are reachable or enjoyable.

## Investment and recovery findings

At earned checkpoints, the following are eight-hour **net changes in the named resource**, including any of that resource paid for the intervention. All other resource changes and construction costs are retained in the raw output; these figures are not a common-currency profit or a universal ranking. The extra worker is an already-idle villager, not a granted arrival.

| Forestry checkpoint / measured stock | Hold | Expand | Equip | Storage | Assign idle worker |
| --- | ---: | ---: | ---: | ---: | ---: |
| Agriculture / tools | +125 | +170 | +140 | +175 | +136 |
| Writing / wood | +1,432 | +1,598 | +1,899 | +1,976 | +3,380 |
| Causal engineering / quantum components | +86 | +93 | +103 | +86 | +164 |

Storage helps the pressured early workshop but adds no quantum output at the sampled late stock level. Equipment improves output without additional workers, while also increasing ingredient demand. Expanding has construction and material costs; assigning a spare worker often gives a strong immediate return. None of these alternatives wins across every tested checkpoint and resource. The requested conversion alternatives at these particular checkpoints were locked and are reported as unavailable; ordinary conversions are exercised by the progression runs and browser tests.

Both branches recover all **89 deliberately starved villagers within five simulated minutes** after ordinary staffing corrections. The one-hour tests also restore production after removing upstream workers, resume a queued expansion without builders, and recover from a week away. All four cases end with fully healthy populations and newly completed projects. A week away preserves useful stock and completes prepared work; it does not schedule new choices. These are tested recovery routes, not a claim that every possible allocation is self-correcting.

Staffing probes at 1, 2, 4, and 8 times capacity, for capacities based on levels 1, 2, 4, 10, 25, 100, and 1,000, retain positive finite marginal output. Equipment also retains positive finite marginal improvement at the seven sampled levels. These checks support the implemented soft curves within the tested range.

## Prestige and first-purchase perks

Every strategy starts from its branch's earned Chronometry checkpoint and receives 30 additional wall-clock days. The initial settlement and discovery are identical within each branch. Only Efficient instruction is purchased in the repeated-reset comparison, so further perk-shopping choices do not confound it. Results are identical across branches for the metrics below:

| Strategy | Resets | Earned lifetime legacy | Additional active minutes |
| --- | ---: | ---: | ---: |
| continue | 0 | 0 | 720.00 |
| writing | 8 | 124 | 760.45 |
| chronometry | 6 | 222 | 749.40 |
| orbital-flight | 4 | 344 | 738.62 |

Repeated early resets do not dominate the tested longer routes. Orbital resets earn the most legacy in this comparison, but require more allocation actions; continuing preserves the advanced settlement and reaches the final era. This is a comparison of four explicit policies, not proof of an optimal reset time.

After the first reset, the following table measures regaining Chronometry under frequent visits. Both branches give the same observed results. Times include the new opening and the return session in which completion is detected:

| First purchase | Hours to regain Chronometry | Effective hours from an initial 24-hour absence |
| --- | ---: | ---: |
| none | 152.13 | 19.71 |
| longer-preparations | 152.13 | 20.98 |
| efficient-instruction | 136.13 | 19.71 |
| early-astronomy | 152.13 | 19.71 |
| organized-records | 144.13 | 19.71 |

Efficient instruction is strongest for this particular research goal; Organized records also improves its time. Longer preparations has no benefit for absences below the existing full-speed window, but adds about 1.27 simulated hours to an initial 24-hour absence. Early astronomy opens an optional observatory and does not shorten the measured return-to-Chronometry goal here. These results do not establish equal perk value or an optimal purchase order for other schedules and goals; no perk prices were retuned to force equality in this one scenario.

## Validation

- `bun run check`: lint, type checking, production build, and **71 tests passed** after the review fixes.
- `bun run test:browser`: **24 Chromium scenarios passed**, covering 1280px and 390px layouts. Opening and agricultural-loop screenshots were inspected. The final balance-cost change is included in these browser results.
- The ten runner regressions cover opening effort, partial horizons, offline accounting, checkpoint isolation, snapshots and commitments, quarry recovery, crowded-food investment, equal-horizon continuation, and an era reached and reset within one visit.
- Edited documentation links and diff whitespace were checked. No dependency, deployment, or save migration was added by this balance work.

The review fixed manual gathering's cached storage penalty so worker completions affect manual progress consistently across update sizes. A regression compares one long update with short updates under storage pressure. Prestige experiments now read the game's earned era record, retaining a frontier reached and reset within a single visit. Both frequent bottleneck routes were rerun through Causal synthesis and reproduced the 320-hour Forestry and 288-hour Stonecraft observations above; sampled returns remained fully healthy. The inspected People layouts fit desktop and phone widths. These checks do not replace human pacing assessment.

## Interpretation and remaining human work

The initial pacing goals remain a roughly 10–15-minute opening, Agriculture around 24–48 wall hours for frequent first-run play, and another two to four days in agriculture. These are provisional experience goals, not mandatory waiting periods. Daily attendance naturally receives fewer intervention opportunities and can also lose effective time to the offline curve.

A practical human round is three to five new players, with desktop and phone represented, plus two players familiar with incremental games. This is a qualitative sample, not a statistical estimate of the player population:

1. Observe an uncoached first 15-minute session. Ask players to build a settlement and decide what to invest in. Record discoveries, repetitive controls, confusion, and their reason for stopping. Do not prescribe the build order.
2. Observe two actual return visits, including an overnight absence. Record what changed, the next meaningful decision, unexplained shortages, and whether the player wants to return. Keep real attendance separate from accelerated simulation.
3. Use earned Agriculture, Writing, and late-game checkpoints for focused 20–30-minute comparisons. Ask players to choose an investment and explain its expected benefit. Then introduce one ordinary allocation mistake and observe recovery. Checkpoint sessions test decisions and comprehension, not first-run pacing.
4. Collect a short account of the best breakthrough and worst wait. Adjust one diagnosed bottleneck at a time, rerun the affected matrix cells and recovery cases, and observe that decision again. Retain uncertainty when players disagree.

A return without a purchase is not automatically empty. Numerical reachability, browser automation, and a few human observations cannot establish population-wide retention or prove universal enjoyment. No human participant study was run in this automated pass.

## Evidence provenance

The final runs used Bun 1.4.2. Raw JSON includes full source hashes, options, observations, controls, and earned checkpoints. The following ignored local artifact directories contain the final evidence; earlier trial directories are not the final verdict. Hashes below are prefixes of the full SHA-256 values in each `provenance.json`.

| Artifact directory under `balance-results/` | Source fingerprint | Coverage |
| --- | --- | --- |
| `final-forestry` | `0c03c7b11e5c4346` | Six final progression scenarios |
| `final-stonecraft` | `0c03c7b11e5c4346` | Six final progression scenarios |
| `matched-reference` | `20a7d3a8fcb48c10` | Six matched bottleneck references |
| `final-experiments` | `0c03c7b11e5c4346` | Forestry investments, recovery, prestige, perks, and curves |
| `final-stonecraft-experiments` | `5dc657c1dec62abd` | Stonecraft investments, recovery, prestige, perks, and curves |

The counterfactual sources are retained locally in `balance-results/expertise-reference-source/`. The policy and expertise rules are held constant in the matched comparison; the intended differences are the manual batch definition, agricultural prices, and farm prerequisite. Test/UI edits made while the concurrent expertise work finished can change the full source fingerprint without changing those economic rules. The current source and archived counterfactual were checked for unintended rule differences.

## Research basis

[The Math of Idle Games, Part I](https://www.kongregate.com/en/pages/the-math-of-idle-games-part-i) motivates comparing marginal investments and shifting production bottlenecks. Its exponential examples are not this game's polynomial cost model. [Part III](https://www.kongregate.com/en/pages/the-math-of-idle-games-part-iii) motivates testing repeated short resets against longer progression. [NN/g's usability-testing guidance](https://www.nngroup.com/articles/usability-testing-101/) supports realistic, uncoached observation and the distinction between qualitative findings and quantitative population claims.
