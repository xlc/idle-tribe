# Primitive Tribe

A browser-based incremental settlement game. Grow from a lone forager through agricultural, town, industrial, digital, space, and quantum eras. Assign workers, plan construction and research, and choose a permanent technology specialization.

This is a proof of concept (PoC). Breaking changes and lost saves are expected; backward compatibility is not supported.

Coding agents should read [AGENTS.md](AGENTS.md) for design, change, and validation guidance.

## Run locally

Install [Bun](https://bun.sh/) 1.3 or newer, then run from the repository root:

```sh
bun install --frozen-lockfile
bun run dev
```

Open the printed local URL. No environment variables or external services are required.

## Gameplay

The playable catalog covers **all eight eras**, through Causal synthesis. Start by gathering food, wood, and stone by hand; research **Shelters** to unlock builders, workplaces, and arriving settlers. Staff workplaces, keep people fed and housed, and queue construction and research toward towns and beyond. After **Writing**, choose a permanent specialization — **Forestry** or **Stonecraft** — that shapes every later era. Later, the mysterious time box offers an optional reset for permanent legacy points and perks.

Gathering reaches a player-controlled **Repeat** option at level 2. It stops when you leave the game. The resource menu lets you pin up to three balances; pins are stored separately from the settlement save.

Every villager has a permanent occupation aptitude and earns per-occupation expertise through practice. Progress saves automatically in your browser, and time away from the game is simulated when you return — the first 8 hours run at full speed, longer absences progressively slower.

Everyone, including the founder, starts with a generated given name and family name. Use **Rename** in their People row to change it. Names persist through reloads; new arrivals avoid existing full names. The two-pool naming approach takes inspiration from [Kittens Game](https://github.com/nuclear-unicorn/kittensgame/blob/master/js/village.js), with a separate name pool for this settlement.

See the [design decisions](docs/GAME_DESIGN.md) and [villager expertise decisions](docs/VILLAGER_EXPERTISE.md) for details, and the [visual guide](docs/VISUAL_GUIDE.md) for the interface.

## Saves and offline progress

The game autosaves to your browser's local storage. Incompatible prototype saves reset; there are no migrations or save versions.

The production build installs as a standalone PWA. On iPhone or iPad, open it in Safari and choose **Share → Add to Home Screen**. Open the installed app online once to cache the complete game; after that it can reopen and play without a connection. Installation and caching require HTTPS or localhost.

## Development

Game content lives in `src/definitions/`, grouped into the eight era folders:
`tribal`, `agricultural`, `town`, `industrial`, `digital`, `space`, `quantum`, and
`beyond-quantum`. Each folder owns its era description, resources, buildings,
research, jobs, equipment, and any actions or perks introduced in that era.
Later forms of an existing building belong in the unlocking era's `building-upgrades.ts`.
Permanent time-box perks live in Industrial, where the time box is discovered.

`src/definitions/index.ts` assembles the typed runtime catalogs. Keep costs,
recipes, prerequisites, and flavor text in the era files; shared evaluation and
simulation stay in the rule modules. `src/ids.ts` preserves canonical iteration
order, and building upgrades append chronologically to preserve form indexes.

Run the same checks as CI before submitting changes:

```sh
bun run check
```

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the development server with hot reload. |
| `bun run lint` / `bun run lint:fix` | Check or fix Biome formatting, lint rules, and import organization. |
| `bun run typecheck` | Check TypeScript types. |
| `bun run test` | Run unit tests. |
| `bun run test:browser` | Build and test the production UI in Chromium, including offline loading. |
| `bun run balance` | Simulate ordinary visits; `--full` reaches all eras, `--matrix` sweeps branches and schedules. |
| `bun run build` | Check types and generate the production bundle in `dist/`. |
| `bun run preview` | Build and serve locally using Cloudflare's runtime. |
| `bun run deploy` | Build and publish to Cloudflare Workers. |

Before the first browser test, install Chromium with `bunx playwright install chromium`.

## Cloudflare deployment

[Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) serves `dist/`; `wrangler.jsonc` names the Worker `idle-tribe`. Use `bun run preview` to inspect the production build locally. To publish:

```sh
bunx wrangler login
bun run deploy
```

Use `bun run deploy --dry-run` to validate without publishing. For automatic deployment from `xlc/idle-tribe`, connect the repository in **Workers & Pages** with [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/): production branch `master`, build command `bun install --frozen-lockfile && bun run check`, deploy command `bun run deploy`, build variables `BUN_VERSION=latest` and `SKIP_DEPENDENCY_INSTALL=true`.

## Origin

Imported from Primitive Tribe's Sites source commit `fb5917349fda27b484370208142e1f91458d41e8`.
