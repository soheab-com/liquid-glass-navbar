# Contributing

Thanks for helping. Bug reports with a small reproduction and pull requests are both welcome.

## Set up

```sh
npm ci
npx playwright install
npm run demo
```

`npm run demo` serves the examples at `http://127.0.0.1:4173/examples/` and rebuilds them on each request. The examples and test pages import the TypeScript source directly.

## Before you open a pull request

```sh
npm run check       # strict TypeScript
npm run lint        # Biome lint and format check (npm run format fixes formatting)
npm test            # Vitest unit tests
npm run test:e2e    # Playwright in Chromium, Firefox and WebKit
npm run build       # dist/ for the package
npm run test:ssr    # the built package imports in plain Node
npm run size        # bundle-size budget
```

CI runs the same steps. If WebKit can't start on Linux because of missing system libraries, point `PW_WEBKIT_PATH` at a launcher that sets them up, or run the other two projects with `npx playwright test --project=chromium --project=firefox`.

## What to keep in mind

- Read [AGENTS.md](AGENTS.md#behavior-to-preserve). Its "Behavior to preserve" list applies to every change.
- The public API (options, methods, types, HTML attributes, CSS custom properties) only grows. Don't rename or remove anything without a major version.
- Interaction changes need an end-to-end test in `e2e/`. Check pointer, touch and keyboard, and Reduce Motion where something moves. Anything that moves uses a spring from `src/spring.ts`.
- Register cleanup for new listeners, observers, frames and generated nodes so `destroy()` restores the original markup.
- Add a line to `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md). Describe how things work in the README; keep version comparisons in the changelog.

## Performance

`npm run perf` (with `npm run demo` running) drags across five tabs over a refracted backdrop in each browser and writes frame timings to `perf-results/`. Run it before and after changes to the glass or the gesture code.
