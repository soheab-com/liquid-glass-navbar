# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.2] - 2026-11-28

### Fixed

- After `update()`, the collapse toggle and More stay after the items of their section. Rebuilt items were appended behind them, so switching pages could put Hide in front of the section's own items.

## [1.0.1] - 2026-11-26

### Fixed

- Dragging from one bar onto another bar of the same `hoverNavigation.group` now shows where you are: the bar under the pointer highlights the item and moves its lens there, and the bar the drag started in steps its lens back until the pointer returns.
- Installing from a Git tag builds `dist/`, so `npm install 'git+https://github.com/soheab-com/liquid-glass-navbar.git#v1.0.1'` works again.

## [1.0.0] - 2026-11-26

The first stable release, and the first published to npm.

### Added

- Published to npm as `@soheab-com/liquid-glass-navbar`, with compiled ESM, TypeScript declarations and `navbar.css` in `dist/`. The JavaScript no longer needs a bundler, and importing it touches no browser globals, so it is safe during server rendering.
- `@soheab-com/liquid-glass-navbar/react` and `/vue` entry points with a `useLiquidGlassNavbar` hook and composable. React and Vue are optional peer dependencies; the core has no runtime dependencies.
- Arrow keys move focus between the bar's items, More and the collapse chevron in screen order, Up and Down move between rows, and Home and End jump to the ends. Inside an open More menu, Up and Down move between its items. Turn this off with `keyboardNavigation: false`.
- Alt+Arrow reordering is announced to screen readers; `reorderAnnouncement` translates the message.
- A focus ring on bar items, coloured by `--lg-nav-focus`.
- Increase Contrast (`prefers-contrast: more`) gives the bar a nearly opaque surface, a solid rim, a thicker lens ring and an underlined current tab.
- Forced colours modes draw the bar, lens and selected item with system colours.
- Firefox gets refraction: like Safari, it bends a copy of the backdrop elements marked `data-navbar-refract`.
- `overflow.perRow` and `overflow.rowLimits` give each numbered row its own More and limit, and `openOverflow({ row })` opens a specific row's menu.
- `data-navbar-max-visible` accepts breakpoints such as `"0:2 900:none"`.
- `update()` accepts `layout`, `maxRows`, and `collapsible`, so the bar can change shape without remounting.
- `onCollapseEnd` fires when a committed collapse reaches its final layout.
- `data-navbar-collapsed-current` marks where the lens rests while the selected tab's row is collapsed.
- `viewTransitionName` keeps the bar live during same-document View Transitions.
- `warnOnMultipleCurrent` logs a warning when more than one item is current.

### Changed

- Licensed under the Mozilla Public License 2.0.
- Engines are chosen by feature detection, apart from one isolated check for whether `backdrop-filter` draws SVG filters, which only Chromium does and no engine reports.
- In copy mode (Safari and Firefox), a bar with no marked backdrop keeps its frosted blur instead of turning sharp and flat.
- Section caps no longer count `data-navbar-overflow="never"` items, matching `maxVisible`.

### Fixed

- Alt+Arrow reordering follows the screen in right-to-left bars.
- `destroy()` no longer leaves empty `class` and `style` attributes on the nav and its sections.
- Collapsing a row no longer gives its overflow budget to the remaining rows.
- Re-laying out during a collapse no longer makes items in the remaining row disappear.
- Equal-width sections fit the available width and truncate long labels.
- Mounting and `update()` choose the same item when more than one is current.
- `update()` keeps visibility set with `setItemHidden()` unless the replacement sets `hidden` or `data-navbar-hidden="false"`.
- Tapping or pressing More or the collapse chevron moves the lens to it.
- Collapsing the row that holds the selected tab keeps the lens visible in the remaining row.
- The collapse toggle exposes only its current label.

### Performance

- Rim maps are computed from one quadrant (about six times faster for large bars) and cached by size, corner radius and clearness.
- Window resizes lay the bar out at most once per frame. Refraction work stops and moving springs settle while the page is hidden.

## [0.12.0] - 2026-11-26

### Added

- Opt-in `hoverNavigation` previews same-page links on mouse hover or a touch swipe, with configurable delay, optional keep behavior, and callbacks for application-driven destinations.
- Group related navbar instances with `hoverNavigation.group` to preview or select across them in a single swipe.
- Mark items or sections with `data-navbar-no-hover` to skip previews.

## [0.11.2] - 2026-11-26

### Fixed

- Tapping or clicking a manually opened More menu item now selects it before the menu closes, including with Reduce Motion.
- The popover starts its opening spring from the current visual state and avoids redundant navbar layout work for menu-style More.

### Added

- Pass `refractionSources: false` to use native blur instead of copied refraction in Safari on busy pages.

## [0.11.1] - 2026-11-26

### Fixed

- Keep the exported TypeScript source compatible with `exactOptionalPropertyTypes` during swipe previews.

## [0.11.0] - 2026-11-26

### Added

- Collapsible numbered rows with a retargetable chevron spring, independent scroll compact state, and a size callback.
- Whole-item visibility, keyed navbar updates, section-scoped equal widths and overflow caps, viewport-based overflow limits, and icon-only More.
- CSS color refresh during lens motion, with independent icon halo and label glow controls.
- Configurable lens style, accent, background, radius, drag blur, and press and drag zoom. The lens can derive its accent from the selected icon.
- Swipe the lens onto the collapse chevron or More to preview the change, then release to commit it.

### Fixed

- The multi-row lens targets stable layout coordinates during first layout and reflow.
- Collapsing keeps existing More entries reachable. Opening upper rows prioritizes the persistent tabs when space is tight.
- Page scrolling stays available beside animated rows, and the lens overlay stays aligned with the collapse chevron.

## [0.10.0] - 2026-11-23

### Added

- Safari bends the backdrop too. Safari can't apply SVG filters through `backdrop-filter`, so there the glass bends a copy of the elements you mark: `data-navbar-refract` for a fixed backdrop, `data-navbar-refract="scroll"` for content that scrolls under the bar, or your own list through the new `refractionSources` option. The copy follows scrolling from the scroll event. `refreshRefraction()` copies the marked content again after it changes.
- While text, media or an image sits behind a piece of glass, its icons and labels get a soft halo so they stay readable. Set the colours with `--lg-nav-halo` and `--lg-nav-on-dark-halo`.
- Over images, a piece of glass takes the image's colour for its rim, top highlight and shadow, and eases back when the image has passed.

### Changed

- The bend follows Liquid Glass on iOS: tinted glass folds the backdrop over in a deep band along its rounded edge, and fully clear glass squeezes it into a wide bevel. Bent glass isn't blurred, and fully clear glass doesn't soften or dim what's behind it.

## [0.9.0] - 2026-11-23

### Added

- `closeOnScroll` for popovers and `overflow`: whether scrolling the page closes them. Off by default.
- `animations` option and `setAnimations()`: opt-in motion, all springs that can be interrupted and none of it with Reduce Motion. `reflow` glides items to their new place when they move between the bar and More, change rows or the bar resizes; `popovers` gives the spring More and anchored popovers open on a little overshoot; `tap` squishes a pressed tab and bounces a newly selected icon; `badges` pops badges in and out and pulses them when they change. Pass `true` for all of them.
- `createSpring()`, `rubberBand()` and `rubberBanded()` are exported, so apps can move in step with the navbar.
- `spring` option for `createAnchoredPopover()`: a little overshoot on its open and close.
- `overflow.trigger: 'dots'` shows the More button as a vertical ⋮ icon without a label; it keeps "More" (or your `label`) as its accessible name.
- Gradual highlight: while the lens moves, only the part of a tab it covers takes the selected colour, so halfway between two tabs you see half of each. Each label and icon gets a copy in the selected colour, clipped to the lens, so it repaints reliably on iOS and isn't recoloured by dark-mode extensions. Items that appear mid-swipe, like an expanded More row, are painted too. It clears when the lens settles.

### Changed

- Popovers and More stay open when a press outside them turns into a page scroll; a tap outside still closes them. Set `closeOnScroll: true` for the old behaviour, closing as the page scrolls.
- Popovers open and close on a spring instead of a fixed fade, so one closed while still opening turns around from where it is.
- Compacting no longer moves items in or out of More: it only hides the labels, and the bar keeps the same items as with labels.

### Fixed

- The lens is drawn over the glass of an expanded More row instead of behind it.
- With More open mid-swipe, a finger off to the side of its items points at the bar again, so the lens comes back down without returning to the bar's height.
- Mid-swipe, magnify follows the finger along the row the lens is in, however far off the bar the finger is held.
- A swipe keeps its highlight and its place when the page scrolls under it, as Safari does when the finger moves away from the bar. Scroll compact waits until the finger lifts.
- More opens when a swipe slides level with it, even with the finger above or below the bar, and closes again as soon as the finger is level with another tab (unless it's heading into the open row), and when the swipe ends outside it.
- Glass circles behind the icons of an expanded More row line up with their icons; they were measured while the row was still scaling in.

## [0.8.0] - 2026-11-22

### Added

- `showContextActions()` options: `placement` puts the actions before or after the navigation, or in place of one section or item, instead of replacing it all. `back` adds a Back item that returns to the previous items, with `onBack`. `className` and `look` (colors, background, transparency) give the actions' pills their own style.
- Items placed straight in a bar that also has sections get a glass pill of their own.

### Changed

- The README is shorter and points to the new [docs](https://soheab.com/navbar-builder/docs/) for the full reference.
- Scroll compact animates: labels fold away and grow back on a spring, and the tabs and lens resize smoothly. Changing direction mid-way turns it around. Reduce Motion switches at once.

### Fixed

- Tabs no longer ask the browser for a compositing layer each (`will-change`), which a page with many bars could run out of on iOS.
- The expanding More row no longer runs past the edges of its boundary; icons wrap onto another row inside it.

## [0.7.0] - 2026-11-22

### Added

- `magnify` option and `setMagnify()`: a Dock-style effect where icons near the mouse pointer or a sliding finger grow and rise away from the bar's edge, then settle as it moves on. Each icon is driven by its own spring, so passing back and forth never restarts the motion. It is off under Reduce Motion and doesn't move the layout, the lens or hit areas.

### Fixed

- The lens and the glass behind each row are now placed to the subpixel, so they are exactly centered on their tabs. Before, they could sit up to 1px off because element offsets round to whole pixels.

## [0.6.0] - 2026-11-22

All new behavior is opt-in; the single-row bar is unchanged by default.

### Added

- `layout: 'wrap' | 'rows'` lays the bar out in rows inside one glass surface, or as one centered pill per row. Assign items or sections to rows with `data-navbar-row`.
- `overflow` moves items that don't fit into a More menu or an expanding row of glass icons (one shared pill or individual icons), with optional `maxRows` and `maxVisible` limits. Fitting uses the measured icons, labels, padding and gaps, and reflows on resize. The current tab stays selected behind More. Keep an item in the bar with `data-navbar-overflow="never"`.
- Anchored popovers with a pointer that stays aligned with the trigger when the popover shifts or flips: `createPopover()` for bar items and `createAnchoredPopover()` for anything else. They close on Escape, an outside press, another tab or a selection, and return focus when appropriate.
- `scrollCompact` compacts the bar while scrolling down and restores labels when scrolling up, ignoring small reversals and overscroll.
- `setBadge()` shows count, dot and status badges with accessible labels.
- `showContextActions()` and `hideContextActions()` temporarily swap the navigation for contextual actions, then restore the previously selected tab.
- `contrast` and `setBackdrop()` switch to a readable foreground over dark content, also with clear glass, and can add tint over busy content.
- `select(item)` marks a tab as current without calling `onSelect`, for restoring a saved tab.

### Changed

- Swipes move in two dimensions when the bar has rows or a More button. Sliding onto More opens it without ending the gesture.
- Refraction follows the rounded corners of multi-row surfaces.

## [0.5.5] - 2026-11-22

### Fixed

- Icons and labels are drawn once. The selected color now applies to the real tab, which prevents doubled glyphs in compact and expanded layouts.

## [0.5.4] - 2026-11-22

### Added

- `data-navbar-no-swipe` on an item or section keeps it out of gestures.

### Changed

- Swipes can start from action items as well as tabs.

## [0.5.3] - 2026-11-22

### Changed

- Buttons, links and the selected tab use the platform UI font consistently. Customize it with `--lg-nav-font`.

## [0.5.2] - 2026-11-22

### Fixed

- Edge-pinned navbars are centered across the full group of pills, including when equal-width tabs grow the bar.

## [0.5.1] - 2026-11-22

### Added

- Contrast outlines on labels and icons, including the selected tab, for readability over changing backdrops.

## [0.5.0] - 2026-11-22

### Changed

- Safari uses live blur and tint without a cached copy of the content. Chromium continues to bend the live backdrop.

### Removed

- The copied backdrop and its `refractionSource` option.

## [0.4.0] - 2026-11-22

### Added

- The glass rim refracts the live backdrop in Chromium. An optional `refractionSource` provides a scroll-synced fallback for Safari.

### Changed

- The transparency setting controls both tint and blur. At 100%, only the rim, shadows and refraction remain.

### Fixed

- Color overrides preserve and restore the original inline theme values.

## [0.3.0] - 2026-11-21

### Added

- Tabs can be links. Put `<a href>` elements in the bar instead of buttons and every tab is its own page: tapping one, or ending a swipe on it, follows the link. Callbacks get the link (`NavbarItem` is a button or a link).

### Changed

- Items your own CSS hides (`display: none`, for example ones moved into a "More" menu) are skipped, the same as items with `hidden`.

### Fixed

- The highlight layer could make the bar report a wider scroll width than it has, which confused pages that measure the bar to decide what fits.
- On link tabs the browser's own link dragging cancelled a swipe as soon as it started.

## [0.2.0] - 2026-11-21

### Added

- `equalWidth` option: every tab gets the width of the longest one, so the lens is the same size everywhere. If the bar is too narrow for that, `equalWidthOverflow` picks what happens: go back to natural widths (the default), cut labels off with "…", or let the bar grow. `setEqualWidth()` changes it later.
- `colors` option and `setColors()`: pick the color of selected and unselected tabs, and color icons and labels separately.
- Pulling the lens past the first or last tab stretches like a rubber band instead of stopping dead.
- Let go mid-swipe and the lens keeps the speed of your finger as it settles.

### Changed

- Dragging feels more like iOS. The lens follows your finger and changes size smoothly between tabs, and it swells into a clear bubble while you hold it. Only the part of a tab under the lens lights up, so halfway between two tabs you get half of each.
- The current tab's color comes from the highlight under the lens (`--lg-nav-accent`), and every tab underneath uses `--lg-nav-muted`. CSS that colored `[aria-current]` buttons directly no longer shows; use `colors` or those two variables instead.

## [0.1.1] - 2026-11-21

### Fixed

- The navbar's styles hit every button inside it, so a menu or popup placed in the bar looked like a tab. Only the bar's own items are styled now.

## [0.1.0] - 2026-11-20

### Added

- A glass tab bar you can drop around your own buttons, with no framework needed.
- Put it on any edge, split it into sections, and show or hide icons and labels per item.
- Set your own background and transparency.
- Tap or swipe to pick a tab; actions like Search sit next to the tabs without becoming one. A swipe can also end on an action.
- `onSelect`, `onAction` and `onReorder` tell your app what happened. With `autoSelect: false` your router decides which tab is current; call `sync()` after you change it.
- Reorder tabs by dragging or with Alt+Arrow keys.
- Colors come from CSS variables (`--lg-nav-accent`, `--lg-nav-muted`, `--lg-nav-surface` and friends), with light and dark looks in the examples.
- Respects Reduce Motion and Reduce Transparency.

[Unreleased]: https://github.com/soheab-com/liquid-glass-navbar/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/soheab-com/liquid-glass-navbar/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/soheab-com/liquid-glass-navbar/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/soheab-com/liquid-glass-navbar/compare/v0.12.0...v1.0.0
[0.12.0]: https://github.com/soheab-com/liquid-glass-navbar/compare/v0.11.2...v0.12.0
[0.11.2]: https://github.com/soheab-com/liquid-glass-navbar/compare/v0.11.1...v0.11.2
[0.11.1]: https://github.com/soheab-com/liquid-glass-navbar/compare/v0.11.0...v0.11.1
[0.11.0]: https://github.com/soheab-com/liquid-glass-navbar/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/soheab-com/liquid-glass-navbar/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/soheab-com/liquid-glass-navbar/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/soheab-com/liquid-glass-navbar/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/soheab-com/liquid-glass-navbar/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/soheab-com/liquid-glass-navbar/compare/v0.5.5...v0.6.0
[0.5.5]: https://github.com/soheab-com/liquid-glass-navbar/compare/v0.5.4...v0.5.5
[0.5.4]: https://github.com/soheab-com/liquid-glass-navbar/compare/v0.5.3...v0.5.4
[0.5.3]: https://github.com/soheab-com/liquid-glass-navbar/compare/v0.5.2...v0.5.3
[0.5.2]: https://github.com/soheab-com/liquid-glass-navbar/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/soheab-com/liquid-glass-navbar/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/soheab-com/liquid-glass-navbar/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/soheab-com/liquid-glass-navbar/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/soheab-com/liquid-glass-navbar/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/soheab-com/liquid-glass-navbar/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/soheab-com/liquid-glass-navbar/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/soheab-com/liquid-glass-navbar/releases/tag/v0.1.0
