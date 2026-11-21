# Changelog

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
