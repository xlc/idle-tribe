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

Bun is not pinned; CI uses the latest stable release. Add dependencies with `bun add` or `bun add --dev`, and commit both `package.json` and `bun.lock`.

## Current gameplay

The playable catalog covers **all eight eras**, through Causal synthesis. [Design decisions](docs/GAME_DESIGN.md) describe the progression, economy, and scope at a high level.

Each manual gathering action starts at one unit: food takes one second, wood two seconds, and stone three seconds before storage pressure. Both explorations take 3 seconds to discover wood and stone. Gathering actions earn 1 XP per completion, with separate levels for food, wood, and stone. Each level adds 3% speed; every fifth level adds 0.1 yield. XP requirements grow by 20% per level. Action cards show level and progress alongside yield and duration. Research **Shelters** to receive the first Foraging camp and unlock builders and automatic arrivals. Housing and other facilities require construction. Workers gather **food**, wood, and stone, then process planks, blocks, tools, and knowledge. Processing pauses without inputs and spends one recipe per completed unit.

Each workplace has **−**, **+**, and **Fill** controls. Plus and Fill choose available villagers with the strongest current contribution for that occupation; Minus releases the weakest contributor. Fill runs once up to the nominal staffing target. The People view allows deliberate individual assignments. Extra workers remain useful with diminishing returns; they are never automatically reassigned. Comfortable housing slows crowding rather than imposing a population limit. Arrivals require a food buffer and sustainable production, arrive unassigned, and can be paused with **Welcome arrivals**.

Every villager has a permanent occupation aptitude. Productive work earns separate expertise for each occupation. Crowding, poor health, storage pressure, and missing inputs slow practice. Expertise survives reassignment, but does not transfer between occupations; farmers start fresh even after years of foraging. Skilled workers also use workplace capacity, so extra staffing and personal bonuses have diminishing returns in crowded workplaces. The People pane shows aptitudes, health, effective output, and optional learning progress in compact rows. [Villager aptitude and expertise decisions](docs/VILLAGER_EXPERTISE.md) describe the intended behavior. Manual action levels are separate from villagers’ occupational expertise and do not improve worker production.

Construction and research have separate ordered queues. Waiting plans reserve nothing; an eligible head pays when it starts. Builders advance construction, while research uses a fixed timer. Reorder or remove waiting plans freely. Cancelling active work refunds its exact committed materials and discards progress. Completed facilities retain their effects during expansion and conversion. Conversion retains levels, assignments, partial cycles, and equipment; removal loses completed investment while preserving people and stock.

Repeatable buildings and equipment refinements have no gameplay level cap. Storage thresholds reduce production gradually above comfortable amounts; all stock remains spendable. Costs committed to unfinished projects still count toward storage pressure. Toolmaking, Organized work, and Civic engineering unlock equipment tiers; Civic engineering also opens unlimited refinements.

**Agriculture** unlocks farms, cottages, and granaries. **Writing** requires a completed Farm and introduces towns, gradual happiness, schools, libraries, and permanent specialization:

- **Forestry:** wood and plank workplace rates ×1.40; Precision joinery reduces wood and stone processing inputs from 3 to 2.
- **Stonecraft:** stone and block workplace rates ×1.40; Architecture adds +50% block production technology and +25% housing contribution.

Both branches reach every era. Industry adds ore, metal, and machinery; digital production adds charge, circuits, and data; space adds exotic material; quantum engineering adds quantum components; causal engineering adds causal models and a second metal source. Later conversions and research improve earlier supply chains. Forestry gains manufacturing input efficiency; Stonecraft gains housing and storage headroom. Facility filters keep production, storage, and housing/support one step away. The unique **Great Hall** remains optional.

**Precision instruments → Chronometry**, available after Mechanization, discovers the mysterious time box. It permits an optional reset for permanent legacy points and perks; the confirmation lists losses and gains. The time box remains available after resetting, but each repeat reset requires reaching Writing again. Optional Early astronomy unlocks a town Observatory; the common space route instead offers the Deep-space array. Causal synthesis is the last finite research, with continued facility investment and prestige beyond it.

Fed people eat 1 food per minute. Shortages reduce individual output to 80% at 3/5 health and 50% at 2/5 or below; nobody dies or leaves. Meals feed the hungriest first. A feast restores missing health for 1 food per point, rounded up. Town happiness changes by at most two points per simulated minute and affects workers, builders, and arrival speed.

## Saves and offline progress

The production build installs as a standalone PWA. On iPhone or iPad, open it in Safari and choose **Share → Add to Home Screen**. Open the installed app online once to let it cache the complete game; after caching completes, it can reopen and play without a connection. Installation and caching require HTTPS or localhost. The hot-reload development server does not install an offline cache; use the production browser checks or preview to verify offline loading.

The game stays within the screen and safe areas, with long lists scrolling inside game panels. Resources use a compact strip across the top; narrow screens can swipe it. The ivory surfaces, painted icons, serif headings, and green controls follow the [visual guide](docs/VISUAL_GUIDE.md). Radix Themes tabs provide keyboard navigation above the content on desktop and along the bottom on phones. People stay beneath the opening actions, then move to a dedicated view after automation. Construction and research have matching summaries with builder and queue controls available on demand. Workplace rows keep production and staffing visible; built facilities reveal investment costs and upgrades in their details. Touch gestures do not zoom the game or scroll the surrounding page. Updates download in the background and wait for all game windows to close before activating; they never force a reload during play. Browser storage remains local to the browser or installed app and can be cleared by the browser or device.

Progress saves automatically in browser local storage under `primitive-tribe-v1`, with current-format schema version 7. Prototype saves from previous schemas reset; there are no migrations. Saves belong to the browser and origin. If storage is unavailable, the current session remains playable but progress will not persist.

Current-format reloads preserve queued research and construction, recorded payments, partial worker cycles, assignments, aptitudes, occupational practice, manual action levels and XP, and absence accounting. Unfinished manual actions alone cancel and refund on reload. Manual actions pause while hidden; workers, meals, immigration, happiness, construction, and research share the same simulation timeline.

The initial **8 hours** away run at full speed. Longer absences continue with diminishing effective time: 24 hours gives about 19.71 simulated hours, and a week gives about 65.32. Supply posts and record technologies extend the full-speed window. Its duration is snapshotted at departure; hidden callbacks and reloads settle only time not already accounted for. Improvements completed away benefit the next absence.

The inline return report expands above the current view to show wall and simulated time, signed resource changes, arrivals, completed plans, personal expertise gains, and current blockers. Its summary remains available when collapsed. No choices, assignments, or new purchases are added automatically beyond the plans you queued.

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
| `bun run test:browser` | Build and test the production UI in Chromium and iOS WebKit, including offline loading. |
| `bun run balance` | Simulate ordinary visits through Mechanization; `--full` reaches all eras, and `--matrix` runs both policies, branches, and all three schedules. |
| `bun scripts/balance-experiments.ts` | Compare earned-checkpoint investments, recovery, prestige strategies, and first-purchase perks. |
| `bun run build` | Check types and generate the production bundle in `dist/`. |
| `bun run preview` | Build and serve locally using Cloudflare's runtime. |
| `bun run deploy` | Build and publish to Cloudflare Workers. |
| `bun run check` | Run lint, build (including type checking), and tests. |

Balance runs accept `--branch=forestry|stonecraft`, `--policy=simple|bottleneck`, `--schedule=frequent|daily|concentrated`, `--days=60`, and `--out=balance-results/latest`. Experiments accept `--branch` and `--out`. Results include source provenance, milestone bounds, control counts, snapshots, and earned checkpoints. Generated artifacts are ignored by Git; preserve their provenance when comparing runs.

Before the first browser test, install the browser engines with `bunx playwright install chromium webkit`. The browser checks use isolated saves and start their own local server.

Code conventions live in `biome.json`, `tsconfig.json`, and `.editorconfig`; `.gitattributes` controls repository line endings. Biome checks TypeScript, CSS, and JSON. HTML, Markdown, and YAML are maintained manually. GitHub Actions runs `bun run check` on pushes and pull requests with a frozen lockfile and read-only repository permissions.

React components render the interface with Radix Themes Tabs, native game controls, and custom CSS. Game rules and session clocks remain independent of React and the DOM.

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
