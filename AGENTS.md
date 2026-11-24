# Liquid Glass Navbar

Use the [README code map](README.md#code-map) to find the implementation and the [API index](docs/api.md) to find the integration contract. The package exports TypeScript and CSS directly, and the examples bundle the source with esbuild.

## Behavior to preserve

- Applications supply the nav markup and own page rendering. Normal tab activation updates `aria-current` and calls `onSelect`. Programmatic `select(item)` updates selection without calling `onSelect`.
- Tabs can be buttons or links. Preserve native link navigation and the link behavior when a swipe ends on a tab. Action items use `onAction`.
- When changing interactions, check pointer, touch, and keyboard paths. For overflow and popover changes, check focus and Escape. For visual changes, check reduced motion and reduced transparency as relevant.
- When adding listeners, observers, or generated DOM, account for cleanup in `destroy()`.

## Verify changes

Run `npm ci`, then `npm run check` for strict TypeScript checking and `npm run demo` to exercise the navbar at `http://127.0.0.1:4173/examples/`. Browser behavior needs a browser check in addition to the type check. The examples' TypeScript and HTML are the source files. Their generated JavaScript is ignored.
