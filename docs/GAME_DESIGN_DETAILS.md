# Primitive Tribe Detailed Design Draft

This is balance draft 0.2 for the multi-era game described in [GAME_DESIGN.md](GAME_DESIGN.md). It proposes concrete rules and content for review. Nothing in this file is implemented merely because it is specified here. The user's latest choices and [AGENTS.md](../AGENTS.md) take precedence. This revision replaces earlier hard-cap proposals with soft limits and adopts the current PoC save-reset policy. Numerical values remain tuning candidates.

The tribal, agricultural, and town eras below have numerical building and technology catalogs. Later eras have a defined expansion outline rather than pretend final balance. Time box discovery and origin remain deliberately undecided.

Implementation status: [the later-era addendum](LATER_ERAS.md) now defines the previously open numerical content and time-box discovery, following the user's implementation request. [Validation results](IMPLEMENTATION_RESULTS.md) describe what is playable and the remaining balance limitations. The draft below is retained as its design history.

## Design targets

- A first visit of roughly 10–15 minutes establishes food production, housing, and initial assignments.
- Later visits take roughly 3–10 minutes, several times a day: assign arrivals, adjust supply, expand capacity, and prepare both queues.
- Agriculture ends the first era around 24–48 real hours for that visit pattern. This is a balance target, not an imposed unlock timestamp.
- Storage, inputs, workers, and prepared plans determine useful offline progress. The initial full-speed offline window is 8 hours, followed by diminishing progress rather than a cutoff.
- Ordinary advancement never requires a prestige reset. Each specialization can reach subsequent eras; prestige adds speed and optional content.
- Every named content item has one short, playful description. Exact effects, costs, prerequisites, and warnings stay separate and literal.

## Description voice

Give every resource, building, upgraded form, technology, tool tier, prestige perk, job, and gameplay action a single playful line. Aim for 4–14 words, with an 18-word ceiling. Keep names recognizable and let the neighboring effect fields explain the rules. Repeated recipe outputs use their resource's description; they do not need a second joke.

The voice is dry, curious, and fond of the settlement's growing ambitions. Early humor comes from food, awkward rocks, and enthusiastic neighbors; later humor comes from complicated machinery and increasingly unreasonable science. Use original wording grounded in each item's role. Avoid jokes that imply unimplemented mechanics, prescribe the next move, or turn future technology into magic. Error messages, queue blockers, and destructive-action confirmations remain direct.

Kittens Game separates mechanical descriptions and effects from brief flavor text, often using understatement or wordplay. That separation is the reference for these one-liners. [Kittens Game English text](https://raw.githubusercontent.com/nuclear-unicorn/kittensgame/master/res/i18n/en.json)

## Resources and units

Use seconds internally and per-minute rates in the interface. Retain full numerical precision in resource balances and cycle progress; display up to three decimal places. Catalog prices use whole units as defined below. Cost comparisons use a small numerical tolerance, never a discounted payment.

| Resource | Identifier | Description | Initial storage threshold | First source |
| --- | --- | --- | --- | --- |
| Food | `food` | The one resource everyone insists on consuming. | 120 | Manual gathering, then Foraging camp |
| Wood | `wood` | Future homes, currently shaped like trees. | 60 | Nearby discovery, then Lumber camp |
| Stone | `stone` | The settlement's oldest and least flexible building material. | 60 | Farther discovery, then Quarry |
| Planks | `planks` | Wood persuaded to take a more useful shape. | 20 | Sawmill |
| Blocks | `blocks` | Stone with its corners finally in order. | 20 | Stoneworks |
| Tools | `tools` | An excellent way to stop doing everything the hard way. | 10 | Tool workshop |
| Knowledge | `knowledge` | Useful ideas that survived being explained to someone else. | 20 | Learning circle |

Food is the new opening resource; incompatible prototype saves reset. Crops feed this same resource, not separate wheat, berry, or meal inventories. All seven stockpiles can grow beyond their storage thresholds, including tools and knowledge. Zero-quantity locked resources remain hidden until their source is discovered.

Each later resource needs a source, a useful sink, and a reachable storage investment before stockpile pressure becomes a long wait. Storage improves efficiency; it never determines whether a price is legally payable.

## Shared formulas

### Building costs and work

A repeatable facility has an integer level `L ≥ 0`, with no maximum. Level 0 means absent. Form conversions retain its level and equipment. Higher forms offer breakthroughs while continued investment in an older form stays possible. The unique Great Hall is a finite discovery/milestone, not a repeatable facility with an arbitrary upgrade ceiling.

```text
g(L) = (1 + 0.25L)^2
G(L) = L + 0.25L(L − 1) + (0.0625/6)L(L − 1)(2L − 1)
capital(resource, form, L) = ceil(base_cost(resource, form) × G(L))
expansion_cost(resource, L → L+1) = capital(resource, form, L+1)
                                  − capital(resource, form, L)
expansion_work(L → L+1) = base_work(form) × g(L)
```

`G(L)` sums `g(0)` through `g(L−1)`. Omitted resources cost zero. Taking differences of rounded cumulative prices prevents route-dependent rounding. Polynomial marginal costs replace exponential prices that would become an effective level ceiling. Construction uses healthy builder-minutes.

Shelters level 1 costs 20 wood, 10 food, and 2 work. Level 2 costs 32 wood, 16 food, and 3.125 work. Existing effects remain until completion. Free starting facilities still count toward their completed level when pricing later expansions.

### Staffing and production

`B = 2L` is a workplace's efficient staffing level, not an assignment limit. An absent workplace cannot employ anyone. Use this shared congestion curve for workplaces and builders:

```text
effective_staff(n, B) = n                         when n ≤ B
                      = B × (1 + ln(n/B))        when n > B
x = sum(assigned_worker_health_multipliers)
staffing_multiplier = effective_staff(x, B) / x  for x > 0
level_multiplier = 1 + 0.10 × (L − 1)
effective_worker_rate = base_rate × level_multiplier × staffing_multiplier
                        × tool_multiplier × mastery_multiplier
                        × technology_multiplier × specialization_multiplier
                        × health_multiplier × happiness_multiplier
                        × prestige_multiplier × storage_multiplier(output)
```

Every additional worker adds output; crowding reduces output per person. With efficient staffing 2, crews of 2, 4, and 8 produce like 2, 3.386, and 4.773 uncrowded workers. This gives expansion a purpose without preventing temporary overstaffing. Use health-weighted staffing `x` for congestion, then each worker's own health multiplier in their rate. This ensures that adding a hungry worker still increases total output; using headcount for congestion could accidentally reduce it. There is no hidden worker reassignment when staffing efficiency changes.

Happiness and prestige multipliers equal 1 before unlocking. Different categories multiply. Within production technology, bonuses add to 1: Sharpened stick plus Seasonal knowledge give foragers ×1.25. Farm irrigation gives `1 + 0.15 × sqrt(irrigation_level)`. Architecture adds 0.50 to block technology. Equipment tiers replace their previous multiplier. Recipes always create one output; faster processing also consumes ingredients faster.

A worker accumulates progress at `effective_worker_rate / 60` per second only while recipe inputs are available. At progress 1, recheck inputs, consume the recipe atomically, and add one output unit. If another worker has taken the inputs, retain at most one completed cycle until they return. No input is spent without output, and no backlog accumulates while blocked. Changing jobs discards partial progress. Storage pressure slows progress but never refuses a completion, so a fractional stockpile cannot become stuck just below a purchase price.

### Gathering mastery

Food, wood, and stone each have shared mastery starting at level 1. Manual completions and corresponding worker completions award 1 XP; no repeat-action skill exists for research or building.

```text
XP needed for next level = ceil(20 × mastery_level^1.5)
mastery_multiplier = 1 + 0.07 × sqrt(mastery_level − 1)
```

Mastery has no level or bonus ceiling. Its diminishing bonus and rising XP requirement favor useful economic investments over click grinding. Food mastery affects foragers and farmers; forager technologies do not affect farms. Processing, scholarship, and builders use mastery multiplier 1. Mastery never changes recipe yields or research timers.

### Storage pressure

Storage buildings provide a comfortable threshold `K`, not a maximum stockpile. Contributions remain resource-specific; spare food space does not store tools.

```text
building_contribution(resource, L) = base_threshold(resource) × G(L)
K(resource) = floor((initial_threshold + sum(building_contributions))
                    × storage_technology_multiplier)
S(resource) = spendable_stock + refundable_materials_in_active_projects
storage_multiplier(resource) = 1 / sqrt(max(1, S(resource) / K(resource)))
```

Below `K`, production runs at full speed. At 4K it runs at half speed, and at 9K at one-third. Stock remains spendable at any size; no spoilage or overflow inventory exists. Apply pressure to manual gathering throughput as well as workers, preventing repetitive clicks from bypassing the storage economy. Research timers and building work do not receive this multiplier.

Inventory keeping multiplies all thresholds by 1.50. Record keeping multiplies knowledge by a further 1.50. Organized records, if purchased, multiplies every threshold by 1.10. These storage bonuses multiply; floor only the final threshold. All refundable costs still held by unfinished manual actions also count in S until those costs are consumed or returned. A level-2 Stockyard adds 768.75 to each of wood and stone, giving thresholds 828 before technology.

Old completed effects remain during upgrades. Removing storage lowers thresholds without deleting stock; production gradually slows according to the resulting pressure. There is no “storage too small” purchase blocker. Storage investment competes with staffing, processing, and spending accumulated resources.

### Payments and refunds

Starting a project removes its exact payment from spendable stock and records it as committed material. That material continues contributing to storage pressure until completion or cancellation; it cannot be spent or eaten. Completion consumes the commitment, and cancellation returns it to spendable stock while discarding progress. Both remove the commitment record exactly once.

Starting and immediately cancelling preserves `S`, so repeated cancellation cannot create storage relief or resources. There is no additional inventory to manage: this uses the same payment record needed for the full refund. Queue entries that have not started reserve nothing. Project costs and food commitments are shown separately from available stock.

### Health and meals

Retain 5 health per person and one meal event per minute. Sort by lowest health ratio, preserving roster order for ties.

| Health ratio before the meal | Required food | Health multiplier |
| --- | --- | --- |
| Above 60% | 1 | 1.00 |
| Above 40%, through 60% | 0.5 | 0.80 |
| At or below 40% | 0.1 | 0.50 |

If the required portion is available, consume it and restore 1 health, capped at maximum. Otherwise lose 1 health, floored at zero. Nobody dies. Apply the health multiplier to gathering, processing, scholarship, and building work. Manual actions remain usable for recovery and are not penalized by health.

Feast costs `ceil(sum of missing health)` food and restores everyone immediately. It requires the full amount and cannot partially execute.

### Housing and immigration

```text
comfortable_places = 1 + floor(housing_places_per_level × housing_level
                               × architecture_multiplier)
crowding = max(1, (current_population + 1) / comfortable_places)
arrival_interval_minutes = 5 × crowding^2 / immigration_multiplier
```

Shelters provide 2 comfortable places per level, Cottages 4, Town houses 8; Architecture multiplies the housing contribution by 1.25. Housing has no population ceiling: crowding slows arrivals, and each additional housing level remains useful as population grows. Removing housing preserves people and assignments.

Arrival progress advances only while Welcome arrivals is enabled, spendable food is at least `20 × (N+1)`, and sustainable food output covers `1.10 × (N+1 + recipe_food_demand)` per minute. `N+1` assumes everyone, including the new arrival, eats full portions. The buffer is a condition, not a fee. Failed conditions pause progress; they do not bank multiple arrivals. Completion creates one healthy, unassigned person and resets progress. Recheck conditions at the completion timestamp.

For this guard, calculate food output from currently assigned food workers and completed facilities, current mastery, equipment, and staffing congestion. Evaluate food storage pressure at the required arrival buffer plus committed food, rather than at a larger temporary hoard: consuming that surplus restores production before reaching the protected buffer. Use their actual health, exclude manual clicks, and after Writing use happiness ×0.75 regardless of today's higher value. Calculate recipe demand from all assigned food-consuming workers at full health, happiness ×1.25 after Writing, and output-storage multiplier 1; assume their other inputs are available. Before Writing both happiness values are 1. This conservative margin prevents automatic growth from depending on temporary happiness or paused scholarship. It does not protect against the player's subsequent reassignment, food spending, or newly upgraded consumption; those are visible, recoverable decisions.

Before towns `immigration_multiplier = 1`; afterward it is `0.5 + happiness/100`. Welcome arrivals defaults on. Fill assigns only currently available people up to the selected workplace's efficient staffing target (or the builder target); + can deliberately assign beyond it. Fill never steals workers or automatically assigns future arrivals. Builders unlock with Shelters.

### Builders

```text
organized_crew = 1 + completed(Masonry) + Builders_lodge_level
x = sum(builder_health_multipliers)
construction_speed = effective_staff(x, organized_crew)
                     × happiness_multiplier × prestige_multiplier
remaining_minutes = remaining_work / construction_speed
```

For zero builders, speed is zero and the project pauses. One healthy builder does one work per minute before town/prestige bonuses. Extra builders always help, with diminishing gains above the organized crew size. Lodge levels improve congested crews; no level is permanently nullified by a global maximum. The UI previews the actual marginal speed at the currently assigned crew.

Builders stay assigned between projects and work on the next eligible entry. An empty or blocked queue shows “Waiting.” Removing the lodge changes efficiency without releasing people. Equipment and conversions share the construction queue; their effects apply at completion. A new facility has no effects before completion.

### Research

Technologies have explicit costs and durations in the research tables. Once a project starts, its duration is fixed; scholars keep producing knowledge for later projects and do not speed up that timer.

```text
duration_seconds = base_duration_seconds / prestige_multiplier
```

This draft has no other research-speed multiplier. Early material-only research unlocks scholars without requiring knowledge. Later technologies use knowledge and specified material costs. Research produces no action XP.

### Queue rules

Maintain two queues, each with one active entry and no gameplay limit on waiting entries. Collapse the waiting list by default; a longer plan adds no automatic choices. A waiting entry represents one target building level, one tool tier, one form conversion, or one technology. Several successive levels can be queued, but their displayed costs use their target level, not today's completed level.

Queued prices are estimates until start. Recalculate the displayed price when an earlier conversion changes the facility's form or a permanent perk changes research costs. Expansion targets keep their specified level; a conversion's quote uses the expected level after preceding entries. At start, validate the actual prerequisites and calculate the payment from the actual form and level. Only that recorded payment is refundable. A tier requires the preceding tier and an existing production facility.

1. Players may freely reorder or remove waiting entries. A missing prerequisite blocks an entry rather than being bypassed.
2. Do not pay or reserve resources when adding an entry. Show “Waiting for materials,” “Requires …,” or “No builders” as appropriate.
3. Only a queue's first waiting entry can start. Construction additionally requires at least one assigned builder. Research does not.
4. If both queue heads are ready, compare their original, monotonically increasing enqueue sequence. The older entry pays first, then re-evaluate the other with the remaining stockpile. Reordering does not change this sequence.
5. An ineligible older entry does not reserve resources or block the other queue. Existing production and meals also continue using resources; a queue is not a protected savings account.
6. Cancelling an active entry refunds all recorded material costs and loses progress. Existing facility effects stay intact. Cancelling a conversion leaves its previous form unchanged.
7. Completion consumes no further payment. It applies effects once, removes the active entry, and checks the waiting head again.

Queued branch choices require the same permanent-choice confirmation as direct research. Incompatible branches cannot both be queued. Completion makes the choice permanent; cancelling before completion permits changing the choice. Invalidated duplicate entries are removed with a concise explanation rather than charged twice. Dependent entries with merely unfinished prerequisites wait.

### Simulation and saving

Use the same event timeline in visible and offline play. At a shared timestamp, resolve: already-active worker and project completions; resulting unlocks and capacity changes; meals; the minute's happiness update if unlocked; eligible immigration; then new queue starts. Resolve simultaneous worker completions in roster order and project completions in research-then-construction order. Recheck recipe inputs for each completion and recompute storage pressure after each stock or commitment change. A happiness update changes rates for subsequent elapsed time, not progress already earned.

Worker progress accrues between events using the conditions applicable during that interval. A producer that frees an input bottleneck only allows another worker to resume from that time onward. No worker gains progress retroactively for a blocked interval.

Before processing a player's action, settle elapsed gameplay to that instant. Persist resources, people, partial cycles, immigration progress, queue order, active queued work, exact paid costs, and the last settled timestamp together. Reload resumes queued research and construction; it does not refund them. Manual actions retain the separate visible-time and reload rules in Opening and interface behavior.

## Building catalog

All costs below are level-1 base costs for the shared formula. Repeatable facilities have no level maximum. Storage threshold contributions use the storage formula; housing and amenities use their stated linear effects. Descriptions are intended as player-facing text.

### Tribal facilities

| Facility and identifier | Description | Unlock | Base cost | Base work in builder-minutes | Effect |
| --- | --- | --- | --- | --- | --- |
| Shelters `housing` | A roof over your head beats a leaf on your head. | Shelters research | 20 wood, 10 food | 2 | +2 comfortable places per level |
| Foraging camp `foraging` | A meeting point for people who know which bushes are lunch. | Shelters research | 10 wood | 1 | Forager workplace; 6 food/min per worker |
| Lumber camp `lumber` | Where standing timber begins a career in construction. | Shelters research and wood discovery | 15 wood | 2 | Woodcutter workplace; 2 wood/min per worker |
| Quarry `quarry` | A reliable source of rocks and opinions about rocks. | Stone tools | 20 wood, 10 stone | 3 | Stoneworker workplace; 1.5 stone/min per worker |
| Food store `food-store` | Tomorrow's lunch has somewhere to wait. | Shelters research | 20 wood, 10 stone | 2 | +400 food base storage threshold |
| Stockyard `stockyard` | Wood here, stone there, toes out of the way. | Shelters research | 40 wood, 20 stone | 3 | +300 wood and +300 stone base storage threshold |
| Sawmill `sawmill` | Logs enter round and leave with better prospects. | Carpentry | 50 wood, 30 stone | 5 | Sawyer workplace; 0.5 planks/min per worker |
| Stoneworks `stoneworks` | We found the useful blocks hiding inside the awkward rocks. | Masonry | 40 wood, 50 stone | 5 | Mason workplace; 0.5 blocks/min per worker |
| Storehouse `storehouse` | Finished goods deserve better than the nearest empty patch. | Carpentry | 60 wood, 40 stone | 4 | +150 planks, +150 blocks, +60 tools base storage threshold |
| Tool workshop `tool-workshop` | Making the tools that make making things easier. | Toolmaking | 20 planks, 10 blocks | 8 | Toolmaker workplace; 0.1 tools/min per worker |
| Learning circle `study` | Sit down with a question and leave with several better ones. | Oral tradition | 20 planks, 10 blocks, 50 food | 6 | Scholar workplace; 0.25 knowledge/min per worker |
| Records shelter `library` | Good ideas finally have somewhere to stay overnight. | Oral tradition | 10 planks, 5 blocks | 4 | +100 knowledge base storage threshold |
| Builders' lodge `builders-lodge` | More builders, fewer arguments about who is holding the ladder. | Masonry | 15 planks, 10 blocks | 6 | +1 organized crew size per level |
| Supply post `supply-post` | Someone remembered to pack for the part where you are away. | Preparedness | 20 planks, 10 blocks, 5 tools | 10 | +2 × sqrt(level) full-speed offline hours |

Shelters research grants a completed level-1 Foraging camp and makes the player a forager only if currently unassigned. It does not grant completed housing or other workplaces. Builders unlock with this research; before automation, manual food remains available. This small exception gets the first worker economy running without demanding a second worker to build its first food source.

### Agricultural and town facilities

| Facility and identifier | Description | Unlock | Base cost | Base work | Effect |
| --- | --- | --- | --- | --- | --- |
| Farm `farm` | Lunch now grows where we tell it to. | Agriculture | 30 planks, 20 blocks, 10 tools | 15 | Farmer workplace; 18 food/min per worker |
| Irrigation works `irrigation` | Water takes the scenic route through everyone's crops. | Irrigation | 40 planks, 30 blocks, 10 tools | 20 | Farm rate × `(1 + 0.15 × sqrt(L))`; no workers or upkeep |
| Meeting place `meeting-place` | An excellent place to accomplish very little together. | Writing | 80 planks, 60 blocks, 15 tools | 30 | Leisure coverage for 10 people per level |
| Public well `public-well` | Fresh water, with a convenient place to discuss everyone else's business. | Town planning | 60 blocks, 30 planks, 10 tools | 20 | Amenity coverage for 10 people per level |
| Great Hall `great-hall` | Finally, a room large enough for the settlement's collective self-importance. | Civic engineering | 120 planks, 120 blocks, 40 tools, 200 knowledge | 90 | Unique milestone; +20 leisure coverage and +20 amenity coverage; ceremonial town milestone |

The Great Hall does not end an era or gate ordinary industrial advancement. It is a useful town investment, not a second transition condition competing with the agreed technology-based advancement.

### Facility forms

Each row converts an existing facility after the listed technology. Keep level, workers, cycle progress, and equipment; old effects remain until completion. Conversions share the construction queue.

```text
conversion_cost(resource, L) = max(0, capital(resource, new_form, L)
                                     − capital(resource, old_form, L))
conversion_work(L) = max(0, new_base_work − old_base_work) × G(L)
```

Use the following new expansion bases with the shared pricing formula. Conversion pays the positive difference in cumulative investment, not a flat fee per level. No credit or refund is granted for materials no longer used by the new form. Thus converting late cannot save modern materials; when the new form omits old materials, delaying conversion additionally consumes those old materials. The work difference makes total construction work independent of conversion timing. Costs shown in the UI derive from these formulas, not a second conversion-price table.

| Conversion | Unlock | New effect | New expansion base cost | New base work |
| --- | --- | --- | --- | --- |
| Shelters → Cottages | Agriculture | 4 comfortable places/level | 12 planks, 8 blocks, 3 tools | 5 |
| Food store → Granary | Agriculture | 1,200 food base storage threshold | 15 planks, 10 blocks | 4 |
| Lumber camp → Timber yard | Forestry methods | 4 wood/min/worker | 20 planks, 10 blocks, 3 tools | 6 |
| Quarry → Stone pit | Stone lifting | 3 stone/min/worker | 15 planks, 20 blocks, 3 tools | 6 |
| Learning circle → School | Writing | 0.75 knowledge/min/worker | 25 planks, 15 blocks, 5 tools | 8 |
| Records shelter → Library | Writing | 400 knowledge base storage threshold | 15 planks, 15 blocks | 5 |
| Cottages → Town houses | Town planning | 8 comfortable places/level | 25 planks, 25 blocks, 5 tools | 10 |

| Form | Player-facing description |
| --- | --- |
| Cottages | Now with walls the wind has to go around. |
| Granary | The harvest has moved in and brought all its friends. |
| Timber yard | More timber, neatly arranged for its upcoming life as something else. |
| Stone pit | The good rocks were underneath the other rocks. |
| School | A place to learn how much there is left to learn. |
| Library | A quiet building full of people who thought they had answers. |
| Town houses | More neighbors, conveniently within complaining distance. |

A player can keep an older form or remove the facility instead. The Farm is a new building type, so it can coexist with Foraging camp; its much higher food output makes foraging less competitive without reducing the old camp's rate.

Removing a completed facility releases its workers, returns no resources, and removes its effects. It is unavailable while that facility has an active project. Preview changes to housing comfort, storage pressure, and production before confirmation. Preserve people and stockpiles. This is a proposed removal policy, distinct from the agreed full refund for cancelling unfinished work.

When building an absent facility, the player may choose any researched form of that type at level 1, using that form's base expansion cost and work. There is no requirement to rebuild an obsolete form first. Rebuilding restores neither the removed levels nor its installed tools. Queued higher-level expansions wait for their required earlier levels; removal does not transform them into free replacement buildings.

## Recipes and permanent tools

Each recipe below creates one unit. Rates come from the associated workplace and multipliers, not from a separate crafting queue.

| Output | Inputs per unit | Workplace |
| --- | --- | --- |
| Food | None | Foraging camp or Farm |
| Wood | None | Lumber camp or Timber yard |
| Stone | None | Quarry or Stone pit |
| Planks | 3 wood | Sawmill |
| Blocks | 3 stone | Stoneworks |
| Tools | 2 planks, 1 block | Tool workshop |
| Knowledge | 1 food | Learning circle or School |

Food spent by scholars is additional to their meals. Toolmaking consumes processed materials, so players must balance raw collection, processing, and equipment rather than converting a raw stockpile directly into every upgrade.

Each production facility may install an unlimited sequence of equipment tiers. The first three are technology milestones; Civic engineering unlocks repeatable refinements beyond tier 3. Tool tiers belong to that facility and survive form conversion. They do not wear out, consume tools during work, or increase staffing capacity. They are lost if the facility is removed.

| Tier | Unlock | Cost | Work | Resulting tool multiplier | Description |
| --- | --- | --- | --- | --- | --- |
| 1 | Toolmaking | 10 tools | 10 builder-minutes | 1.20 | Finally, the right tool is more than a hopeful expression. |
| 2 | Organized work | 30 tools, 50 knowledge | 20 | 1.45 | Fewer awkward handles between you and a job well done. |
| 3 | Civic engineering | 80 tools, 150 knowledge | 40 | 1.75 | Even the tools have become specialists. |

For tier `t ≥ 4`, cost is `ceil(80 × (t/3)^2)` tools plus `ceil(150 × (t/3)^2)` knowledge, work is `40 × (t/3)^2`, and the resulting multiplier is `1.75 + 0.5 × (sqrt(t−2) − 1)`. Each tier requires the previous one. Refinements have the description: “A familiar tool with a few surprisingly clever adjustments.” Benefits continue growing while marginal cost rises; there is no tier or bonus maximum.

The multiplier replaces the previous tier's multiplier; tiers are not multiplied together. The Tool workshop may receive its own tool upgrade after producing the necessary tools with its unupgraded rate. Study buildings count as production facilities; storage, housing, amenities, irrigation, Supply post, and Builders' lodge do not.

## Technology catalog

Prerequisites mean completion of every listed technology. Technologies have one level each in this draft. Costs are paid once at start; research durations below are base minutes before prestige. A completed technology unlocks options rather than automatically constructing them.

### Tribal era

| Technology and identifier | Prerequisites | Cost | Minutes | Effect | Description |
| --- | --- | --- | --- | --- | --- |
| Sharpened stick `sharpened-stick` | Discover wood | 10 wood, 5 food | 1 | Foraging technology bonus +10%. | A stick with a surprisingly convincing point. |
| Shelters `shelters` | Sharpened stick | 20 wood, 20 food | 2 | Unlock housing, camps, basic storage, immigration; grant first Foraging camp. | The weather can conduct its business outside. |
| Stone tools `stone-tools` | Sharpened stick; discover stone | 30 wood, 30 stone, 30 food | 8 | Unlock Quarry. | Some rocks are better at convincing other rocks. |
| Carpentry `carpentry` | Shelters, Stone tools | 60 wood, 30 stone | 10 | Unlock Sawmill and Storehouse. | Wood behaves better once you explain the corners. |
| Masonry `masonry` | Stone tools | 40 wood, 80 stone | 15 | Unlock Stoneworks and Builders' lodge; organized crew size +1. | The trick is putting the heavy bit on another heavy bit. |
| Oral tradition `oral-tradition` | Shelters, Carpentry | 100 food, 20 planks | 30 | Unlock Learning circle and Records shelter. | Good advice travels farther when someone remembers the middle. |
| Toolmaking `toolmaking` | Carpentry, Masonry | 50 planks, 30 blocks | 30 | Unlock Tool workshop and tier-1 equipment. | Perhaps the next difficult job could be the tool's problem. |
| Preparedness `preparedness` | Toolmaking, Oral tradition | 40 knowledge, 20 tools, 150 food | 60 | Unlock Supply post. | Tomorrow's problems have been asked to arrive by appointment. |
| Seasonal knowledge `seasonal-knowledge` | Oral tradition, Toolmaking | 120 knowledge, 50 planks, 30 blocks, 10 tools | 90 | Foraging technology bonus +15%. | The bushes have a schedule, and we are finally catching on. |
| Agriculture `agriculture` | Preparedness, Seasonal knowledge | 180 knowledge, 500 food, 200 wood, 100 stone, 30 tools | 120 | Enter agricultural era; unlock Farm, Cottages and Granary forms. | Convince dinner to put down roots. |

Masonry's 80 stone exceeds the initial threshold of 60 but remains reachable without a Stockyard. A Stockyard reduces the waiting time; it is an economic choice rather than a permission gate. Carpentry unlocks processed-material production and storage before Toolmaking needs them. Scholars require no knowledge to unlock. Agriculture requires neither Writing nor specialization.

### Agricultural era

| Technology and identifier | Prerequisites | Cost | Minutes | Effect | Description |
| --- | --- | --- | --- | --- | --- |
| Irrigation `irrigation` | Agriculture | 200 knowledge, 80 planks, 60 blocks, 20 tools | 90 | Unlock Irrigation works. | Teach water a route that includes the vegetables. |
| Forestry methods `forestry-methods` | Agriculture | 150 knowledge, 100 wood, 60 planks, 20 tools | 60 | Unlock Timber yard conversion. | A little planning saves a lot of arguing with trees. |
| Stone lifting `stone-lifting` | Agriculture | 150 knowledge, 100 stone, 60 blocks, 20 tools | 60 | Unlock Stone pit conversion. | The rock remains heavy, but fewer people have to mention it. |
| Organized work `organized-work` | Irrigation | 250 knowledge, 100 planks, 80 blocks, 30 tools | 120 | Unlock tier-2 equipment. | Everyone knows which end of the job they are holding. |
| Inventory keeping `inventory-keeping` | Agriculture | 200 knowledge, 80 planks, 60 blocks | 90 | All seven storage thresholds ×1.50; full-speed offline window +4h. | We have counted the piles, and some of them were surprisingly large. |
| Writing `writing` | Organized work, Forestry methods, Stone lifting, Inventory keeping | 600 knowledge, 200 planks, 150 blocks, 60 tools | 180 | Enter town era; unlock School, Library, Meeting place, happiness, and first specialization. | Good ideas can now outlive the person who keeps repeating them. |

The agricultural era target is another 2–4 days on a first run, subject to testing. Records shelter level 3 plus Inventory keeping provides a 751 knowledge threshold, above Writing's 600. Earlier investment improves waiting time, but even smaller storage cannot lock the technology out.

### Town era

| Technology and identifier | Prerequisites | Cost | Minutes | Effect | Description |
| --- | --- | --- | --- | --- | --- |
| Town planning `town-planning` | Writing | 500 knowledge, 150 planks, 150 blocks, 40 tools | 60 | Unlock Town houses and Public well. | Someone should probably decide where all these neighbors are going. |
| Forestry `forestry` | Writing; excludes Stonecraft | 400 knowledge, 150 planks, 40 tools | 45 | Wood and plank workplace rates ×1.40. | A proud tradition of knowing exactly what to do with a tree. |
| Stonecraft `stonecraft` | Writing; excludes Forestry | 400 knowledge, 150 blocks, 40 tools | 45 | Stone and block workplace rates ×1.40. | Our ancestors saw rocks; we see a promising career. |
| Precision joinery `joinery` | Forestry | 800 knowledge, 300 planks, 150 blocks, 80 tools | 90 | Plank and block recipes use 2 raw materials instead of 3. | Measure carefully enough and even the offcuts start pulling their weight. |
| Architecture `architecture` | Stonecraft | 800 knowledge, 150 planks, 300 blocks, 80 tools | 90 | Housing contribution +25%; block production technology bonus +50%. | Put the walls in smarter places and invite a few more neighbors. |
| Civic engineering `civic-engineering` | Town planning; either Joinery or Architecture | 1,200 knowledge, 400 planks, 400 blocks, 100 tools | 120 | Unlock Great Hall and tier-3 equipment. | A whole town's ambition now comes with a set of plans. |
| Record keeping `record-keeping` | Writing | 600 knowledge, 200 planks, 100 blocks | 60 | Knowledge threshold ×1.50 in addition to other storage effects; full-speed offline window +4h. | Tomorrow's workers would appreciate knowing what today's workers were thinking. |
| Mechanization `mechanization` | Civic engineering, Record keeping | 2,500 knowledge, 600 planks, 600 blocks, 200 tools | 120 | Enter industrial era; unlock powered production and metalworking content described below. | The heavy lifting has been offered to something with gears. |

The first run can delay specialization until a branch-dependent technology becomes necessary. Both branches reach Mechanization. They emphasize different production and housing advantages rather than removing an essential resource chain.

## Opening and interface behavior

Start with one healthy person, no resources, no buildings, and the initial storage thresholds. The first visible action is Gather food: one food per 3 seconds. Manual wood and stone produce one unit per 5 seconds after discovery. Manual gathering rate uses mastery and storage pressure; each completed action still yields one unit. No routine clicking is needed once camps unlock.

Holding 5 food reveals Explore nearby. It costs 10 food and takes 20 seconds, discovers wood, and reveals Gather wood. Holding 2 wood reveals Technology. Sharpened stick reveals Explore farther: 20 food, 30 seconds, discovers stone. Discoveries are permanent and never repeat for duplicate rewards.

Shelters reveals worker assignments, builders, housing, and the construction queue. Its camp grant starts food automation. Research becomes queued as soon as Technology is available, with one active project. Early discovery and manual actions continue to use one separate visible-time action slot. They pause when hidden and cancel/refund on reload, as today; automatic jobs and the two planning queues use elapsed simulation time.

| Action | Description |
| --- | --- |
| Gather food | Investigate the bushes for something that counts as breakfast. |
| Gather wood | Find a branch with a promising future. |
| Gather stone | Pick up a rock and call it the start of something. |
| Explore nearby | The edge of the clearing is doing an excellent job of looking interesting. |
| Explore farther | Pack a snack and enlarge your definition of nearby. |
| Feast | An entire settlement briefly agrees on what to do next. |
| Welcome arrivals | There is room at the fire for a few more stories. |
| Fill | Put those available hands where the work is. |

| Job or assignment | Description |
| --- | --- |
| Forager | Finds breakfast in places the rest of us walked past. |
| Farmer | Persuades plants to keep regular working hours. |
| Woodcutter | Negotiates a change of direction for trees. |
| Stoneworker | Brings home the rocks the settlement has taken a liking to. |
| Sawyer | Helps trees settle into a flatter line of work. |
| Mason | Makes stone look like it was expecting to become a building. |
| Toolmaker | Equips everyone else to complain less about their equipment. |
| Scholar | Turns a full stomach into difficult questions. |
| Builder | Turns everyone's plans into things everyone can point at. |
| Available | No assignment yet, but excellent potential for being volunteered. |

| Settlement measure | Description |
| --- | --- |
| Population | Every new pair of hands arrives with a matching mouth. |
| Health | How convincingly your stomach agrees with today's workload. |
| Happiness | A measure of how much less interesting the complaints have become. |

Cards show name, one-line description, current level or form, assigned/efficient staffing, output and inputs per minute, upgrade cost, and one current blocker. Show net rates after recipes and meals; “Crowded storage” is a slowdown, distinct from “Missing inputs.” Do not add repeated instruction paragraphs.

Show action, job, resource, and settlement-measure descriptions in their detail view or tooltip, not as extra paragraphs beside every control. Each item gets one flavor line on a surface; the mechanical explanation remains readable without it.

The population control shows current/comfortable places, available people, and Welcome arrivals. Each workplace has +, −, and Fill. Builders show assigned/organized crew and the current project. Research and construction each show the active project's remaining time and the ordered waiting entries. Cancelling active work shows the exact full refund; waiting entries can be removed without a refund dialog because they have not paid.

The return summary reports simulated time, the difference between wall time and effective offline time, signed net resource changes, arrivals, and completed queued projects. It also identifies a blocking queue or crowded key stockpile, without instructing players what to do next.

## Happiness at the town stage

Happiness unlocks with Writing. Before then its production and immigration multipliers are exactly 1, with no hidden town penalties.

Let `N` be population, `P` comfortable housing places, `A` amenity coverage, and `R` leisure coverage. Define `clamp01(x) = min(1, max(0, x))`:

```text
food_security = clamp01(food / (30 × N))
housing_comfort = clamp01((P − N) / max(1, 0.20 × N))
amenities = clamp01(A / N)
leisure = clamp01(R / N)
target_happiness = 100 × (0.40 × food_security
                         + 0.20 × housing_comfort
                         + 0.20 × amenities
                         + 0.20 × leisure)
happiness_multiplier = 0.75 + 0.005 × happiness
immigration_multiplier = 0.50 + happiness / 100
```

Public well provides amenity coverage, Meeting place provides leisure coverage, and Great Hall provides both. Coverage is a comfort effect; these buildings do not consume workers in this draft.

Happiness starts at 50 on unlock and moves toward its target by at most 2 points per simulated minute. Recompute the target at each minute boundary and move by `clamp(target − current, −2, 2)`. Thus a brief food purchase does not instantly change the whole settlement's output.

Example: 20 people, 24 comfortable places, 600 food, 20 amenity coverage, and 10 leisure coverage yield a target of 90 happiness. At 90, worker and builder output are ×1.20 and immigration is ×1.40. With full food but no spare housing or services, target happiness is 40: a modest ×0.95 economic effect rather than immediate collapse.

Hunger and happiness multiply after the town stage: hunger is immediate individual nutrition; happiness changes gradually with settlement conditions. Happiness cannot stop production entirely or cause strikes, death, or departure. These formulas deliberately keep its range at ×0.75–1.25.

## Offline progress

The initial 8 hours are a full-speed window, followed by a diminishing tail. This explicitly replaces the earlier hard cutoff, including its proposed 72-hour ceiling.

```text
B = 8 + 2 × sqrt(Supply_post_level)
      + 4 × completed(Inventory keeping)
      + 4 × completed(Record keeping)
      + permanent_offline_bonus + sqrt(Observatory_level)
      + later_era_window_bonuses
F(T, B) = T                         for wall absence T ≤ B
        = B × (2 × sqrt(T/B) − 1)  for T > B
```

`B`, `T`, and `F` are in hours. Snapshot `B` at departure. With base B=8, 8 hours away gives 8 simulated hours, 24 gives 19.71, and a week gives 65.32. At 4B away, progress is still arriving at half normal speed; nothing switches off. A larger window always helps absences beyond the old window, and Supply post/Observatory levels have no ceiling.

Apply the same effective elapsed time to production, meals, arrivals, happiness, construction, and research. Do not continue consumption on wall time while slowing production. Manual actions pause throughout the absence.

Persist the absence start, its snapshotted window, and effective time already settled. Hidden-page updates or reloads apply only `F(total_absence, B) − previously_settled_effective_time`; they do not restart the curve. Returning visibly ends the absence and subsequent visible gameplay runs at normal speed. An upgrade completed while away affects the next absence, not the current snapshot. This avoids a hidden page gaining more than a closed one merely because it receives timer callbacks.

## Prestige rewards proposal

The mysterious time box unlocks prestige sometime after several early eras and before space. This draft does not decide its discovery event, origin, or exact prerequisite. Treat it as an explicit unresolved content item, not a randomly assumed event.

Once discovered, the time box remains unlocked. A subsequent reset requires reaching Writing again in that run; repeatedly completing only the opening technologies cannot farm legacy points. This repeat-reset threshold is a proposed rule, not a decision about the box's first discovery. A reset is optional and shows everything that will be lost and gained. Let era index `E` be 0 for tribal, 1 agricultural, 2 town, 3 industrial, 4 digital, 5 space, 6 quantum, and 7 beyond quantum. Let `T` be the number of distinct technologies completed in the current run:

```text
reset_eligible = time_box_discovered AND Writing_completed_this_run
legacy_points_gained = floor(10 × max(0, E − 1)^1.5 + T / 5)
prestige_multiplier = 1 + 0.02 × sqrt(lifetime_legacy_points)
```

Use lifetime earned points for the passive multiplier, so buying perks does not reduce production. Points gained from an eligible reset are based on the run being reset, not cumulative technologies from older runs. The multiplier applies to worker production, construction work rate, and research speed, but not housing, storage, or manual clicks.

| Permanent perk | Cost | Effect | Description |
| --- | --- | --- | --- |
| Longer preparations | 10 legacy points | +2h full-speed offline window; one purchase | Past you has thoughtfully packed a little extra future. |
| Efficient instruction | 15 | Reduce all research material costs, including knowledge, by 10%, rounding each nonzero cost up; one purchase | A useful head start on questions you have asked before. |
| Early astronomy | 20 | Add optional town technology and Observatory described below to future runs | A lasting suspicion that looking up might pay off. |
| Organized records | 25 | All storage thresholds ×1.10; one purchase | The piles are finally on speaking terms with the paperwork. |

Early astronomy research requires Writing and costs 300 knowledge, 100 planks, and 50 blocks; base duration 90 minutes. It unlocks Observatory: base cost 80 planks, 60 blocks, 20 tools, work 30 builder-minutes, unlimited levels, no workers. It adds `0.05 × sqrt(level)` to the knowledge technology multiplier and `sqrt(level)` full-speed offline hours. It is an optional route, never required for Mechanization or later era entry.

| Item | Kind | Description |
| --- | --- | --- |
| Mysterious time box | Prestige discovery | A small box with a very unreasonable relationship to time. |
| Legacy points | Prestige currency | Progress worth remembering, even when the settlement starts over. |
| Early astronomy | Research | The sky has been showing off for ages; time to take notes. |
| Observatory | Building | Stare into space with enough purpose to call it work. |

Reset clears resources, people beyond the starting person, buildings, tool tiers, jobs, mastery, discoveries, current-run technologies, specialization, queues, and unfinished projects. It starts the ordinary opening with no resources; cancelled projects are not refunded into the next run. Preserve lifetime legacy points, unspent points, purchased perks, settings, and a simple record of highest era reached. The time box remains unlocked after the first discovery, although another reset still uses current-run progress for its reward.

The 24–48 hour opening target applies to the first run, not to accelerated prestige runs. Legacy points and new perks need longer-run balance testing before implementation.

## Later-era expansion catalog

This section gives the full progression direction concrete content, effects, and concise descriptions. Numeric costs and detailed unlock graphs beyond Mechanization remain future balancing work. Do not generate them merely by multiplying tribal costs by an enormous factor: new inputs, replacement economics, and available population must be tested together.

Keep the same one-facility-per-type interface, two queues, builder model, storage-threshold contributions, and non-decaying installed upgrades. Introduce at most a few new stockpiles per era. Power is proposed as stored Charge rather than a separate real-time electrical grid, preserving the existing recipe model.

| Era | New production and building roles | Storage and replacement roles | Proposed transition technology |
| --- | --- | --- | --- |
| Industrial | Ore mine → Ore; Foundry converts Ore + Wood into Metal; Machine shop converts Metal + Tools into Machinery. | Warehouse form adds Metal/Machinery thresholds; powered forms replace raw extraction and processing rates after the player upgrades. Older buildings remain functional. | Electronics |
| Digital | Generator produces Charge; Electronics plant converts Metal + Charge into Circuits; Computing center converts Knowledge + Circuits + Charge into Data. | Battery bank raises Charge threshold; Data center raises Data and Knowledge thresholds. School can upgrade to Research institute. | Orbital flight |
| Space | Launch complex consumes Machinery + Circuits + Charge for orbital projects; Orbital extractor produces Exotic material; Habitat increases comfortable housing without land management. | Cargo depot raises advanced material thresholds; Observatory can gain a non-prestige space counterpart with a distinct identity, so prestige content is never mandatory. | Quantum engineering |
| Quantum | Quantum laboratory converts Exotic material + Data + Charge into Quantum components; Quantum fabricator uses components to improve selected production forms. | Quantum vault increases component storage thresholds; advanced records extend the full-speed offline window without a ceiling. | Causal engineering |
| Beyond quantum | Causal laboratory turns Quantum components + Data into Causal models; Stellar foundry provides a new high-output material route. | Large projects improve earlier bottlenecks and unlock optional prestige research. Time manipulation is technological; its link to the mysterious box is intentionally unresolved. | Open-ended research frontier; no final ending selected |

Proposed production identities must be distinct from era names: the scientific tree, new material, and its first storage route arrive together. No newly required material can depend on a recipe unlocked only by the technology that already requires it.

Forestry and Stonecraft remain permanent town choices in later eras. The draft preserves their early advantages; the first later branch upgrades should extend Forestry toward efficient manufactured inputs and Stonecraft toward infrastructure and capacity. Exact late-game effects are open. Neither branch may block common space, quantum, or beyond-quantum advancement.

### Later resource descriptions

| Resource | Description |
| --- | --- |
| Ore | Rock with a more ambitious job hidden inside. |
| Metal | Shiny proof that the furnace was worth the trouble. |
| Machinery | Several moving parts that have agreed to move together. |
| Charge | Stored energy, impatient for something to switch on. |
| Circuits | Tiny roads for decisions that happen much too quickly. |
| Data | Facts gathered faster than anyone can nod thoughtfully. |
| Exotic material | Matter that makes the old textbooks look a little embarrassed. |
| Quantum components | Small parts with unusually complicated working arrangements. |
| Causal models | Careful diagrams of why things happened, or might insist on happening. |

### Later building descriptions

| Building or form | Description |
| --- | --- |
| Ore mine | The metal is down there, wearing a very convincing rock disguise. |
| Foundry | Where stubborn ore warms up to the idea of being metal. |
| Machine shop | A workshop for building the things that do the workshop's work. |
| Warehouse | The piles have grown large enough to deserve an address. |
| Generator | Makes the sort of power that does not require a motivational speech. |
| Electronics plant | Persuades tiny components to agree on where the electricity should go. |
| Computing center | Does the thinking that mostly involves doing the same thing a billion times. |
| Battery bank | A savings account for whatever needs switching on later. |
| Data center | A home for facts that have outgrown everyone's memory. |
| Research institute | A larger building for discovering how many questions the school missed. |
| Launch complex | The ground has served us well, but we have other appointments. |
| Orbital extractor | Finding useful things somewhere considerably less convenient than the quarry. |
| Habitat | Home is where you can leave your helmet off. |
| Cargo depot | Even among the stars, someone has to organize the deliveries. |
| Space observation facility (name pending) | The view is excellent, and somebody should really write this down. |
| Quantum laboratory | A laboratory for very small things with very large research budgets. |
| Quantum fabricator | Assembles tomorrow's equipment from parts that make yesterday's engineers nervous. |
| Quantum vault | Keeps complicated little things in a reassuringly ordinary inventory. |
| Causal laboratory | Investigates cause and effect while carefully labeling which is which. |
| Stellar foundry | The ambitions of a furnace have become rather astronomical. |

The space observation facility is the optional non-prestige counterpart mentioned above; its final identity and effects remain open. Unnamed powered forms, orbital projects, and later upgrades receive their own one-liners when their individual entries are defined.

### Later technology descriptions

| Technology | Description |
| --- | --- |
| Electronics | Let very small switches make some very big decisions. |
| Orbital flight | Falling around the world turns out to be a useful travel arrangement. |
| Quantum engineering | Tiny things have strange rules, and we have started reading the instructions. |
| Causal engineering | Cause and effect have been invited to a design meeting. |

### Era descriptions

Use these lines on era introductions, with the unlocked systems shown separately.

| Era | Description |
| --- | --- |
| Tribal | Civilization begins with lunch and a fairly optimistic stick. |
| Agricultural | Dinner has put down roots, and so have we. |
| Town | A settlement large enough for everyone to have opinions about it. |
| Industrial | The settlement has discovered a louder way to work. |
| Digital | The blinking lights insist everything is under control. |
| Space | The roof was becoming a limitation. |
| Quantum | Very small things are making very large demands. |
| Beyond quantum | The laws of physics have received your suggested edits. |

## Current-format saves and implementation boundaries

This is a PoC. Follow [AGENTS.md](../AGENTS.md): no compatibility adapters, fallback formats, or save migrations. Reset incompatible saves to the current opening. Update current-format defaults and save normalization together; never preserve an incompatible settlement by inventing buildings, unlocks, or historical elapsed time.

Within the supported format, preserve resources, current people, jobs, cycles, technologies, facilities, equipment, mastery, queues, commitments, and absence accounting together. Reload must neither duplicate refunds nor lose already settled time. A format reset clears old active projects and timestamps together. Prestige is a supported gameplay reset within the current format, distinct from incompatible-save handling.

Keep mechanics independent of the DOM. Define prerequisites, costs, recipes, effects, and descriptions in typed content definitions; small shared evaluators serve rules, normalization, and display. Avoid named-item conditional chains and speculative generic frameworks. Maintain brief copy, progressive discovery, task-based controls, and convenient narrow-screen click/tap flows; no separate accessibility-compliance gate is required.

Health bounds, happiness bounds, one active project per queue, unique discoveries, the Great Hall, and mutually exclusive branches express deliberate rules. They are not ceilings on repeatable economic investment. No land system, cloud service, multiplayer, payments, or equipment wear is introduced.

## Validation and remaining review

Thresholds are efficient operating targets, not affordability requirements.

Keep arithmetic evidence distinct from playtesting. A cost/source audit can establish a reachable route; a stated economic scenario can estimate waits; neither proves a 24–48 hour first era or enjoyable visits. The first-era and agricultural-era targets still need a full visit-schedule simulation and human playthrough. Later-era costs, the time box discovery, and long-run prestige tuning remain open.
