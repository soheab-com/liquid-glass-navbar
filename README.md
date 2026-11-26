# Liquid Glass Navbar

A glass tab bar for the web, in the style of iOS. You write the buttons, it adds the glass, the sliding highlight and the swipe gesture. It's plain TypeScript and CSS, so it works with any framework or none.

**[Read the docs](https://soheab.com/navbar-builder/docs/)**: every option and method, with live examples you can change and the code that runs them.
**[Try the builder](https://soheab.com/navbar-builder/)**: design a bar, see it on a phone, tablet or desktop, and copy the code.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/mockups/showcase-dark.gif">
  <img src="docs/mockups/showcase.gif" alt="Tapping between tabs, then dragging the highlight across the bar: it swells into a bubble, highlights the nearest tab, stretches past the first tab and springs back">
</picture>

## Install

It isn't on npm. Install it from GitHub:

```sh
npm install 'git+https://github.com/soheab-com/liquid-glass-navbar.git#v0.12.0'
```

You need a bundler (Vite, esbuild, webpack and so on), because the package ships TypeScript and CSS.

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

`delay` defaults to zero in milliseconds. Set `keep: true` to leave the page at the previewed position, or `swipe: false` to preview only with a hovering pointer. Add `data-navbar-no-hover` to opt an item or section out. For button tabs or custom destinations, supply `onPreview(item)` and optionally `onPreviewEnd()` to manage your own preview. The built-in behavior only scrolls to IDs in the current document. Give two bars the same `group` value to preview and select across them in one swipe. Try the [hover navigation example](http://127.0.0.1:4173/tests/hover-navigation.html) with the demo server running.

## Multi-row navigation

Open the [catalog demo](examples/catalog.html) after starting the demo server. The bar has a filter row, an equal-width preset row and a main row. Try the chevron, the theme and accent controls, switching catalogs, and resizing across 900 px.

Use `layout: 'rows'` and put `data-navbar-row="1"`, `data-navbar-row="2"`, and so on on sections or on direct items. Sections are direct children marked with `data-navbar-section`.

```html
<nav id="catalog" aria-label="Catalog">
  <div data-navbar-section data-navbar-row="1" data-navbar-max-visible="2">
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

- **Collapse state.** `collapsible: true` collapses the numbered rows above the last numbered row. Pass `rows` to choose which rows collapse. `initial` defaults to `'open'`. The default `toggle: 'auto'` adds an accessible chevron in the final row and keeps it out of More. Pass an interactive `HTMLElement` for a custom control with its own accessible name, or `false` to drive collapse yourself. Read `navbar.collapsed` for the target state and call `navbar.setCollapsed(value)` to change it. `onCollapse` fires when the target changes, including programmatic changes. Use `spring: { response, dampingRatio }` to tune the motion. Reduce Motion applies the target immediately. During a swipe, moving the lens onto the chevron previews the opposite state. Swipe away to restore the rows, or release on the chevron to commit the change. Releasing on a newly revealed tab selects it and keeps its row open. Collapse and scroll compact have independent state. Items already in More from a collapsed row remain available through More while that row is hidden.
- **First layout.** The lens uses the selected item’s layout coordinates as numbered rows settle, including while items glide. Mount the bar normally and call `sync()` for application-driven markup changes.
- **Resize.** `onResize({ width, height })` reports the navbar’s border-box size on initial layout and when it changes, including during a collapse spring. For a bottom-fixed bar or a bar inside a bottom-anchored container, the bottom row stays vertically anchored.
- **Items and sections.** `navbar.setItemHidden(item, true)` removes an item from layout and More, while retaining its DOM node and selection. Pass `false` to show it. Neighbours spring to their new positions. Add `data-navbar-equal` to a section for equal widths within that section.
- **Overflow.** `moreLabel: false` hides the visual More label while preserving its accessible name. `maxVisible` accepts a number, a map of minimum viewport widths to limits, or a function of viewport width. With overflow enabled, `data-navbar-max-visible="2"` caps a section at two items. Pinned items count toward the cap and stay visible even if they exceed it. Swipe the lens onto More to preview its menu. Swipe away to close the preview, or release on More to leave it open. More and the automatic collapse toggle are excluded from the visible-item limit. Collapsible bars give persistent rows first choice of the shared limit, so opening a row above the main tabs doesn’t bump those tabs into More.
- **Lens appearance.** Use `lens: { style: 'glass' | 'tinted' | 'outline', accent }` at mount or call `navbar.setLens(options)` to change it live. By default the lens uses a softened version of the selected icon color, with a translucent fill and a clearer rim. A lens accent overrides that color independently. Pass a CSS color expression, or set `--lg-nav-lens-accent` in your stylesheet. Use `background` or `radius` to customize the fill or shape. Set `blur` in pixels for the drag backdrop, and use `pressScale` and `dragScale` for zoom. Each scale accepts a number or an `[x, y]` pair. Reduce Motion disables lens zoom, and Reduce Transparency disables lens backdrop blur. `setLens()` restores the stylesheet defaults.
- **Colors and contrast.** `setColors()` accepts CSS color expressions in the navbar’s style scope, including `var()` and `color-mix()`. Resting colors follow the cascade automatically. If the theme changes during a gesture or lens glide, call `refreshColors()` to rebuild the active color overlays. `contrast: { halo: false, glow: false }` disables the icon and label effects independently. Both default to enabled. Use `refractionSources: false` for native blur in Safari when a page has a lot of moving content.
- **Content updates.** Call `navbar.update(replacementNav, { key, animate })` with a detached or parsed nav containing the new items and sections. The mounted nav and its attributes stay in place. New items are moved from detached replacement markup, preserving their listeners. Use a stable `data-navbar-key`, an ID, or a custom `key(element)` function to retain nodes when their link or label changes. Numbered sections fall back to their row number, links to their literal `href`, and unkeyed nodes to matching markup. Supply unique keys for repeated destinations or multiple sections in the same row. Use `aria-current="page"` in the replacement to choose the next tab. The lens glides to it, new items rise in, and removed items fade out. Pass `animate: false` for an immediate update. Application-level selection callbacks still fire only on activation.

## Code map

- [Local API index](docs/api.md) — integration, public types, and instance methods. The hosted docs also have a [plain-text index](https://soheab.com/navbar-builder/docs/llms.txt).
- [src/index.ts](src/index.ts) — package entry point, public types, selection, swipe gestures, layout, overflow, and lifecycle.
- [src/navbar.css](src/navbar.css) — layout, glass styling, custom properties, and accessibility media queries.
- [src/popover.ts](src/popover.ts) — shared anchored popovers, including the surface used by the More menu.
- [src/spring.ts](src/spring.ts) — spring motion and rubber-band math.
- [src/compact.ts](src/compact.ts), [src/contrast.ts](src/contrast.ts), and [src/refraction.ts](src/refraction.ts) — scroll direction, backdrop tone detection, and glass refraction.
- [examples/demo.ts](examples/demo.ts) and [examples/index.html](examples/index.html) — interactive demo with controls. [examples/features.ts](examples/features.ts) and [examples/features.html](examples/features.html) — focused scenarios for layout, overflow, and other options.

## Run the demo

```sh
npm ci
npm run check
npm run demo
```

Open [the demo](http://127.0.0.1:4173/examples/) or [the multi-row catalog](http://127.0.0.1:4173/examples/catalog.html). The [first-layout lens regression](http://127.0.0.1:4173/tests/rows-lens.html) displays its result in the browser. The [manual More regression](http://127.0.0.1:4173/tests/more-tap.html) checks selection after you open More and tap Settings.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

## Disclaimer

This project isn't made by, affiliated with or endorsed by Apple. Apple and iOS are trademarks of Apple Inc. Liquid Glass is Apple's name for its design style; this is an independent take on the look.
