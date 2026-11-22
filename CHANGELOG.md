# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/soheab-com/liquid-glass-navbar/compare/v0.8.0...HEAD
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
