import { watchScrollDirection, type ScrollCompactOptions } from './compact.js';
import { readBackdrop, type BackdropSignal, type BackdropTone, type ContrastOptions } from './contrast.js';
import { createAnchoredPopover, type AnchoredPopover, type AnchoredPopoverOptions } from './popover.js';
import { mountRefraction, refractionMode, type RefractionSources } from './refraction.js';
import { createSpring, rubberBanded, type Spring } from './spring.js';

export { createAnchoredPopover, watchScrollDirection };
// The springs the navbar moves with, for apps that want their own motion to match.
export { createSpring, rubberBand, rubberBanded } from './spring.js';
export type { Spring, SpringOptions } from './spring.js';
export type {
  AnchoredPopover, AnchoredPopoverOptions, BackdropSignal, BackdropTone, ContrastOptions, ScrollCompactOptions,
};
export type { PopoverCloseReason, PopoverPlacement } from './popover.js';
export type { ScrollSource } from './compact.js';

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
  maxVisible?: number;
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
   * Chromium bends the live page and ignores this.
   */
  refractionSources?: RefractionSources;
  colors?: NavbarColors;
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
  setItemVisibility(item: NavbarItem, visibility: ItemVisibility): void;
  setReorderMode(active: boolean): void;
  reorder(order: readonly NavbarItem[]): void;
  /** Mark an item as the current tab without calling `onSelect`, for example to restore a saved tab. */
  select(item: NavbarItem): void;
  setLayout(layout: NavbarLayout, maxRows?: number): void;
  setOverflow(overflow?: LiquidGlassNavbarOptions['overflow']): void;
  /** Items currently behind More, in order. */
  readonly overflowItems: readonly NavbarItem[];
  openOverflow(options?: { focus?: boolean }): void;
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
  createPopover(trigger: NavbarItem, content: Node | readonly Node[], options?: AnchoredPopoverOptions): AnchoredPopover;
  destroy(): void;
}

interface Gesture {
  id: number;
  start: number;
  crossStart: number;
  origin: { x: number; y: number };
  free: boolean;
  dragging: boolean;
  draggedItem: NavbarItem | null;
  openedOverflow: boolean;
}

interface Box { left: number; top: number; width: number; height: number }
interface Unit { element: HTMLElement; width: number; row: number | undefined }

/** A tab or action: a `<button>`, or an `<a href>` for sites where each tab is its own page. */
export type NavbarItem = HTMLButtonElement | HTMLAnchorElement;

const ITEM_SELECTOR = ':scope > button, :scope > a[href]';
const CONTEXT = 'data-navbar-context';
const ELLIPSIS = 'M5 12h.01M12 12h.01M19 12h.01';
const VERTICAL_ELLIPSIS = 'M12 5h.01M12 12h.01M12 19h.01';

const sectionSelector = ':scope > [data-navbar-section]';
const buttonsIn = (section: Element): NavbarItem[] =>
  [...section.querySelectorAll<NavbarItem>(ITEM_SELECTOR)];
const isAction = (button: NavbarItem): boolean => button.hasAttribute('data-navbar-action');
const allowsSwipe = (button: NavbarItem): boolean => !button.closest('[data-navbar-no-swipe]');
const isAvailable = (button: NavbarItem): boolean => !button.hidden
  && !(button instanceof HTMLButtonElement && button.disabled)
  // Hidden by the page's own CSS (display: none), for example an item that moved into a "More" menu.
  && button.getClientRects().length > 0
  && !(button.hasAttribute('data-navbar-hide-icon') && button.hasAttribute('data-navbar-hide-label'));
const rowOf = (element: Element): number | undefined => {
  const value = Number(element.getAttribute('data-navbar-row'));
  return Number.isFinite(value) && value > 0 ? value : undefined;
};
const px = (value: string): number => parseFloat(value) || 0;
let badgeSequence = 0;

function svgIcon(path: string): SVGSVGElement {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  for (const [name, value] of Object.entries({
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.6', 'stroke-linecap': 'round', 'aria-hidden': 'true',
  })) svg.setAttribute(name, value);
  svg.setAttribute('data-navbar-icon', '');
  const line = document.createElementNS(namespace, 'path');
  line.setAttribute('d', path);
  svg.append(line);
  return svg;
}

function overflowSettings(value: LiquidGlassNavbarOptions['overflow']): NavbarOverflowOptions | undefined {
  if (!value) return undefined;
  if (value === true) return { style: 'menu' };
  if (typeof value === 'string') return { style: value };
  return value;
}

export function mountLiquidGlassNavbar(nav: HTMLElement, options: LiquidGlassNavbarOptions): LiquidGlassNavbar {
  const listeners = new AbortController();
  const { signal } = listeners;
  const lens = document.createElement('span');
  lens.className = 'lg-navbar__lens';
  lens.setAttribute('aria-hidden', 'true');
  nav.classList.add('lg-navbar');
  nav.prepend(lens);
  const mode = refractionMode();
  const refraction = mode ? mountRefraction(nav, mode, options.refractionSources) : undefined;

  let placement = options.position;
  let reorderMode = false;
  let heldCompact: boolean | undefined;
  let gesture: Gesture | undefined;
  let suppressClick = false;
  let layout: NavbarLayout = options.layout ?? 'row';
  let maxRows = options.maxRows;
  let overflow = overflowSettings(options.overflow);
  let compact = false;
  interface ContextState {
    /** What was inserted into the bar (generated pills, your sections, or your items). */
    inserted: HTMLElement[];
    /** Your own nodes, and what to restore on them. */
    restore: { node: HTMLElement; className: string; style: string | null }[];
    current: NavbarItem | undefined;
    label: string | null;
    replace: boolean;
    hidden: HTMLElement | undefined;
    back: HTMLButtonElement | undefined;
    onBack: (() => void) | undefined;
  }
  let context: ContextState | undefined;
  const generatedLabels = new Set<NavbarItem>();
  const popovers = new Map<NavbarItem, AnchoredPopover>();
  const badges = new Map<NavbarItem, { badge: HTMLElement; text: HTMLElement; describedBy: string | null }>();
  const enabled = options.enabled ?? (() => true);
  const vertical = (): boolean => placement === 'left' || placement === 'right';
  const inContext = (element: Element): boolean => !context?.replace || Boolean(element.closest(`[${CONTEXT}]`));
  const sections = (): HTMLElement[] => [nav, ...nav.querySelectorAll<HTMLElement>(sectionSelector)]
    .filter((section) => section === nav || inContext(section));
  const items = (): NavbarItem[] => [...sections().flatMap(buttonsIn), ...(more ? buttonsIn(more.host) : [])].filter(inContext);
  const tabs = (): NavbarItem[] => items().filter((button) => isAvailable(button) && !isAction(button));
  let lensSize = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const spring = createSpring(0, (offset) => {
    lens.style.translate = vertical() ? `0 ${offset}px` : `${offset}px 0`;
    if (ink) paintInk();
  }, { response: .38, dampingRatio: .78, onRest: () => { if (!gesture?.dragging) clearInk(); } });

  // ---- Gradual highlight: while the lens moves, only the part of a tab it covers takes the selected colour. ----
  // Each label and icon keeps the unselected colour, and a copy in the selected colour is laid over it and
  // clipped to the lens. It's a plain colour and a CSS clip, which iOS redraws reliably (gradient-painted text and
  // SVG gradients it didn't) and colour-rewriting extensions leave alone. At rest the normal colouring returns.

  interface InkPart {
    element: HTMLElement | SVGElement;
    /** The copy in the selected colour, clipped to the part the lens covers. */
    copy: HTMLElement | SVGElement | undefined;
    painted: string;
  }
  interface InkTab {
    item: NavbarItem;
    label: InkPart | undefined;
    icon: InkPart | undefined;
    base: { label: string; icon: string };
  }
  let ink: { tabs: InkTab[]; accent: { label: string; icon: string }; unselected: { label: string; icon: string } } | undefined;
  const hiddenClip = 'inset(0 100% 0 0)';

  const colourOf = (element: Element | undefined | null): string => (element ? getComputedStyle(element).color : '');
  const coloursOf = (item: NavbarItem | undefined) => ({
    label: colourOf(item?.querySelector('[data-navbar-label]')),
    icon: colourOf(item?.querySelector('[data-navbar-icon]')),
  });
  const plainTab = (item: NavbarItem): boolean => item.getAttribute('aria-current') !== 'page' && !item.classList.contains('lg-navbar__preview');
  /** The tabs the highlight paints: everything shown, except a More menu's list, which the lens doesn't visit. */
  function inkable(): NavbarItem[] {
    const menu = more?.host.classList.contains('lg-navbar__overflow--menu') ? more.host : undefined;
    return items().filter((item) => isAvailable(item) && !menu?.contains(item));
  }

  // Where a part sits before magnify or tap feedback moves it: the copy takes that place inside the tab, and the
  // same rules then move it too.
  function placeOf(item: NavbarItem, element: HTMLElement | SVGElement) {
    if (!element.getClientRects().length) return undefined;
    const saved = [element.style.translate, element.style.scale, item.style.scale];
    element.style.translate = 'none';
    element.style.scale = 'none';
    item.style.scale = 'none';
    const box = element.getBoundingClientRect();
    const outer = item.getBoundingClientRect();
    [element.style.translate, element.style.scale, item.style.scale] = saved;
    for (const node of [element, item]) if (!node.getAttribute('style')) node.removeAttribute('style');
    // Anything else scaling the tab, like a More row springing open, scales both boxes alike.
    const k = item.offsetWidth && Math.abs(outer.width - item.offsetWidth) > 1 ? outer.width / item.offsetWidth : 1;
    return {
      left: (box.left - outer.left) / k - item.clientLeft, top: (box.top - outer.top) / k - item.clientTop,
      width: box.width / k, height: box.height / k,
    };
  }

  function inkTabs(tabsToPaint: NavbarItem[], accent: { label: string; icon: string }, unselected: { label: string; icon: string }, haveReference: boolean): InkTab[] {
    const found = tabsToPaint.map((item) => {
      const label = item.querySelector<HTMLElement>('[data-navbar-label]') ?? undefined;
      const icon = item.querySelector<HTMLElement | SVGElement>('[data-navbar-icon]') ?? undefined;
      // Read every place first, then add the copies, so measuring never waits on a layout per tab.
      return { item, label, icon, labelPlace: label && placeOf(item, label), iconPlace: icon && placeOf(item, icon) };
    });
    const part = (item: NavbarItem, element: HTMLElement | SVGElement | undefined, place: ReturnType<typeof placeOf>, colour: string): InkPart | undefined => {
      if (!element) return undefined;
      let copy: InkPart['copy'];
      if (place) {
        copy = element.cloneNode(true) as HTMLElement | SVGElement;
        copy.removeAttribute('id');
        copy.querySelectorAll('[id]').forEach((child) => child.removeAttribute('id'));
        copy.setAttribute('aria-hidden', 'true');
        copy.classList.add('lg-navbar__ink');
        copy.style.left = `${place.left}px`;
        copy.style.top = `${place.top}px`;
        copy.style.width = `${place.width}px`;
        copy.style.height = `${place.height}px`;
        copy.style.color = colour;
        copy.style.clipPath = hiddenClip;
        item.append(copy);
      }
      return { element, copy, painted: '' };
    };
    return found.map(({ item, label, icon, labelPlace, iconPlace }): InkTab => ({
      item,
      label: part(item, label, labelPlace, accent.label),
      icon: part(item, icon, iconPlace, accent.icon),
      base: haveReference && !plainTab(item) ? unselected : coloursOf(item),
    }));
  }

  function startInk(): void {
    // Not tied to Reduce Motion: it adds no movement, it only colours what the lens covers as it moves.
    if (ink || lens.hidden) return;
    const tabsToPaint = inkable();
    // The bar's own colours: unselected from a plain tab, selected from a tab in the preview state the lens uses.
    const reference = tabsToPaint.find(plainTab);
    const unselected = coloursOf(reference);
    let accent = unselected;
    if (reference) {
      const hadClass = reference.hasAttribute('class');
      reference.classList.add('lg-navbar__preview');
      accent = coloursOf(reference);
      reference.classList.remove('lg-navbar__preview');
      if (!hadClass) reference.removeAttribute('class');
    }
    ink = { tabs: inkTabs(tabsToPaint, accent, unselected, Boolean(reference)), accent, unselected };
    nav.classList.add('lg-navbar--inking');
  }

  /** Where the lens covers a box along the bar, as fractions of the box: [start, end], or undefined. */
  function coverage(lensBox: DOMRect, box: DOMRect, alongY: boolean): [number, number] | undefined {
    const crossOverlap = alongY
      ? Math.min(lensBox.right, box.right) - Math.max(lensBox.left, box.left)
      : Math.min(lensBox.bottom, box.bottom) - Math.max(lensBox.top, box.top);
    if (crossOverlap <= 0) return undefined;
    const start = alongY ? box.top : box.left;
    const size = alongY ? box.height : box.width;
    if (!size) return undefined;
    const from = ((alongY ? lensBox.top : lensBox.left) - start) / size;
    const to = ((alongY ? lensBox.bottom : lensBox.right) - start) / size;
    const a = Math.max(0, Math.min(1, from));
    const b = Math.max(0, Math.min(1, to));
    return b > a ? [a, b] : undefined;
  }

  function paintInk(): void {
    if (!ink) return;
    if (lens.hidden || nav.classList.contains('lg-navbar--lens-away')) {
      for (const tab of ink.tabs) paintTab(tab, undefined, undefined);
      return;
    }
    const lensBox = lens.getBoundingClientRect();
    const alongY = vertical();
    // Read every box first, then write, so painting never forces a layout per tab.
    const boxes = ink.tabs.map((tab) => ({
      label: tab.label?.element.getBoundingClientRect(),
      icon: tab.icon?.element.getBoundingClientRect(),
    }));
    ink.tabs.forEach((tab, index) => {
      const box = boxes[index]!;
      paintTab(tab, box.label && coverage(lensBox, box.label, alongY), box.icon && coverage(lensBox, box.icon, alongY));
    });
  }

  function paintTab(tab: InkTab, label: [number, number] | undefined, icon: [number, number] | undefined): void {
    paintPart(tab.label, tab.base.label, label);
    paintPart(tab.icon, tab.base.icon, icon);
  }

  // The part itself shows the unselected colour; its copy shows the selected colour where the lens is.
  function paintPart(part: InkPart | undefined, base: string, covered: [number, number] | undefined): void {
    if (!part) return;
    if (part.element.style.color !== base) part.element.style.setProperty('color', base);
    if (!part.copy) return;
    const [a, b] = covered ?? [0, 0];
    const percent = (value: number): string => `${(value * 100).toFixed(2)}%`;
    const clip = b <= a ? hiddenClip : vertical()
      ? `inset(${percent(a)} 0 ${percent(1 - b)} 0)`
      : `inset(0 ${percent(1 - b)} 0 ${percent(a)})`;
    if (clip === part.painted) return;
    part.painted = clip;
    part.copy.style.clipPath = clip;
  }

  // Remove inline properties the ink set, without leaving an empty style attribute behind.
  function unstyle(element: Element | undefined, ...properties: string[]): void {
    if (!(element instanceof HTMLElement || element instanceof SVGElement)) return;
    for (const property of properties) element.style.removeProperty(property);
    if (element.getAttribute('style') === '') element.removeAttribute('style');
  }

  /**
   * When the tabs the highlight paints change mid-swipe, as when More opens or closes, add copies for the tabs
   * that appeared and drop those that went. The rest keep theirs untouched: rebuilding every copy at that moment
   * left iOS drawing none of them.
   */
  function reink(): void {
    if (!ink) return;
    const wanted = inkable();
    const kept = ink.tabs.filter((tab) => wanted.includes(tab.item));
    for (const tab of ink.tabs) if (!kept.includes(tab)) dropTab(tab);
    const added = wanted.filter((item) => !kept.some((tab) => tab.item === item));
    ink.tabs = [...kept, ...inkTabs(added, ink.accent, ink.unselected, true)];
    paintInk();
  }

  function dropTab(tab: InkTab): void {
    for (const part of [tab.label, tab.icon]) {
      if (!part) continue;
      unstyle(part.element, 'color');
      part.copy?.remove();
    }
  }

  function clearInk(): void {
    if (!ink) return;
    for (const tab of ink.tabs) dropTab(tab);
    ink = undefined;
    // At rest the bar holds nothing extra.
    nav.classList.remove('lg-navbar--inking');
  }
  let releaseVelocity: { value: number; at: number } | undefined;
  let samples: { position: number; time: number }[] = [];

  // Positions inside the nav's padding box, to the subpixel: offsetLeft and offsetWidth round to whole pixels,
  // which leaves the lens and row surfaces up to a pixel off centre.
  function offsetOf(button: HTMLElement): { left: number; top: number } {
    const outer = nav.getBoundingClientRect();
    const inner = button.getBoundingClientRect();
    return { left: inner.left - outer.left - nav.clientLeft, top: inner.top - outer.top - nav.clientTop };
  }

  function boxOf(button: HTMLElement): Box {
    const outer = nav.getBoundingClientRect();
    const inner = button.getBoundingClientRect();
    return { left: inner.left - outer.left - nav.clientLeft, top: inner.top - outer.top - nav.clientTop, width: inner.width, height: inner.height };
  }

  function measure(button: HTMLElement): { start: number; size: number } {
    const box = boxOf(button);
    return vertical() ? { start: box.top, size: box.height } : { start: box.left, size: box.width };
  }

  function placeLens(button: HTMLElement, size?: number): void {
    const box = boxOf(button);
    const width = vertical() ? box.width : size ?? box.width;
    const height = vertical() ? size ?? box.height : box.height;
    lens.style.width = `${width}px`;
    lens.style.height = `${height}px`;
    lens.style.left = vertical() ? `${box.left}px` : '0';
    lens.style.top = vertical() ? '0' : `${box.top}px`;
    lensSize = vertical() ? height : width;
    lens.hidden = false;
  }

  function labelItems(): void {
    for (const button of items()) {
      if (button.hasAttribute('aria-label') || button.hasAttribute('aria-labelledby')) continue;
      const label = button.querySelector('[data-navbar-label]')?.textContent?.trim();
      if (!label) continue;
      button.setAttribute('aria-label', label);
      generatedLabels.add(button);
    }
  }

  // ---- Overflow: items that don't fit move into a popover behind a More button, and back when there's room. ----

  let more: { button: HTMLButtonElement; dot: HTMLElement; host: HTMLElement; popover: AnchoredPopover } | undefined;
  const homes = new Map<NavbarItem, HTMLElement>();
  let sequence: NavbarItem[] = [];
  const widths = new WeakMap<HTMLElement, { key: string; width: number }>();
  let lastOverflow: NavbarItem[] = [];

  function ensureMore(): NonNullable<typeof more> {
    if (more) return more;
    const settings = overflow ?? {};
    const style = settings.style ?? 'menu';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lg-navbar__more';
    button.hidden = true;
    for (const name of ['data-navbar-action', 'data-navbar-generated']) button.setAttribute(name, '');
    button.setAttribute('data-navbar-overflow', 'never');
    const dots = settings.trigger === 'dots';
    const icon = settings.icon ? settings.icon.cloneNode(true) as Element : svgIcon(dots ? VERTICAL_ELLIPSIS : ELLIPSIS);
    // Dots only: the label stays as the button's accessible name but isn't shown.
    if (dots) {
      button.setAttribute('data-navbar-hide-label', '');
      button.setAttribute('aria-label', settings.label ?? 'More');
    }
    icon.setAttribute('data-navbar-icon', '');
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.setAttribute('data-navbar-label', '');
    label.textContent = settings.label ?? 'More';
    const dot = document.createElement('span');
    dot.className = 'lg-navbar__badge';
    dot.dataset.kind = 'dot';
    dot.setAttribute('aria-hidden', 'true');
    dot.hidden = true;
    button.append(icon, label, dot);
    const host = document.createElement('div');
    host.className = `lg-navbar__overflow lg-navbar__overflow--${style}`;
    if (style === 'expand') host.classList.add(`lg-navbar__overflow--${settings.surface ?? 'shared'}`);
    const popover = createAnchoredPopover(button, host, {
      container: nav,
      label: settings.label ?? 'More',
      className: `lg-navbar__popover lg-navbar__popover--${style}`,
      bindTrigger: false,
      // Clear the pill around More rather than More itself.
      anchor: () => button.parentElement,
      gap: style === 'expand' ? 12 : 10,
      ...(settings.boundary ? { boundary: settings.boundary } : {}),
      spring: () => motionOn('popovers'),
      // Read each time, so setOverflow changes it without rebuilding More.
      get closeOnScroll() { return overflow?.closeOnScroll ?? false; },
      onOpen: () => sync(),
      onClose: () => sync(),
    });
    more = { button, dot, host, popover };
    return more;
  }

  function removeMore(): void {
    if (!more) return;
    restoreAll();
    more.popover.destroy();
    more.button.remove();
    more = undefined;
  }

  function flowItems(): NavbarItem[] {
    // Every overflowable item in reading order, wherever it currently is.
    const inBar = sections().flatMap(buttonsIn).filter((button) => button !== more?.button);
    const away = more ? buttonsIn(more.host) : [];
    if (!away.length) return inBar;
    const order = [...sequence.filter((button) => inBar.includes(button) || away.includes(button))];
    for (const button of [...inBar, ...away]) if (!order.includes(button)) order.push(button);
    return order;
  }

  function restore(button: NavbarItem): void {
    const home = homes.get(button) ?? nav;
    const after = sequence.slice(sequence.indexOf(button) + 1).find((next) => next.parentElement === home);
    if (after) home.insertBefore(button, after);
    else if (more?.button.parentElement === home) home.insertBefore(button, more.button);
    else home.append(button);
    homes.delete(button);
  }

  function restoreAll(): void {
    if (!more) return;
    for (const button of buttonsIn(more.host)) restore(button);
  }

  function naturalWidth(button: HTMLElement): number {
    const style = getComputedStyle(button);
    let content = 0;
    for (const child of button.children) {
      if (child.classList.contains('lg-navbar__badge') || child.classList.contains('lg-navbar__sr')) continue;
      const rect = child.getBoundingClientRect();
      content = Math.max(content, rect.width, child instanceof HTMLElement ? child.scrollWidth : 0);
    }
    const width = content + px(style.paddingLeft) + px(style.paddingRight) + px(style.borderLeftWidth) + px(style.borderRightWidth);
    return Math.ceil(Math.max(px(style.minWidth), width) * 100) / 100;
  }

  // Widths are always the ones with labels, so compacting never moves items in or out of More: it only hides the
  // labels. While compact, a tab's labelled width is the one remembered from before.
  const widthKey = (button: HTMLElement): string => [
    nav.classList.contains('lg-navbar--no-labels'), button.hasAttribute('data-navbar-hide-icon'),
    button.hasAttribute('data-navbar-hide-label'), button.hidden, button.querySelector('[data-navbar-label]')?.textContent,
  ].join('|');

  function widthOf(button: HTMLElement): number | undefined {
    const cached = widths.get(button);
    const known = cached && cached.key === widthKey(button) ? cached.width : undefined;
    if (button.parentElement && !more?.host.contains(button)) {
      if (!isAvailableForLayout(button)) return 0;
      // A bar that starts compact has no labelled width yet; its compact width will do until it expands.
      if (compact) return known ?? naturalWidth(button);
      const width = naturalWidth(button);
      widths.set(button, { key: widthKey(button), width });
      return width;
    }
    return known;
  }

  // Like isAvailable, but an item hidden only because it sits in a closed popover still counts.
  function isAvailableForLayout(button: HTMLElement): boolean {
    if (button.hidden) return false;
    if (button.hasAttribute('data-navbar-hide-icon') && button.hasAttribute('data-navbar-hide-label')) return false;
    return more?.host.contains(button) || button.getClientRects().length > 0;
  }

  function availableWidth(): number {
    if (placement === 'top' || placement === 'bottom') {
      const style = getComputedStyle(nav);
      const offset = px(style.getPropertyValue('--lg-nav-offset')) || 12;
      return containingBlock(style.position).clientWidth - 2 * offset;
    }
    const parent = nav.parentElement;
    if (!parent) return Infinity;
    const style = getComputedStyle(parent);
    return parent.clientWidth - px(style.paddingLeft) - px(style.paddingRight);
  }

  // The box a pinned bar is placed in: the viewport, unless an ancestor contains fixed or absolute descendants.
  function containingBlock(position: string): Element {
    if (position !== 'fixed') return nav.offsetParent ?? document.documentElement;
    for (let node = nav.parentElement; node && node !== document.body; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.transform !== 'none' || style.filter !== 'none' || style.backdropFilter !== 'none'
          || /paint|layout|strict|content/.test(style.contain) || style.containerType !== 'normal') return node;
    }
    return document.documentElement;
  }

  const horizontalSpace = (element: HTMLElement): { pad: number; gap: number } => {
    const style = getComputedStyle(element);
    return {
      pad: px(style.paddingLeft) + px(style.paddingRight) + px(style.borderLeftWidth) + px(style.borderRightWidth),
      gap: px(style.columnGap),
    };
  };

  function breakLines(units: Unit[], room: number, gap: number, pad: number, single: boolean): Unit[][] {
    if (single) return units.length ? [units] : [];
    const lines: Unit[][] = [];
    let line: Unit[] = [];
    let used = pad;
    let row = units[0]?.row;
    for (const unit of units) {
      const add = (line.length ? gap : 0) + unit.width;
      const manualBreak = line.length > 0 && unit.row !== undefined && unit.row !== row;
      if (line.length && (manualBreak || used + add > room + .5)) {
        lines.push(line);
        line = [];
        used = pad;
      }
      if (unit.row !== undefined) row = unit.row;
      used += (line.length ? gap : 0) + unit.width;
      line.push(unit);
    }
    if (line.length) lines.push(line);
    return lines;
  }

  const lineWidth = (line: Unit[], gap: number, pad: number): number =>
    pad + line.reduce((sum, unit) => sum + unit.width, 0) + gap * Math.max(0, line.length - 1);

  const multiRowActive = (): boolean => !vertical() && layout !== 'row';
  const overflowActive = (): boolean => !vertical() && overflow !== undefined;
  const sectioned = (): boolean => sections().length > 1;

  let orderedUnits = new Set<HTMLElement>();
  const breaks: HTMLElement[] = [];
  const surfaces: HTMLElement[] = [];

  function clearRows(): void {
    for (const unit of orderedUnits) unit.style.removeProperty('order');
    orderedUnits = new Set();
    breaks.splice(0).forEach((node) => node.remove());
    for (const surface of surfaces.filter((node) => node.parentElement === nav)) {
      surface.remove();
      surfaces.splice(surfaces.indexOf(surface), 1);
    }
    nav.style.removeProperty('--_lg-rows-width');
    nav.style.removeProperty('--_lg-equal-width');
  }

  /** Lay out rows and overflow. Runs on every sync, but only writes to the DOM when the result changes. */
  function layoutPass(): void {
    // Context actions pause rows and More: items stay where they are until the navigation comes back.
    if (context) return;
    const multi = multiRowActive();
    const split = multi && layout === 'rows' && !sectioned();
    nav.classList.toggle('lg-navbar--multirow', multi);
    nav.classList.toggle('lg-navbar--wrap', multi && layout === 'wrap');
    nav.classList.toggle('lg-navbar--split', split);
    if (!overflowActive()) {
      if (more) removeMore();
    }
    if (!multi && !overflowActive()) {
      clearRows();
      return;
    }
    if (overflowActive()) ensureMore();
    const room = availableWidth();
    const isSectioned = sectioned();
    const equal = nav.classList.contains('lg-navbar--equal') || equalWidth;

    // Widths for every item; items behind More use their last width in the bar, or come back to be measured.
    let flow = flowItems();
    let measured = flow.map(widthOf);
    let moreWidth = more ? measureMore() : 0;
    if (measured.some((width) => width === undefined)) {
      restoreAll();
      flow = flowItems();
      measured = flow.map(widthOf);
    }
    let natural = measured.map((width) => width ?? 0);
    if (equal) {
      const widest = Math.max(0, ...natural);
      natural = natural.map((width) => (width ? widest : 0));
      moreWidth = Math.max(moreWidth, widest);
      nav.style.setProperty('--_lg-equal-width', `${widest}px`);
    } else nav.style.removeProperty('--_lg-equal-width');
    const widthFor = new Map(flow.map((button, index) => [button, natural[index] ?? 0]));
    const homeOf = (button: NavbarItem): HTMLElement => (more?.host.contains(button) ? homes.get(button) : button.parentElement as HTMLElement) ?? nav;

    const navSpace = horizontalSpace(nav);
    const rowLimit = overflowActive() ? (maxRows ?? (multi ? Infinity : 1)) : Infinity;
    const single = !multi;

    function unitsFor(kept: Set<NavbarItem>, moreHost: HTMLElement | undefined): Unit[] {
      const visible = flow.filter((button) => kept.has(button) && (widthFor.get(button) ?? 0) > 0);
      if (!isSectioned) {
        const units: Unit[] = visible.map((button) => ({ element: button, width: widthFor.get(button) ?? 0, row: rowOf(button) }));
        if (moreHost && more) units.push({ element: more.button, width: moreWidth, row: units[units.length - 1]?.row });
        return sortByRow(units);
      }
      const units: Unit[] = [];
      for (const section of sections().slice(1)) {
        const members = visible.filter((button) => homeOf(button) === section);
        const hasMore = moreHost === section && more !== undefined;
        if (!members.length && !hasMore) continue;
        const space = horizontalSpace(section);
        const memberWidths = members.map((button) => widthFor.get(button) ?? 0);
        if (hasMore) memberWidths.push(moreWidth);
        units.push({
          element: section,
          width: space.pad + memberWidths.reduce((sum, width) => sum + width, 0) + space.gap * Math.max(0, memberWidths.length - 1),
          row: rowOf(section),
        });
      }
      return sortByRow(units);
    }

    function sortByRow(units: Unit[]): Unit[] {
      if (!units.some((unit) => unit.row !== undefined)) return units;
      let row = 1;
      const rows = units.map((unit) => (row = unit.row ?? row));
      return units.map((unit, index) => ({ unit, row: rows[index] ?? 1, index }))
        .sort((a, b) => a.row - b.row || a.index - b.index)
        .map(({ unit, row: value }) => ({ ...unit, row: value }));
    }

    const fits = (units: Unit[]): Unit[][] | undefined => {
      const lines = breakLines(units, room, navSpace.gap, navSpace.pad, single);
      return lines.length <= rowLimit && lines.every((line) => lineWidth(line, navSpace.gap, navSpace.pad) <= room + .5) ? lines : undefined;
    };

    let kept = new Set(flow);
    let moreHost: HTMLElement | undefined;
    let lines = fits(unitsFor(kept, undefined));
    const limit = overflow?.maxVisible;
    const fixed = flow.filter((button) => button.getAttribute('data-navbar-overflow') === 'never');
    const movable = flow.filter((button) => !fixed.includes(button) && (widthFor.get(button) ?? 0) > 0);
    const tooMany = limit !== undefined && fixed.length + movable.length > limit;
    if (overflowActive() && (!lines || tooMany)) {
      lines = undefined;
      for (let keep = movable.length - 1; keep >= 0; keep--) {
        if (limit !== undefined && fixed.length + keep > limit) continue;
        kept = new Set([...fixed, ...movable.slice(0, keep)]);
        const lastKept = [...flow].reverse().find((button) => kept.has(button) && (widthFor.get(button) ?? 0) > 0);
        moreHost = isSectioned ? (lastKept ? homeOf(lastKept) : sections()[1]) : nav;
        lines = fits(unitsFor(kept, moreHost));
        if (lines) break;
      }
      if (!lines) {
        kept = new Set(fixed);
        moreHost = isSectioned ? sections()[1] ?? nav : nav;
        lines = breakLines(unitsFor(kept, moreHost), room, navSpace.gap, navSpace.pad, single);
      }
    }

    applyOverflow(flow, kept, moreHost);
    if (multi) applyRows(lines ?? breakLines(unitsFor(kept, moreHost), room, navSpace.gap, navSpace.pad, false), navSpace, split);
    else clearRows();
  }

  function measureMore(): number {
    if (!more) return 0;
    const { button } = more;
    const wasHidden = button.hidden;
    if (!button.parentElement) (sections()[sections().length - 1] ?? nav).append(button);
    button.hidden = false;
    const cached = widths.get(button);
    const key = widthKey(button);
    const width = compact && cached?.key === key ? cached.width : naturalWidth(button);
    if (!compact) widths.set(button, { key, width });
    button.hidden = wasHidden;
    return width;
  }

  function applyOverflow(flow: NavbarItem[], kept: Set<NavbarItem>, moreHost: HTMLElement | undefined): void {
    if (!more) return;
    const focused = document.activeElement;
    const leaving = flow.filter((button) => !kept.has(button) && !more!.host.contains(button));
    const returning = flow.filter((button) => kept.has(button) && more!.host.contains(button));
    if (leaving.length || returning.length) sequence = [...flow];
    for (const button of returning) restore(button);
    for (const button of leaving) homes.set(button, button.parentElement as HTMLElement);
    const away = flow.filter((button) => !kept.has(button));
    // Keep the menu in reading order; only touch items whose place changes.
    away.forEach((button, index) => {
      if (more!.host.children[index] !== button) more!.host.insertBefore(button, more!.host.children[index] ?? null);
    });
    const { button } = more;
    if (moreHost) {
      if (button.parentElement !== moreHost || button.nextElementSibling) moreHost.append(button);
      button.hidden = false;
    } else {
      button.hidden = true;
      if (more.popover.open) more.popover.hide();
    }
    if (focused instanceof HTMLElement && focused !== document.activeElement && focused.isConnected) {
      if (more.host.contains(focused) && !more.popover.open) button.focus({ preventScroll: true });
      else focused.focus({ preventScroll: true });
    }
    more.dot.hidden = !away.some((item) => badges.has(item));
    if (away.length !== lastOverflow.length || away.some((item, index) => lastOverflow[index] !== item)) {
      lastOverflow = away;
      options.onOverflowChange?.([...away]);
    }
  }

  function applyRows(lines: Unit[][], space: { pad: number; gap: number }, split: boolean): void {
    const widest = Math.max(0, ...lines.map((line) => lineWidth(line, space.gap, space.pad)));
    nav.style.setProperty('--_lg-rows-width', `${Math.ceil(widest + 1)}px`);
    const nextOrdered = new Set<HTMLElement>();
    lines.forEach((line, index) => {
      for (const unit of line) {
        nextOrdered.add(unit.element);
        if (unit.element.style.order !== String(index * 2)) unit.element.style.order = String(index * 2);
      }
    });
    for (const unit of orderedUnits) if (!nextOrdered.has(unit)) unit.style.removeProperty('order');
    orderedUnits = nextOrdered;
    while (breaks.length < lines.length - 1) {
      const line = document.createElement('span');
      line.className = 'lg-navbar__break';
      line.setAttribute('aria-hidden', 'true');
      nav.append(line);
      breaks.push(line);
    }
    breaks.splice(Math.max(0, lines.length - 1)).forEach((node) => node.remove());
    breaks.forEach((node, index) => { node.style.order = String(index * 2 + 1); });
    paintSurfaces(split ? lines.map((line) => line.map((unit) => unit.element)) : [], nav, space.pad / 2);
  }

  function paintSurfaces(groups: HTMLElement[][], host: HTMLElement, pad: number): void {
    const pool = surfaces.filter((surface) => surface.parentElement === host);
    while (pool.length < groups.length) {
      const surface = document.createElement('span');
      surface.className = 'lg-navbar__surface';
      surface.setAttribute('aria-hidden', 'true');
      host.insertBefore(surface, host === nav ? lens.nextSibling : host.firstChild);
      surfaces.push(surface);
      pool.push(surface);
    }
    for (const surface of pool.splice(groups.length)) {
      surface.remove();
      surfaces.splice(surfaces.indexOf(surface), 1);
    }
    groups.forEach((group, index) => {
      const surface = pool[index];
      if (!surface) return;
      // Inside a popover, measure from the layout: the popover may still be scaling in as it opens, and on-screen
      // boxes would bake that scale into the glass. The surfaces and the items share the same offset parent.
      const boxes = group.map((element) => (host === nav ? boxOf(element)
        : { left: element.offsetLeft, top: element.offsetTop, width: element.offsetWidth, height: element.offsetHeight }));
      const left = Math.min(...boxes.map((box) => box.left)) - pad;
      const top = Math.min(...boxes.map((box) => box.top)) - pad;
      const right = Math.max(...boxes.map((box) => box.left + box.width)) + pad;
      const bottom = Math.max(...boxes.map((box) => box.top + box.height)) + pad;
      Object.assign(surface.style, { left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${bottom - top}px` });
    });
  }

  // Items placed straight in a bar that also has sections (for example beside context actions) get a pill of
  // their own, like a section.
  function paintMixed(sectioned: boolean): void {
    const direct = buttonsIn(nav).filter(isAvailable);
    const mixed = sectioned && direct.length > 0 && !nav.classList.contains('lg-navbar--multirow');
    nav.classList.toggle('lg-navbar--mixed', mixed);
    for (const item of buttonsIn(nav)) item.removeAttribute('data-lg-navbar-run');
    if (!mixed) {
      if (!nav.classList.contains('lg-navbar--split')) {
        for (const surface of surfaces.filter((node) => node.parentElement === nav)) {
          surface.remove();
          surfaces.splice(surfaces.indexOf(surface), 1);
        }
      }
      return;
    }
    direct[0]?.setAttribute('data-lg-navbar-run', direct.length === 1 ? 'only' : 'start');
    if (direct.length > 1) direct[direct.length - 1]?.setAttribute('data-lg-navbar-run', 'end');
    paintSurfaces([direct], nav, 4);
  }

  function overflowOpen(): boolean {
    return Boolean(more?.popover.open);
  }

  function openOverflow({ focus = false }: { focus?: boolean } = {}): void {
    if (!more || more.button.hidden) return;
    more.popover.show({ focus });
  }

  // ---- Sync ----

  // ---- Opt-in motion ----

  let animations: Required<NavbarAnimations> = { reflow: false, popovers: false, tap: false, badges: false };
  let mounted = false;
  const motionOn = (kind: keyof NavbarAnimations): boolean => animations[kind] && !reducedMotion.matches;

  function setAnimations(value?: boolean | NavbarAnimations): void {
    const all = value === true;
    const pick = typeof value === 'object' ? value : {};
    animations = {
      reflow: all || Boolean(pick.reflow), popovers: all || Boolean(pick.popovers),
      tap: all || Boolean(pick.tap), badges: all || Boolean(pick.badges),
    };
    nav.classList.toggle('lg-navbar--anim-tap', animations.tap);
  }

  // Reflow glide: before a layout pass, note where every item is; after it, each moved item starts from its old
  // place (an offset) and springs to the new one.
  const glides = new Map<NavbarItem, { spring: Spring; dx: number; dy: number }>();
  const reflowing = (): boolean => mounted && motionOn('reflow') && !gesture?.dragging
    && !nav.classList.contains('lg-navbar--compacting') && enabled();

  function snapshot(): Map<NavbarItem, DOMRect> {
    const rects = new Map<NavbarItem, DOMRect>();
    for (const item of items()) if (!more?.host.contains(item) && isAvailable(item)) rects.set(item, item.getBoundingClientRect());
    return rects;
  }

  function glide(before: Map<NavbarItem, DOMRect>): void {
    for (const item of items()) {
      if (more?.host.contains(item) || !isAvailable(item)) continue;
      const now = item.getBoundingClientRect();
      const state = glides.get(item);
      const progress = state?.spring.value ?? 0;
      // Where the item really sits, without the offset of a glide still under way.
      const left = now.left - (state ? state.dx * progress : 0);
      const top = now.top - (state ? state.dy * progress : 0);
      const old = before.get(item);
      const dx = old ? old.left - left : 0;
      const dy = old ? old.top - top : 10;
      if (old && Math.abs(dx) < .5 && Math.abs(dy) < .5) continue;
      const entry = state ?? { dx: 0, dy: 0, spring: createSpring(0, (value) => {
        const glideState = glides.get(item);
        if (!glideState) return;
        item.style.translate = `${(glideState.dx * value).toFixed(2)}px ${(glideState.dy * value).toFixed(2)}px`;
      }, { response: .42, dampingRatio: .86, precision: .002, onRest: () => {
        item.style.removeProperty('translate');
        item.style.removeProperty('opacity');
        if (item.getAttribute('style') === '') item.removeAttribute('style');
        glides.delete(item);
      } }) };
      entry.dx = dx;
      entry.dy = dy;
      glides.set(item, entry);
      // An item that wasn't in the bar before rises in and fades up.
      if (!old) item.animate?.({ opacity: [0, 1] }, { duration: 180, easing: 'ease-out' });
      entry.spring.set(1);
      entry.spring.to(0);
    }
  }

  function sync(immediate = false): void {
    const before = reflowing() ? snapshot() : undefined;
    // With reflow glide on, the lens springs to its tab too instead of jumping.
    syncNow(before ? false : immediate);
    if (before) glide(before);
  }

  function syncNow(immediate: boolean): void {
    if (signal.aborted) return;
    // The gradual highlight only lives while the lens moves; never let it outlast the motion.
    if (ink && !spring.moving && !gesture?.dragging) clearInk();
    const isEnabled = enabled();
    nav.classList.toggle('lg-navbar--enabled', isEnabled);
    labelItems();
    // Mid-compact, labels are still drawn while they shrink, so measuring now would keep items behind More.
    if (!(compact && nav.classList.contains('lg-navbar--compacting'))) layoutPass();
    const groups = sections().slice(1);
    nav.classList.toggle('lg-navbar--sectioned', groups.length > 0);
    paintMixed(groups.length > 0);
    const split = nav.classList.contains('lg-navbar--split');
    const glass = groups.length ? groups : split ? surfaces.filter((surface) => surface.parentElement === nav) : [nav];
    if (more && overflowOpen()) {
      if (more.host.classList.contains('lg-navbar__overflow--individual')) {
        paintSurfaces(buttonsIn(more.host).map((button) => [button]), more.host, 0);
      }
      if (more.host.classList.contains('lg-navbar__overflow--shared')) glass.push(more.host);
      else if (more.host.classList.contains('lg-navbar__overflow--individual')) glass.push(...surfaces.filter((surface) => surface.parentElement === more!.host));
    }
    refraction?.sync(isEnabled ? glass : []);
    fitEqualWidth();
    nav.classList.toggle('lg-navbar--free', freeSwipe());
    updateContrast();
    const active = items().find((button) => button.getAttribute('aria-current') === 'page');
    const behindMore = Boolean(active && more?.host.contains(active));
    more?.button.toggleAttribute('data-navbar-overflow-current', behindMore);
    const expanded = more?.host.classList.contains('lg-navbar__overflow--expand') && overflowOpen();
    const target = active && behindMore ? (expanded && isAvailable(active) ? active : more?.button) : active && isAvailable(active) ? active : undefined;
    if (!target || (target === more?.button && !isAvailable(target))) {
      lens.hidden = true;
      spring.stop();
      clearInk();
      return;
    }
    placeLens(target);
    const { start } = measure(target as NavbarItem);
    // A swipe that just ended hands its speed to the spring, so the lens carries on and settles.
    const velocity = releaseVelocity && performance.now() - releaseVelocity.at < 600 ? releaseVelocity.value : undefined;
    releaseVelocity = undefined;
    if (immediate || !isEnabled) {
      if (!gesture?.dragging) clearInk();
      spring.set(start);
    } else {
      if (Math.abs(spring.value - start) > .5 || spring.moving) startInk();
      spring.to(start, velocity);
    }
  }

  function freeSwipe(): boolean {
    if (vertical() || reorderMode) return false;
    return nav.classList.contains('lg-navbar--multirow') || Boolean(more && !more.button.hidden) || popovers.size > 0;
  }

  function buttonAt(event: Event): NavbarItem | null {
    const button = event.target instanceof Element ? event.target.closest<NavbarItem>('button, a[href]') : null;
    return button && items().includes(button) && isAvailable(button) ? button : null;
  }

  function pointOf(event: PointerEvent): { x: number; y: number } {
    const rect = nav.getBoundingClientRect();
    return { x: event.clientX - rect.left - nav.clientLeft, y: event.clientY - rect.top - nav.clientTop };
  }

  function eventPosition(event: PointerEvent): number {
    const point = pointOf(event);
    return vertical() ? point.y : point.x;
  }

  function peers(button: NavbarItem): NavbarItem[] {
    return button.parentElement ? buttonsIn(button.parentElement) : [];
  }

  function reorder(order: readonly NavbarItem[]): void {
    if (order.length === 0) return;
    const section = order[0].parentElement;
    const original = peers(order[0]).filter((button) => button !== more?.button);
    if (!section || order.length !== original.length || new Set(order).size !== order.length ||
        order.some((button) => !original.includes(button) || !items().includes(button))) {
      throw new Error('Pass every button in one navbar section exactly once.');
    }
    const focused = document.activeElement;
    section.append(...order);
    if (more?.button.parentElement === section) section.append(more.button);
    sequence = flowItems();
    if ((focused instanceof HTMLButtonElement || focused instanceof HTMLAnchorElement) && order.includes(focused)) focused.focus({ preventScroll: true });
    options.onReorder?.([...order], section);
    sync(true);
  }

  function moveTo(button: NavbarItem, target: NavbarItem): void {
    if (button === target) return;
    const order = peers(button).filter((peer) => peer !== more?.button);
    const index = order.indexOf(target);
    if (index < 0) return;
    order.splice(order.indexOf(button), 1);
    order.splice(index, 0, button);
    reorder(order);
  }

  const presses = new Map<NavbarItem, Spring>();
  function pressSpring(item: NavbarItem): Spring {
    let spring = presses.get(item);
    if (!spring) {
      spring = createSpring(0, (value) => {
        if (Math.abs(value) < .001) item.style.removeProperty('--_lg-press');
        else item.style.setProperty('--_lg-press', value.toFixed(4));
      }, { response: .28, dampingRatio: .55, precision: .002 });
      presses.set(item, spring);
    }
    return spring;
  }
  function release(): void {
    for (const spring of presses.values()) spring.to(0);
  }
  const bounces = new Map<Element, Spring>();
  // The icon of a newly selected tab gives a bounce: it pops up, then settles with a little wobble.
  function bounce(item: NavbarItem): void {
    if (!motionOn('tap')) return;
    const icon = item.querySelector<HTMLElement>('[data-navbar-icon]');
    if (!icon) return;
    let spring = bounces.get(icon);
    if (!spring) {
      spring = createSpring(0, (value) => {
        if (Math.abs(value) < .001) icon.style.removeProperty('--_lg-bounce');
        else icon.style.setProperty('--_lg-bounce', value.toFixed(4));
      }, { response: .5, dampingRatio: .42, precision: .002 });
      bounces.set(icon, spring);
    }
    spring.set(1);
    spring.to(0);
  }

  function markCurrent(button: NavbarItem): void {
    if (button.getAttribute('aria-current') !== 'page') bounce(button);
    for (const current of nav.querySelectorAll('[aria-current="page"]')) current.removeAttribute('aria-current');
    button.setAttribute('aria-current', 'page');
  }

  function select(button: NavbarItem): void {
    if (options.autoSelect !== false) markCurrent(button);
    options.onSelect?.(button);
  }

  /** What a tap, a key press or the end of a swipe on an item does. */
  function activate(button: NavbarItem, { keyboard = false, swipe = false, keepOpen = false } = {}): void {
    if (more && button === more.button) {
      if (keepOpen) openOverflow();
      else if (overflowOpen()) more.popover.hide({ reason: 'trigger' });
      else openOverflow({ focus: keyboard });
      return;
    }
    if (context?.back && button === context.back) {
      const { onBack } = context;
      hideContextActions(keyboard);
      onBack?.();
      return;
    }
    const popover = popovers.get(button);
    if (popover) {
      if (keepOpen) popover.show();
      else popover.toggle({ focus: keyboard });
      return;
    }
    const fromOverflow = Boolean(more?.host.contains(button));
    if (isAction(button)) options.onAction?.(button);
    // A link is followed like a tap: its click selects it, then the browser navigates.
    else if (swipe && button instanceof HTMLAnchorElement) button.click();
    else select(button);
    if (fromOverflow) more?.popover.hide({ reason: 'selection', restoreFocus: keyboard });
  }

  function blendedSize(spans: { start: number; size: number }[], position: number): number {
    const centres = spans.map(({ start, size }) => start + size / 2);
    if (position <= centres[0]) return spans[0].size;
    for (let i = 1; i < spans.length; i++) {
      if (position <= centres[i]) {
        const t = (position - centres[i - 1]) / (centres[i] - centres[i - 1] || 1);
        return spans[i - 1].size + (spans[i].size - spans[i - 1].size) * t;
      }
    }
    return spans[spans.length - 1].size;
  }

  // Speed at release from the last ~100 ms of movement, in px per second.
  function velocityOf(points: { position: number; time: number }[]): number {
    if (points.length < 2) return 0;
    const first = points[0], last = points[points.length - 1];
    const seconds = (last.time - first.time) / 1000;
    return seconds > 0 ? (last.position - first.position) / seconds : 0;
  }

  function candidates(): NavbarItem[] {
    if (gesture?.draggedItem) return peers(gesture.draggedItem).filter((button) => isAvailable(button) && button !== more?.button);
    return items().filter(button => isAvailable(button) && allowsSwipe(button));
  }

  function closest(buttons: NavbarItem[], position: number): NavbarItem | undefined {
    return buttons.reduce<NavbarItem | undefined>((best, next) => {
      const { start, size } = measure(next);
      if (!best) return next;
      const current = measure(best);
      return Math.abs(start + size / 2 - position) < Math.abs(current.start + current.size / 2 - position) ? next : best;
    }, undefined);
  }

  // In two dimensions: the item whose box is nearest the point, so rows and the expanded row all take part.
  function closestTo(buttons: NavbarItem[], point: { x: number; y: number }): NavbarItem | undefined {
    let best: NavbarItem | undefined;
    let distance = Infinity;
    for (const button of buttons) {
      const box = boxOf(button);
      const dx = Math.max(box.left - point.x, 0, point.x - box.left - box.width);
      const dy = Math.max(box.top - point.y, 0, point.y - box.top - box.height);
      const score = dx * dx + dy * dy * 1.4;
      if (score < distance) {
        best = button;
        distance = score;
      }
    }
    return best;
  }

  /** Whether a point is level with an item along the bar, however far off the bar it is. */
  const inColumn = (button: HTMLElement, point: { x: number; y: number }): boolean => {
    const box = boxOf(button);
    return vertical()
      ? point.y >= box.top && point.y <= box.top + box.height
      : point.x >= box.left && point.x <= box.left + box.width;
  };

  /** Whether a point is level with an item across the bar: on the bar's own row, not off to its side. */
  const inRow = (button: HTMLElement, point: { x: number; y: number }): boolean => {
    const box = boxOf(button);
    return vertical()
      ? point.x >= box.left && point.x <= box.left + box.width
      : point.y >= box.top && point.y <= box.top + box.height;
  };

  /** Whether a point is on an element or within `margin` pixels of it. */
  const near = (element: HTMLElement, point: { x: number; y: number }, margin: number): boolean => {
    const box = boxOf(element);
    return point.x >= box.left - margin && point.x <= box.left + box.width + margin
      && point.y >= box.top - margin && point.y <= box.top + box.height + margin;
  };

  function finish(event: PointerEvent, cancelled = false): void {
    if (!gesture || gesture.id !== event.pointerId) return;
    const { dragging, draggedItem, free, openedOverflow } = gesture;
    const target = dragging && !cancelled
      ? (free ? freeTarget(candidates(), pointOf(event)) : closest(candidates(), eventPosition(event)))
      : undefined;
    gesture = undefined;
    if (dragging) releaseVelocity = { value: velocityOf(samples), at: performance.now() };
    samples = [];
    nav.classList.remove('lg-navbar--pressed', 'lg-navbar--dragging', 'lg-navbar--lens-away');
    items().forEach((button) => button.classList.remove('lg-navbar__preview'));
    if (nav.hasPointerCapture(event.pointerId)) nav.releasePointerCapture(event.pointerId);
    if (target) {
      suppressClick = true;
      if (draggedItem) moveTo(draggedItem, target);
      else activate(target, { swipe: true, keepOpen: openedOverflow && target === more?.button });
    }
    // More opened by sliding onto it during this swipe closes again unless the finger lifted on More or inside it.
    if (openedOverflow && more && target !== more.button && !(target && more.host.contains(target))) {
      more.popover.hide({ reason: 'selection' });
    }
    sync();
    if (heldCompact !== undefined) setCompact(heldCompact);
  }

  // Links can be dragged out of the page by default, which cancels the swipe as soon as it starts.
  nav.addEventListener('dragstart', (event) => {
    if (enabled() && buttonAt(event)) event.preventDefault();
  }, { signal });
  nav.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick = false;
    const button = buttonAt(event);
    if (!button || !enabled() || (!reorderMode && !allowsSwipe(button))) return;
    gesture = {
      id: event.pointerId,
      start: vertical() ? event.clientY : event.clientX,
      crossStart: vertical() ? event.clientX : event.clientY,
      origin: { x: event.clientX, y: event.clientY },
      free: freeSwipe(),
      dragging: false,
      draggedItem: reorderMode ? button : null,
      openedOverflow: false,
    };
    nav.classList.add('lg-navbar--pressed');
  }, { signal });
  window.addEventListener('pointermove', (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    let buttons = candidates();
    const canReveal = Boolean(more && !more.button.hidden && buttons.includes(more.button));
    if (buttons.length < 2 && !canReveal) return;
    if (!gesture.dragging) {
      if (gesture.free) {
        if (Math.hypot(event.clientX - gesture.origin.x, event.clientY - gesture.origin.y) < 6) return;
      } else {
        const delta = Math.abs((vertical() ? event.clientY : event.clientX) - gesture.start);
        const crossDelta = Math.abs((vertical() ? event.clientX : event.clientY) - gesture.crossStart);
        if (delta < 6 || delta < crossDelta) return;
      }
      gesture.dragging = true;
      try { nav.setPointerCapture(event.pointerId); } catch { /* The window still tracks this gesture. */ }
      startInk();
      release();
      nav.classList.add('lg-navbar--dragging');
    }
    if (gesture.free) return dragFree(event, buttons);
    const position = eventPosition(event);
    const target = closest(buttons, position);
    if (!target) return;
    samples = [...samples.filter((sample) => event.timeStamp - sample.time < 100), { position, time: event.timeStamp }];
    // The lens follows the finger, its size blending between the two items it's between; past the first or last
    // item it gives like a rubber band instead of stopping dead.
    buttons = buttons.filter((button) => !more?.host.contains(button));
    const spans = buttons.map(measure).sort((a, b) => a.start - b.start);
    const size = blendedSize(spans, position);
    const offset = position - size / 2;
    const min = spans[0].start, max = spans[spans.length - 1].start + spans[spans.length - 1].size - size;
    placeLens(target, size);
    spring.set(rubberBanded(offset, min, max, size));
    items().forEach((button) => button.classList.toggle('lg-navbar__preview', button === target));
  }, { passive: true, signal });

  /** The item a free swipe points at. With More open, a finger off to the side of its items means the bar. */
  function freeTarget(buttons: NavbarItem[], point: { x: number; y: number }): NavbarItem | undefined {
    if (more && overflowOpen() && !near(more.host, point, 12)) {
      const inBar = buttons.filter((button) => !more!.host.contains(button));
      if (inBar.length) return closestTo(inBar, point);
    }
    return closestTo(buttons, point);
  }

  function dragFree(event: PointerEvent, buttons: NavbarItem[]): void {
    if (!gesture) return;
    const point = pointOf(event);
    const target = freeTarget(buttons, point);
    if (!target) return;
    // Sliding onto More opens it without ending the gesture; the same finger carries on into the new row.
    // The finger needn't be on the bar itself: being level with More, above or below it, is enough.
    if (more && target === more.button && !overflowOpen() && inColumn(target, point)) {
      openOverflow();
      gesture.openedOverflow = true;
      reink();
    }
    // ...and closes again as soon as the finger is level with another tab in the bar, unless it's on its way into
    // the open row; sliding back onto More reopens it.
    else if (more && gesture.openedOverflow && overflowOpen() && target !== more.button
      && !more.host.contains(target) && inColumn(target, point) && (inRow(target, point) || !near(more.host, point, 12))) {
      more.popover.hide({ reason: 'selection' });
      reink();
    }
    samples = [...samples.filter((sample) => event.timeStamp - sample.time < 100), { position: point.x, time: event.timeStamp }];
    items().forEach((button) => button.classList.toggle('lg-navbar__preview', button === target));
    const inMenu = Boolean(more?.host.classList.contains('lg-navbar__overflow--menu') && more.host.contains(target));
    nav.classList.toggle('lg-navbar--lens-away', inMenu);
    if (inMenu) return;
    const box = boxOf(target);
    const row = buttons.filter((button) => {
      if (more?.host.contains(button) !== more?.host.contains(target)) return false;
      return Math.abs(boxOf(button).top - box.top) < 4;
    });
    const spans = row.map((button) => ({ start: boxOf(button).left, size: boxOf(button).width })).sort((a, b) => a.start - b.start);
    const size = blendedSize(spans, point.x);
    const min = spans[0].start, max = spans[spans.length - 1].start + spans[spans.length - 1].size - size;
    placeLens(target, size);
    spring.set(rubberBanded(point.x - size / 2, min, max, size));
  }

  nav.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0 || !motionOn('tap')) return;
    const item = buttonAt(event);
    if (item) pressSpring(item).to(1);
  }, { signal });
  window.addEventListener('pointerup', release, { signal });
  window.addEventListener('pointercancel', release, { signal });
  window.addEventListener('pointerup', (event) => finish(event), { signal });
  window.addEventListener('pointercancel', (event) => finish(event, true), { signal });
  nav.addEventListener('lostpointercapture', (event) => {
    if (event.target === nav) finish(event, true);
  }, { signal });
  nav.addEventListener('click', (event) => {
    if (suppressClick && event.detail > 0) {
      suppressClick = false;
      event.stopPropagation();
      return;
    }
    const button = buttonAt(event);
    if (!button || reorderMode) return;
    activate(button, { keyboard: event.detail === 0 });
    sync();
  }, { signal });
  nav.addEventListener('keydown', (event) => {
    if (!options.reorderable || !event.altKey) return;
    const button = buttonAt(event);
    if (!button) return;
    const direction = event.key === (vertical() ? 'ArrowUp' : 'ArrowLeft') ? -1
      : event.key === (vertical() ? 'ArrowDown' : 'ArrowRight') ? 1 : 0;
    const available = peers(button).filter((peer) => isAvailable(peer) && peer !== more?.button);
    const target = available[available.indexOf(button) + direction];
    if (!direction || !target) return;
    event.preventDefault();
    moveTo(button, target);
  }, { signal });

  function setPosition(position?: NavbarPosition): void {
    placement = position;
    if (position) nav.dataset.lgNavbarPosition = position;
    else delete nav.dataset.lgNavbarPosition;
    nav.classList.toggle('lg-navbar--vertical', vertical());
    sync(true);
  }

  let equalWidth = false;
  let equalOverflow: EqualWidthOverflow = 'natural';
  // 'natural' keeps equal widths only while every label fits; 'truncate' and 'grow' always keep them.
  function fitEqualWidth(): void {
    nav.classList.toggle('lg-navbar--equal', equalWidth);
    nav.classList.toggle('lg-navbar--equal-truncate', equalWidth && equalOverflow === 'truncate');
    nav.classList.toggle('lg-navbar--equal-grow', equalWidth && equalOverflow === 'grow');
    if (equalWidth && equalOverflow === 'natural' && !nav.classList.contains('lg-navbar--multirow')
        && items().some((button) => isAvailable(button) && !more?.host.contains(button) && !fits(button))) {
      nav.classList.remove('lg-navbar--equal');
    }
  }

  // Does the button's content (icon, label) fit inside it? Labels don't wrap, so they overflow when it's too narrow.
  function fits(button: NavbarItem): boolean {
    const style = getComputedStyle(button);
    const room = button.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return [...button.children].every((child) => child.classList.contains('lg-navbar__badge')
      || child.classList.contains('lg-navbar__sr') || child.getBoundingClientRect().width <= room + 1);
  }

  function setEqualWidth(equal: boolean, overflowMode: EqualWidthOverflow = equalOverflow): void {
    equalWidth = equal;
    equalOverflow = overflowMode;
    sync(true);
  }

  function setLabels(visible: boolean): void {
    nav.classList.toggle('lg-navbar--no-labels', !visible);
    sync(true);
  }

  function setBackground(background?: string): void {
    if (background !== undefined && !CSS.supports('background', background)) throw new Error('Invalid navbar background.');
    if (background === undefined) nav.style.removeProperty('--lg-nav-background');
    else nav.style.setProperty('--lg-nav-background', background);
  }

  // Each colour becomes a CSS variable on the bar; leaving one out falls back to the theme.
  const COLOR_VARIABLES: Record<keyof NavbarColors, string> = {
    selected: '--lg-nav-accent',
    unselected: '--lg-nav-muted',
    selectedIcon: '--lg-nav-icon-accent',
    selectedLabel: '--lg-nav-label-accent',
    unselectedIcon: '--lg-nav-icon-color',
    unselectedLabel: '--lg-nav-label-color',
  };
  const originalColors = new Map(Object.values(COLOR_VARIABLES).map((variable) => [
    variable, { value: nav.style.getPropertyValue(variable), priority: nav.style.getPropertyPriority(variable) },
  ]));
  function setColors(colors: NavbarColors = {}): void {
    for (const [key, variable] of Object.entries(COLOR_VARIABLES) as [keyof NavbarColors, string][]) {
      const value = colors[key];
      if (value) nav.style.setProperty(variable, value);
      else {
        const original = originalColors.get(variable);
        if (original?.value) nav.style.setProperty(variable, original.value, original.priority);
        else nav.style.removeProperty(variable);
      }
    }
  }

  // ---- Transparency and adaptive contrast ----

  let transparency: number | undefined;
  let contrast: ContrastOptions | undefined;
  let backdropSignal: BackdropSignal | undefined;
  let backdrop: Required<BackdropSignal> = { tone: 'light', busy: false };
  let appliedTint: number | undefined | null = null;
  let contrastWatch: AbortController | undefined;
  let contrastFrame = 0;

  function setTransparency(percentage?: number): void {
    if (percentage !== undefined && (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)) {
      throw new RangeError('Navbar transparency must be between 0 and 100.');
    }
    transparency = percentage;
    applyTint();
  }

  function applyTint(): void {
    const adaptive = contrast?.adaptiveTint;
    const busyTint = typeof adaptive === 'object' ? adaptive.busy ?? 34 : 34;
    const value = adaptive && backdrop.busy ? Math.min(transparency ?? 60, busyTint) : transparency;
    if (value === appliedTint) return;
    appliedTint = value;
    nav.classList.toggle('lg-navbar--custom-tint', value !== undefined);
    nav.classList.toggle('lg-navbar--clear', value === 100);
    refraction?.setTransparency(value);
    if (value === undefined) nav.style.removeProperty('--lg-nav-tint');
    else nav.style.setProperty('--lg-nav-tint', String(1 - value / 100));
  }

  function regions(): Iterable<Element> {
    const source = contrast?.regions ?? '[data-navbar-backdrop]';
    return typeof source === 'string' ? document.querySelectorAll(source) : source();
  }

  function updateContrast(): void {
    if (!contrast && !backdropSignal) {
      if (nav.hasAttribute('data-lg-navbar-backdrop')) nav.removeAttribute('data-lg-navbar-backdrop');
      nav.classList.remove('lg-navbar--busy');
      backdrop = { tone: 'light', busy: false };
      applyTint();
      return;
    }
    const detected = contrast ? readBackdrop(nav, regions()) : { tone: 'light' as const, busy: false };
    backdrop = { tone: backdropSignal?.tone ?? detected.tone, busy: backdropSignal?.busy ?? detected.busy };
    if (nav.getAttribute('data-lg-navbar-backdrop') !== backdrop.tone) nav.setAttribute('data-lg-navbar-backdrop', backdrop.tone);
    nav.classList.toggle('lg-navbar--busy', backdrop.busy);
    applyTint();
  }

  function scheduleContrast(): void {
    if (!contrastFrame) contrastFrame = requestAnimationFrame(() => { contrastFrame = 0; updateContrast(); });
  }

  function setContrast(value?: boolean | ContrastOptions): void {
    contrast = value === true ? {} : value || undefined;
    contrastWatch?.abort();
    contrastWatch = undefined;
    if (contrast) {
      contrastWatch = new AbortController();
      const watch = { passive: true, capture: true, signal: contrastWatch.signal } as const;
      addEventListener('scroll', scheduleContrast, watch);
      addEventListener('resize', scheduleContrast, watch);
    }
    updateContrast();
  }

  // ---- Badges ----

  // Badge motion: one spring on the badge's scale.
  function popBadge(node: HTMLElement, from: number, to: number, onRest?: () => void): void {
    if (!motionOn('badges')) { onRest?.(); return; }
    const spring = createSpring(from, (value) => { node.style.scale = String(Math.max(0, value)); }, {
      response: .38, dampingRatio: .5, precision: .002,
      onRest: () => { node.style.removeProperty('scale'); onRest?.(); },
    });
    spring.set(from);
    spring.to(to);
  }

  function setBadge(item: NavbarItem, badge: NavbarBadge | null): void {
    if (!items().includes(item) && !item.closest('.lg-navbar__overflow')) throw new Error('The button does not belong to this navbar.');
    const existing = badges.get(item);
    const shown = badge && !('count' in badge && badge.count <= 0) ? badge : null;
    if (existing) {
      existing.text.remove();
      if (existing.describedBy === null) item.removeAttribute('aria-describedby');
      else item.setAttribute('aria-describedby', existing.describedBy);
      badges.delete(item);
      // A badge that stays is updated in place and pulses if it changed; one that goes shrinks away.
      if (!shown) {
        const node = existing.badge;
        popBadge(node, 1, 0, () => node.remove());
      }
    }
    if (shown) {
      const node = existing?.badge ?? document.createElement('span');
      const before = node.textContent + (node.dataset.kind ?? '') + (node.dataset.tone ?? '');
      node.className = 'lg-navbar__badge';
      node.setAttribute('aria-hidden', 'true');
      delete node.dataset.tone;
      const text = document.createElement('span');
      text.className = 'lg-navbar__sr';
      text.id = `lg-navbar-badge-${++badgeSequence}`;
      if ('count' in shown) {
        const max = shown.max ?? 99;
        node.dataset.kind = 'count';
        node.textContent = shown.count > max ? `${max}+` : String(shown.count);
        text.textContent = shown.label ?? `${shown.count} new`;
      } else if ('dot' in shown) {
        node.dataset.kind = 'dot';
        node.textContent = '';
        text.textContent = shown.label ?? 'New';
      } else {
        node.dataset.kind = 'status';
        node.dataset.tone = shown.status;
        node.textContent = '';
        text.textContent = shown.label;
      }
      const describedBy = item.getAttribute('aria-describedby');
      if (!existing) item.append(node);
      item.append(text);
      item.setAttribute('aria-describedby', [describedBy, text.id].filter(Boolean).join(' '));
      badges.set(item, { badge: node, text, describedBy });
      if (!existing) popBadge(node, 0, 1);
      else if (before !== node.textContent + (node.dataset.kind ?? '') + (node.dataset.tone ?? '')) popBadge(node, 1.35, 1);
    }
    sync(true);
  }

  // ---- Compact ----

  let stopScroll: (() => void) | undefined;
  // Compacting animates: each label's width, height and opacity follow one spring (0 = labels, 1 = icons only),
  // so the tabs and the lens resize smoothly and a change of direction mid-way turns round from where it is.
  // At rest the plain `lg-navbar--compact` class takes over and the bar lays out normally again.
  const compactLabels = new Set<HTMLElement>();
  const compactSpring = createSpring(0, (value) => {
    nav.style.setProperty('--_lg-compact', value.toFixed(4));
    followActive();
  }, { response: .34, dampingRatio: 1, precision: .002, onRest: (value) => finishCompact(value > .5) });

  function followActive(): void {
    const active = items().find((button) => button.getAttribute('aria-current') === 'page');
    const target = active && more?.host.contains(active) && !overflowOpen() ? more.button : active;
    // Mid-swipe the finger owns the lens; the swipe's own end settles it.
    if (!target || !isAvailable(target) || gesture?.dragging) return;
    placeLens(target);
    // An instant move cancels any spring, so its rest never comes: the gradual highlight ends here instead.
    spring.set(measure(target).start);
    clearInk();
  }

  function finishCompact(value: boolean): void {
    nav.classList.toggle('lg-navbar--compact', value);
    nav.classList.remove('lg-navbar--compacting');
    nav.style.removeProperty('--_lg-compact');
    for (const label of compactLabels) {
      label.style.removeProperty('--_lg-label-w');
      label.style.removeProperty('--_lg-label-h');
    }
    compactLabels.clear();
    sync(true);
  }

  function setCompact(value: boolean): void {
    // Scrolling under a swipe (or Safari resizing its toolbar) mustn't reshape the bar beneath the finger:
    // the change waits for the swipe to end.
    if (gesture?.dragging) {
      heldCompact = value;
      return;
    }
    heldCompact = undefined;
    if (value === compact) return;
    compact = value;
    options.onCompactChange?.(value);
    if (reducedMotion.matches || !enabled()) {
      compactSpring.set(value ? 1 : 0);
      finishCompact(value);
      return;
    }
    if (!nav.classList.contains('lg-navbar--compacting')) {
      compactSpring.set(value ? 0 : 1);
      nav.style.setProperty('--_lg-compact', value ? '0' : '1');
    }
    nav.classList.add('lg-navbar--compacting');
    nav.classList.remove('lg-navbar--compact');
    // Each label's natural size is where it animates from or to; scroll sizes ignore the clipping.
    for (const label of nav.querySelectorAll<HTMLElement>('[data-navbar-label]:not(.lg-navbar__ink)')) {
      compactLabels.add(label);
      label.style.setProperty('--_lg-label-w', `${label.scrollWidth + 1}px`);
      label.style.setProperty('--_lg-label-h', `${label.scrollHeight}px`);
    }
    compactSpring.to(value ? 1 : 0);
    // Expanding: items that won't fit with labels go behind More first, then the labels grow. Compacting does
    // the reverse: the labels shrink, then items come back from More when it settles (in finishCompact).
    if (!value) sync(true);
  }
  function setScrollCompact(value?: boolean | ScrollCompactOptions): void {
    stopScroll?.();
    stopScroll = undefined;
    nav.classList.toggle('lg-navbar--compactable', Boolean(value));
    if (!value) return;
    stopScroll = watchScrollDirection(value === true ? {} : value, setCompact);
  }

  // ---- Context actions ----

  function showContextActions(nodes: readonly HTMLElement[], contextOptions: ContextActionsOptions = {}): void {
    if (context) hideContextActions(false);
    more?.popover.hide();
    for (const popover of popovers.values()) popover.hide();
    const focusInside = nav.contains(document.activeElement);
    const placement = contextOptions.placement ?? 'replace';
    const target = placement instanceof HTMLElement ? placement : undefined;
    if (target && (!nav.contains(target) || target === nav)) throw new Error('The placement must be a section or item of this navbar.');
    // An item as the target takes the actions in its own section; anything else gets them in pills.
    const loose = target !== undefined && !target.hasAttribute('data-navbar-section');
    const restore = nodes.map((node) => ({ node, className: node.className, style: node.getAttribute('style') }));
    let back: HTMLButtonElement | undefined;
    if (contextOptions.back) {
      const settings = contextOptions.back === true ? {} : contextOptions.back;
      back = document.createElement('button');
      back.type = 'button';
      back.className = 'lg-navbar__back';
      for (const name of ['data-navbar-action', 'data-navbar-generated', 'data-navbar-overflow']) back.setAttribute(name, name === 'data-navbar-overflow' ? 'never' : '');
      const icon = settings.icon ? settings.icon.cloneNode(true) as Element : svgIcon('M15 5l-7 7 7 7');
      icon.setAttribute('data-navbar-icon', '');
      icon.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span');
      text.setAttribute('data-navbar-label', '');
      text.textContent = settings.label ?? 'Back';
      back.append(icon, text);
    }
    // Wrap runs of loose items into pills of their own; your sections are used as they are.
    const inserted: HTMLElement[] = [];
    const queue: HTMLElement[] = back ? [back, ...nodes] : [...nodes];
    if (loose) inserted.push(...queue);
    else {
      let run: HTMLElement | undefined;
      for (const node of queue) {
        if (node.hasAttribute('data-navbar-section')) {
          run = undefined;
          inserted.push(node);
          continue;
        }
        if (!run) {
          run = document.createElement('div');
          run.setAttribute('data-navbar-section', '');
          run.setAttribute('data-navbar-generated', '');
          inserted.push(run);
        }
        run.append(node);
      }
    }
    const look = contextOptions.look;
    for (const node of inserted) {
      node.setAttribute(CONTEXT, '');
      if (contextOptions.className) node.classList.add(...contextOptions.className.split(/\s+/).filter(Boolean));
      if (!look) continue;
      for (const [key, variable] of Object.entries(COLOR_VARIABLES) as [keyof NavbarColors, string][]) {
        const value = look.colors?.[key];
        if (value) node.style.setProperty(variable, value);
      }
      if (look.background !== undefined && CSS.supports('background', look.background)) node.style.setProperty('--lg-nav-background', look.background);
      if (look.transparency !== undefined) node.style.setProperty('--lg-nav-tint', String(1 - Math.min(100, Math.max(0, look.transparency)) / 100));
    }
    context = {
      inserted, restore, back, replace: placement === 'replace', hidden: target, onBack: contextOptions.onBack,
      current: items().find((button) => button.getAttribute('aria-current') === 'page'),
      label: nav.getAttribute('aria-label'),
    };
    if (placement === 'replace') {
      nav.append(...inserted);
      nav.classList.add('lg-navbar--context');
      // Rows belong to the hidden navigation; the actions lay out as one row.
      nav.classList.remove('lg-navbar--multirow', 'lg-navbar--wrap', 'lg-navbar--split');
      nav.style.removeProperty('--_lg-rows-width');
    } else if (placement === 'start') {
      const first = [...nav.children].find((child) => child.matches('[data-navbar-section], button, a[href]'));
      for (const node of inserted) nav.insertBefore(node, first ?? null);
    } else if (placement === 'end') {
      nav.append(...inserted);
    } else if (target) {
      target.after(...inserted);
      target.setAttribute('data-navbar-context-hidden', '');
    }
    if (contextOptions.label) nav.setAttribute('aria-label', contextOptions.label);
    sync(true);
    if (focusInside) (back ?? items().find((item) => inserted.some((node) => node.contains(item)) && isAvailable(item)))?.focus({ preventScroll: true });
  }

  function hideContextActions(focus = true): void {
    if (!context) return;
    const { inserted, restore, current, label, hidden, back } = context;
    const focusInside = inserted.some((node) => node.contains(document.activeElement));
    for (const node of inserted) {
      for (const marked of node.querySelectorAll('[aria-current="page"]')) marked.removeAttribute('aria-current');
      if (node.getAttribute('aria-current') === 'page') node.removeAttribute('aria-current');
      node.remove();
    }
    back?.remove();
    // Your nodes come back exactly as they were, outside any pill the bar made for them.
    for (const { node, className, style } of restore) {
      node.remove();
      node.removeAttribute(CONTEXT);
      node.className = className;
      if (style === null) node.removeAttribute('style');
      else node.setAttribute('style', style);
    }
    hidden?.removeAttribute('data-navbar-context-hidden');
    context = undefined;
    nav.classList.remove('lg-navbar--context');
    if (label === null) nav.removeAttribute('aria-label');
    else nav.setAttribute('aria-label', label);
    if (current?.isConnected) markCurrent(current);
    sync(true);
    if (focus && focusInside) (current && isAvailable(current) ? current : more?.button ?? items().find(isAvailable))?.focus({ preventScroll: true });
  }

  // ---- Magnify: each icon's amount (0..1) is its own spring, so passing over it rises and settles smoothly ----

  let magnify: Required<NavbarMagnifyOptions> | undefined;
  const magnifySprings = new Map<NavbarItem, ReturnType<typeof createSpring>>();
  let magnifyPoint: { x: number; y: number } | undefined;
  let magnifyFrame = 0;

  function magnifySpring(item: NavbarItem): ReturnType<typeof createSpring> {
    let spring = magnifySprings.get(item);
    if (!spring) {
      spring = createSpring(0, (value) => {
        if (value < .001) item.style.removeProperty('--_lg-magnify');
        else item.style.setProperty('--_lg-magnify', value.toFixed(4));
      }, { response: .28, dampingRatio: 1, precision: .001 });
      magnifySprings.set(item, spring);
    }
    return spring;
  }

  function applyMagnify(): void {
    magnifyFrame = 0;
    if (!magnify) return;
    const point = magnifyPoint;
    const range = magnify.range;
    for (const item of items()) {
      let amount = 0;
      const inMenu = Boolean(more?.host.contains(item) && more.host.classList.contains('lg-navbar__overflow--menu'));
      if (point && isAvailable(item) && !inMenu) {
        const box = boxOf(item);
        const dx = point.x - (box.left + box.width / 2);
        const dy = point.y - (box.top + box.height / 2);
        // Along the bar the falloff is smooth; across it, only rows the pointer is near react.
        const along = vertical() ? Math.abs(dy) : Math.abs(dx);
        const across = Math.max(0, (vertical() ? Math.abs(dx) - box.width / 2 : Math.abs(dy) - box.height / 2));
        const distance = Math.hypot(along, across * 1.5);
        // Mid-swipe only the row the lens is in reacts; the point is already level with it.
        const otherRow = Boolean(gesture?.dragging) && across > 0;
        amount = distance < range && !otherRow ? (1 + Math.cos(Math.PI * distance / range)) / 2 : 0;
      }
      const spring = magnifySprings.get(item);
      if (amount > 0 || (spring && spring.target !== 0)) magnifySpring(item).to(amount);
    }
  }

  function magnifyAt(point: { x: number; y: number } | undefined): void {
    if (!magnify || reducedMotion.matches) return;
    magnifyPoint = point;
    if (!point) { applyMagnify(); return; }
    if (!magnifyFrame) magnifyFrame = requestAnimationFrame(applyMagnify);
  }

  function clearMagnify(): void {
    cancelAnimationFrame(magnifyFrame);
    magnifyFrame = 0;
    for (const [item, spring] of magnifySprings) {
      spring.stop();
      item.style.removeProperty('--_lg-magnify');
    }
    magnifySprings.clear();
  }

  function setMagnify(value?: boolean | NavbarMagnifyOptions): void {
    const settings = value === true ? {} : value || undefined;
    magnify = settings ? { scale: settings.scale ?? 1.4, lift: settings.lift ?? 10, range: settings.range ?? 110 } : undefined;
    nav.classList.toggle('lg-navbar--magnify', Boolean(magnify));
    if (magnify) {
      nav.style.setProperty('--_lg-magnify-scale', String(magnify.scale));
      nav.style.setProperty('--_lg-magnify-lift', `${magnify.lift}px`);
    } else {
      nav.style.removeProperty('--_lg-magnify-scale');
      nav.style.removeProperty('--_lg-magnify-lift');
      clearMagnify();
    }
  }

  nav.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse' && !gesture) magnifyAt(pointOf(event));
  }, { signal, passive: true });
  nav.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse' && !gesture) magnifyAt(undefined);
  }, { signal });
  // A finger magnifies while it's down and sliding; the window sees those moves once the nav captures them.
  window.addEventListener('pointermove', (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const point = pointOf(event);
    // Mid-swipe the finger drives the row the lens is in, however far off the bar it's held.
    if (gesture.dragging && !lens.hidden && !nav.classList.contains('lg-navbar--lens-away')) {
      const box = boxOf(lens);
      if (vertical()) point.x = box.left + box.width / 2;
      else point.y = box.top + box.height / 2;
    }
    magnifyAt(point);
  }, { signal, passive: true });
  window.addEventListener('pointerup', (event) => {
    if (event.pointerType !== 'mouse') magnifyAt(undefined);
  }, { signal });
  window.addEventListener('pointercancel', () => magnifyAt(undefined), { signal });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) clearMagnify(); }, { signal });

  // While compacting animates, the spring keeps the lens in place; the full layout runs once it settles.
  const observer = new ResizeObserver(() => { if (!gesture?.dragging && !nav.classList.contains('lg-navbar--compacting')) sync(true); });
  observer.observe(nav);
  if (nav.parentElement) observer.observe(nav.parentElement);
  // A bar that fell back to natural widths may fit equal ones again after the window grows, without itself resizing.
  addEventListener('resize', () => { if ((equalWidth || overflow || layout !== 'row') && !gesture?.dragging) sync(true); }, { signal, passive: true });
  // Web fonts change label widths after the first layout.
  document.fonts?.addEventListener?.('loadingdone', () => sync(true), { signal });
  equalWidth = options.equalWidth ?? false;
  equalOverflow = options.equalWidthOverflow ?? 'natural';
  compact = options.compact ?? false;
  nav.classList.toggle('lg-navbar--compact', compact);
  nav.classList.toggle('lg-navbar--no-labels', !(options.labels ?? true));
  setBackground(options.background);
  setTransparency(options.transparency);
  setColors(options.colors);
  setContrast(options.contrast);
  setScrollCompact(options.scrollCompact);
  setMagnify(options.magnify);
  setAnimations(options.animations);
  setPosition(placement);
  // From here on, changes may animate; the first layout above never does.
  mounted = true;

  return {
    sync: () => sync(),
    setPosition,
    setLabels,
    setEqualWidth,
    setBackground,
    setTransparency,
    refreshRefraction: () => refraction?.refreshSources(),
    setColors,
    setItemVisibility(button, { icon, label }) {
      if (!items().includes(button)) throw new Error('The button does not belong to this navbar.');
      if (icon !== undefined) button.toggleAttribute('data-navbar-hide-icon', !icon);
      if (label !== undefined) button.toggleAttribute('data-navbar-hide-label', !label);
      sync(true);
    },
    setReorderMode(active) {
      reorderMode = Boolean(options.reorderable && active);
      nav.classList.toggle('lg-navbar--reordering', reorderMode);
      sync(true);
    },
    reorder,
    select(item) {
      if (!items().includes(item)) throw new Error('The button does not belong to this navbar.');
      markCurrent(item);
      sync();
    },
    setLayout(next, rows) {
      layout = next;
      maxRows = rows;
      sync(true);
    },
    setOverflow(next) {
      removeMore();
      overflow = overflowSettings(next);
      sync(true);
    },
    get overflowItems() { return more ? buttonsIn(more.host) : []; },
    openOverflow,
    closeOverflow() { more?.popover.hide(); },
    setBadge,
    setCompact,
    setScrollCompact,
    get compact() { return compact; },
    setContrast,
    setBackdrop(next) {
      backdropSignal = next && (next.tone !== undefined || next.busy !== undefined) ? { ...next } : undefined;
      updateContrast();
    },
    showContextActions,
    hideContextActions: () => hideContextActions(),
    get contextActive() { return context !== undefined; },
    setMagnify,
    setAnimations,
    createPopover(trigger, content, popoverOptions = {}) {
      if (!items().includes(trigger)) throw new Error('The button does not belong to this navbar.');
      popovers.get(trigger)?.destroy();
      const popover = createAnchoredPopover(trigger, content, {
        container: nav, anchor: trigger.parentElement ?? nav, spring: () => motionOn('popovers'), ...popoverOptions, bindTrigger: false,
        className: `lg-navbar__popover${popoverOptions.className ? ` ${popoverOptions.className}` : ''}`,
      });
      const destroy = popover.destroy;
      const registered: AnchoredPopover = Object.assign(Object.create(popover) as AnchoredPopover, {
        destroy() {
          destroy();
          if (popovers.get(trigger) === registered) popovers.delete(trigger);
          sync(true);
        },
      });
      popovers.set(trigger, registered);
      sync(true);
      return registered;
    },
    destroy() {
      hideContextActions(false);
      for (const popover of [...popovers.values()]) popover.destroy();
      for (const item of [...badges.keys()]) {
        const entry = badges.get(item);
        if (!entry) continue;
        entry.badge.remove();
        entry.text.remove();
        if (entry.describedBy === null) item.removeAttribute('aria-describedby');
        else item.setAttribute('aria-describedby', entry.describedBy);
      }
      badges.clear();
      clearInk();
      for (const [item, { spring }] of glides) { spring.stop(); item.style.removeProperty('translate'); }
      glides.clear();
      for (const [item, spring] of presses) { spring.stop(); item.style.removeProperty('--_lg-press'); }
      presses.clear();
      for (const [icon, spring] of bounces) { spring.stop(); (icon as HTMLElement).style.removeProperty('--_lg-bounce'); }
      bounces.clear();
      listeners.abort();
      contrastWatch?.abort();
      cancelAnimationFrame(contrastFrame);
      stopScroll?.();
      compactSpring.stop();
      for (const label of compactLabels) {
        label.style.removeProperty('--_lg-label-w');
        label.style.removeProperty('--_lg-label-h');
      }
      nav.style.removeProperty('--_lg-compact');
      clearMagnify();
      nav.style.removeProperty('--_lg-magnify-scale');
      nav.style.removeProperty('--_lg-magnify-lift');
      removeMore();
      clearRows();
      refraction?.destroy();
      observer.disconnect();
      spring.stop();
      if (gesture && nav.hasPointerCapture(gesture.id)) nav.releasePointerCapture(gesture.id);
      items().forEach((button) => button.classList.remove('lg-navbar__preview'));
      generatedLabels.forEach((button) => button.removeAttribute('aria-label'));
      delete nav.dataset.lgNavbarPosition;
      nav.removeAttribute('data-lg-navbar-backdrop');
      nav.style.removeProperty('--lg-nav-background');
      nav.style.removeProperty('--lg-nav-tint');
      setColors();
      for (const name of [...nav.classList]) if (name === 'lg-navbar' || name.startsWith('lg-navbar--')) nav.classList.remove(name);
      lens.remove();
    },
  };
}
