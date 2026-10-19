# Primitive Tribe

A browser-based incremental idle game. Gather resources, explore nearby areas, and research tools while keeping your tribe fed.

Coding agents should also read [AGENTS.md](AGENTS.md) for change and validation guidance.

## Run locally

Install [Bun](https://bun.sh/) 1.3 or newer, then run from the repository root. Bun is intentionally not pinned; CI uses the latest stable release.

```sh
bun install --frozen-lockfile
bun run dev
```

Open the local URL printed by Bun. The development server bundles the TypeScript and CSS from source and reloads changes. Stop it with `Ctrl+C`.

Progress is saved in your browser's local storage under the existing `primitive-tribe-v1` key. Saves are local to the browser and origin; changing the hostname or port uses a different save. If browser storage is unavailable, gameplay still works but progress will not persist.

## Development checks

Run the same checks as CI before submitting changes:

```sh
bun run check
```

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the development server with hot reload. |
| `bun run lint` | Check Biome formatting, lint rules, and import organization. |
| `bun run lint:fix` | Apply Biome formatting, import organization, and safe lint fixes. |
| `bun run format` | Format files with Biome. |
| `bun run typecheck` | Check strict TypeScript types, unused code, and switch fallthrough. |
| `bun test` | Run the unit tests. |
| `bun run build` | Check types and generate the production bundle in `dist/`. |
| `bun run check` | Run lint/format checks, type checking, the build, and tests. |

[Biome](https://biomejs.dev/reference/configuration/) checks TypeScript, CSS, and JSON with two-space indentation, single quotes, and no optional semicolons in TypeScript. Its configuration respects `.gitignore`; `.editorconfig` and `.gitattributes` keep editor settings and line endings consistent. Use your editor's Biome integration for formatting on save. HTML, Markdown, and YAML are edited manually; experimental HTML support is not enabled.

GitHub Actions runs `bun run check` for pushes and pull requests, using a frozen lockfile and read-only repository permissions.

## Production build

`bun run build` first runs strict TypeScript checking, then bundles `index.html`, TypeScript, and CSS into `dist/` using Bun.

`dist/` is generated and ignored by Git. Deploy its contents to a static web host **after running the build**; it is no longer checked in. Deployment must install dependencies and run `bun run build` before publishing. Serve the output over HTTP rather than opening the HTML directly from disk.

Dependencies, build output, caches, test coverage, logs, and local environment/editor files are ignored. No environment variables or external services are required. Never commit secrets or browser saves.

Use `bun add` / `bun add --dev` to add dependencies and commit both `package.json` and `bun.lock`. Use `bun install --frozen-lockfile` for fresh checkouts and CI so installation fails if the manifest and lockfile disagree.

## Origin

Imported from Primitive Tribe's Sites source commit `fb5917349fda27b484370208142e1f91458d41e8`.
