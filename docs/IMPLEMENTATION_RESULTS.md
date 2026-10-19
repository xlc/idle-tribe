# Design implementation and validation

Implemented on 19 October 2026 against [design draft 0.2](GAME_DESIGN_DETAILS.md), following [AGENTS.md](../AGENTS.md). The baseline in [GAME_DESIGN.md](GAME_DESIGN.md) remains a historical snapshot. Setup and commands live in [README.md](../README.md).

## Playable scope

All eight eras are playable through Causal synthesis: sixteen resources; the full research graph; facilities and form conversions; the Great Hall; permanent equipment and unlimited refinements; shared gathering mastery; meals and recovery; automatic unassigned immigration; town happiness; two ordered project queues; and uncapped economic investment with diminishing efficiency.

The simulation resolves worker completions in roster order, then research and construction completions, meals, happiness, immigration, and queue starts. Every active project has one recorded payment. That commitment remains in storage pressure until completion or a full cancellation refund. Waiting entries pay nothing and preserve original enqueue sequence when reordered. Old facility effects remain during work, and missing earlier levels can be rebuilt without discarding higher queued targets.

Current-format saves retain those commitments and partial progress together. Manual actions cancel/refund on reload; automatic projects resume. The offline curve snapshots its full-speed window once per absence, including across callbacks, restoration events, and reloads. Full resource precision is retained; display rounding does not alter the economy.

The UI exposes local production/input rates, storage comfort and pressure, Fill and deliberate overstaffing, arrivals, builders, queue ordering and cancellation, conversions, equipment, and removal previews. Facility filters separate production, storage, and housing/support. Conversion previews show replacement rates, recipes, and capacity. Short descriptions stay separate from mechanical effects. Completed research and optional details collapse; narrow screens stack the same controls.

The [later-era addendum](LATER_ERAS.md) defines industry, digital production, space, quantum engineering, causal technology, late branch specialization, and all additional costs and recipes. Chronometry discovers the time box during industry. Prestige reset rules, lifetime/unspent points, four permanent perks, optional astronomy, Observatory effects, and the non-prestige Deep-space array are implemented. Causal synthesis is the final finite discovery; repeatable investment and prestige continue afterward.

## Validation

- `bun run check`: lint, TypeScript, production build, and 45 rule/session/save tests passed.
- `bun run test:browser`: 14 production Chromium scenarios passed at 1280px and 390px. Screenshots were reviewed for both layouts.
- Browser interactions cover opening discovery, assigning and overstaffing, Fill, paid cancellation, queued research across reload, permanent-choice confirmation, conversion, removal, modern rebuilding, signed away reports, paid time-box discovery, reset/perk persistence, advanced recipes, facility filtering, and late-era saves.
- Regression scenarios cover contested recipes, no retroactive blocked-worker progress, live/sliced simulation equivalence, both specialization routes, cumulative conversion pricing, commitments and refunds, unbounded levels, hunger recovery, conservative arrivals, happiness ordering, prestige reset boundaries, offline windows across reloads and backwards clock movement, industrial-to-causal recipes, resource-preserving conversions, late branch effects, and upstream demand for paused processors.
- The browser server required local execution outside the restricted sandbox, which blocks loopback listeners. No deployment was performed.

## Scheduled visits and pacing

`bun run balance --full` runs a reproducible policy from a fresh opening through the final research; omit `--full` to stop at Mechanization. Use `--branch=forestry` or `--branch=stonecraft` to isolate one path. It uses ordinary actions and assignments, without granting materials, people, buildings, or research. After a 13.9-minute first visit establishes food automation, housing, and a lumber camp, it visits every eight hours for roughly eight minutes. Stone discovery and initial stone gathering occur on the first return; subsequent production is automated. The policy reassigns existing people only as needed, plans research and construction, and preserves work cycles when assignments remain unchanged. Allocation accounts for the ingredients that assigned processors would consume even when temporarily paused for missing inputs.

These are observations at visits, so milestone times are upper bounds, not exact completion timestamps. This is one deterministic strategy, not a human playthrough or an optimality claim.

| Observation | Forestry | Stonecraft | Draft target |
| --- | --- | --- | --- |
| First prepared settlement | 13.9 minutes | 13.9 minutes | 10–15-minute opening |
| Agriculture observed | 64 hours | 64 hours | 24–48 hours |
| Writing observed | 80 hours | 80 hours | Agricultural era lasting another 2–4 days |
| Mechanization observed | 104 hours | 104 hours | No numerical town-duration target |
| Chronometry / time box observed | 184 hours | 184 hours | Available before spaceflight |
| Electronics observed | 192 hours | 192 hours | No specified duration |
| Orbital flight observed | 232 hours | 232 hours | No specified duration |
| Quantum engineering observed | 280.12 hours | 272 hours | No specified duration |
| Causal engineering observed | 312 hours | 296 hours | No specified duration |
| Causal synthesis observed | 352 hours / 14.67 days | 328 hours / 13.67 days | Open investment after final discovery |
| People at final visit | 147 | 156 | Soft housing pressure; no population ceiling |

The first visit fits the intended range. This policy misses the first-era target and compresses the agricultural era into roughly two return intervals. The specified early catalog numbers were retained rather than tuned to one scripted strategy. Later numbers were designed as the explicit extension requested by the user.

The early bottleneck is a new workplace waiting for a return visit to receive staff: early wood accumulates while stone production has not started. Tools introduce another visible delay before Preparedness; the policy has hundreds of planks and knowledge while its new tool chain is still being staffed. Queues cannot resolve those allocation decisions automatically. Later farms release a large fraction of the workforce for processing and scholarship, accelerating Writing. These are useful tuning targets for human playtesting, not evidence that longer waits should be imposed.

## Economic comparisons

The following marginal comparisons assume healthy workers, no storage pressure, no mastery/research/happiness/prestige bonuses, and inputs available. Recipes still cost one full set of ingredients per output. These isolate the choice; the visit simulation above includes the interacting systems.

| State | Investment | Economic consequence |
| --- | --- | --- |
| Early, level-1 camp with two workers | Add a third worker | Effective staff rises from 2 to 2.811; output rises about 40.5%, with another person's meals. |
| Early, four workers at level 1 | Expand to level 2 | Effective staff rises from 3.386 to 4 and the level multiplier becomes 1.1; output rises about 30%, without increasing meals. |
| Middle, one level-1 toolmaker | Install tier 1 | Output rises from 0.10 to 0.12 tools/min, with inputs rising proportionally. Recovering the 10-tool cost through additional tool output takes 500 production minutes, plus construction. |
| Middle, level-2 housing | Convert to Cottages | Cost is 31 planks, 21 blocks, 8 tools and 7.6875 work; comfortable places rise from 5 to 9. Conversion does not free a worker directly. |
| Late, staffed processing facility | Refine tools from tier 3 to 4 | Multiplier rises from 1.75 to about 1.957 (about 11.8%); cost is 143 tools, 267 knowledge and about 71.11 work. More output also requires more recipe inputs. |
| Any era, stock at four times comfort | Invest in storage or spend stock | Production runs at half speed until pressure falls. At nine times comfort it still advances at one-third speed. Stock never becomes unspendable. |

No branch is required for a common source or transition. The two branches reach Mechanization together; Stonecraft reaches Causal synthesis one day earlier under this policy, with nine more people. Forestry finishes with more machinery and data; Stonecraft has more components and metal. That does not establish that either strategy dominates across other allocations.

An earlier policy stalled Stonecraft at the causal transition: over 100 analysts competed for circuits produced by a single electronics worker, while the policy looked only at instantaneous net rates. A paused recipe reported no current consumption, so the policy overlooked its upstream demand. Planning the intended recipe demand resolved the wait without changing costs or granting resources. The UI identifies missing inputs and exposes per-unit recipes so the equivalent player mistake has a visible allocation recovery path. Equipment payback and large farm-driven population growth need broader player testing; the scripted policy does not purchase equipment, so it cannot validate equipment's appeal by itself.

## Later investment comparisons and remaining limits

The following base comparisons use healthy workers, sufficient ingredients and stock below comfort; actual waits depend on level, staffing, happiness, technology and existing commitments.

| Choice | Output and net-input tradeoff |
| --- | --- |
| Mechanical tool workshop, level 1 | Base tool rate rises from 0.1 to 0.3/min. The conversion requires 30 metal and 10 machinery in addition to positive cumulative differences in earlier materials. A 0.2/min gain still needs extra planks/blocks; this is an industrial conversion, not free throughput. |
| Electric foundry, level 1 | Base metal rate rises from 2 to 6/min and fuel changes from 1 wood to 1 charge per metal. At full rate, ore demand rises from 6 to 18/min; powering the foundry does not solve its ore bottleneck. |
| Solar array, level 1 | Charge rises from 12 to 24/min per worker, and the 0.5 wood/charge recipe disappears. Keeping one worker saves the previous 6 wood/min and produces 12 additional charge/min, after investing metal/circuits/exotic material. |
| Quantum fabricator | Level 1 adds 15 percentage points of technology to six processing jobs; level 4 gives 30 points at 7.875× cumulative base investment. Existing technology bonuses reduce its relative benefit, so it competes with staffing, workplace expansion, and storage. |
| Predictive machine shop | Base machinery rises from 0.75 to 1.5/min while recipes change from 3 metal + 1 tool + 2 charge to 2 metal + 0.5 tools + 1 charge + 0.01 causal models. Doubled output has the same tools/charge use per minute, more metal demand, and a new causal sink before branch modifiers. |
| Stellar foundry | Base rate is 30 metal/min for 0.1 exotic material + 2 charge per metal, versus the electric foundry's 6 metal/min for 3 ore + 1 charge. It releases ore workers, but a fully staffed stellar route raises power and orbital demand. It does not delete the ore route. |
| Causal synthesis lab | Base rate rises from 0.05 to 0.12 models/min; ingredients fall from 2 components + 10 data + 20 charge per model to 1 component + 8 data + 12 charge. At the faster rate, total component demand still rises from 0.10 to 0.12/min. |

The complete visit simulations took about 28 seconds (Forestry) and 26 seconds (Stonecraft) on the validation machine. The slowest single eight-hour catch-ups were about 1.3 and 1.8 seconds respectively while the simulations ran concurrently. The simulator reuses structural rates only until a meal, health/happiness/mastery change, arrival, project completion or queue start; ingredient availability, resource pressure and commitments remain live. Sliced/live and save/reload regression scenarios verify the event boundaries. Very large settlements or long absences can take longer; these measurements are not a device-independent performance promise.

The opening and the full production graph have automated interaction and scheduled-visit evidence. They are not a human fun assessment. The first-era and agricultural-era duration mismatch, equipment appeal, long-run prestige timing, and repeat-run strategy still need player testing. The richer narrative presentation of individual tribal life has no specified mechanic beyond names, health, jobs and growth; no speculative relationship or event system was added. There is no deployment or claim of live production verification.
