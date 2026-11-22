import { watchScrollDirection, type ScrollCompactOptions } from './compact.js';
import { readBackdrop, type BackdropSignal, type BackdropTone, type ContrastOptions } from './contrast.js';
import { createAnchoredPopover, type AnchoredPopover, type AnchoredPopoverOptions } from './popover.js';
import { mountRefraction, supportsBackdropRefraction } from './refraction.js';
import { createSpring, rubberBanded } from './spring.js';

export { createAnchoredPopover, watchScrollDirection };
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

export interface NavbarOverflowOptions {
  style?: NavbarOverflowStyle;
  /** For `expand`: one shared glass pill (default) or a glass circle per icon. */
  surface?: 'shared' | 'individual';
  /** The More button's label. Default "More". */
  label?: string;
  /** An icon for the More button, cloned into it. Defaults to an ellipsis. */
  icon?: Element;
  /** Show at most this many items in the bar, not counting More. */
  maxVisible?: number;
  /** Keep the popover inside this element. Defaults to the viewport. */
  boundary?: HTMLElement;
}

export type NavbarBadge =
  | { count: number; max?: number; label?: string }
  | { dot: true; label?: string }
  | { status: 'info' | 'success' | 'warning' | 'error'; label: string };

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
}

export interface LiquidGlassNavbar {
  sync(): void;
  setPosition(position?: NavbarPosition): void;
  setLabels(visible: boolean): void;
  setEqualWidth(equal: boolean, overflow?: EqualWidthOverflow): void;
  setBackground(background?: string): void;
  setTransparency(percentage?: number): void;
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
  const refraction = supportsBackdropRefraction() ? mountRefraction(nav) : undefined;

  let placement = options.position;
  let reorderMode = false;
  let gesture: Gesture | undefined;
  let suppressClick = false;
  let layout: NavbarLayout = options.layout ?? 'row';
  let maxRows = options.maxRows;
  let overflow = overflowSettings(options.overflow);
  let compact = false;
  let context: { nodes: HTMLElement[]; current: NavbarItem | undefined; label: string | null } | undefined;
  const generatedLabels = new Set<NavbarItem>();
  const popovers = new Map<NavbarItem, AnchoredPopover>();
  const badges = new Map<NavbarItem, { badge: HTMLElement; text: HTMLElement; describedBy: string | null }>();
  const enabled = options.enabled ?? (() => true);
  const vertical = (): boolean => placement === 'left' || placement === 'right';
  const inContext = (element: Element): boolean => !context || Boolean(element.closest(`[${CONTEXT}]`));
  const sections = (): HTMLElement[] => [nav, ...nav.querySelectorAll<HTMLElement>(sectionSelector)]
    .filter((section) => section === nav || inContext(section));
  const items = (): NavbarItem[] => [...sections().flatMap(buttonsIn), ...(more ? buttonsIn(more.host) : [])].filter(inContext);
  const tabs = (): NavbarItem[] => items().filter((button) => isAvailable(button) && !isAction(button));
  let lensSize = 0;
  const spring = createSpring(0, (offset) => {
    lens.style.translate = vertical() ? `0 ${offset}px` : `${offset}px 0`;
  }, { response: .38, dampingRatio: .78 });
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
    const icon = settings.icon ? settings.icon.cloneNode(true) as Element : svgIcon(ELLIPSIS);
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

  const widthKey = (button: HTMLElement): string => [
    nav.classList.contains('lg-navbar--no-labels'), compact, button.hasAttribute('data-navbar-hide-icon'),
    button.hasAttribute('data-navbar-hide-label'), button.hidden, button.textContent,
  ].join('|');

  function widthOf(button: HTMLElement): number | undefined {
    if (button.parentElement && !more?.host.contains(button)) {
      if (!isAvailableForLayout(button)) return 0;
      const width = naturalWidth(button);
      widths.set(button, { key: widthKey(button), width });
      return width;
    }
    const cached = widths.get(button);
    return cached && cached.key === widthKey(button) ? cached.width : undefined;
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

  const multiRowActive = (): boolean => !vertical() && !context && layout !== 'row';
  const overflowActive = (): boolean => !vertical() && !context && overflow !== undefined;
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
    const width = naturalWidth(button);
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
      const origin = host === nav ? undefined : (surface.offsetParent ?? host).getBoundingClientRect();
      const boxes = group.map((element) => {
        if (!origin) return boxOf(element);
        const rect = element.getBoundingClientRect();
        return { left: rect.left - origin.left, top: rect.top - origin.top, width: rect.width, height: rect.height };
      });
      const left = Math.min(...boxes.map((box) => box.left)) - pad;
      const top = Math.min(...boxes.map((box) => box.top)) - pad;
      const right = Math.max(...boxes.map((box) => box.left + box.width)) + pad;
      const bottom = Math.max(...boxes.map((box) => box.top + box.height)) + pad;
      Object.assign(surface.style, { left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${bottom - top}px` });
    });
  }

  function overflowOpen(): boolean {
    return Boolean(more?.popover.open);
  }

  function openOverflow({ focus = false }: { focus?: boolean } = {}): void {
    if (!more || more.button.hidden) return;
    more.popover.show({ focus });
  }

  // ---- Sync ----

  function sync(immediate = false): void {
    if (signal.aborted) return;
    const isEnabled = enabled();
    nav.classList.toggle('lg-navbar--enabled', isEnabled);
    labelItems();
    layoutPass();
    const groups = sections().slice(1);
    nav.classList.toggle('lg-navbar--sectioned', groups.length > 0);
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
      return;
    }
    placeLens(target);
    const { start } = measure(target as NavbarItem);
    // A swipe that just ended hands its speed to the spring, so the lens carries on and settles.
    const velocity = releaseVelocity && performance.now() - releaseVelocity.at < 600 ? releaseVelocity.value : undefined;
    releaseVelocity = undefined;
    if (immediate || !isEnabled) spring.set(start);
    else spring.to(start, velocity);
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

  function markCurrent(button: NavbarItem): void {
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

  const inside = (button: HTMLElement, point: { x: number; y: number }): boolean => {
    const box = boxOf(button);
    return point.x >= box.left && point.x <= box.left + box.width && point.y >= box.top && point.y <= box.top + box.height;
  };

  function finish(event: PointerEvent, cancelled = false): void {
    if (!gesture || gesture.id !== event.pointerId) return;
    const { dragging, draggedItem, free, openedOverflow } = gesture;
    const target = dragging && !cancelled
      ? (free ? closestTo(candidates(), pointOf(event)) : closest(candidates(), eventPosition(event)))
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
    sync();
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

  function dragFree(event: PointerEvent, buttons: NavbarItem[]): void {
    if (!gesture) return;
    const point = pointOf(event);
    const target = closestTo(buttons, point);
    if (!target) return;
    // Sliding onto More opens it without ending the gesture; the same finger carries on into the new row.
    if (more && target === more.button && !overflowOpen() && inside(target, point)) {
      openOverflow();
      gesture.openedOverflow = true;
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

  function setBadge(item: NavbarItem, badge: NavbarBadge | null): void {
    if (!items().includes(item) && !item.closest('.lg-navbar__overflow')) throw new Error('The button does not belong to this navbar.');
    const existing = badges.get(item);
    if (existing) {
      existing.badge.remove();
      existing.text.remove();
      if (existing.describedBy === null) item.removeAttribute('aria-describedby');
      else item.setAttribute('aria-describedby', existing.describedBy);
      badges.delete(item);
    }
    if (badge && !('count' in badge && badge.count <= 0)) {
      const node = document.createElement('span');
      node.className = 'lg-navbar__badge';
      node.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span');
      text.className = 'lg-navbar__sr';
      text.id = `lg-navbar-badge-${++badgeSequence}`;
      if ('count' in badge) {
        const max = badge.max ?? 99;
        node.dataset.kind = 'count';
        node.textContent = badge.count > max ? `${max}+` : String(badge.count);
        text.textContent = badge.label ?? `${badge.count} new`;
      } else if ('dot' in badge) {
        node.dataset.kind = 'dot';
        text.textContent = badge.label ?? 'New';
      } else {
        node.dataset.kind = 'status';
        node.dataset.tone = badge.status;
        text.textContent = badge.label;
      }
      const describedBy = item.getAttribute('aria-describedby');
      item.append(node, text);
      item.setAttribute('aria-describedby', [describedBy, text.id].filter(Boolean).join(' '));
      badges.set(item, { badge: node, text, describedBy });
    }
    sync(true);
  }

  // ---- Compact ----

  let stopScroll: (() => void) | undefined;
  function setCompact(value: boolean): void {
    if (value === compact) return;
    compact = value;
    nav.classList.toggle('lg-navbar--compact', value);
    options.onCompactChange?.(value);
    sync();
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
    restoreAll();
    context = {
      nodes: [...nodes],
      current: items().find((button) => button.getAttribute('aria-current') === 'page'),
      label: nav.getAttribute('aria-label'),
    };
    for (const node of nodes) {
      node.setAttribute(CONTEXT, '');
      nav.append(node);
    }
    if (contextOptions.label) nav.setAttribute('aria-label', contextOptions.label);
    nav.classList.add('lg-navbar--context');
    sync(true);
    if (focusInside) items().find(isAvailable)?.focus({ preventScroll: true });
  }

  function hideContextActions(focus = true): void {
    if (!context) return;
    const { nodes, current, label } = context;
    const focusInside = nodes.some((node) => node.contains(document.activeElement));
    for (const node of nodes) {
      node.removeAttribute(CONTEXT);
      for (const marked of node.querySelectorAll('[aria-current="page"]')) marked.removeAttribute('aria-current');
      if (node.getAttribute('aria-current') === 'page') node.removeAttribute('aria-current');
      node.remove();
    }
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
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

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
        amount = distance < range ? (1 + Math.cos(Math.PI * distance / range)) / 2 : 0;
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
    if (gesture && gesture.id === event.pointerId) magnifyAt(pointOf(event));
  }, { signal, passive: true });
  window.addEventListener('pointerup', (event) => {
    if (event.pointerType !== 'mouse') magnifyAt(undefined);
  }, { signal });
  window.addEventListener('pointercancel', () => magnifyAt(undefined), { signal });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) clearMagnify(); }, { signal });

  const observer = new ResizeObserver(() => { if (!gesture?.dragging) sync(true); });
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
  setPosition(placement);

  return {
    sync: () => sync(),
    setPosition,
    setLabels,
    setEqualWidth,
    setBackground,
    setTransparency,
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
    createPopover(trigger, content, popoverOptions = {}) {
      if (!items().includes(trigger)) throw new Error('The button does not belong to this navbar.');
      popovers.get(trigger)?.destroy();
      const popover = createAnchoredPopover(trigger, content, {
        container: nav, anchor: trigger.parentElement ?? nav, ...popoverOptions, bindTrigger: false,
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
      listeners.abort();
      contrastWatch?.abort();
      cancelAnimationFrame(contrastFrame);
      stopScroll?.();
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
