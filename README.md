# Primitive Tribe

A browser-based incremental game about turning a small tribe into an automated village. Assign workers, build production chains, and develop a permanent technology specialization.

Coding agents should also read [AGENTS.md](AGENTS.md) for change and validation guidance.

## Run locally

Install [Bun](https://bun.sh/) 1.3 or newer, then run from the repository root. Bun is intentionally not pinned; CI uses the latest stable release. Automatic peer installation is disabled so the Tailwind plugin uses the installed Bun runtime; add any needed peer packages explicitly.

```sh
bun install --frozen-lockfile
bun run dev
```

Open the local URL printed by Bun. The development server bundles the TypeScript and CSS from source and reloads changes. Stop it with `Ctrl+C`.

Progress is saved in your browser's local storage under the existing `primitive-tribe-v1` key. Saves are local to the browser and origin; changing the hostname or port uses a different save. If browser storage is unavailable, gameplay still works but progress will not persist.

Reloading cancels unfinished actions and research and returns their reserved materials. Completed discoveries, upgrades, skill progress, job assignments, and partial worker gathering cycles remain saved. Older saves migrate automatically without losing people or progress.

## Growing your tribe

Gather fruit, explore for wood, and collect 2 wood to open Technology. Research a sharpened stick, then **Shelters** to start automation. Your first shelters include a foraging camp and lumber camp, and put you to work gathering fruit. Invite people for 15 fruit and assign available workers with each building's + and − buttons. Individual assignments are also available under People.

Discovering stone adds a quarry. **Carpentry** unlocks a sawmill and houses; **Masonry** unlocks stoneworks. Sawmills convert 3 wood into planks, and stoneworks convert 3 stone into blocks. Production pauses when inputs run out. Move workers between gathering and processing to manage supply. Building expansions add two worker places and increase output by 50% of the original yield. Houses increase population capacity.

**Writing** unlocks the study, where scholars turn fruit into knowledge, and the specialization choice:

- **Forestry:** +60% wood and plank output. Precision joinery reduces both processing recipes to 2 raw materials.
- **Stonecraft:** +60% stone and block output. Architecture improves block output and doubles the capacity added by houses.

A specialization is permanent for the run. Both paths retain all essential workplaces and can research Cultivation and Engineering, then construct the **Great Hall** to establish a village. Production and construction continue after that milestone. A reset or prestige system is not implemented.

Each fed person eats 1 fruit per minute. Food shortages reduce output to 80% at 3/5 health and 50% at 2/5 or below; nobody dies or permanently stops working. Meals feed the hungriest first. Foragers can recover the economy without manual gathering. A feast restores everyone's missing health immediately for 1 fruit per health point, rounded up.

Work continues while the game is hidden or closed, with up to **24 hours** of production and meals per absence. The return summary shows net resource gains. Catch-up uses the same recipes, worker assignments, food effects, and partial cycles as visible play; it does not buy buildings, recruit people, or choose research automatically. Manual actions and research pause while the page is hidden. Unfinished manual actions and research still cancel and refund their reserved materials on reload.

Existing saves migrate automatically to version 4. Resources, people, research and skills remain; existing workers receive enough workplace capacity to retain their jobs. Saves without a reliable timestamp begin offline accounting from their first load in this version.

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
| `bun run preview` | Build and serve the static site locally using Cloudflare's runtime. |
| `bun run deploy` | Build and publish the static site to Cloudflare Workers. |
| `bun run check` | Run lint/format checks, type checking, the build, and tests. |

[Biome](https://biomejs.dev/reference/configuration/) checks TypeScript, CSS, and JSON with two-space indentation, single quotes, and no optional semicolons in TypeScript. Its configuration respects `.gitignore`; `.editorconfig` and `.gitattributes` keep editor settings and line endings consistent. Use your editor's Biome integration for formatting on save. HTML, Markdown, and YAML are edited manually; experimental HTML support is not enabled.

GitHub Actions runs `bun run check` for pushes and pull requests, using a frozen lockfile and read-only repository permissions.

## Production build

`bun run build` first runs strict TypeScript checking, then bundles `index.html`, TypeScript, and CSS into `dist/` using Bun with the Tailwind plugin. The development server uses the same plugin for hot reload.

The UI uses [Tailwind CSS](https://tailwindcss.com/) for layout and spacing and [daisyUI](https://daisyui.com/) for controls. The custom `tribe` theme and shared game action states live in the stylesheet. Keep utility class names complete in HTML and renderer strings so Tailwind can detect them at build time.

`dist/` is generated and ignored by Git. Deploy its contents to a static web host **after running the build**; it is no longer checked in. Deployment must install dependencies and run `bun run build` before publishing. Serve the output over HTTP rather than opening the HTML directly from disk.

Dependencies, build output, caches, test coverage, logs, and local environment/editor files are ignored. No environment variables or external services are required. Never commit secrets or browser saves.

Use `bun add` / `bun add --dev` to add dependencies and commit both `package.json` and `bun.lock`. Use `bun install --frozen-lockfile` for fresh checkouts and CI so installation fails if the manifest and lockfile disagree.

## Cloudflare deployment

The site uses [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) to publish `dist/`. `wrangler.jsonc` sets the Worker name to `idle-tribe`; no server code or runtime bindings are needed.

After installing dependencies, preview the production build locally:

```sh
bun run preview
```

To publish from your machine, authenticate with your Cloudflare account once, then deploy:

```sh
bunx wrangler login
bun run deploy
```

The deploy command builds first and prints the public `workers.dev` URL after publishing. To validate the build and deployment configuration without publishing, run `bun run deploy --dry-run`.

[Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) is connected to `xlc/idle-tribe` and automatically deploys pushes to `master`. The Cloudflare build configuration uses these settings:

| Setting | Value |
| --- | --- |
| Worker name | `idle-tribe` |
| Production branch | `master` |
| Root directory | Repository root |
| Build command | `bun install --frozen-lockfile && bun run check` |
| Deploy command | `bun run deploy` |
| Build variable `BUN_VERSION` | `latest` (must be Bun 1.3 or newer) |
| Build variable `SKIP_DEPENDENCY_INSTALL` | `true` (the build command installs with the frozen lockfile) |

If recreating the Cloudflare project, connect the repository in **Workers & Pages** and set the build variables before the first build: Cloudflare's [default Bun version](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/) may be older than this project requires. For deployment from another CI service, provide `CLOUDFLARE_API_TOKEN` with Workers deployment permissions and `CLOUDFLARE_ACCOUNT_ID` through that service's secret settings. Do not commit credentials.

## Origin

Imported from Primitive Tribe's Sites source commit `fb5917349fda27b484370208142e1f91458d41e8`.
