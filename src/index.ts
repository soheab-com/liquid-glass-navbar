// Public entry point. Everything here is re-exported; the implementation lives in the modules it names.
export { mountLiquidGlassNavbar } from './navbar.js';
export { createAnchoredPopover } from './popover.js';
export { watchScrollDirection } from './compact.js';
// The springs the navbar moves with, for apps that want their own motion to match.
export { createSpring, rubberBand, rubberBanded } from './spring.js';

export type {
  ContextActionsOptions, EqualWidthOverflow, ItemVisibility, LiquidGlassNavbar, LiquidGlassNavbarOptions,
  NavbarAnimations, NavbarBackItem, NavbarBadge, NavbarBadgeStatus, NavbarCollapseOptions, NavbarColors,
  NavbarContextLook, NavbarContextPlacement, NavbarItem, NavbarLayout, NavbarLensOptions, NavbarLensScale,
  NavbarLensStyle, NavbarMagnifyOptions, NavbarOverflowOptions, NavbarOverflowStyle, NavbarOverflowSurface,
  NavbarOverflowTrigger, NavbarPosition, NavbarSize, NavbarUpdateOptions, NavbarVisibleLimit,
} from './types.js';
export type { NavbarHoverOptions } from './hover.js';
export type { Spring, SpringOptions } from './spring.js';
export type { BackdropSignal, BackdropTone, ContrastOptions } from './contrast.js';
export type { AnchoredPopover, AnchoredPopoverOptions, PopoverCloseReason, PopoverPlacement } from './popover.js';
export type { ScrollCompactOptions, ScrollSource } from './compact.js';
