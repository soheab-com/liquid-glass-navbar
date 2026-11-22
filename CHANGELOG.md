# Changelog

## 0.5.5

- Draw icons and labels once. The selected color now applies to the real tab, which prevents doubled glyphs in compact and expanded layouts.

## 0.5.4

- Start a swipe from action items as well as tabs. Add `data-navbar-no-swipe` to an item or section to keep it out of gestures.

## 0.5.3

- Use the platform UI font consistently for buttons, links, and the selected tab. Customize it with `--lg-nav-font`.

## 0.5.2

- Center edge-pinned navbars across the full group of pills, including when equal-width tabs grow the bar.

## 0.5.1

- Added contrast outlines to navbar labels and icons, including the selected tab, for readability over changing backdrops.

## 0.5.0

- Removed the copied backdrop and its `refractionSource` option. Safari now uses live blur and tint without a cached copy of the content. Chromium continues to bend the live backdrop.

## 0.4.0

- The glass rim refracts the live backdrop in Chromium. An optional `refractionSource` provides a scroll-synced fallback for Safari.
- The transparency setting controls both tint and blur. At 100%, only the rim, shadows, and refraction remain.
- Color overrides now preserve and restore the original inline theme values.

## 0.3.0

- Tabs can be links now. Put `<a href>` elements in the bar instead of buttons and every tab is its own page: tapping one, or ending a swipe on it, follows the link. Callbacks get the link (`NavbarItem` is a button or a link).
- Items your own CSS hides (`display: none`, for example ones moved into a "More" menu) are skipped, the same as items with `hidden`.
- Fixed: the highlight layer could make the bar report a wider scroll width than it has, which confused pages that measure the bar to decide what fits.
- Fixed: on link tabs the browser's own link dragging cancelled a swipe as soon as it started.

## 0.2.0

- New `equalWidth` option: every tab gets the width of the longest one, so the lens is the same size everywhere. If the bar is too narrow for that, `equalWidthOverflow` picks what happens: go back to natural widths (the default), cut labels off with "…", or let the bar grow. `setEqualWidth()` changes it later.
- New `colors` option and `setColors()`: pick the colour of selected and unselected tabs, and colour icons and labels separately if you like.
- Dragging feels more like iOS. The lens follows your finger and changes size smoothly between tabs, and it swells into a clear bubble while you hold it. Only the part of a tab under the lens lights up, so halfway between two tabs you get half of each.
- Pulling the lens past the first or last tab now stretches like a rubber band instead of stopping dead.
- Let go mid-swipe and the lens keeps the speed of your finger as it settles.
- Heads up if you style tabs yourself: the current tab's colour now comes from the highlight under the lens (`--lg-nav-accent`), and every tab underneath uses `--lg-nav-muted`. CSS that coloured `[aria-current]` buttons directly won't show anymore; use `colors` or those two variables instead.

## 0.1.1

- Fixed: the navbar's styles hit every button inside it, so a menu or popup placed in the bar looked like a tab. Only the bar's own items are styled now.

## 0.1.0

First release.

- A glass tab bar you can drop around your own buttons, with no framework needed.
- Put it on any edge, split it into sections, and show or hide icons and labels per item.
- Set your own background and transparency.
- Tap or swipe to pick a tab; actions like Search sit next to the tabs without becoming one. A swipe can also end on an action.
- `onSelect`, `onAction` and `onReorder` tell your app what happened. With `autoSelect: false` your router decides which tab is current; call `sync()` after you change it.
- Reorder tabs by dragging or with Alt+Arrow keys.
- Colours come from CSS variables (`--lg-nav-accent`, `--lg-nav-muted`, `--lg-nav-surface` and friends), with light and dark looks in the examples.
- Respects Reduce Motion and Reduce Transparency.
