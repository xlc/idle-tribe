# Primitive Tribe design decisions

Primitive Tribe is a single-player incremental settlement game. The player grows from a lone gatherer into a self-sustaining civilization by discovering resources, assigning people, building production chains, researching improvements, and choosing which opportunities to pursue.

This document records product decisions. The README describes the current playable build, and the repository guidance in [AGENTS.md](../AGENTS.md) governs implementation. Exact balance, data formats, test evidence, and source structure belong in the product and its checks rather than in design documentation.

## Core experience

- The main loop is discover, prepare, assign, produce, invest, and return to inspect the result.
- Every new system must create a useful choice, a visible consequence, a discovery, or a stronger sense of place.
- Players should be able to recover from ordinary mistakes. Shortages slow progress and create decisions; they do not erase the settlement.
- Automation handles mastered repetition while the player keeps control of staffing, investment, research, and specialization.
- Progress should reward both short visits and prepared absences.

## Progression

The settlement advances through a connected sequence of eras:

- The tribal era establishes gathering, basic tools, construction, processing, food, and scholarship.
- Agriculture changes the food economy and supports larger settlements.
- Towns introduce happiness, deeper research, and the first permanent specialization choice.
- Industrial, digital, space, quantum, and causal eras expand the production web and introduce new ways to improve earlier chains.

Each era should change the decisions available to the player. New eras are not just larger numbers or additional currencies. The final catalog remains open to continued investment and optional prestige rather than forcing a victory reset.

## Economy

- Resources have meaningful sources, sinks, and dependencies.
- Raw materials become processed materials and then support more advanced work.
- Bottlenecks should move as the settlement grows, giving players competing investments rather than one dominant purchase.
- Use rising costs, diminishing returns, and economic pressure as soft caps. Repeatable investment remains possible and useful.
- Storage pressure slows production without making stockpiles impossible to spend.
- Food, health, housing, staffing, inputs, and happiness are part of the same economic picture.
- Research and construction are separate plans. Players may arrange future work, but the game does not choose purchases or assignments for them.
- Permanent specialization creates a meaningful tradeoff while every branch preserves a route through the shared progression.
- Prestige is optional, preserves selected long-term progress, and begins a new settlement with fresh early choices.

## People and work

- People arrive unassigned so population growth creates an allocation decision.
- Each person has a small permanent aptitude and develops separate expertise in the occupations they actually practice.
- Expertise rewards a prepared, functioning workplace and creates an opportunity cost when a skilled person is moved.
- Staffing controls should make routine allocation convenient without silently moving people away from deliberate assignments.
- Extra staffing remains useful with diminishing returns; efficient staffing is a guide, not a hard limit.
- Hunger and crowding reduce output temporarily. Recovery remains available through ordinary settlement decisions.

## Time and persistence

- Production, consumption, population, happiness, and queued projects share one settlement timeline.
- Prepared worker activity continues while the player is away, with diminishing benefit for very long absences.
- Manual actions remain visible-time activities so the player can see and choose each one.
- Reloading preserves supported current progress. Incompatible prototype saves may reset; save migration is not a product requirement.
- Progress is local to the browser and does not imply accounts or cloud synchronization.

## Interface direction

- The interface is mobile first and remains comfortable on larger screens.
- Resources, net rates, active work, and immediate controls stay near one another.
- Frequent actions are visible in their task view; long or infrequent detail sits behind compact disclosure controls.
- Mechanical effects and short flavor descriptions appear inline where the player makes the decision. Hover-only information and tooltip-dependent interactions are not part of the design.
- Icons, meters, progress, wording, and state changes should explain the economy without requiring a tutorial.
- The settlement view should feel warm and lived-in while keeping the next meaningful decision easy to find.

## Scope boundaries

The game does not currently include combat, trade, diplomacy, territory management, procedural exploration, multiplayer, monetization, or character relationship systems. Those ideas remain outside the product until they support a clear settlement decision and fit the existing progression.

Kittens Game is a reference for interconnected production and discovery. It informs the shape of the economy, not the resource catalog, balance, or interface.
