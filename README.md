# Primitive Tribe

A browser-based incremental idle game. Gather resources, explore nearby areas, and research tools while keeping your tribe fed.

## Run locally

Install [Bun](https://bun.sh/) 1.3 or newer, then run from the repository root:

```sh
bun install
bun run dev
```

Open the local URL printed by Bun. The development server bundles the TypeScript and CSS from source and reloads changes. Stop it with `Ctrl+C`.

Progress is saved in your browser's local storage under the existing `primitive-tribe-v1` key. Saves are local to the browser and origin; changing the hostname or port uses a different save. If browser storage is unavailable, gameplay still works but progress will not persist.

## Build and check

```sh
bun run test
bun run build
```

The build first runs strict TypeScript checking, then bundles `index.html`, TypeScript, and CSS into `dist/` using Bun. Run `bun run typecheck` to check types without building.

`dist/` is generated and ignored by Git. Deploy its contents to a static web host **after running the build**; it is no longer checked in. Deployment must install dependencies and run `bun run build` before publishing. Serve the output over HTTP rather than opening the HTML directly from disk.

Dependencies, build output, caches, test coverage, logs, and local environment/editor files are ignored. Keep the Bun lockfile versioned for reproducible installs; use `bun install --frozen-lockfile` in automation once it is present.

## Repository layout

- `index.html` — HTML entry point for development and production builds.
- `src/main.ts` — browser startup, event handlers, action progress, and the food clock.
- `src/persistence.ts` — browser-local save loading and writing, including legacy save normalization.
- `src/` — game rules, state, rendering, formatting, constants, types, styles, and tests.
- `package.json` — Bun development, build, typecheck, and test commands.
- `tsconfig.json` — strict TypeScript configuration.
- `dist/` — generated static deployment output (not versioned).

## Origin

Imported from Primitive Tribe's Sites source commit `fb5917349fda27b484370208142e1f91458d41e8`.
