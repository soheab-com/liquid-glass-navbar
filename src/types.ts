// Public types, plus the internal shapes shared across the navbar implementation.

import type { ScrollCompactOptions } from './compact.js';
import type { BackdropSignal, ContrastOptions } from './contrast.js';
import type { NavbarHoverOptions } from './hover.js';
import type { AnchoredPopover, AnchoredPopoverOptions } from './popover.js';
import type { RefractionSources } from './refraction.js';
import type { SpringOptions } from './spring.js';

export type NavbarPosition = 'top' | 'bottom' | 'left' | 'right';

/** What equal widths do when the widest item doesn't fit the bar. */
export type EqualWidthOverflow = 'natural' | 'truncate' | 'grow';

/**
 * `row` keeps one row (the default). `wrap` wraps items into rows inside one glass surface. `rows` gives each row
 * its own centered glass pill. Multi-row layouts apply to top and bottom bars; side bars always use one column.
 */
export type NavbarLayout = 'row' | 'wrap' | 'rows';

/** `menu` lists the extra items in an anchored menu; `expand` opens a row of glass icons above More. */
export type NavbarOverflowStyle = 'menu' | 'expand';

/** For the `expand` style: one shared glass pill, or a glass circle per icon. */
export type NavbarOverflowSurface = 'shared' | 'individual';

/** How the More button looks: an icon with a label, or a vertical ⋮ icon only. */
export type NavbarOverflowTrigger = 'more' | 'dots';

/** The colour of a status badge. */
export type NavbarBadgeStatus = 'info' | 'success' | 'warning' | 'error';

/** Where context actions go: instead of the navigation, before or after it, or in place of one section or item. */
export type NavbarContextPlacement = 'replace' | 'start' | 'end' | HTMLElement;

/** The Back item of context actions. */
export interface NavbarBackItem {
  label?: string;
  icon?: Element;
}

/** A look of their own for context actions' pills. */
export interface NavbarContextLook {
  colors?: NavbarColors;
  background?: string;
  transparency?: number;
}

export type NavbarVisibleLimit = number | Readonly<Record<number, number>> | ((viewportWidth: number) => number);

export interface NavbarCollapseOptions {
  /** Row numbers to collapse. Defaults to every row before the last. */
  rows?: readonly number[];
  initial?: 'open' | 'collapsed';
  /** Defaults to an automatically generated button. */
  toggle?: 'auto' | HTMLElement | false;
  hideLabel?: string;
  showLabel?: string;
  spring?: Pick<SpringOptions, 'response' | 'dampingRatio'>;
}

export interface NavbarSize {
  readonly width: number;
  readonly height: number;
}

export interface NavbarUpdateOptions {
  /** Stable identity for items and sections. Return undefined to use the default keys. */
  key?: (element: HTMLElement) => string | undefined;
  /** Defaults to true. */
  animate?: boolean;
  layout?: NavbarLayout;
  /** Set to null to restore the default limit. */
  maxRows?: number | null;
  /** Changes which rows collapse without remounting the navbar. */
  collapsible?: boolean | NavbarCollapseOptions;
}

export interface NavbarOverflowOptions {
  style?: NavbarOverflowStyle;
  /** For `expand`: one shared glass pill (default) or a glass circle per icon. */
  surface?: NavbarOverflowSurface;
  /** `more` (default) shows an icon with a label; `dots` shows only a vertical ⋮ icon, keeping the label for screen readers. */
  trigger?: NavbarOverflowTrigger;
  /** The More button's label. Default "More". */
  label?: string;
  /** An icon for the More button, cloned into it. Defaults to an ellipsis. */
  icon?: Element;
  /** Show at most this many items in the bar, not counting More. */
  maxVisible?: NavbarVisibleLimit;
  moreLabel?: boolean;
  /** In rows layout, give each authored row its own More and visible-item budget. */
  perRow?: boolean;
  /** Overrides maxVisible for individual authored rows when perRow is enabled. */
  rowLimits?: Readonly<Record<number, NavbarVisibleLimit>>;
  /** Keep the popover inside this element. Defaults to the viewport. */
  boundary?: HTMLElement;
  /** Close More when the page scrolls. Default false: it stays open, and only a tap outside closes it. */
  closeOnScroll?: boolean;
}

export type NavbarBadge =
  | { count: number; max?: number; label?: string }
  | { dot: true; label?: string }
  | { status: NavbarBadgeStatus; label: string };

export interface ItemVisibility {
  icon?: boolean;
  label?: boolean;
}

/**
 * Tab colours. `selected` is what the lens lights up (the current tab, and anything you drag over); `unselected`
 * is every other tab. The icon and label versions override those for just that part. Any CSS colour works.
 */
export interface NavbarColors {
  selected?: string;
  unselected?: string;
  selectedIcon?: string;
  selectedLabel?: string;
  unselectedIcon?: string;
  unselectedLabel?: string;
}

export type NavbarLensStyle = 'glass' | 'tinted' | 'outline';
/** Uniform scale or separate horizontal and vertical scales. */
export type NavbarLensScale = number | readonly [horizontal: number, vertical: number];

export interface NavbarLensOptions {
  /** Defaults to the original glass lens. */
  style?: NavbarLensStyle;
  /** CSS color expression for the lens fill and rim. Defaults to a softer version of the selected icon color. */
  accent?: string;
  /** Override the fill with a CSS background. */
  background?: string;
  /** CSS border radius. Defaults to a pill. */
  radius?: string;
  /** Backdrop blur during a drag, in pixels. Defaults to 1.5. */
  blur?: number;
  /** Zoom while pressed. Defaults to [1.08, 1.05]. */
  pressScale?: NavbarLensScale;
  /** Zoom while dragging. Defaults to [1.22, 1.38]. */
  dragScale?: NavbarLensScale;
}

export interface LiquidGlassNavbarOptions {
  onSelect?: (button: NavbarItem) => void;
  autoSelect?: boolean;
  onAction?: (button: NavbarItem) => void;
  onReorder?: (order: readonly NavbarItem[], section: HTMLElement) => void;
  enabled?: () => boolean;
  position?: NavbarPosition;
  labels?: boolean;
  equalWidth?: boolean;
  equalWidthOverflow?: EqualWidthOverflow;
  background?: string;
  transparency?: number;
  /**
   * Safari can't bend what's behind an element, so there the glass bends a copy of these elements instead (a CSS
   * selector or a function). Defaults to `[data-navbar-refract]`; mark the page's backdrop, such as a fixed wallpaper.
   * With the default, elements that scroll only take part with `data-navbar-refract="scroll"`, because their copy
   * follows scrolling from script and can trail a little on iOS; elements you pass yourself are always taken.
   * Pass false to use native blur instead of copied refraction in Safari. Chromium bends the live page and ignores this.
   */
  refractionSources?: RefractionSources | false;
  colors?: NavbarColors;
  lens?: NavbarLensOptions;
  /** Preview same-page destinations while hovering or swiping. Off by default. */
  hoverNavigation?: boolean | NavbarHoverOptions;
  reorderable?: boolean;
  /** Multi-row layout. Assign items or sections to rows with `data-navbar-row="2"`. */
  layout?: NavbarLayout;
  /** With `overflow`, the most rows to use before items move into More. Defaults to 1 for `row`, unlimited otherwise. */
  maxRows?: number;
  /** Move items that don't fit into a More button. `true` uses a menu. Keep an item in the bar with `data-navbar-overflow="never"`. */
  overflow?: boolean | NavbarOverflowStyle | NavbarOverflowOptions;
  /** Called when items move between the bar and More. */
  onOverflowChange?: (overflowed: readonly NavbarItem[]) => void;
  /** Start compact: icons only. */
  compact?: boolean;
  /** Compact the bar while scrolling down and restore labels when scrolling up. */
  scrollCompact?: boolean | ScrollCompactOptions;
  collapsible?: boolean | NavbarCollapseOptions;
  onCollapse?: (collapsed: boolean) => void;
  /** Fires when the committed collapse or expand reaches its final layout. */
  onCollapseEnd?: (collapsed: boolean) => void;
  /** Unique snapshot name. The navbar stays live during a same-document View Transition. */
  viewTransitionName?: string;
  /** Log a warning for multiple current items. Enable this in development builds. */
  warnOnMultipleCurrent?: boolean;
  /** Reports changes to the navbar's border box, including spring frames. */
  onResize?: (size: NavbarSize) => void;
  onCompactChange?: (compact: boolean) => void;
  /** Adapt the foreground and tint to what's behind the bar. `true` watches `[data-navbar-backdrop]` regions. */
  contrast?: boolean | ContrastOptions;
  /** Dock-style magnification: icons near the pointer or finger grow and rise, then settle as it moves on. */
  magnify?: boolean | NavbarMagnifyOptions;
  /** Extra motion, off by default: `true` turns on all of it, or pick with `{ reflow, popovers, tap, badges }`. */
  animations?: boolean | NavbarAnimations;
}

/** Opt-in motion. Everything is a spring that can be interrupted, and none of it runs with Reduce Motion. */
export interface NavbarAnimations {
  /** Items glide to their new place when they move between the bar and More, change rows, or the bar resizes. */
  reflow?: boolean;
  /** More and anchored popovers open and close on a spring from their trigger. */
  popovers?: boolean;
  /** A small squish while a tab is pressed, and a bounce of its icon when it becomes selected. */
  tap?: boolean;
  /** Badges pop in, pulse when their count changes, and shrink away when removed. */
  badges?: boolean;
}

export interface NavbarMagnifyOptions {
  /** How large the icon under the pointer grows. Default 1.4. */
  scale?: number;
  /** How far it rises away from the bar's edge, in px. Default 10. */
  lift?: number;
  /** How far from the pointer neighbours still react, in px. Default 110. */
  range?: number;
}

export interface ContextActionsOptions {
  /** A temporary accessible name for the bar, such as "Actions for 2 files". */
  label?: string;
  /**
   * Where the actions go. `replace` (the default) swaps out the whole navigation. `start` and `end` add them
   * beside it. A section or item of the bar replaces just that part.
   */
  placement?: NavbarContextPlacement;
  /** Add a Back item that returns to the previous items. Pass `{ label, icon }` to change it. */
  back?: boolean | NavbarBackItem;
  /** Called when the Back item is used, after the previous items are back. */
  onBack?: () => void;
  /** Class names for the actions' pills, for your own styles. */
  className?: string;
  /** A look of their own: colours, a background and transparency for the actions' pills. */
  look?: NavbarContextLook;
}

export interface LiquidGlassNavbar {
  sync(): void;
  setPosition(position?: NavbarPosition): void;
  setLabels(visible: boolean): void;
  setEqualWidth(equal: boolean, overflow?: EqualWidthOverflow): void;
  setBackground(background?: string): void;
  setTransparency(percentage?: number): void;
  /** Safari only: copy the `refractionSources` again after their content changed. */
  refreshRefraction(): void;
  setColors(colors?: NavbarColors): void;
  refreshColors(): void;
  /** Change the lens appearance. Omit options to use the stylesheet defaults. */
  setLens(options?: NavbarLensOptions): void;
  setCollapsed(collapsed: boolean): void;
  readonly collapsed: boolean;
  setItemHidden(item: NavbarItem, hidden: boolean): void;
  /** Reconcile direct items and sections from replacement markup, keeping the mounted nav. */
  update(replacement: HTMLElement, options?: NavbarUpdateOptions): void;
  setItemVisibility(item: NavbarItem, visibility: ItemVisibility): void;
  setReorderMode(active: boolean): void;
  reorder(order: readonly NavbarItem[]): void;
  /** Mark an item as the current tab without calling `onSelect`, for example to restore a saved tab. */
  select(item: NavbarItem): void;
  setLayout(layout: NavbarLayout, maxRows?: number): void;
  setOverflow(overflow?: LiquidGlassNavbarOptions['overflow']): void;
  /** Items currently behind More, in order. */
  readonly overflowItems: readonly NavbarItem[];
  openOverflow(options?: { focus?: boolean; row?: number }): void;
  closeOverflow(): void;
  /** Show a count, dot or status on an item. Pass `null` to remove it. */
  setBadge(item: NavbarItem, badge: NavbarBadge | null): void;
  setCompact(compact: boolean): void;
  setScrollCompact(options?: boolean | ScrollCompactOptions): void;
  readonly compact: boolean;
  setContrast(options?: boolean | ContrastOptions): void;
  /** Tell the bar what's behind it. Overrides region detection for the fields you pass; call with nothing to clear. */
  setBackdrop(signal?: BackdropSignal): void;
  /** Temporarily replace the navigation with your own items or `[data-navbar-section]` groups. */
  showContextActions(nodes: readonly HTMLElement[], options?: ContextActionsOptions): void;
  /** Leave context mode, restoring the navigation and the tab that was selected before. */
  hideContextActions(): void;
  readonly contextActive: boolean;
  setMagnify(options?: boolean | NavbarMagnifyOptions): void;
  setAnimations(options?: boolean | NavbarAnimations): void;
  /** An anchored popover for one of the bar's items. Activating the item, by tap or swipe, toggles it. */
  createPopover(
    trigger: NavbarItem,
    content: Node | readonly Node[],
    options?: AnchoredPopoverOptions,
  ): AnchoredPopover;
  destroy(): void;
}

/** @internal */
export interface More {
  button: HTMLButtonElement;
  dot: HTMLElement;
  host: HTMLElement;
  popover: AnchoredPopover;
}

/** @internal */
export interface Gesture {
  id: number;
  start: number;
  crossStart: number;
  origin: { x: number; y: number };
  free: boolean;
  dragging: boolean;
  draggedItem: NavbarItem | null;
  openedOverflow?: More;
  collapseBeforePreview?: boolean;
}

/** @internal */
export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}
/** @internal */
export interface Unit {
  element: HTMLElement;
  width: number;
  row: number | undefined;
  equalItemWidth?: number;
}

/** A tab or action: a `<button>`, or an `<a href>` for sites where each tab is its own page. */
export type NavbarItem = HTMLButtonElement | HTMLAnchorElement;
