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
npm install 'git+https://github.com/soheab-com/liquid-glass-navbar.git#v0.10.0'
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

Open `http://127.0.0.1:4173/examples/` and play with the controls. The code is in [examples/demo.ts](examples/demo.ts).

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

## Disclaimer

This project isn't made by, affiliated with or endorsed by Apple. Apple and iOS are trademarks of Apple Inc. Liquid Glass is Apple's name for its design style; this is an independent take on the look.
