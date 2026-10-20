# Primitive Tribe

A browser-based incremental settlement game. Grow from a lone forager through agricultural and town economies through industrial, digital, space, quantum, and beyond-quantum eras. Assign workers, plan construction and research, and choose a permanent technology specialization.

This is a proof of concept (PoC). Breaking changes and lost saves are expected; backward compatibility is not supported.

Coding agents should read [AGENTS.md](AGENTS.md) for design, change, and validation guidance.

## Run locally

Install [Bun](https://bun.sh/) 1.3 or newer, then run from the repository root:

```sh
bun install --frozen-lockfile
bun run dev
```

Open the printed local URL. The server bundles TypeScript and CSS from source and reloads changes; stop it with `Ctrl+C`. No environment variables or external services are required to play locally.

Bun is not pinned; CI uses the latest stable release. Automatic peer installation is disabled so the Tailwind plugin uses the installed Bun runtime. Add needed peers explicitly with `bun add` or `bun add --dev`, and commit both `package.json` and `bun.lock`.

## Current gameplay

The playable catalog covers **all eight eras**, through Causal synthesis. The first three eras follow [the detailed design](docs/GAME_DESIGN_DETAILS.md); [the later-era addendum](docs/LATER_ERAS.md) defines the remaining costs, unlocks, recipes, branch upgrades, and time-box discovery. [Implementation and playtest results](docs/IMPLEMENTATION_RESULTS.md) record coverage and pacing evidence.

Manual gathering produces three units per batch at the same base rate as individual gathering. Explore to discover wood and stone. Research **Shelters** to receive the first Foraging camp and unlock builders and automatic arrivals. Housing and other facilities require construction. Workers gather **food**, wood, and stone, then process planks, blocks, tools, and knowledge. Processing pauses without inputs and spends one recipe per completed unit.

Each workplace has **−**, **+**, and **Fill** controls. Plus and Fill choose available villagers with the strongest current contribution for that occupation; Minus releases the weakest contributor. Fill runs once up to the nominal staffing target. The People view allows deliberate individual assignments. Extra workers remain useful with diminishing returns; they are never automatically reassigned. Comfortable housing slows crowding rather than imposing a population limit. Arrivals require a food buffer and sustainable production, arrive unassigned, and can be paused with **Welcome arrivals**.

Every villager has a permanent **aptitude** worth +5% personal work in one occupation. Productive work earns separate **expertise** for each occupation, starting with a 5% gain after 15 practice minutes and diminishing gains afterward. Crowding, poor health, storage pressure, and missing inputs slow practice. Expertise survives reassignment, but does not transfer between occupations; farmers start fresh even after years of foraging. Skilled workers also use workplace capacity, so extra staffing and personal bonuses have diminishing returns in crowded workplaces. The People view shows aptitudes, effective output, and optional learning progress. [Villager expertise](docs/VILLAGER_EXPERTISE.md) defines the rules and [its validation results](docs/VILLAGER_EXPERTISE_RESULTS.md) describe the playtests. Manual gathering keeps its base batch rates and has no expertise bonus.

Construction and research have separate ordered queues. Waiting plans reserve nothing; an eligible head pays when it starts. Builders advance construction, while research uses a fixed timer. Reorder or remove waiting plans freely. Cancelling active work refunds its exact committed materials and discards progress. Completed facilities retain their effects during expansion and conversion. Conversion retains levels, assignments, partial cycles, and equipment; removal loses completed investment while preserving people and stock.

Repeatable buildings and equipment refinements have no gameplay level cap. Storage thresholds reduce production gradually above comfortable amounts; all stock remains spendable. Costs committed to unfinished projects still count toward storage pressure. Toolmaking, Organized work, and Civic engineering unlock equipment tiers; Civic engineering also opens unlimited refinements.

**Agriculture** unlocks farms, cottages, and granaries. **Writing** requires a completed Farm and introduces towns, gradual happiness, schools, libraries, and permanent specialization:

- **Forestry:** wood and plank workplace rates ×1.40; Precision joinery reduces wood and stone processing inputs from 3 to 2.
- **Stonecraft:** stone and block workplace rates ×1.40; Architecture adds +50% block production technology and +25% housing contribution.

Both branches reach every era. Industry adds ore, metal, and machinery; digital production adds charge, circuits, and data; space adds exotic material; quantum engineering adds quantum components; causal engineering adds causal models and a second metal source. Later conversions and research improve earlier supply chains. Forestry gains manufacturing input efficiency; Stonecraft gains housing and storage headroom. Facility filters keep production, storage, and housing/support one step away. The unique **Great Hall** remains optional.

**Precision instruments → Chronometry**, available after Mechanization, discovers the mysterious time box. It permits an optional reset for permanent legacy points and perks; the confirmation lists losses and gains. The time box remains available after resetting, but each repeat reset requires reaching Writing again. Optional Early astronomy unlocks a town Observatory; the common space route instead offers the Deep-space array. Causal synthesis is the last finite research, with continued facility investment and prestige beyond it.

Fed people eat 1 food per minute. Shortages reduce individual output to 80% at 3/5 health and 50% at 2/5 or below; nobody dies or leaves. Meals feed the hungriest first. A feast restores missing health for 1 food per point, rounded up. Town happiness changes by at most two points per simulated minute and affects workers, builders, and arrival speed.

## Saves and offline progress

Progress saves automatically in browser local storage under `primitive-tribe-v1`, with current-format schema version 6. Prototype saves from previous schemas reset; there are no migrations. Saves belong to the browser and origin. If storage is unavailable, the current session remains playable but progress will not persist.

Current-format reloads preserve queued research and construction, recorded payments, partial worker cycles, assignments, aptitudes, occupational practice, and absence accounting. Unfinished manual actions alone cancel and refund on reload. Manual actions pause while hidden; workers, meals, immigration, happiness, construction, and research share the same simulation timeline.

The initial **8 hours** away run at full speed. Longer absences continue with diminishing effective time: 24 hours gives about 19.71 simulated hours, and a week gives about 65.32. Supply posts and record technologies extend the full-speed window. Its duration is snapshotted at departure; hidden callbacks and reloads settle only time not already accounted for. Improvements completed away benefit the next absence.

The return report shows wall and simulated time, signed resource changes, arrivals, completed plans, personal expertise gains, and current blockers. No choices, assignments, or new purchases are added automatically beyond the plans you queued.

## Development

Run the same checks as CI before submitting code or tooling changes:

```sh
bun run check
```

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the development server with hot reload. |
| `bun run lint` | Check Biome formatting, lint rules, and import organization. |
| `bun run lint:fix` | Apply formatting, import organization, and safe lint fixes. |
| `bun run format` | Format files with Biome. |
| `bun run typecheck` | Check TypeScript types. |
| `bun run test` | Run unit tests. |
| `bun run test:browser` | Build and test the production UI in Chromium at desktop and phone widths. |
| `bun run balance` | Simulate ordinary visits through Mechanization; `--full` reaches all eras, and `--matrix` runs both policies, branches, and all three schedules. |
| `bun scripts/balance-experiments.ts` | Compare earned-checkpoint investments, recovery, prestige strategies, and first-purchase perks. |
| `bun run build` | Check types and generate the production bundle in `dist/`. |
| `bun run preview` | Build and serve locally using Cloudflare's runtime. |
| `bun run deploy` | Build and publish to Cloudflare Workers. |
| `bun run check` | Run lint, build (including type checking), and tests. |

Balance runs accept `--branch=forestry|stonecraft`, `--policy=simple|bottleneck`, `--schedule=frequent|daily|concentrated`, `--days=60`, and `--out=balance-results/latest`. Experiments accept `--branch` and `--out`. Results include source provenance, milestone bounds, control counts, snapshots, and earned checkpoints. See [balance methodology and results](docs/BALANCE_RESULTS.md) for interpretation and limitations. Generated artifacts are ignored by Git; preserve their provenance when comparing runs.

Before the first browser test, install Chromium with `bunx playwright install chromium`. The browser checks use isolated saves and start their own local server.

Code conventions live in `biome.json`, `tsconfig.json`, and `.editorconfig`; `.gitattributes` controls repository line endings. Biome checks TypeScript, CSS, and JSON. HTML, Markdown, and YAML are maintained manually. GitHub Actions runs `bun run check` on pushes and pull requests with a frozen lockfile and read-only repository permissions.

Development and production share a Tailwind build plugin that flattens generated CSS with Lightning CSS before Bun bundles it. This preserves daisyUI pseudo-elements and nested color rules affected by [Bun's CSS nesting issue](https://github.com/oven-sh/bun/issues/45258). React components render the interface with daisyUI components and a custom `tribe` theme; custom CSS covers game layout and gameplay states. Game rules and session clocks remain independent of React and the DOM. Keep utility class names complete in HTML and TSX so Tailwind detects them.

`dist/` is generated and ignored by Git. Install dependencies and build before publishing its contents to a static host; serve over HTTP rather than opening HTML from disk. Never commit secrets or browser saves.

## Cloudflare deployment

[Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) serves `dist/`. `wrangler.jsonc` names the Worker `idle-tribe`; no server code or runtime bindings are needed.

Use `bun run preview` to inspect the production build locally. To publish, authenticate once and deploy:

```sh
bunx wrangler login
bun run deploy
```

Deployment builds first and prints the public `workers.dev` URL. Use `bun run deploy --dry-run` to validate the build and deployment configuration without publishing.

For automatic deployment from `xlc/idle-tribe`, connect the repository in **Workers & Pages** using these [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) settings:

| Setting | Value |
| --- | --- |
| Worker name | `idle-tribe` |
| Production branch | `master` |
| Root directory | Repository root |
| Build command | `bun install --frozen-lockfile && bun run check` |
| Deploy command | `bun run deploy` |
| Build variable `BUN_VERSION` | `latest` (Bun 1.3 or newer) |
| Build variable `SKIP_DEPENDENCY_INSTALL` | `true` (the build command installs dependencies) |

Set the build variables before the first build. These dashboard settings are managed outside the repository. For deployment from another CI service, supply `CLOUDFLARE_API_TOKEN` with Workers deployment permissions and `CLOUDFLARE_ACCOUNT_ID` through its secret settings.

## Origin

Imported from Primitive Tribe's Sites source commit `fb5917349fda27b484370208142e1f91458d41e8`.
