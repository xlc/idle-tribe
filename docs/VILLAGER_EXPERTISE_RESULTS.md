# Villager expertise implementation and validation

Implemented on 20 October 2026 against the [villager expertise design](VILLAGER_EXPERTISE.md). Villagers have permanent occupational aptitudes, learn through supported work, and retain separate expertise when reassigned. Plus and Fill choose suitable available people; Minus releases the lowest contribution. The People view and return report show individual progress. Shared gathering mastery has been removed, and schema 6 resets incompatible saves.

## Rules and browser checks

`bun run check` passed lint, TypeScript, the production build, and all 68 rule/session/save/tooling tests. `bun run test:browser` passed all 24 Chromium scenarios. Local documentation links and diff whitespace checks also passed.

The regression scenarios cover level crossings changing subsequent output, practice independent of recipe speed and equipment, contested inputs, crowding, storage pressure, health recovery, paid builder work and cancellation, conversion, retained expertise, staffing choices, mixed crews, ingredient demand, conservative food security, arrival aptitudes, fractional saves, offline reloads, and prestige. Aptitude draws are reproducible from arrival order, so splitting elapsed time or reloading does not change the resulting roster.

The production Chromium checks run at 1280px and 390px. They cover the founder's aptitude, suitable-worker selection, Fill and release, deliberate reassignment, farming starting at level zero, saved expertise, the first visible milestone, feast recovery, grouped return reports, and a 36-person roster. Existing construction, research, conversion, prestige, and later-era interactions remain covered. The People panel and return-report screenshots were inspected at desktop and phone widths; assignment controls and optional details fit without horizontal scrolling.

Browser tests require a loopback server. The restricted run could not bind the port; the approved local run completed outside that restriction. These are local production-build checks, not deployment evidence.

## Scheduled progression

The reference run used the working-tree economy before expertise implementation, including the in-progress opening and research balance changes. The candidate uses individual expertise and current staffing selection. Both use the bottleneck policy with eight-minute visits every eight hours, a fresh opening, and ordinary game actions. Times below are upper bounds observed at visits, not exact research completion times.

| Observation | Reference Forestry | Expertise Forestry | Reference Stonecraft | Expertise Stonecraft |
| --- | --- | --- | --- | --- |
| Prepared opening | 13.88 min | 14.18 min | 13.88 min | 14.18 min |
| Agriculture | 40 h | 48 h | 40 h | 48 h |
| Writing | 96 h | 88 h | 96 h | 88 h |
| Mechanization | 120 h | 112 h | 120 h | 112 h |
| Chronometry | 144 h | 136 h | 144 h | 136 h |
| Orbital flight | 192 h | 184 h | 192 h | 184 h |
| Causal engineering | 272 h | 288 h | 264 h | 280 h |
| Causal synthesis | 312 h | 400 h | 304 h | 488 h |

The opening remains within the 10–15-minute target, at 60 controls in both runs. Agriculture is observed at the upper end of its 24–48-hour target. Each candidate reaches every era, and sampled returns have fully healthy populations. These runs compare overall policy outcomes; they do not isolate every modifier or establish an optimal strategy. The planner was also being developed in the working tree, so the reference is context rather than a controlled experiment attributing every time difference to expertise.

The final full runs took about 48 seconds for Forestry and 68 seconds for Stonecraft on the validation machine. Their slowest individual eight-hour catch-ups were about 3.67 and 2.10 seconds. More workers and expertise thresholds increase simulation work; these measurements do not establish performance on a phone or very large settlements.

The late waits deserve attention. In the Stonecraft candidate, the settlement continued using a level-one farm with more than 100 farmers. Machinery repeatedly consumed scarce tools, delaying construction investments. Removing inherited food mastery makes that investment pattern less forgiving; increasing personal expertise alone does not solve inadequate capacity.

## Recovery through ordinary decisions

The following recovery trials start from the candidate final checkpoints. They redirect machinery workers to toolmaking, prioritize one farm expansion using the normal paid queue, simulate construction, and release farmers only while the conservative food-security check remains satisfied. They grant no resources, people, levels, or experience.

| Checkpoint | Farm expansion | Cost | Time until built | Farmers before and after |
| --- | --- | --- | --- | --- |
| Forestry | Level 3 → 4 | 92 planks, 61 blocks, 30 tools | 13 min | 107 → 41 |
| Stonecraft | Level 1 → 2 | 47 planks, 32 blocks, 16 tools | 16 min 50 sec | 122 → 14 |

Both recoveries leave sustainable food headroom for the next arrival. A modest investment frees workers for stalled production chains; waiting for expertise levels is not the only available response. These are targeted recovery demonstrations, not reruns proving improved final completion times. The scripted planner's late empty waits remain a limitation of the tested policy.

## Investment comparisons

These examples isolate healthy workers below storage pressure and within workplace capacity, with no other bonuses. Ingredient consumption scales with completed output.

| Stage | Comparison | Decision |
| --- | --- | --- |
| Early | Four hours of woodcutting practice adds 10% personal work; matching aptitude makes 15%. A single level-one woodcutter produces 2.3 wood/min instead of 2. | Retaining an experienced supplier helps, but moving them remains worthwhile for an urgent missing occupation. |
| Agriculture | The same practice and aptitude give a forager 6.9 food/min; a novice farmer begins at 18 food/min. | Starting a separate occupation still provides a clear production breakthrough. |
| Middle | A toolmaker with 10% expertise produces 0.11 tools/min. Tier-one equipment changes this to 0.132, with proportional input demand. The 10-tool price takes about 455 production minutes to recover from the extra 0.022 tools/min, excluding construction time and valuing inputs separately. | Expertise complements equipment, but does not remove its long payback or solve ingredient shortages. |
| Late | A base causal researcher with 20% expertise produces 0.06 models/min rather than 0.05, consuming 0.12 components, 0.6 data, and 1.2 charge per minute. The later laboratory's base 0.12 rate and improved recipe are a much larger change. | Expertise rewards continuity without replacing research, conversion, or upstream investment. |

Food recovery and reassignment were also exercised through browser controls: a feast restores health, supported practice reaches the first milestone, moving a worker retains their old expertise, and assigning a forager to farming starts at farming level zero. No transfer bonus or mentoring was added.

## Remaining limits

The feature has automated rule and interaction evidence plus inspected layouts. Human judgments of attachment to individual villagers, the appeal of long specialization, and the emotional effect of leaving an obsolete occupation need broader playtesting. The initial 5% aptitude and learning curve are retained; no broad economic retuning was made to fit one scripted policy. Equipment's payback and late food-capacity planning remain worthwhile follow-up balance topics.

Raw local run artifacts are under `/tmp/idle-tribe-expertise-baseline`, `/tmp/idle-tribe-expertise-candidate`, and `/tmp/idle-tribe-expertise-final`; each contains its source provenance and visit data. The candidate recovery trial uses the candidate checkpoints. These temporary artifacts are not part of the repository; the tables above retain their relevant findings. Commands and setup remain in the README.
