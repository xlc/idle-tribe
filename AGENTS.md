# Agent guidance

Applies to the whole repository. Read [README.md](README.md) for setup and
runtime commands. Keep this project a small, playable proof of concept.

## Product and game design

- Make each feature improve choice, feedback, discovery, pacing, or atmosphere.
- Prefer concise, discoverable game feedback over tutorials, walkthroughs, or
  repeated instructions. Do not babysit the player.
- Keep resources, costs, upkeep, bottlenecks, and irreversible choices legible.
- Balance active and idle play. Avoid dominant strategies, arbitrary hard caps,
  and empty waits; use rising costs, diminishing returns, and meaningful sinks.
- Keep the interface compact, readable, and usable on narrow touch screens.

## Implementation

- Inspect the working tree before editing and keep changes focused.
- Treat `biome.json`, `tsconfig.json`, and `.editorconfig` as the sources of
  truth for code style and compiler rules.
- Keep game rules independent of React, the DOM, browser APIs, and globals.
  Pass time, randomness, and other dependencies explicitly so rules stay easy
  to test.
- Use strict, concrete TypeScript types. Avoid `any`; use `unknown` only at a
  real untyped boundary and justify it locally. Prefer generics and typed
  narrowing over assertions or duplicated shapes.
- Keep definitions data-driven. Actions, resources, jobs, buildings, research,
  and their costs, effects, and prerequisites belong in typed definitions.
  Shared evaluators must not branch on named item IDs. Adding an item should
  not require editing the core engine or renderer.
- Keep one source of truth for state and rules. Avoid speculative abstractions,
  compatibility wrappers, and defensive handling for unsupported inputs.
- This is a PoC: breaking save changes are acceptable. Do not add migrations or
  legacy adapters; reset incompatible saves and update current initialization
  and normalization together.
- Preserve the distinction between active elapsed time and hidden-page time.
  Set user-controlled text through DOM text properties, never HTML strings.

## Testing and handoff

- Prioritize unit tests for game logic, simulation, balance, persistence, and
  meaningful regressions. Keep tests focused; do not mirror implementation.
- Browser tests are optional and not part of the normal validation path. Add or
  run them only for behavior that cannot be verified in game-logic tests.
- Run the relevant checks before handoff, normally:

  ```sh
  bun run lint
  bun run typecheck
  bun test ./src ./scripts
  bun run build
  ```

- Report what changed, what passed, and any checks that could not run.
