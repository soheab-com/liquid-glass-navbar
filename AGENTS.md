# Liquid Glass Navbar

Use the [README code map](README.md#code-map) to find the implementation and the [API index](docs/api.md) to find the integration contract. The package exports TypeScript and CSS directly, and the examples bundle the source with esbuild.

## Behavior to preserve

- Applications supply the nav markup and own page rendering. Normal tab activation updates `aria-current` and calls `onSelect`. Programmatic `select(item)` updates selection without calling `onSelect`.
- Tabs can be buttons or links. Preserve native link navigation and the link behavior when a swipe ends on a tab. Action items use `onAction`.
- When changing interactions, check pointer, touch, and keyboard paths. For overflow and popover changes, check focus and Escape. For visual changes, check reduced motion and reduced transparency as relevant.
- When adding listeners, observers, or generated DOM, account for cleanup in `destroy()`.

## Verify changes

Run `npm ci`, then:

- `npm run check` for strict TypeScript checking.
- `npm test` for the Vitest unit tests (springs, rim maps, visible limits, update keys).
- `npm run test:e2e` for the Playwright suite in Chromium, Firefox, and WebKit. It starts its own server. `npx playwright install` downloads the browsers.
- `npm run build` and `npm run test:ssr` to check the published package imports in plain Node.

`npm run demo` serves the examples at `http://127.0.0.1:4173/examples/`. The examples' and tests' TypeScript and HTML are the source files. Their generated JavaScript is ignored. Interaction changes need an end-to-end test as well as the type check.

## Commits and releases

- Give each feature, bug fix, or other change its own commit. Combine changes in one commit only when they can't be separated or are closely related.
- Write a clear one-line commit message with no description body.
- Keep releases out of change commits. A release is its own commit that bumps the version and can include the changelog entry. Tag that commit.
