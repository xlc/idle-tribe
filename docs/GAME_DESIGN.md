# Primitive Tribe Game Design

Primitive Tribe is a single-player browser incremental game about growing from one person gathering food into an automated village. Players discover resources, recruit and assign workers, build production chains, research improvements, and choose a permanent specialization.

The implemented baseline below records revision `ba5d66d`, inspected on 19 October 2026. It is a historical mechanics snapshot, not a claim that ongoing working-tree changes retain every detail. Its numbers are not the planned multi-era balance. [README.md](../README.md) describes the current runnable prototype; [AGENTS.md](../AGENTS.md) governs future changes. The agreed design below records our decisions; open rules and reference ideas are identified separately. Setup and deployment remain in [README.md](../README.md).

[Detailed design draft](GAME_DESIGN_DETAILS.md) contains proposed formulas, building effects and descriptions, recipes, technology costs, and progression content. Draft 0.2 replaces hard economic limits with soft caps and removes save compatibility requirements. Numerical values are proposals, not implemented behavior or previously approved tuning.

Implementation status: [the later-era addendum](LATER_ERAS.md) now defines the previously open numerical content and time-box discovery, following the user's implementation request. [Validation results](IMPLEMENTATION_RESULTS.md) describe what is playable and the remaining balance limitations. The draft below is retained as its design history.

## Implemented baseline

### Current experience

The core loop is **gather → discover → research → recruit and assign → produce → build and expand**. Automation takes over routine gathering early. The main decisions then concern workforce allocation, food supply, processing inputs, upgrade spending, and specialization.

The current chapter ends with construction of the Great Hall. Play continues afterward, but there is no later chapter, reset, prestige, or additional victory condition.

The implemented experience favors recoverable setbacks: food shortages reduce production without killing people. Construction is a purchase rather than a placement or building-time system. Exploration consists of two fixed discoveries rather than a navigable world.

#### Progression

| Stage | What the player does | What changes |
| --- | --- | --- |
| A small beginning | Gather fruit with one person and no starting resources | Holding 5 fruit reveals nearby exploration |
| Wood discovery | Spend 10 fruit on nearby exploration | Wood gathering becomes available; holding 2 wood opens Technology |
| Basic tools | Research Sharpened stick | Fruit yield improves; farther exploration and Shelters become available |
| First settlement | Research Shelters | Population capacity becomes 3; free foraging and lumber camps appear; an idle person becomes a forager |
| Stone discovery | Spend 10 fruit on farther exploration | Stone gathering and Flint knapping become available; a free quarry appears once Shelters is researched |
| Workshops | Research Carpentry and Masonry; construct processors | Wood becomes planks and stone becomes blocks; houses can increase population capacity |
| Knowledge | Research Writing; construct and staff a study | Fruit becomes knowledge; specialization research becomes available |
| Specialization | Choose Forestry or Stonecraft | One production branch gains a permanent advantage and a unique follow-up technology |
| Village | Research Cultivation, the chosen path technology, and Engineering; build the Great Hall | Village completion is acknowledged; the economy keeps running |

Stone discovery may happen before or after Shelters. Higher levels of foundational technologies are optional improvements rather than mandatory steps in a single linear sequence.

### Resources and production

There are six resources. Stockpiles have no gameplay storage caps or spoilage. Amounts can be fractional.

| Resource | Sources | Main uses |
| --- | --- | --- |
| Fruit | Manual gathering; foragers | Meals, recruitment, exploration, early research, scholar inputs, feasts |
| Wood | Manual gathering; woodcutters | Early research, buildings, plank production |
| Stone | Manual gathering; stoneworkers | Research, buildings, block production |
| Planks | Sawyers | Buildings, houses, later research, Great Hall |
| Blocks | Masons | Buildings, houses, later research, Great Hall |
| Knowledge | Scholars | Specializations, later research, Great Hall |

#### Manual actions

| Action | Availability in the interface | Cost | Base duration | Result before upgrades |
| --- | --- | --- | --- | --- |
| Gather fruit | From the start | None | 1 second | 1 fruit |
| Explore nearby | Once 5 fruit has been held; disappears after discovery | 10 fruit | 2 seconds | Discover wood |
| Gather sticks | After wood discovery | None | 2 seconds | 1 wood |
| Explore farther | After Sharpened stick; disappears after discovery | 10 fruit | 3 seconds | Discover stone |
| Gather stone | After stone discovery | None | 3 seconds | 1 stone |

Each click starts one action; manual actions do not repeat automatically. One manual action and one research action can run concurrently, alongside all workers. The player character can hold a worker job while manual work and research run.

#### Worker jobs

| Workplace | Job | Input per completed cycle | Base output per cycle | Cycle time |
| --- | --- | --- | --- | --- |
| Foraging camp | Forager | None | Twice the corresponding fruit gathering yield | 5 seconds |
| Lumber camp | Woodcutter | None | Twice the corresponding wood gathering yield | 8 seconds |
| Quarry | Stoneworker | None | Twice the corresponding stone gathering yield | 12 seconds |
| Sawmill | Sawyer | 3 wood | 1 plank | 8 seconds |
| Stoneworks | Mason | 3 stone | 1 block | 10 seconds |
| Study | Scholar | 1 fruit | 1 knowledge | 8 seconds |

Inputs are paid when a cycle completes. A worker needs the recipe inputs available to advance work; production pauses when they are absent. Workers share stockpiles, and competing workers resolve in roster order. Stored partial progress resumes when inputs return. Changing jobs discards that person's unfinished cycle.

Worker yields combine building level, applicable research, specialization, shared gathering skills, and hunger. Worker cycle durations remain fixed; manual skill speed bonuses do not shorten them. Precision joinery changes both material-processing recipes from 3 raw materials to 2. It does not reduce the study's fruit cost.

### Population and food

The game starts with one person named You, available for work, with 5/5 health. Recruitment costs 15 fruit and creates another fully fed, unassigned person. People have names, jobs, health, and individual work-cycle progress; they do not have personal skill trees or traits.

Normal population capacity is `1 + 2 × Shelters level + houses level × housing bonus`. The housing bonus is 2, or 4 with Architecture. Existing people are retained even if a loaded save exceeds that calculated capacity. Ordinary new-game capacity therefore reaches 27 people on Forestry or 47 on Stonecraft when housing and Shelters are maxed.

Every minute, a shared meal event feeds the hungriest people first. Ties retain roster order. Each person's pre-meal health determines both their food portion and production multiplier:

| Health with the default maximum of 5 | Fruit needed at the next meal | Worker output |
| --- | --- | --- |
| Above 3 | 1 | 100% |
| Above 2 through 3 | 0.5 | 80% |
| 2 or below | 0.1 | 50% |

A person who receives their full portion recovers 1 health, up to their maximum. Otherwise they lose 1, down to zero. Nobody dies, leaves, or permanently stops working. Manual action output is unaffected by hunger. Food production can restore the economy without manual gathering once foragers are available.

Feast is an immediate recovery action. It restores everyone's missing health for 1 fruit per missing point, with the total rounded up. It is available only when recovery is needed and the entire cost is affordable.

### Buildings

Each building is represented by a single upgradeable entry, with no map position or construction timer. All buildings require Shelters. Additional unlocks are listed below.

| Building | Additional unlock | Level 0 to 1 cost | Maximum level |
| --- | --- | --- | --- |
| Foraging camp | None | 6 wood | 8 |
| Lumber camp | Discover wood | 6 wood, 3 stone | 8 |
| Quarry | Discover stone | 8 wood, 6 stone | 8 |
| Sawmill | Carpentry | 15 wood, 8 stone | 8 |
| Stoneworks | Masonry | 12 wood, 12 stone | 8 |
| Study | Writing | 8 planks, 4 blocks | 8 |
| Houses | Carpentry | 8 planks, 4 blocks | 10 |
| Great Hall | Engineering | 120 planks, 120 blocks, 80 knowledge | 1 |

Shelters grants level 1 foraging and lumber camps for free. A level 1 quarry is also granted when both Shelters and stone discovery are complete. Their listed initial prices are the configured purchase costs, not extra charges for those grants.

A workplace supports `2 × building level` workers. Its output multiplier is `1 + 0.5 × (level − 1)`: each expansion adds two worker places and another 50% of level 1 output per worker.

For an upgrade from current level `L`, each base resource cost becomes `ceil(base cost × 1.65^L)`. Workplace expansions above level 1 additionally cost `4 × L` planks and `2 × L` blocks. Houses use the scaling base cost without those workplace surcharges. Buildings have no upkeep beyond the recipes and meals of their workers.

### Technology

Research consumes materials at the start and takes visible-page time. Only one research action runs at a time. Prerequisites below mean at least level 1 unless specified otherwise. Display names are used rather than internal identifiers.

#### Foundations

Costs and base durations are listed in level order. Each technology has three levels.

| Technology | Prerequisite | Effect | Costs and base durations for levels 1 / 2 / 3 |
| --- | --- | --- | --- |
| Sharpened stick | Technology unlocked | Adds 1 / 1.5 / 2 to manual fruit yield, also benefiting foragers | 2 wood + 5 fruit, 5s / 4 wood + 20 fruit, 7s / 7 wood + 35 fruit, 10s |
| Woven baskets | Sharpened stick | +25% forager output per level; +1 fruit-gathering XP per completion per level | 2 wood + 20 fruit, 8s / 5 wood + 45 fruit, 15s / 9 wood + 90 fruit, 30s |
| Flint knapping | Discover stone | +0.1 stone gathering yield per level | 2 wood + 3 stone + 10 fruit, 10s / 5 wood + 10 stone + 25 fruit, 18s / 10 wood + 25 stone + 50 fruit, 30s |
| Shelters | Sharpened stick | +2 population places per level; level 1 starts workplaces and recruitment | 4 wood + 8 fruit, 6s / 20 wood + 5 stone + 30 fruit, 15s / 50 wood + 20 stone + 60 fruit, 25s |
| Stone axes | Flint knapping | +0.5 wood gathering yield per level | 5 wood + 5 stone, 10s / 15 wood + 15 stone, 18s / 30 wood + 35 stone, 30s |
| Quarrying | Stone axes | +0.5 stone gathering yield per level | 10 wood + 8 stone + 10 fruit, 12s / 25 wood + 20 stone + 25 fruit, 20s / 50 wood + 40 stone + 50 fruit, 30s |
| Teamwork | Shelters | +25% worker output per level | 8 wood + 25 fruit, 12s / 20 wood + 10 stone + 50 fruit, 20s / 40 wood + 25 stone + 100 fruit, 30s |

#### Workshops and village development

Each technology below has one level.

| Technology | Prerequisite | Cost | Base duration | Effect |
| --- | --- | --- | --- | --- |
| Carpentry | Shelters and stone discovery | 12 wood, 15 fruit | 6s | Unlock sawmill and houses |
| Masonry | Flint knapping | 10 wood, 12 stone | 7s | Unlock stoneworks |
| Writing | Carpentry and Masonry | 6 planks, 4 blocks | 10s | Unlock study and specialization choices |
| Forestry | Writing; no Stonecraft choice | 12 knowledge, 10 planks | 12s | Choose Forestry; multiply worker wood and plank output by 1.6 |
| Stonecraft | Writing; no Forestry choice | 12 knowledge, 10 blocks | 12s | Choose Stonecraft; multiply worker stone and block output by 1.6 |
| Cultivation | Writing | 15 knowledge, 12 planks, 6 blocks | 12s | Double forager output |
| Precision joinery | Forestry | 35 knowledge, 35 planks, 15 blocks | 18s | Sawmills and stoneworks use 2 raw materials per cycle |
| Architecture | Stonecraft | 35 knowledge, 35 blocks, 15 planks | 18s | Houses grant 4 places per level; multiply mason output by 1.5 |
| Engineering | Cultivation and either path technology | 40 knowledge, 40 planks, 30 blocks | 20s | Multiply all worker output by 1.25; unlock Great Hall |

The specialization becomes permanent when its research completes. The interface asks for confirmation before starting it, then hides the opposing branch after completion. Both paths retain all essential workplaces and can reach the Great Hall. There is currently no respecialization or reset control.

The Engineering description in the interface says “all output”; its implementation affects workers, not manual gathering. This document records the implemented rule.

### Skills

Skills are shared by action type across the settlement, start at level 1, and have no configured level cap. Completing an action normally awards 1 XP. Woven baskets increases fruit-gathering XP; foragers, woodcutters, and stoneworkers train their corresponding shared gathering skills. Processors and scholars do not train a skill.

XP required for the next level is `ceil(base XP × 1.2^(current level − 1))`. Base XP is 4 for fruit, 3 for wood, and 5 for stone. Other actions and research also track action-specific XP.

Each skill level above 1 reduces its manual action or research duration by 3% of the base duration, down to a 0.5-second minimum. Gathering skills add 0.1 resource yield at levels 5, 10, 15, and so on. A completion that reaches a milestone receives the improved yield immediately. Gathering workers use twice that shared yield before other multipliers.

Most research is limited to one or three purchases, so its action skill has little or no opportunity to develop compared with repeatable gathering.

### Time and persistence

Worker production, processing, skill gains from gathering jobs, and meals continue during absences, capped at 24 hours per absence. Catch-up follows the same simulation rules as visible play and retains partial worker and meal cycles. It does not recruit, build, assign jobs, select technologies, or complete manual actions and research automatically.

Manual actions and research pause while the page is hidden and resume when visible. Reloading instead cancels unfinished manual work and research and restores their reserved costs. Completed discoveries, technology, skills, people, assignments, buildings, resources, and partial worker cycles persist.

The snapshot saves progress automatically in browser local storage under `primitive-tribe-v1`. This does not establish a compatibility requirement: the current PoC policy requires incompatible saves to reset, with no legacy adapters, fallback formats, or migrations.

Saves are specific to the browser and site origin. There are no accounts, cloud saves, manual save slots, or import/export controls. When storage is unavailable, the session remains playable but cannot persist. Invalid or unreadable save data falls back to a new game.

### Interface and presentation

The current interface uses warm paper backgrounds, muted green controls, resource accents, text, cards, and progress bars. It has no illustrated settlement, animated characters, map, or audio system.

The stockpile shows amounts and estimated current net rates per minute, including processing consumption and meals. These rates exclude manual clicking and are estimates from current workers and input availability, not guarantees of sustained supply.

Settlement contains recruitment, discoveries, workplace construction and staffing, manual work, and people. Technology contains Foundations, Workshops, specialization choices, village development, and completed research. Content appears progressively; manual work collapses when automation begins, and Foundations collapses after Writing. New eligible research is marked unread even when unaffordable.

Building +/− controls assign and release available workers. Individual workplace selectors are also provided under People. Keyboard tab switching, visible focus styling, native controls, and status announcements are implemented. Layout rules stack the game on narrow screens; these are implementation features, not a claim of a completed accessibility audit.

After at least one minute away, automated settlements expose an Away button that opens a dismissible return-summary popover. It lists only resources with positive net gains; resource losses are omitted. The Great Hall adds a completion message without interrupting play.

Player-facing copy should remain brief and let players discover mechanics through interaction, following the repository's existing guidance.

### Current scope and open edges

There is no combat, trade, diplomacy, territory, procedural exploration, weather, seasons, random events, quests, individual character development, multiplayer, monetization, or post-village progression. These are absent systems, not an approved backlog.

The current content has finite building and research levels but uncapped gathering skills and stockpiles. The Great Hall marks a milestone rather than a formal end screen. The code does not establish a target audience, intended total play duration, return frequency, or long-term replay structure.

Existing regression tests cover both specialization routes reaching the Great Hall through automation after the opening, as well as workforce capacity, processing competition, food recovery, interrupted work, save handling, and offline/live simulation consistency. The scripted routes are not human playtest measurements.

## Agreed future design

### Direction and precedence

Balance economy optimization, discovery, and a growing tribe. Advance through tribal, agricultural, town, industrial, digital, space, quantum, and beyond-quantum eras using technology rather than fantasy. Keep substantial choices in early eras. Agriculture ends the tribal era; later transitions are specified as proposals in the detailed catalog.

The intended rhythm is short visits several times daily, with a first era around 1–2 days. This is a tuning target, not an enforced waiting period. The latest request for soft caps supersedes earlier answers about hard stockpile, staffing, building, equipment, queue-length, and offline limits. The initial 8 hours now mean full-speed offline progress, followed by a diminishing tail. Buildings and research extend that window.

[AGENTS.md](../AGENTS.md) supplies the design principles: each feature must improve choice, feedback, discovery, satisfaction, or atmosphere; ordinary mistakes remain recoverable; bottlenecks should prompt useful decisions. Numerical implementation is in [draft 0.2](GAME_DESIGN_DETAILS.md), avoiding duplicated formulas here.

| System | Selected direction and draft interpretation |
| --- | --- |
| Economy and food | One shared food resource; farming follows Agriculture; raw wood/stone become planks/blocks and then tools |
| Buildings | One expandable facility per type; no land, map placement, or settlement-space system; repeatable levels have no maximum |
| Replacement | Older forms remain functional; voluntary conversions retain levels and installed equipment; removal is allowed |
| Storage | Different buildings improve resource-specific thresholds; production slows above them but stock can always grow and be spent |
| Staffing | Assignments beyond efficient staffing remain possible with diminishing output per person; Fill assigns available people once up to that efficient target |
| Population | Automatic, unassigned arrivals; housing crowding slows arrival speed; food-buffer and sustainable-rate checks protect against automatic overgrowth |
| Happiness | Introduced with towns after farming, before industry; distinct from early individual hunger; no strikes, death, or departures |
| Construction | One active project, with assigned builders; organized crew size is a soft efficiency threshold; old facility effects remain until completion |
| Research | Early material costs; later stored knowledge plus materials and time; one project independent of construction |
| Planning | Separate ordered queues with unrestricted waiting entries; no automatic choice of purchases or technologies |
| Payment | Pay at start, never enqueue; blocked head holds its own queue; if both heads can start, original enqueue order decides priority |
| Editing and cancellation | Reorder/remove waiting entries freely; active cancellation fully refunds the recorded payment and loses progress |
| Refund accounting | Committed materials remain part of storage pressure until consumed or refunded, preventing cancellation from farming storage relief |
| Equipment | Permanent workplace upgrades, no wear; three technology milestones followed by repeatable refinements |
| Specialization | First exclusive branch at towns, permanent within the run; every branch can reach common later eras |
| Prestige | Optional after discovery of a mysterious time box after a few early eras and before space; permanent efficiency and new options; fresh branch choices on reset |
| Offline play | Same economic rules and event ordering as visible play, using effective elapsed time; manual work remains visible-time only |
| Persistence | Supported current-format progress survives reload; incompatible formats reset; no save migration or legacy compatibility code |
| Descriptions | Each defined item has one original playful line, separate from literal mechanical effects; reveal detail without text walls |

### Era landmarks

| Stage or discovery | Role |
| --- | --- |
| Tribal | Establish food automation, construction, processing, tools, and scholarship |
| Agriculture | Farming breakthrough and more efficient housing/storage forms |
| Towns | Writing, happiness, improved scholarship, and first specialization |
| Mysterious time box | Optional prestige discovery; exact timing relative to town/industrial/digital remains undecided |
| Industrial → digital → space → quantum → beyond | Expand production and discovery; numerical content after Mechanization remains open |

Old production becomes less competitive because alternatives improve, without forced replacement or automatic decay. A facility's old output, housing comfort, or storage benefit remains during an upgrade. Reassigning a producer as a builder still removes that person's production. Removal preserves people and stock, but removes the facility's effects; it does not refund completed investment.

### Rules that must remain consistent

- **Sources and research:** every required resource must have an earlier source. Agriculture needs no town specialization; scholars need no knowledge to unlock. Each branch reaches the shared progression.
- **Food:** include meals, recipe inputs, health, staffing congestion, storage pressure, and happiness in net rates. Arrivals remain unassigned, so automatic growth must not assume future Fill presses or manual clicking.
- **Storage:** thresholds affect rate, never affordability. Missing inputs pause processing without spending them; crowded storage only slows progress. Removal and cancellation do not delete stock or create resources.
- **Queues:** use one recorded payment per active project. Waiting entries reserve nothing, only the head starts, and a blocked queue does not block the other. Upgrades apply once at completion.
- **Time:** production, consumption, immigration, happiness, and projects share effective simulation time. Hidden callbacks and reloads must not restart the same absence's full-speed window. Upgrades completed away affect the next absence.
- **Saves:** current defaults and current-format normalization change together. Reset incompatible formats; no invented migration state or old offline time. Current-format reload preserves paid commitments and unfinished work together.
- **Soft caps:** repeatable investment continues to increase useful output or efficiency. Health/happiness ranges, finite discoveries, exclusive branches, and single-project concurrency are intentional rules rather than economic upgrade ceilings.
- **Presentation:** stable task-based views, amounts and net rates beside relevant controls, progressive disclosure, brief flavor, convenient narrow-screen interaction. No mandatory tutorial or separate accessibility-compliance gate.

### Remaining decisions and evidence

The detailed draft now supplies first-three-era formulas, building costs and effects, descriptions, recipes, research, immigration, happiness, and offline rules. These are coherent tuning proposals, not promises that pacing is already proven.

Still open: time box origin/discovery, later-era numerical catalogs and branch development, long-run prestige pacing, the final progression endpoint, and the fuller presentation of individual tribal life. The first-era 24–48 hour and agricultural-era 2–4 day targets need a visit-schedule simulation and playthrough. No new resource or system should be added solely to fill an era label.

## Kittens Game reference

Kittens Game is a reference for economic structure and gradual technological expansion. The comparison below uses its public source as checked on 19 October 2026. The implications are design observations for Primitive Tribe, not newly accepted features or borrowed balance values.

| Observed pattern in Kittens Game | Relevance to this design |
| --- | --- |
| Building and technology text separates mechanical descriptions or effects from short flavor lines, including understatement and wordplay. [English text](https://raw.githubusercontent.com/nuclear-unicorn/kittensgame/master/res/i18n/en.json) | Use one original playful line per item alongside exact effects. The [description voice](GAME_DESIGN_DETAILS.md#description-voice) and item catalogs cover resources, facilities, research, upgrades, perks, jobs, and actions. |
| Barns and warehouses add different amounts to specific resource caps; libraries raise science capacity and production. Some buildings evolve into later forms, such as libraries becoming data centers. [Building definitions](https://raw.githubusercontent.com/nuclear-unicorn/kittensgame/master/js/buildings.js) | Supports resource-specific storage roles and facility forms. Our storage uses soft efficiency thresholds rather than copying hard caps. |
| Crafting converts wood into beams and minerals into slabs, then uses crafted goods in further recipes. [Crafting definitions](https://raw.githubusercontent.com/nuclear-unicorn/kittensgame/master/js/workshop.js) | Supports raw → processed → crafted chains. Our planks, blocks, and permanent tool upgrades keep their own recipes and pacing. |
| Technology ranges from Agriculture to Chronophysics and Tachyon Theory; science is joined by other resources in later costs. Its policy system includes mutually blocking choices. [Science and policies](https://raw.githubusercontent.com/nuclear-unicorn/kittensgame/master/js/science.js) | A useful reference for expanding the economy and presenting exclusive choices. It does not determine our era boundaries or make every technology an exclusive branch. |
| Settlement happiness affects worker production and draws on factors including population, luxuries, festivals, and environmental effects. [Village rules](https://raw.githubusercontent.com/nuclear-unicorn/kittensgame/master/js/village.js) | Demonstrates how living conditions can matter economically. Our happiness arrives later; luxury goods, festivals, and environmental systems are not automatically added. |
| Paragon contributes production and storage benefits, and prestige purchases unlock persistent upgrades. [Prestige rules](https://raw.githubusercontent.com/nuclear-unicorn/kittensgame/master/js/prestige.js), [Metaphysics](https://wiki.kittensgame.com/en/game-tabs/science/metaphysics) | Supports both faster repeat runs and lasting new options. Our time box remains a separate, deliberately unfinished design. |
| Offline simulation has an elapsed-time cap, enforces resource limits, and contains queue-aware catch-up logic behind feature flags. [Time and queue rules](https://raw.githubusercontent.com/nuclear-unicorn/kittensgame/master/js/time.js) | Reinforces that offline time, stockpile capacity, and planned spending must be designed together. Our 8-hour full-speed window, diminishing tail, timed construction, and two queues are our own rules; the reference's hard caps are not imported. |

The useful pattern is a changing economic bottleneck: workforce, inputs, capacity, or an unlock makes the next investment meaningful. For this game, that suggests showing why a planned action is blocked and introducing systems gradually. It does not require importing Kittens Game's full resource catalog or complexity.

## Implementation references

- [Game composition](../src/game.ts), [actions](../src/actions.ts), [research](../src/research.ts), [settlement rules](../src/settlement.ts), [food](../src/food.ts), and [skills](../src/skills.ts) define the current mechanics.
- [Building definitions](../src/economy.ts), [timing and job constants](../src/constants.ts), and [identifiers](../src/ids.ts) define current content and balance.
- [State defaults](../src/state.ts), [shared types](../src/types.ts), [save handling](../src/persistence.ts), [simulation](../src/simulation.ts), and [clocks](../src/clock.ts) define continuity and time behavior.
- [React interface](../src/app.tsx), [browser entry](../src/main.tsx), [session coordination](../src/session.ts), [page structure](../index.html), and [styles](../src/styles.css) define presentation and controls.
- [Core rule tests](../src/game.test.ts), [settlement and offline tests](../src/settlement.test.ts), and [save tests](../src/persistence.test.ts) record existing regression scenarios.
