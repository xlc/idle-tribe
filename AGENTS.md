# Agent guidance

Applies to the entire repository. Read [README.md](README.md) for setup, commands, current gameplay, and deployment. Keep those instructions there; do not add file inventories or directory listings.

## Game design principles

Build an incremental settlement game that is fun to discover, challenging to optimize, and satisfying to revisit. Use Kittens Game as a reference for interconnected production and discovery, not a specification to copy. These principles guide future changes and override conflicting design drafts; they do not describe every implemented rule.

### Purpose, discovery, and challenge

- Every feature, screen element, and item must improve choice, feedback, discovery, satisfaction, or atmosphere. Identify its purpose before adding it; merge or remove clutter, chores, and duplicate decisions.
- Let players learn through actions and consequences. Keep copy brief; avoid mandatory walkthroughs, next-step coaching, and repeated instructions. Optional details explain rules without prescribing strategy. Flavor text must earn its space.
- Create difficulty through worker allocation, resources, production chains, and investment timing. Make costs, effects, shortages, and irreversible consequences legible. Ordinary mistakes need a playable recovery path.
- Reveal systems when relevant, with time to understand each interaction. Unlocks should change actions or planning, not merely add currencies or larger numbers.
- Give resources useful sources and sinks, and upgrades distinct roles. Shift bottlenecks as the settlement grows; avoid dominant purchases or strategies that make other investments irrelevant.
- Automate mastered repetition while preserving allocation and investment decisions. Reward active play through choices, not compulsory clicking; idle progress should reflect preparation without constant attendance.

### Progression and soft caps

- Prefer rising marginal costs, diminishing benefits, or economic pressure over arbitrary building, stockpile, or upgrade limits. Further investment must remain possible and useful while alternatives become more attractive; avoid curves that function as hard caps. Purposeful finite discoveries and mutually exclusive choices may remain finite.
- Balance costs against net production, including inputs and upkeep. Evaluate time to afford, marginal benefit, and payback across early, middle, and late progression, including stacked multipliers and active and idle play.
- Alternate pressure with breakthroughs. Give short sessions worthwhile decisions and longer absences useful progress. Before a bottleneck becomes an empty wait, offer reachable efficiency improvements, alternative investments, or new interactions.

### Compact, playable interface

- Use recognizable icons, visual states, meters, and small animations when clearer than prose. Keep meanings consistent and label unfamiliar icons. Accessibility compliance is not a project requirement; prioritize clear, convenient gameplay.
- Organize by player task with stable locations. Keep resource amounts, net rates, and controls together; make production, shortages, affordability, and action results easy to scan.
- Reveal optional detail progressively. Keep frequent actions in the relevant view or one navigation step away; avoid nested menus and repeated panel switching. Keep controls readable and touch targets usable on narrow screens.
- Keep routine feedback quiet and local. Reserve prominent notices and confirmations for discoveries, consequential decisions, or problems needing attention. Collapse completed or obsolete content while retaining useful history.

### Research references

These inform the principles, not every project policy; in particular, their hard caps are not this project's model.

- Kittens Game: [worker roles](https://wiki.kittensgame.com/en/general-information/resources/kittens), [game mechanics](https://wiki.kittensgame.com/en/general-information/game-mechanics), and [iron](https://wiki.kittensgame.com/en/general-information/resources/iron) illustrate interconnected production, consumption, resource uses, and diminishing bonuses.
- Anthony Pecorella's [The Math of Idle Games, Part I](https://www.kongregate.com/en/pages/the-math-of-idle-games-part-i) discusses cost/production curves, milestone multipliers, and competing investments.

## Making changes

- Inspect the working tree before editing and preserve unrelated changes.
- Keep changes focused and follow existing patterns. Prefer clear names, direct control flow, and a single source of truth. Add dependencies or abstractions only for concrete needs; avoid speculative frameworks, redundant state, and defensive layers for unsupported cases. Simplicity must preserve correctness.
- Treat `biome.json`, `tsconfig.json`, and `.editorconfig` as the sources of truth for code conventions; do not duplicate their settings in documentation.
- Use concrete types instead of `unknown`. Reserve `unknown` for rare boundaries where the input cannot be modeled more precisely, and explain the exception locally. Do not substitute `any` or unchecked assertions.
- Keep game rules easy to unit test without browser setup. Pass state and dependencies such as time and randomness explicitly; keep game logic independent of the DOM, browser APIs, and mutable globals.
- Shared logic must operate on typed definitions, not chains of special cases for named jobs, buildings, resources, actions, or research. Put prerequisites, costs, effects, and other item-specific behavior in their owning definitions; use small shared evaluators across gameplay, save normalization, and rendering. Adding an item must not require extending ID comparisons in those consumers. Do not merely hide the same branch chain in a helper or build a generic framework for hypothetical rules.
- This project is at the proof-of-concept (PoC) stage. Compatibility code is not allowed: do not add or retain legacy adapters, fallback formats, or save migrations. Breaking changes and lost saves are acceptable. Update default initialization and current-format save handling together when changing state; reset incompatible saves rather than migrating them.
- When changing actions or research, check shared types, configuration, game rules, renderer, and HTML bindings together. Keep identifiers consistent.
- Preserve the distinction between elapsed gameplay time and hidden-page time. Account for visibility changes and page restoration when changing timers.
- Set user-controlled text through DOM text properties, not HTML interpolation.

## Validation and handoff

- For code or tooling changes, run the README's development checks; report anything that could not run and why.
- Keep the test suite small and focused. Unit tests should primarily cover meaningful game logic and save behavior; add regression coverage where it protects a distinct behavior. Extend existing tests when practical, and avoid redundant cases or tests that merely restate configuration or implementation.
- Keep only a minimal set of automated browser tests for essential end-to-end flows and browser-specific behavior that unit tests cannot cover. For interface changes, manually verify affected interactions and layout in a browser, including narrow screens and common click/tap flows; do not add a browser test for every UI change.
- For gameplay changes, play through the affected decision loop: purpose, pacing, tradeoffs, and recovery. For balance changes, compare early, middle, and late states and report empty waits or dominant strategies; unit tests alone do not establish fun.
- For documentation-only changes, verify accuracy and local links; application tests are unnecessary unless executable behavior changes.
- Summarize results, validation, and remaining limitations.
