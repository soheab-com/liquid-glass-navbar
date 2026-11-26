# Liquid Glass Navbar API index

Start with the [README quick start](../README.md#quick-start) for installation, example markup, and a mount call. Install from npm (or a Git tag). The package ships compiled ESM with declarations, so the JavaScript needs no bundler; load `navbar.css` yourself. When integrating a pinned version, read the types at that tag.

```ts
import { mountLiquidGlassNavbar } from '@soheab-com/liquid-glass-navbar';
import '@soheab-com/liquid-glass-navbar/navbar.css';
```

Supply a nav element containing buttons or `<a href="…">` items. Mark the starting item with `aria-current="page"` and use `data-navbar-icon` and `data-navbar-label` to identify the icon and label. Mount after the nav exists. For button tabs, use `onSelect` to display the corresponding content. Link tabs navigate to their destinations.

| Task | Start here |
| --- | --- |
| Configure a navbar | `LiquidGlassNavbarOptions` in [src/types.ts](../src/types.ts) and the [options reference](https://soheab.com/navbar-builder/docs/#options) |
| Update an existing instance | `LiquidGlassNavbar` in [src/types.ts](../src/types.ts) and the [methods reference](https://soheab.com/navbar-builder/docs/#methods) |
| Set selection programmatically | `navbar.select(item)` updates selection without firing `onSelect` |
| Collapse numbered rows | `collapsible`, `setCollapsed(value)`, `collapsed`, `onCollapse`, `onCollapseEnd`, `onResize`, `data-navbar-collapsed-current` |
| Hide or reconcile content | `setItemHidden(item, hidden)`, `update(replacementNav, options)` (including `layout`, `maxRows`, `collapsible`), `data-navbar-key`, `warnOnMultipleCurrent` |
| Give each row its own More | `overflow.perRow`, `overflow.rowLimits`, `openOverflow({ row })` |
| Keep the bar live in a View Transition | `viewTransitionName` |
| Size and limit a section | `data-navbar-equal`, `data-navbar-max-visible`, `NavbarVisibleLimit` |
| Preview sections on hover or swipe | `hoverNavigation`, `NavbarHoverOptions`, and `data-navbar-no-hover` |
| Style the lens | `lens`, `setLens(options)`, `NavbarLensOptions`, and `NavbarLensStyle` |
| Refresh inherited colors | `setColors(colors)`, `refreshColors()`, `ContrastOptions.halo` and `ContrastOptions.glow` |
| Keyboard | `keyboardNavigation`, `reorderable`, `reorderAnnouncement`, and `--lg-nav-focus` |
| Use from React or Vue | `useLiquidGlassNavbar` from `@soheab-com/liquid-glass-navbar/react` or `/vue` |
| Unmount | Call `navbar.destroy()` when disposing of the instance |
| Configure markup or styling | [HTML attributes](https://soheab.com/navbar-builder/docs/#attributes), [CSS variables](https://soheab.com/navbar-builder/docs/#css), and [src/navbar.css](../src/navbar.css) |
| See full examples | [Configurable demo](../examples/demo.ts) and [feature examples](../examples/features.ts) |

See the [multi-row integration guide](../README.md#multi-row-navigation) for typed configuration examples and the catalog demo.
