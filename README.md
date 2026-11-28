# Liquid Glass Navbar

A glass tab bar for the web, in the style of iOS. You write the buttons, it adds the glass, the sliding highlight and the swipe gesture. It's plain TypeScript and CSS, so it works with any framework or none.

**[Read the docs](https://soheab.com/navbar-builder/docs/)**: every option and method, with live examples you can change and the code that runs them.
**[Try the builder](https://soheab.com/navbar-builder/)**: design a bar, see it on a phone, tablet or desktop, and copy the code.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/mockups/showcase-dark.gif">
  <img src="docs/mockups/showcase.gif" alt="Tapping between tabs, then dragging the highlight across the bar: it swells into a bubble, highlights the nearest tab, stretches past the first tab and springs back">
</picture>

## Install

```sh
npm install @soheab-com/liquid-glass-navbar
```

Or install a tagged version straight from GitHub:

```sh
npm install 'git+https://github.com/soheab-com/liquid-glass-navbar.git#v1.0.2'
```

It adds about 27 kB of JavaScript (minified and gzipped) and 7.5 kB of CSS (gzipped), with no dependencies. CI fails if either grows past its budget (`npm run size`).

The package ships compiled ES modules with TypeScript declarations, so the JavaScript works without a bundler. Importing it is safe during server rendering: it only touches the DOM when you mount a navbar. You still need to load the stylesheet, either through your bundler (`import '@soheab-com/liquid-glass-navbar/navbar.css'`) or with a `<link>`:

```html
<link rel="stylesheet" href="/node_modules/@soheab-com/liquid-glass-navbar/dist/navbar.css">
<script type="module">
  import { mountLiquidGlassNavbar } from '/node_modules/@soheab-com/liquid-glass-navbar/dist/index.js';
</script>
```

## Quick start

Write a normal `<nav>` with buttons. Mark the label and icon in each button, and mark the tab you start on with `aria-current="page"`.

```html
<nav id="tabs" aria-label="Main">
  <button type="button" aria-current="page">
    <svg data-navbar-icon viewBox="0 0 24 24" aria-hidden="true">...</svg>
    <span data-navbar-label>Home</span>
  </button>
  <button type="button">
    <svg data-navbar-icon viewBox="0 0 24 24" aria-hidden="true">...</svg>
    <span data-navbar-label>Schedule</span>
  </button>
  <button type="button">
    <svg data-navbar-icon viewBox="0 0 24 24" aria-hidden="true">...</svg>
    <span data-navbar-label>Map</span>
  </button>
</nav>
```

Then turn it into a navbar:

```ts
import { mountLiquidGlassNavbar } from '@soheab-com/liquid-glass-navbar';
import '@soheab-com/liquid-glass-navbar/navbar.css';

const navbar = mountLiquidGlassNavbar(document.querySelector('#tabs')!, {
  position: 'bottom',
  onSelect(button) {
    // Show the page that belongs to this tab.
  },
});
```

The navbar uses the platform UI font by default. Set `--lg-nav-font` on the navbar to use a different font stack.

Tapping or swiping to a tab moves `aria-current` to it and calls `onSelect`. Showing the right page is up to you.

If every tab is its own page, use links instead of buttons: `<a href="/schedule">`. Tapping a link, or ending a swipe on it, follows it like any other link.

## What it does

- A glass bar around your own buttons or links, on any edge or placed by your layout, with sections and actions.
- A highlight that follows your finger, with springs and a rubber band, and Dock-style magnify.
- Rows, a More menu or row of icons for what doesn't fit, and anchored popovers.
- Badges, compact while scrolling, context actions, and adaptive contrast over the page behind it.
- Keyboard, screen reader, Reduce Motion and Reduce Transparency support.

Everything is explained, with live examples, in the [docs](https://soheab.com/navbar-builder/docs/):
[quick start](https://soheab.com/navbar-builder/docs/#quick-start),
[options](https://soheab.com/navbar-builder/docs/#options),
[methods](https://soheab.com/navbar-builder/docs/#methods),
[TypeScript types](https://soheab.com/navbar-builder/docs/#types),
[HTML attributes](https://soheab.com/navbar-builder/docs/#attributes) and
[CSS variables](https://soheab.com/navbar-builder/docs/#css).

## Jump on hover

Use same-page links such as `<a href="#settings">Settings</a>` and opt in with `hoverNavigation: true`. A hover or drag previews the section without selecting the tab, changing the hash, or adding a history entry. Moving away restores the previous scroll position. Clicking or completing a swipe still follows the link normally.

```ts
mountLiquidGlassNavbar(nav, {
  hoverNavigation: { delay: 2000, keep: true },
});
```

`delay` defaults to zero in milliseconds. Set `keep: true` to leave the page at the previewed position, or `swipe: false` to preview only with a hovering pointer. Add `data-navbar-no-hover` to opt an item or section out. For button tabs or custom destinations, supply `onPreview(item)` and optionally `onPreviewEnd()` to manage your own preview. The built-in behavior only scrolls to IDs in the current document. Give two bars the same `group` value to preview and select across them in one swipe. Try it in the [hosted docs](https://soheab.com/navbar-builder/docs/#hover-navigation), or locally in [tests/hover-navigation.html](tests/hover-navigation.html) with `npm run demo` running.

## Multi-row navigation

Open the [catalog demo](examples/catalog.html) after starting the demo server. The bar has a filter row, an equal-width preset row and a main row. Try the chevron, the theme and accent controls, switching catalogs, and resizing across 900 px.

Use `layout: 'rows'` and put `data-navbar-row="1"`, `data-navbar-row="2"`, and so on on sections or on direct items. Sections are direct children marked with `data-navbar-section`.

```html
<nav id="catalog" aria-label="Catalog">
  <div data-navbar-section data-navbar-row="1" data-navbar-max-visible="0:2 900:none">
    <!-- Filter items -->
  </div>
  <div data-navbar-section data-navbar-row="2" data-navbar-equal>
    <!-- Equal-width preset items -->
  </div>
  <div data-navbar-section data-navbar-row="3">
    <!-- Main tabs and actions -->
  </div>
</nav>
```

```ts
const navbar = mountLiquidGlassNavbar(document.querySelector('#catalog')!, {
  position: 'bottom',
  layout: 'rows',
  collapsible: {
    rows: [1, 2],
    initial: localStorage.getItem('catalog-collapsed') === 'true' ? 'collapsed' : 'open',
    hideLabel: 'Hide',
    showLabel: 'Show',
  },
  onCollapse(collapsed) {
    localStorage.setItem('catalog-collapsed', String(collapsed));
  },
  onResize({ height }) {
    document.body.style.setProperty('--navigation-space', `${height}px`);
  },
  overflow: { moreLabel: false, maxVisible: { 0: 4, 900: 12 } },
  lens: { style: 'tinted' },
  colors: { selected: 'color-mix(in srgb, var(--accent) 78%, var(--text))' },
  contrast: { halo: false, glow: false },
  scrollCompact: { threshold: 24 },
  animations: true,
});
```

- **Collapse state.** `collapsible: true` collapses the numbered rows above the last numbered row. Pass `rows` to choose which rows collapse. `initial` defaults to `'open'`. The default `toggle: 'auto'` adds an accessible chevron in the final row and keeps it out of More. Pass an interactive `HTMLElement` for a custom control with its own accessible name, or `false` to drive collapse yourself. Read `navbar.collapsed` for the target state and call `navbar.setCollapsed(value)` to change it. `onCollapse` fires when the target changes, including programmatic changes. Use `spring: { response, dampingRatio }` to tune the motion. Reduce Motion applies the target immediately. During a swipe, moving the lens onto the chevron previews the opposite state. Swipe away to restore the rows, or release on the chevron to commit the change. Releasing on a newly revealed tab selects it and keeps its row open. Collapse and scroll compact have independent state. Items already in More from a collapsed row remain available through More while that row is hidden. `onCollapse` fires when the target changes. `onCollapseEnd(collapsed)` fires once the committed state reaches its final layout, so it is the place for follow-up layout work such as `setOverflow()`. Layout changes made during a collapse are applied when it settles, and the remaining row stays in place. The chevron exposes only its current label, and its accessible name and `aria-expanded` change together. Pressing the chevron moves the lens onto it briefly. If the selected tab is in a collapsing row, the lens moves to the remaining-row item marked `data-navbar-collapsed-current`, or to the chevron if no item is marked, and returns when the row opens.
- **First layout.** The lens uses the selected item’s layout coordinates as numbered rows settle, including while items glide. Mount the bar normally and call `sync()` for application-driven markup changes.
- **Resize.** `onResize({ width, height })` reports the navbar’s border-box size on initial layout and when it changes, including during a collapse spring. For a bottom-fixed bar or a bar inside a bottom-anchored container, the bottom row stays vertically anchored.
- **Items and sections.** `navbar.setItemHidden(item, true)` removes an item from layout and More, while retaining its DOM node and selection. Pass `false` to show it. Neighbours spring to their new positions. Add `data-navbar-equal` to a section for equal widths within that section. Equal widths are capped at the space available, and labels that don’t fit are truncated with an ellipsis.
- **Overflow.** `moreLabel: false` hides the visual More label while preserving its accessible name. `maxVisible` accepts a number, a map of minimum viewport widths to limits, or a function of viewport width. With overflow enabled, `data-navbar-max-visible` caps a section: a number such as `"2"`, or breakpoints such as `"0:2 900:none"` (minimum viewport width, then a limit or `none`). Section caps and `maxVisible` count only movable items. Items marked `data-navbar-overflow="never"`, More, and the automatic collapse toggle never count. Swipe the lens onto More to preview its menu. Swipe away to close the preview, or release on More to leave it open. A tap, click, or keyboard activation also moves the lens onto More while its menu is open. When the menu closes, the lens returns to the selected tab, or moves to the item chosen from the menu. In a collapsible bar the limit is planned for the expanded rows, so collapsing a row never hands its slots to the remaining rows.
- **Per-row overflow.** In `layout: 'rows'`, `overflow: { perRow: true }` gives each numbered row its own More and its own limit. Use `rowLimits` to override `maxVisible` per row, for example `rowLimits: { 1: 4, 3: { 0: 0, 900: 4 } }`. Call `navbar.openOverflow({ row })` to open a specific row’s menu. Opening one row’s menu closes the others. This lets a filter strip be a collapsible row of the same bar, so it collapses with the bar and is included in `onResize`.
- **Lens appearance.** Use `lens: { style: 'glass' | 'tinted' | 'outline', accent }` at mount or call `navbar.setLens(options)` to change it live. By default the lens uses a softened version of the selected icon color, with a translucent fill and a clearer rim. A lens accent overrides that color independently. Pass a CSS color expression, or set `--lg-nav-lens-accent` in your stylesheet. Use `background` or `radius` to customize the fill or shape. Set `blur` in pixels for the drag backdrop, and use `pressScale` and `dragScale` for zoom. Each scale accepts a number or an `[x, y]` pair. Reduce Motion disables lens zoom, and Reduce Transparency disables lens backdrop blur. `setLens()` restores the stylesheet defaults.
- **Colors and contrast.** `setColors()` accepts CSS color expressions in the navbar’s style scope, including `var()` and `color-mix()`. Resting colors follow the cascade automatically. If the theme changes during a gesture or lens glide, call `refreshColors()` to rebuild the active color overlays. `contrast: { halo: false, glow: false }` disables the icon and label effects independently. Both default to enabled. Use `refractionSources: false` for native blur in Safari when a page has a lot of moving content.
- **Content updates.** Call `navbar.update(replacementNav, { key, animate })` with a detached or parsed nav containing the new items and sections. The mounted nav and its attributes stay in place. New items are moved from detached replacement markup, preserving their listeners. Use a stable `data-navbar-key`, an ID, or a custom `key(element)` function to retain nodes when their link or label changes. Numbered sections fall back to their row number, links to their literal `href`, and unkeyed nodes to matching markup. Supply unique keys for repeated destinations or multiple sections in the same row. Use `aria-current="page"` in the replacement to choose the next tab. The lens glides to it, new items rise in, and removed items fade out. Pass `animate: false` for an immediate update. Application-level selection callbacks still fire only on activation. The update options also accept `layout`, `maxRows`, and `collapsible`, so a page that needs an extra row or different collapsible rows can glide to it without remounting. Visibility set with `setItemHidden()` carries over to the matching keyed item unless the replacement overrides it: `hidden` hides the item and `data-navbar-hidden="false"` shows it.
- **Current item.** When more than one item has `aria-current="page"`, mounting, `sync()`, and `update()` all choose the item in the highest-numbered row, then the first in markup order. Set `warnOnMultipleCurrent: true` in development builds to log a warning when this happens.
- **View Transitions.** Pass `viewTransitionName: 'site-navigation'` to give the bar a unique `view-transition-name`. The navbar injects styles that show only the live new snapshot, without fading or additive blending. Its own springs keep running while `document.startViewTransition()` cross-fades the rest of the page. The name and styles are removed in `destroy()`.

## React and Vue

Optional bindings mount the bar on a `<nav>` you render and destroy it on unmount. They add about 1 kB each, and React and Vue stay your own dependencies.

```tsx
import { useRef } from 'react';
import { useLiquidGlassNavbar } from '@soheab-com/liquid-glass-navbar/react';
import '@soheab-com/liquid-glass-navbar/navbar.css';

function Tabs({ onOpen }: { onOpen: (tab: string) => void }) {
  const ref = useRef<HTMLElement>(null);
  const navbar = useLiquidGlassNavbar(ref, {
    position: 'bottom',
    onSelect: (item) => onOpen(item.dataset.tab!),
  });
  return (
    <nav ref={ref} aria-label="Main">
      <button type="button" data-tab="home" aria-current="page"><span data-navbar-label>Home</span></button>
      <button type="button" data-tab="search"><span data-navbar-label>Search</span></button>
    </nav>
  );
}
```

```ts
// Vue: in <script setup>, with <nav ref="nav"> in the template.
import { ref } from 'vue';
import { useLiquidGlassNavbar } from '@soheab-com/liquid-glass-navbar/vue';

const nav = ref<HTMLElement>();
const navbar = useLiquidGlassNavbar(nav, () => ({ position: 'bottom', onSelect: (item) => open(item) }));
```

Options are read when the bar mounts. Callbacks always call the latest version, so they can use current props and state. To change anything else later, call methods on the returned instance (`navbar.setColors(…)`, `navbar.update(…)`); it is `null` (React) or `undefined` (Vue) until the bar has mounted. Let the navbar own the selection: re-rendering the `<nav>`'s children from React or Vue state would fight it, so use `navbar.select()` or `navbar.update()` to change them.

## Keyboard, right-to-left and accessibility settings

- **Keyboard.** Tab reaches every item; Enter or Space activates it. The arrow keys move focus between the bar's items, More and the collapse chevron in screen order, Up and Down move between rows (or along a vertical bar), and Home and End jump to the first and last. Inside an open More menu, Up and Down move between its items and Escape closes it, returning focus to More. Arrow keys only move focus; they never select. Pass `keyboardNavigation: false` to turn them off. Focused items get a ring in the accent colour; set `--lg-nav-focus` to change it.
- **Reordering.** With `reorderable: true`, Alt+Arrow moves the focused item and a polite live region announces its new position ("Moved Home to position 2 of 5"). Pass `reorderAnnouncement(item, position, count)` to translate it.
- **Right-to-left.** In a `dir="rtl"` page or nav, tabs run right to left, a swipe selects the tab under the finger, the rubber band stretches past either visual end, More sits at the visual end, and arrow keys and Alt+Arrow follow the screen.
- **Reduce Motion** swaps springs for immediate changes. Springs also settle straight away when the page is hidden. **Reduce Transparency** turns off blur and refraction.
- **Increase Contrast** (`prefers-contrast: more`) makes the surface nearly opaque, draws a solid rim and a thicker lens ring, uses full-strength labels, and underlines the current tab's label.
- **Forced colours** (Windows High Contrast and similar) draws the bar with system colours: a `CanvasText` outline, a `Highlight` lens and `HighlightText` for the selected item.

## Browser support

| Browser | Minimum | Glass |
| --- | --- | --- |
| Chrome, Edge and other Chromium browsers | 111 | Bends the live backdrop |
| Safari (macOS and iOS) | 16.2 | Bends a copy of the elements marked `data-navbar-refract`; frosted otherwise |
| Firefox | 121 | Bends a copy of the elements marked `data-navbar-refract`; frosted otherwise |

Every engine gets the same layout, lens, gestures and overflow. Only how the glass bends what's behind it differs: Safari and Firefox can't apply SVG filters to a backdrop, so they bend a copy of the backdrop elements you mark. Without marked elements they show frosted glass with blur, saturation and a rim highlight. Reduce Transparency turns the bending off everywhere. The end-to-end tests run in Chromium, Firefox and WebKit.

## Code map

- [Local API index](docs/api.md) — integration, public types, and instance methods. The hosted docs also have a [plain-text index](https://soheab.com/navbar-builder/docs/llms.txt).
- [src/index.ts](src/index.ts) — package entry point. It only re-exports.
- [src/navbar.ts](src/navbar.ts) — the mounted navbar: selection, swipe gestures, layout, overflow, collapse, keyed updates, and `destroy()`.
- [src/types.ts](src/types.ts) — public option, method, and item types.
- [src/dom.ts](src/dom.ts), [src/limits.ts](src/limits.ts), [src/update.ts](src/update.ts), [src/view-transition.ts](src/view-transition.ts), and [src/lifecycle.ts](src/lifecycle.ts) — markup helpers, visible-item limits, keyed-update matching, View Transition support, and the cleanup helper `destroy()` runs.
- [src/keyboard.ts](src/keyboard.ts), [src/badges.ts](src/badges.ts), [src/backdrop-tint.ts](src/backdrop-tint.ts), and [src/context-actions.ts](src/context-actions.ts) — arrow keys and reordering, badges, transparency and adaptive contrast, and context actions.
- [src/react.ts](src/react.ts) and [src/vue.ts](src/vue.ts) — the optional framework bindings.
- [src/navbar.css](src/navbar.css) — layout, glass styling, custom properties, and accessibility media queries.
- [src/popover.ts](src/popover.ts) — shared anchored popovers, including the surface used by the More menu.
- [src/spring.ts](src/spring.ts) — spring motion and rubber-band math.
- [src/compact.ts](src/compact.ts), [src/contrast.ts](src/contrast.ts), and [src/refraction.ts](src/refraction.ts) — scroll direction, backdrop tone detection, and glass refraction.
- [examples/demo.ts](examples/demo.ts) and [examples/index.html](examples/index.html) — interactive demo with controls. [examples/features.ts](examples/features.ts) and [examples/features.html](examples/features.html) — focused scenarios for layout, overflow, and other options.

## Run the demo and tests

```sh
npm ci
npm run demo
```

`npm run demo` serves the [demo](examples/index.html), the [feature examples](examples/features.html), and the [multi-row catalog](examples/catalog.html) at `http://127.0.0.1:4173/examples/`.

```sh
npm run check      # strict TypeScript
npm test           # unit tests (Vitest)
npm run test:e2e   # end-to-end tests in Chromium, Firefox and WebKit (Playwright)
```

Run `npx playwright install` once to download the browsers.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

## License

[Mozilla Public License 2.0](LICENSE). You can use the navbar in any project, open or closed. If you change its own files and ship them, you share those changes under the same license; your app's code stays yours.

## Disclaimer

This project isn't made by, affiliated with or endorsed by Apple. Apple and iOS are trademarks of Apple Inc. Liquid Glass is Apple's name for its design style; this is an independent take on the look.
