# Agent guidance

This file applies to the entire repository. Read [README.md](README.md) for setup, commands, and deployment. Keep those instructions there; use this file only for guidance on making changes. Do not add file inventories or directory listings to the README.

## Making changes

- Inspect the working tree before editing and preserve unrelated changes.
- Keep changes focused on the requested behavior. Follow existing patterns and avoid adding dependencies or abstractions without a concrete need.
- Treat `biome.json`, `tsconfig.json`, and `.editorconfig` as the sources of truth for code conventions; do not duplicate their settings in documentation.
- Keep player-facing copy brief. This is a game: let players discover mechanics through play; avoid next-step coaching, repeated instructions, and text walls.
- Use concrete types instead of `unknown`. Reserve `unknown` for rare boundaries where the input cannot be modeled more precisely, and explain the exception locally. Do not substitute `any` or unchecked assertions.
- Keep game rules independent of the DOM so they can be tested without browser setup.
- Shared logic must operate on typed definitions, not chains of special cases for named jobs, buildings, resources, actions, or research. Put prerequisites, costs, effects, and other item-specific behavior in their owning definitions; use small shared evaluators across gameplay, save normalization, and rendering. Adding an item must not require extending ID comparisons in those consumers. Do not merely hide the same branch chain in a helper or build a generic framework for hypothetical rules.
- When changing state, update default initialization and save normalization together. Preserve existing saves through explicit migrations rather than silently resetting progress.
- When adding or changing actions or research, check the shared types, configuration, game rules, renderer, and HTML bindings together. Keep their identifiers consistent.
- Preserve the distinction between elapsed gameplay time and time spent in a hidden page. Changes to timers must account for visibility changes and page restoration.
- Keep user-controlled text in DOM text properties rather than interpolating it into HTML.

## Validation and handoff

- For code or tooling changes, run the development checks documented in the README. Report any check that could not run and why.
- Add focused regression coverage when changing behavior, especially save compatibility and game rules. Avoid tests that only restate configuration or implementation details.
- For interface changes, verify the affected interactions and layout in a browser, including narrow screens and keyboard access.
- For documentation-only changes, verify accuracy and local links; application tests are unnecessary unless executable behavior also changes.
- Summarize the result, validation, and any remaining limitations when handing work back.
