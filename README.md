# Liquid Glass Navbar

A glass tab bar for the web, in the style of iOS. You write the buttons, it adds the glass, the sliding highlight and the swipe gesture. It's plain TypeScript and CSS, so it works with any framework or none.

[Try it in the builder](https://soheab.com/navbar-builder/). You can change every option there, see it on a phone, tablet or desktop, and copy the code.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/mockups/showcase-dark.gif">
  <img src="docs/mockups/showcase.gif" alt="Tapping between tabs, then dragging the highlight across the bar: it swells into a bubble, lights up only the part of each tab it covers, stretches past the first tab and springs back">
</picture>

## Install

It isn't on npm. Install it from GitHub:

```sh
npm install 'git+https://github.com/soheab-com/liquid-glass-navbar.git#v0.3.0'
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

That's it. Tapping or swiping to a tab moves `aria-current` to it and calls `onSelect`. Showing the right page is up to you.

If every tab is its own page, use links instead of buttons: `<a href="/schedule">`. Tapping a link, or ending a swipe on it, follows it like any other link.

## Sections and actions

To split the bar into separate pills, wrap groups of buttons in `data-navbar-section`. A button with `data-navbar-action` is something you do, like Search or opening a menu, so it never becomes the current tab. Tapping it, or ending a swipe on it, calls `onAction`.

```html
<nav id="tabs" aria-label="Main">
  <div data-navbar-section>
    <button type="button" aria-current="page"><span data-navbar-label>Home</span></button>
    <button type="button"><span data-navbar-label>Schedule</span></button>
  </div>
  <div data-navbar-section>
    <button type="button" data-navbar-action aria-label="Search">
      <svg data-navbar-icon viewBox="0 0 24 24" aria-hidden="true">...</svg>
    </button>
  </div>
</nav>
```

Give icon-only buttons an `aria-label`, so screen readers have something to read.

## Options

Pass these to `mountLiquidGlassNavbar`. All of them are optional.

| Option | What it does |
| --- | --- |
| `position` | `'top'`, `'bottom'`, `'left'` or `'right'` pins the bar to that edge of the screen. Leave it out to place the bar yourself. |
| `labels` | `false` hides every label and shows icons only. |
| `equalWidth` | `true` makes every tab as wide as the longest one, so the highlight is the same size on every tab. |
| `equalWidthOverflow` | What equal widths do when the bar is too narrow. `'natural'` (the default) goes back to normal widths until there's room. `'truncate'` keeps them equal and cuts long labels off with "…". `'grow'` keeps them equal and lets the bar get wider, so your layout has to make room. |
| `colors` | Tab colours, see [Colours](#colours). |
| `background` | Any CSS background, like `'#adc9ef'` or a gradient, to tint the glass. |
| `transparency` | How see-through that tint is, from `0` (solid) to `100` (clear). |
| `reorderable` | `true` lets people reorder tabs, see [Reordering](#reordering). |
| `autoSelect` | `false` stops the navbar from moving `aria-current` itself. Use this with a router: change `aria-current` yourself, then call `sync()`. |
| `enabled` | A function that returns `false` to switch the glass off, for example in a theme that shouldn't have it. |
| `onSelect(item)` | Called when someone picks a tab. `item` is the button or link. |
| `onAction(item)` | Called when someone picks an action. |
| `onReorder(order, section)` | Called after tabs are reordered, so you can save the order. |

## Changing things later

`mountLiquidGlassNavbar` returns an object you can use to change the bar after it's on the page.

| Method | What it does |
| --- | --- |
| `setPosition(edge)` | Moves the bar to another edge. Call it with nothing to let your own layout place it again. |
| `setLabels(visible)` | Shows or hides all labels. |
| `setEqualWidth(equal, overflow?)` | Turns equal widths on or off, and optionally changes what happens when they don't fit. |
| `setColors(colors?)` | Changes the tab colours. Call it with nothing to go back to the theme's colours. |
| `setBackground(value?)` | Changes the tint. Call it with nothing to go back to the theme's glass. |
| `setTransparency(percent?)` | Changes how see-through the tint is. |
| `setItemVisibility(button, { icon, label })` | Hides the icon or label of one tab. Hiding both hides the whole tab. You can also use the `data-navbar-hide-icon` and `data-navbar-hide-label` attributes. |
| `setReorderMode(on)` | Turns drag-to-reorder on or off. |
| `reorder(buttons)` | Puts the tabs of one section in a new order. Pass every button of that section once. |
| `sync()` | Tells the navbar something changed: the current tab, a hidden tab, or the theme. |
| `destroy()` | Removes everything the navbar added. Call it before you remove the `<nav>`. |

## Colours

Tabs have two states. Selected is whatever the highlight is over: the current tab, or the part of a tab you're dragging across. Unselected is everything else.

```ts
navbar.setColors({
  selected: '#e8590c',
  unselected: '#495057',
});
```

You can also colour icons and labels differently. These override `selected` and `unselected` for just that part:

```ts
navbar.setColors({
  selected: '#7048e8',
  selectedLabel: '#1c7ed6',
  unselectedIcon: '#868e96',
});
```

If you prefer CSS, set the same colours as variables on the nav. `--lg-nav-accent` is selected and `--lg-nav-muted` is unselected. The icon and label versions are `--lg-nav-icon-accent`, `--lg-nav-label-accent`, `--lg-nav-icon-color` and `--lg-nav-label-color`. The glass itself uses `--lg-nav-surface`, `--lg-nav-opaque`, `--lg-nav-rim`, `--lg-nav-highlight` and `--lg-nav-shadow`.

## Dragging

Press a tab and slide along the bar. The highlight follows your finger and swells into a clear bubble. Only the part of a tab under the bubble lights up, so halfway between two tabs you see half of each. Let go and it settles on the nearest tab, keeping the speed you let go at. Pull past the first or last tab and it stretches like a rubber band instead of stopping dead.

People who turn on Reduce Motion get the same result without the animation, and Reduce Transparency swaps the glass for a solid colour.

## Reordering

With `reorderable: true`, people can move a focused tab with Alt and the arrow keys. To let them drag tabs around with a mouse or finger too, call `setReorderMode(true)`, for example from an "Edit" button. Tabs only move within their own section. Use `onReorder` to save the new order.

## Pictures

The [mockups](docs/mockups/README.md) show every option: the four [positions](docs/mockups/position-top.png), [icons and labels](docs/mockups/item-visibility.png), [tints](docs/mockups/background-gradient.png), [dragging](docs/mockups/navbar-drag.png), [reordering](docs/mockups/reorder.png), and the [light](docs/mockups/navbar-light.png) and [dark](docs/mockups/navbar-dark.png) looks.

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
