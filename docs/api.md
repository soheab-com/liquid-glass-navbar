# Liquid Glass Navbar API index

Start with the [README quick start](../README.md#quick-start) for installation, example markup, and a mount call. Install from a Git tag and bundle the package's TypeScript and CSS. When integrating a pinned version, read the types at that tag.

```ts
import { mountLiquidGlassNavbar } from '@soheab-com/liquid-glass-navbar';
import '@soheab-com/liquid-glass-navbar/navbar.css';
```

Supply a nav element containing buttons or `<a href="…">` items. Mark the starting item with `aria-current="page"` and use `data-navbar-icon` and `data-navbar-label` to identify the icon and label. Mount after the nav exists. For button tabs, use `onSelect` to display the corresponding content. Link tabs navigate to their destinations.

| Task | Start here |
| --- | --- |
| Configure a navbar | `LiquidGlassNavbarOptions` in [src/index.ts](../src/index.ts) and the [options reference](https://soheab.com/navbar-builder/docs/#options) |
| Update an existing instance | `LiquidGlassNavbar` in [src/index.ts](../src/index.ts) and the [methods reference](https://soheab.com/navbar-builder/docs/#methods) |
| Set selection programmatically | `navbar.select(item)` updates selection without firing `onSelect` |
| Unmount | Call `navbar.destroy()` when disposing of the instance |
| Configure markup or styling | [HTML attributes](https://soheab.com/navbar-builder/docs/#attributes), [CSS variables](https://soheab.com/navbar-builder/docs/#css), and [src/navbar.css](../src/navbar.css) |
| See full examples | [Configurable demo](../examples/demo.ts) and [feature examples](../examples/features.ts) |
