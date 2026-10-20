# Villager aptitudes and expertise

Give villagers a small starting aptitude and expertise earned in individual occupations. The player prepares food, inputs, workplaces, and assignments, then returns to people who have become better at their work. Reassigning an experienced worker creates an opportunity cost without erasing their history.

Implemented on 20 October 2026; [validation results](VILLAGER_EXPERTISE_RESULTS.md) record automated checks, browser playtests, and pacing limitations. The selected direction is individual villagers, light economic decisions, preparation-driven outcomes while away, and an opening-through-Agriculture focus suited to brief visits and occasional longer sessions. Occupations develop separately; ordinary staffing controls choose suitable available people. Numerical values below are the initial implementation values; broader human playtesting is still needed. [AGENTS.md](../AGENTS.md) governs implementation; [README.md](../README.md) describes current gameplay and validation commands.

## Purpose and first release

The feature should make an assignment feel like placing a particular person, while keeping the workforce convenient to manage. Its recurring choice is whether to retain someone's established advantage or train them for a newly important occupation. Expertise rewards a functioning settlement: it develops through supported work, including simulated work while away.

The first release includes aptitudes, occupational expertise, suitable-worker selection, compact worker details, and return-report milestones. Apply the same rules to every existing production occupation and builders, so early villagers remain usable throughout the game. Concentrate human pacing tests on the opening through Agriculture, with economic checks in later eras.

Relationships, random incident cards, personality disadvantages, fatigue, training buildings, training currencies, and permanent injuries are outside this release. Individual development and existing health recovery provide the selected mix of missed opportunities and temporary setbacks. There are no response deadlines or rewards requiring attendance at a milestone.

## Starting aptitudes

Each person has one permanent aptitude for one occupation. It adds **5 percentage points** to that occupation's personal work multiplier. It does not change learning speed, food consumption, recipe costs, or other occupations. There are no negative aptitudes and no occupation restrictions.

The founder, currently named `You`, starts with a foraging aptitude and zero experience. New arrivals receive one aptitude, sampled uniformly from currently assignable working occupations, including builders and excluding idle. A production occupation is eligible when its workplace exists; builder eligibility follows the existing automation unlock. This gives arrivals a usable distinction without revealing future technology. The draw is reproducible from arrival order, making equivalent live, sliced, and reloaded timelines produce the same people without a separate random-state record. Record the result when the person arrives and preserve it on save; loading never draws again. Tests can supply the draw explicitly.

The pool is evaluated at arrival. Opening a workplace can therefore introduce that occupation among future arrivals, but it does not guarantee a specialist. An aptitude persists if its workplace is removed. There is no hiring screen, reroll action, or automatic reassignment.

Use a literal label such as **Woodcutting aptitude · +5% personal work**. Aptitude display metadata belongs to the occupation definition. A modifier this small should help distinguish beginners without outweighing established experience or a pressing food shortage.

## Expertise and learning curve

Store cumulative practice seconds separately for each working occupation. A new person starts at zero in all occupations. Idle has no expertise. Foraging and farming are separate, as are stoneworking and masonry, woodcutting and sawing, and smelting and stellar metal production. A building conversion that retains the same occupation retains the same expertise.

Confirmed after the worked-example review: expertise in one occupation gives no starting experience or learning-speed advantage in another. A veteran starts a new occupation under the same learning rules as a newcomer. Earlier expertise remains useful when returning to that occupation; this release adds neither general experience nor mentoring to preserve its value across technology changes.

Let `t` be cumulative practice minutes in an occupation:

```text
threshold(level) = 15 × level² minutes, for integer level ≥ 0
level(t) = floor(sqrt(t / 15))
expertise_bonus(level) = 0.05 × sqrt(level)
personal_work = 1 + expertise_bonus + (0.05 if aptitude matches, otherwise 0)
```

Levels have no maximum. Thresholds grow while each level adds a smaller benefit. Aptitude and expertise add within one multiplier; they do not multiply one another. Compute levels from practice time instead of saving both representations.

| Accumulated practice | Level | Expertise bonus | With matching aptitude | Next level at |
| --- | --- | --- | --- | --- |
| 0 minutes | 0 | 0% | 5% | 15 minutes |
| 15 minutes | 1 | 5% | 10% | 60 minutes |
| 1 hour | 2 | 7.07% | 12.07% | 2 hours 15 minutes |
| 4 hours | 4 | 10% | 15% | 6 hours 15 minutes |
| 8 hours | 5 | 11.18% | 16.18% | 9 hours |
| 24 hours | 9 | 15% | 20% | 25 hours |
| 7 days | 25 | 25% | 30% | 7 days 1 hour |

These are practice durations, not promised wall-clock completion times. Crowding, poor health, storage pressure, missing inputs, and the existing offline curve can all slow accumulation. Equipment and technology improve production without multiplying practice gains. A slow recipe and a fast recipe provide equal learning per equivalent productive minute.

Expertise never decays. Changing jobs retains every occupation's practice, while resetting the partial production cycle as assignments currently do. Selecting the current job remains a no-op. Cancelled construction does not undo builder practice already earned through work.

## Productive practice and recovery

For each simulated interval, award practice only while a person's assigned work advances:

```text
practice_seconds = simulated_seconds × health_multiplier
                   × staffing_multiplier × output_storage_multiplier
```

Production workers need an existing workplace, the recipe's required inputs, and room to advance their current production cycle. A worker held at a completed cycle while another worker consumed the available inputs earns no waiting-time practice. Time spent advancing a partial cycle counts, even when completion is later blocked. Ingredients continue to be paid per completed recipe; practice does not introduce reservations or additional consumption.

Builders use the same formula with storage multiplier 1, and earn practice only while they contribute to an active, paid construction project. A waiting queue, an empty queue, research timers, and instantaneous zero-work completions do not provide builder practice. Scholars learn through producing knowledge, not merely because research is running.

Use the current health multipliers: 1 at health 4–5, 0.8 at health 3, and 0.5 at health 0–2. Hungry people still work and learn more slowly. Meals and feasts restore health under existing rules. Thus poor preparation means lower output and missed practice; it does not erase expertise or create a second morale or injury penalty.

Crowding and storage pressure reduce practice along with useful work. This discourages assigning a huge idle crew or stockpiling unwanted goods solely to train. Aptitude, expertise, equipment, technology, happiness, and prestige do not directly accelerate practice. Their effects on congestion and available inputs can change how much practice actually occurs.

## Production and crowded workplaces

Expertise must improve a worker without making an extra available worker reduce the crew's aggregate output. The current health-weighted crowding formula assumes otherwise identical workers. Multiplying heterogeneous skill bonuses after that calculation can violate this property.

Use health and personal work together as the worker's contribution to the crowding calculation:

```text
contribution(person, job) = health_multiplier × personal_work(person, job)
x = sum(contribution for the assigned crew)
B = existing efficient staffing capacity
staffing_multiplier = effective_staff(x, B) / x, when x > 0

individual_output = base_workplace_rate × contribution × staffing_multiplier
                    × existing level, equipment, technology, specialization,
                      happiness, prestige, and output storage multipliers
```

Keep the existing `effective_staff(x, B)` curve: `x` up to capacity, otherwise `B × (1 + ln(x/B))`. For builders, sum contributions through the same curve with existing builder capacity, then apply existing happiness and prestige multipliers. Production still consumes one recipe per completed unit. Faster processing therefore raises input demand.

Capacity now describes supported work capacity. Strong workers can encounter diminishing returns before the nominal headcount is reached. Retain headcount as the familiar Fill target, but show actual staffing efficiency and explain in optional detail that skilled workers also use workplace capacity. This is a soft efficiency change, never a limit on assignment.

For example, with capacity 2 and all other multipliers at 1, two healthy novices without matching aptitudes contribute 2 work. Two workers with personal work 1.15 contribute about 2.280 after crowding, a 13.98% gain rather than 15%. Adding a healthy novice raises that to about 3.002. Increasing capacity to 4 lets the original skilled pair contribute their full 2.3, before the facility expansion's other benefits.

All rate consumers must use these personal contributions: workplace summaries, resource net rates, input demand, builder previews, staffing selection, and conservative arrival checks. Common workplace factors may be shared, but one worker's expertise must never stand in for everyone in the occupation. Existing conservative health and storage assumptions in arrival checks remain explicit and apply per person.

## Staffing and deliberate reassignment

**Plus** selects the available person with the largest marginal increase in the target crew's supported output. Compare their current health and expertise in the target occupation, including aptitude and the post-assignment crowding factor. With shared workplace factors, this ranks candidates by `health_multiplier × personal_work`.

For temporarily input-starved workplaces, rank potential output assuming recipe inputs are available. For builders with no active project, rank potential construction contribution. Show the existing blocked state separately: a missing input must not make all candidates appear equally suitable. Selection never predicts future research, learning, or cross-workplace optimization.

**Fill** repeats that choice among remaining available people until the existing nominal headcount target is reached or nobody is available. It runs only on the click. It neither replaces existing workers nor fills later vacancies automatically. **Minus** releases the assigned person whose removal loses the least supported output. Break exact ties by existing roster order, consistently across all controls.

The People view retains explicit occupation selection. A player can intentionally move an experienced worker or train a newcomer; show the person's potential rate for the selected occupation and their current expertise. Routine assignment requires no confirmation. A local message can identify the person just assigned or released.

## Replacing shared gathering mastery

Remove the settlement-wide food, wood, and stone mastery tracks and their worker bonuses. Remove their per-output awards and shared mastery presentation. Expertise is personal and occupational, so farming does not inherit foraging experience and later arrivals do not inherit veteran skills. Equipment and research remain settlement investments that can benefit new workers immediately.

Manual gathering does not use occupational expertise. Separate action levels earn 1 XP per completion. Food, wood, and stone start at 1, 2, and 3 seconds for one unit; each additional level adds 3% speed, and every fifth level adds 0.1 yield. XP requirements are `ceil(base XP × 1.2^(level − 1))`, with base XP 4, 3, and 5 respectively. Duration is base seconds divided by the speed multiplier and storage multiplier. Both explorations take 3 seconds and retain their costs. Manual actions are settlement actions, not a second simultaneous occupation for the founder.

Action XP rewards manual gathering and recovery without granting a settlement-wide worker bonus. Worker production continues to depend on the assigned villager’s own occupational expertise.

At Agriculture, a practiced forager begins farming at level 0. This follows the chosen occupation-specific progression. At base rates and without other modifiers, even a forager with 7 days of practice and matching aptitude produces 7.8 food/min, compared with a novice farmer's 18 food/min. That example supports a reachable transition, but actual facility levels, equipment, storage, and other bonuses must be included in playtesting. Veteran foragers should remain useful without making farming unattractive.

## Worked settlement example

Assume healthy villagers, level-one workplaces, one worker in each occupation, stock below storage thresholds, and no equipment, research, happiness, or prestige modifiers. Each person has accumulated four hours of practice in their current occupation, reaching level 4; each has a matching aptitude.

| Person | Occupation | Personal work | Output per minute |
| --- | --- | --- | --- |
| Mira | Woodcutter | 1.15 | 2.30 wood |
| Tavi | Stoneworker | 1.15 | 1.725 stone |
| Neri | Forager | 1.15 | 6.90 food |

A new sawmill needs a worker. Mira and Tavi each start sawing at level zero, producing 0.5 planks/min and consuming 1.5 wood/min. Moving Tavi stops stone production but leaves Mira supplying the sawmill with 0.8 wood/min to spare initially. Moving Mira instead preserves stone production but consumes stored wood until the sawmill pauses. That can suit a short plank batch while stone is urgently needed. With nobody available, Plus does not make this decision; the player deliberately reassigns someone.

Suppose Tavi moves to sawing and accumulates one hour of productive practice before an input shortage blocks work. He reaches sawing level 2, with about 7.07% expertise. His higher processing rate also raises wood demand. Time spent blocked earns no practice. Returning him to stoneworking restores his existing level 4 advantage immediately; later sawing resumes from the retained level 2 practice.

When Agriculture opens, Neri starts farming at level zero with no applicable aptitude, producing a base 18 food/min under the same assumptions. His foraging aptitude and level 4 expertise remain recorded, but do not accelerate farming practice. The player accepts an old specialty becoming less useful in exchange for a major production breakthrough; the design does not add a compensating transfer bonus.

## Interface and personal feedback

Use the existing People view and workplace controls. A compact person row shows name, health, assignment, matching expertise level, and effective output. An aptitude badge remains readable when it applies to a different occupation. Expand the same row for learned occupations, bonuses, and progress to the next level; omit future locked occupations and zero-experience entries that add no information.

Example expanded content:

```text
Mira · Woodcutter · health 5/5
Woodcutting aptitude +5% · Expertise 4 +10%
Next level: 4h / 6h 15m practice
Output: [current calculated amount] wood/min
```

The first level can use the descriptive label “Practiced” alongside its number. Further levels use numbers rather than an expanding catalog of rank names. Level gains update locally during active play. Do not interrupt research discoveries with repetitive milestone notices.

On return, extend the existing report with level changes such as “Mira: Woodcutting 2 → 4.” Show at most five rows initially, with a count and expansion for the rest. Group multiple gains for one person into one row. Compare levels against the departure snapshot; people who arrived during the absence start at zero for that comparison. Include a milestone once for the whole absence, not once per hidden callback or reload. Current blockers remain in the existing report rather than inventing a personal event history.

At phone width, keep the assignment and output readable without horizontal scrolling; expanded expertise details stack within the same row. Names use DOM text properties. The opening needs no tutorial modal: aptitude is visible on the founder, and ordinary work reveals expertise progress.

## Simulation and persistence contracts

Use a concrete working-occupation type excluding idle, a typed aptitude identifier, and a complete record of finite nonnegative practice seconds per person. Keep occupational names, aptitude labels, eligibility, and production-versus-construction learning behavior in the owning typed definitions. Shared evaluators consume those definitions; adding an occupation must not add named-job branches to simulation, rendering, or save normalization.

Make expertise level crossings explicit simulation events. Within an interval, personal multipliers are constant; split at the next practice threshold as well as existing production, meal, arrival, and project events. Credit elapsed work using the old rates, derive new expertise, then recompute subsequent rates. A level reached at the end of an interval never improves work already done. Resolve simultaneous existing events in their current order, then refresh derived rates, including the expertise earned through that interval.

Practice uses simulated gameplay seconds, including the effective seconds supplied by the existing offline curve. It never uses raw wall time or advances manual actions while hidden. Repeated hidden callbacks, restoration, and reloads settle only previously unaccounted time. Save fractional practice along with current production cycles and absence accounting. Large advances, many small advances, and save/reload midway must produce equivalent results within the simulator's numerical tolerance.

Extend the absence snapshot with starting occupational levels for the existing roster; append-only roster positions identify people during a run. Do not use editable names as identity. A run reset clears the snapshot together with the roster. Store only the baseline needed for the report, not a duplicate activity ledger.

Save schema version 7 retains aptitudes and occupational practice and adds separate manual action levels and XP. Default initialization and current-format validation use the same schema; incompatible saves reset. Missing or invalid required expertise data invalidates the new-format save rather than inventing a migration. Loading preserves saved aptitudes and practice exactly; it does not retroactively train anyone.

Prestige resets people, aptitudes, and expertise with the settlement. The new founder uses the same fixed starting aptitude. Existing legacy points and perks retain their current meaning, and the reset preview explicitly lists personal expertise among the losses. Prestige does not provide an undocumented practice-speed multiplier.

## Balance questions and acceptance evidence

The initial curve makes aptitude equal to the first level's 5% benefit. Four hours of supported practice grants 10% expertise; eight hours grants about 11.18%. This should make stable assignments rewarding while allowing an experienced non-specialist to beat an untrained specialist. It is a hypothesis to test, not a requirement to leave someone in an unsuitable job.

Use the current working-tree economy as the baseline at implementation time, including independently changed research costs and manual-action batching. Do not treat the older [recorded visit results](IMPLEMENTATION_RESULTS.md) as measurements of this proposal. Keep baseline and candidate policies identical except for staffing choices enabled by the feature, and record those differences.

| Stage or decision | Required comparison |
| --- | --- |
| Opening | Fresh game through food automation, housing, and the first arrival; verify action XP, three-second exploration, and the path to automation. Record first useful aptitude choice and first expertise gain. |
| Early visits | Food, wood, stone, and builder allocation under brief visits and a 15–20-minute active session. Compare a stable crew with sensible reassignment, including opportunity costs and empty waits. |
| Agriculture | Compare veteran foragers with novice farmers using actual facilities and bonuses. Reassign for food recovery and return to the original occupation with its expertise intact. |
| Middle economy | Compare equipment, expansion, and expertise for input-limited tools and knowledge. Include net input demand, meals, time to afford, and payback. |
| Late economy | Exercise both branches with healthy veterans, newcomers, advanced recipes, and stacked multipliers. Confirm expertise does not crowd out technology, storage, or expansion choices. |
| Crowding | Compare capacity 2 with novice and mixed-expertise crews, then expansion. Adding a worker and increasing expertise must each raise supported aggregate output. |
| Absences | Compare an eight-hour prepared absence with food or input shortages, then a 24-hour absence under diminishing effective time. Test equivalent sliced and reloaded timelines. |

Focused regression coverage should demonstrate threshold-crossing output, retained expertise after reassignment and conversion, per-person recipe demand, conservative arrivals, builder learning through paid work, recovery after meals, and stable suitable-worker selection. Verify positive save/reload and prestige outcomes, including current-format validation and reset behavior for incompatible data.

Browser checks must cover Plus, Minus, Fill, deliberate assignment, expanding personal details, returning from an absence, and reloading at desktop and narrow widths. Include a larger roster so individual detail remains optional and quick visits do not become a sequence of person-by-person chores. Run the README development and browser checks for code changes.

Before calling the feature ready, report whether players can recognize a person's useful distinction, make a worthwhile reassignment, recover from a shortage, and prepare an absence without constant attendance. Report any dominant strategy or long empty wait and tune the curve, aptitude size, or affected economic bottleneck accordingly. Automated passage through eras alone does not establish those outcomes.
