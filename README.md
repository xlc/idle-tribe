# Primitive Tribe

A browser-based incremental idle game. Gather resources, explore nearby areas, and research tools while keeping your tribe fed.

## Run locally

The self-contained game in `dist/index.html` requires no dependency installation or build step. Open that file directly in a browser, or serve it over HTTP with Python 3 from the repository root:

```sh
python3 -m http.server 8000 --directory dist
```

Then visit http://localhost:8000. Stop the server with `Ctrl+C`.

Progress is saved in your browser's local storage. Saves are local to the browser and origin, so opening the file directly and serving it over HTTP may use different saves.

## Repository layout

- `dist/index.html` — runnable game with inline HTML, CSS, and JavaScript; also the static deployment content.
- `index.html` — separate HTML entry point referencing `/src/main.ts`, which is not currently included.
- `src/` — TypeScript modules for game rules, state, rendering, formatting, constants, and types, plus styles.
- `.openai/hosting.json` — existing ChatGPT Sites configuration, serving `dist/`.

## Development notes

The repository currently has no package manifest, build configuration, or automated test setup. The TypeScript modules are not wired into a runnable entry point, and there is no configured command to rebuild `dist/index.html` from them. Use the checked-in `dist/index.html` to run the game; serving the root `index.html` is not a working development setup.

Changes to `src/` do not automatically update the runnable game. When modifying `dist/index.html`, reload the locally served page and manually check the affected gameplay and save behavior.

`dist/` is intentionally versioned and is not ignored by `.gitignore`.

## Origin

Imported from Primitive Tribe's Sites source commit `fb5917349fda27b484370208142e1f91458d41e8`.
