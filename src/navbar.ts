// The navbar itself: one closure per mounted bar, holding its state, gestures, layout and cleanup.

import { createBackdropTint } from './backdrop-tint.js';
import { createBadges } from './badges.js';
import { type ScrollCompactOptions, watchScrollDirection } from './compact.js';
import { createContextActions } from './context-actions.js';
import {
  allowsSwipe,
  buttonsIn,
  CONTEXT,
  ELLIPSIS,
  ITEM_SELECTOR,
  isAction,
  isAvailable,
  overflowSettings,
  px,
  rowOf,
  sectionSelector,
  svgIcon,
  VERTICAL_ELLIPSIS,
} from './dom.js';
import { bindHoverNavigation } from './hover.js';
import { bindKeyboard } from './keyboard.js';
import { createDisposer } from './lifecycle.js';
import { parseSectionLimit, resolveVisibleLimit as resolveLimit } from './limits.js';
import { type AnchoredPopover, createAnchoredPopover } from './popover.js';
import { mountRefraction, refractionMode } from './refraction.js';
import { createSpring, rubberBanded, type Spring } from './spring.js';
import type {
  Box,
  EqualWidthOverflow,
  Gesture,
  LiquidGlassNavbar,
  LiquidGlassNavbarOptions,
  More,
  NavbarAnimations,
  NavbarColors,
  NavbarItem,
  NavbarLayout,
  NavbarLensOptions,
  NavbarLensScale,
  NavbarMagnifyOptions,
  NavbarPosition,
  NavbarUpdateOptions,
  NavbarVisibleLimit,
  Unit,
} from './types.js';
import { defaultKey, findKeyedMatch } from './update.js';
import { mountViewTransition } from './view-transition.js';

export function mountLiquidGlassNavbar(nav: HTMLElement, options: LiquidGlassNavbarOptions): LiquidGlassNavbar {
  const listeners = new AbortController();
  const { signal } = listeners;
  // Observers, frames and other teardown registered here run when destroy() aborts `listeners`.
  const disposer = createDisposer(signal);
  // Authored `class` and `style` attributes, so destroy() can drop the empty ones the navbar leaves behind.
  const authoredAttributes = new WeakMap<Element, { class: boolean; style: boolean }>();
  for (const element of [nav, ...nav.querySelectorAll('*')]) {
    authoredAttributes.set(element, { class: element.hasAttribute('class'), style: element.hasAttribute('style') });
  }
  const lens = document.createElement('span');
  lens.className = 'lg-navbar__lens';
  lens.setAttribute('aria-hidden', 'true');
  nav.classList.add('lg-navbar');
  nav.prepend(lens);
  const removeTransition = mountViewTransition(nav, options.viewTransitionName);
  if (removeTransition) disposer.add(removeTransition);
  const mode = refractionMode();
  const refraction =
    mode && (mode !== 'copy' || options.refractionSources !== false)
      ? mountRefraction(nav, mode, options.refractionSources || undefined)
      : undefined;
  const tint = createBackdropTint(nav, disposer, refraction);
  const badges = createBadges(() => motionOn('badges'));

  let placement = options.position;
  let reorderMode = false;
  let heldCompact: boolean | undefined;
  let gesture: Gesture | undefined;
  let suppressClick = false;
  let layout: NavbarLayout = options.layout ?? 'row';
  let maxRows = options.maxRows;
  let overflow = overflowSettings(options.overflow);
  let compact = false;
  const generatedLabels = new Set<NavbarItem>();
  const popovers = new Map<NavbarItem, AnchoredPopover>();
  const enabled = options.enabled ?? (() => true);
  const vertical = (): boolean => placement === 'left' || placement === 'right';
  const inContext = (element: Element): boolean =>
    !contextActions.state?.replace || Boolean(element.closest(`[${CONTEXT}]`));
  const sections = (): HTMLElement[] =>
    [nav, ...nav.querySelectorAll<HTMLElement>(sectionSelector)].filter(
      (section) => section === nav || inContext(section),
    );
  const items = (): NavbarItem[] =>
    [...sections().flatMap(buttonsIn), ...allMore().flatMap((entry) => buttonsIn(entry.host))].filter(inContext);
  const tabs = (): NavbarItem[] => items().filter((button) => isAvailable(button) && !isAction(button));
  let lensSize = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const spring = createSpring(
    0,
    (offset) => {
      lens.style.translate = vertical() ? `0 ${offset}px` : `${offset}px 0`;
      if (ink) paintInk();
    },
    { response: 0.38, dampingRatio: 0.78, onRest: settleInk },
  );

  // A bottom dock moves as rows shrink. Keep the lens in screen space during that spring
  // while ordinary reflow still measures relative to the navbar.
  let crossReference: number | undefined;
  let crossOffset = 0;
  const navTop = (): number => nav.getBoundingClientRect().top + nav.clientTop;
  const crossOrigin = (): number => crossOffset + (crossReference === undefined ? 0 : navTop() - crossReference);
  const drawCross = (offset: number): void => {
    lens.style.top = `${offset - crossOrigin()}px`;
  };
  const crossSpring = createSpring(
    0,
    (offset) => {
      drawCross(offset);
      if (ink) paintInk();
    },
    { response: 0.38, dampingRatio: 0.9, onRest: settleInk },
  );

  function settleInk(): void {
    if (!gesture?.dragging && !spring.moving && !crossSpring.moving) clearInk();
  }

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
  let ink:
    | { tabs: InkTab[]; accent: { label: string; icon: string }; unselected: { label: string; icon: string } }
    | undefined;
  const hiddenClip = 'inset(0 100% 0 0)';

  const colourOf = (element: Element | undefined | null): string => (element ? getComputedStyle(element).color : '');
  const coloursOf = (item: NavbarItem | undefined) => ({
    label: colourOf(item?.querySelector('[data-navbar-label]')),
    icon: colourOf(item?.querySelector('[data-navbar-icon]')),
  });
  const plainTab = (item: NavbarItem): boolean =>
    item.getAttribute('aria-current') !== 'page' && !item.classList.contains('lg-navbar__preview');
  /** The tabs the highlight paints: everything shown, except a More menu's list, which the lens doesn't visit. */
  function inkable(): NavbarItem[] {
    return items().filter((item) => isAvailable(item) && !inMoreMenu(item));
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
      left: (box.left - outer.left) / k - item.clientLeft,
      top: (box.top - outer.top) / k - item.clientTop,
      width: box.width / k,
      height: box.height / k,
    };
  }

  function inkTabs(
    tabsToPaint: NavbarItem[],
    accent: { label: string; icon: string },
    unselected: { label: string; icon: string },
    haveReference: boolean,
  ): InkTab[] {
    const found = tabsToPaint.map((item) => {
      const label =
        item === collapseToggle ? undefined : (item.querySelector<HTMLElement>('[data-navbar-label]') ?? undefined);
      const icon = item.querySelector<HTMLElement | SVGElement>('[data-navbar-icon]') ?? undefined;
      // Read every place first, then add the copies, so measuring never waits on a layout per tab.
      return { item, label, icon, labelPlace: label && placeOf(item, label), iconPlace: icon && placeOf(item, icon) };
    });
    const part = (
      item: NavbarItem,
      element: HTMLElement | SVGElement | undefined,
      place: ReturnType<typeof placeOf>,
      colour: string,
    ): InkPart | undefined => {
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
    return found.map(
      ({ item, label, icon, labelPlace, iconPlace }): InkTab => ({
        item,
        label: part(item, label, labelPlace, accent.label),
        icon: part(item, icon, iconPlace, accent.icon),
        base: haveReference && !plainTab(item) ? unselected : coloursOf(item),
      }),
    );
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
    const clip =
      b <= a
        ? hiddenClip
        : vertical()
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

  function boxOf(button: HTMLElement): Box {
    const outer = nav.getBoundingClientRect();
    const inner = button.getBoundingClientRect();
    const glide = glides.get(button as NavbarItem);
    const progress = glide?.spring.value ?? 0;
    return {
      left: inner.left - outer.left - nav.clientLeft - (glide?.dx ?? 0) * progress,
      top: inner.top - outer.top - nav.clientTop - (glide?.dy ?? 0) * progress,
      width: inner.width,
      height: inner.height,
    };
  }

  function measure(button: HTMLElement): { start: number; size: number } {
    const box = boxOf(button);
    return vertical() ? { start: box.top, size: box.height } : { start: box.left, size: box.width };
  }

  function placeLens(button: HTMLElement, size?: number, animateRow = false): void {
    const box = boxOf(button);
    const width = vertical() ? box.width : (size ?? box.width);
    const height = vertical() ? (size ?? box.height) : box.height;
    lens.style.width = `${width}px`;
    lens.style.height = `${height}px`;
    lens.style.left = vertical() ? `${box.left}px` : '0';
    const lensTop = (vertical() ? 0 : box.top) + crossOrigin();
    if (animateRow && !lens.hidden) {
      if (Math.abs(crossSpring.target - lensTop) > 0.05) crossSpring.to(lensTop);
      drawCross(crossSpring.value);
    } else crossSpring.set(lensTop);
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

  const moreByRow = new Map<number, More>();
  const allMore = (): More[] => [...moreByRow.values()];
  const moreFor = (button: HTMLElement | undefined): More | undefined =>
    button && allMore().find((entry) => entry.button === button || entry.host.contains(button));
  const inMoreMenu = (button: HTMLElement): boolean =>
    Boolean(moreFor(button)?.host.matches('.lg-navbar__overflow--menu') && moreFor(button)?.host.contains(button));
  const isMore = (button: HTMLElement): boolean => moreFor(button)?.button === button;
  const openMore = (): More | undefined => allMore().find((entry) => entry.popover.open);
  const hideMore = (): void => allMore().forEach((entry) => entry.popover.hide());
  const rowOfItem = (button: NavbarItem): number => {
    const home = homeOf(button);
    return rowOf(home === nav ? button : home) ?? 1;
  };
  const homeOf = (button: NavbarItem): HTMLElement => homes.get(button) ?? button.parentElement ?? nav;
  const homes = new Map<NavbarItem, HTMLElement>();
  const anchors = new Map<NavbarItem, Comment>();
  const parkedItems = new Map<Node, NavbarItem>();
  const widths = new WeakMap<HTMLElement, { key: string; width: number }>();
  let lastOverflow: NavbarItem[] = [];

  function ensureMore(row: number): More {
    const existing = moreByRow.get(row);
    if (existing) return existing;
    const settings = overflow ?? {};
    const style = settings.style ?? 'menu';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lg-navbar__more';
    button.hidden = true;
    for (const name of ['data-navbar-action', 'data-navbar-generated']) button.setAttribute(name, '');
    button.setAttribute('data-navbar-overflow', 'never');
    const dots = settings.trigger === 'dots';
    const icon = settings.icon
      ? (settings.icon.cloneNode(true) as Element)
      : svgIcon(dots ? VERTICAL_ELLIPSIS : ELLIPSIS);
    // Dots only: the label stays as the button's accessible name but isn't shown.
    if (dots || settings.moreLabel === false) {
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
      // The navbar delegates activation to real menu items. Let it select before the menu becomes inert.
      closeOnSelect: false,
      // Clear the pill around More rather than More itself.
      anchor: () => button.parentElement,
      gap: style === 'expand' ? 12 : 10,
      ...(settings.boundary ? { boundary: settings.boundary } : {}),
      spring: () => motionOn('popovers'),
      // Read each time, so setOverflow changes it without rebuilding More.
      get closeOnScroll() {
        return overflow?.closeOnScroll ?? false;
      },
      onOpen: () => sync(),
      onClose: () => sync(),
    });
    const entry = { button, dot, host, popover };
    moreByRow.set(row, entry);
    return entry;
  }

  function removeMore(row?: number): void {
    for (const [key, entry] of moreByRow) {
      if (row !== undefined && row !== key) continue;
      for (const item of buttonsIn(entry.host)) restore(item);
      moreByRow.delete(key);
      entry.popover.destroy();
      releaseCollapseUnit(entry.button);
      entry.button.remove();
    }
  }

  function flowItems(): NavbarItem[] {
    const read = (home: HTMLElement): NavbarItem[] => {
      const local = new Set(buttonsIn(home).filter((button) => !isMore(button) && inContext(button)));
      return [...home.childNodes].flatMap((node) => {
        const away = parkedItems.get(node);
        if (away && inContext(away)) return [away];
        if (local.has(node as NavbarItem)) return [node as NavbarItem];
        return home === nav && node instanceof HTMLElement && node.hasAttribute('data-navbar-section')
          ? read(node)
          : [];
      });
    };
    return read(nav);
  }

  function restore(button: NavbarItem): void {
    const anchor = anchors.get(button);
    if (anchor?.parentNode) anchor.replaceWith(button);
    else (homes.get(button) ?? nav).append(button);
    if (anchor) parkedItems.delete(anchor);
    anchors.delete(button);
    homes.delete(button);
  }

  function restoreAll(): void {
    for (const entry of allMore()) for (const button of buttonsIn(entry.host)) restore(button);
  }

  function naturalWidth(button: HTMLElement): number {
    const style = getComputedStyle(button);
    const collapseScale = button.closest('.lg-navbar__collapse-unit')
      ? 0.25 + 0.75 * Math.min(1, Math.max(0, collapseSpring.value))
      : 1;
    let content = 0;
    for (const child of button.children) {
      if (child.matches('.lg-navbar__badge, .lg-navbar__sr, .lg-navbar__ink')) continue;
      const width = child.getBoundingClientRect().width / collapseScale;
      content = Math.max(content, width, child instanceof HTMLElement ? child.scrollWidth : 0);
    }
    const width =
      content + px(style.paddingLeft) + px(style.paddingRight) + px(style.borderLeftWidth) + px(style.borderRightWidth);
    return Math.ceil(Math.max(px(style.minWidth), width) * 100) / 100;
  }

  // Widths are always the ones with labels, so compacting never moves items in or out of More: it only hides the
  // labels. While compact, a tab's labelled width is the one remembered from before.
  const widthKey = (button: HTMLElement): string =>
    [
      nav.classList.contains('lg-navbar--no-labels'),
      button.hasAttribute('data-navbar-hide-icon'),
      button.hasAttribute('data-navbar-hide-label'),
      button.hidden,
      button.querySelector('[data-navbar-label]')?.textContent,
    ].join('|');

  function widthOf(button: HTMLElement): number | undefined {
    if (!isAvailableForLayout(button)) return 0;
    const cached = widths.get(button);
    const known = cached && cached.key === widthKey(button) ? cached.width : undefined;
    if (button.parentElement && !moreFor(button)?.host.contains(button)) {
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
    if (button.hidden || (!homes.has(button as NavbarItem) && button.closest('[hidden]'))) return false;
    const home = homes.get(button as NavbarItem);
    if (home?.hidden) return false;
    if (button.hasAttribute('data-navbar-hide-icon') && button.hasAttribute('data-navbar-hide-label')) return false;
    return moreFor(button)?.host.contains(button) || button.getClientRects().length > 0;
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
      if (
        style.transform !== 'none' ||
        style.filter !== 'none' ||
        style.backdropFilter !== 'none' ||
        /paint|layout|strict|content/.test(style.contain) ||
        style.containerType !== 'normal'
      )
        return node;
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

  function breakLines(
    units: Unit[],
    room: number,
    gap: number,
    pad: number,
    single: boolean,
    authoredRows = false,
  ): Unit[][] {
    if (single) return units.length ? [units] : [];
    const lines: Unit[][] = [];
    let line: Unit[] = [];
    let used = pad;
    let row = units[0]?.row;
    for (const unit of units) {
      const add = (line.length ? gap : 0) + unit.width;
      const manualBreak = line.length > 0 && unit.row !== undefined && unit.row !== row;
      if (line.length && (manualBreak || (!authoredRows && used + add > room + 0.5))) {
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

  const equalSections = new Set<HTMLElement>();

  function clearSectionWidths(): void {
    for (const section of equalSections) section.style.removeProperty('--_lg-section-equal-width');
    equalSections.clear();
  }

  /** Measure and plan the expanded rows even when some are collapsed. Only their rendering changes. */
  function layoutPass(): void {
    if (contextActions.state) return;
    const multi = multiRowActive();
    const authoredRows =
      multi && layout === 'rows' && collapseElements().some((element) => rowOf(element) !== undefined);
    const isSectioned = sectioned();
    const split = authoredRows && !isSectioned;
    const usesOverflow = overflowActive();
    const lockRows = usesOverflow && authoredRows;
    const perRow = usesOverflow && multi && layout === 'rows' && overflow?.perRow === true;
    nav.classList.toggle('lg-navbar--multirow', multi);
    nav.classList.toggle('lg-navbar--wrap', multi && layout === 'wrap');
    nav.classList.toggle('lg-navbar--split', split);
    placeCollapseToggle();
    clearSectionWidths();

    // A hidden collapse unit still takes part in the expanded layout plan. Expose it only for
    // this synchronous measurement, then put it back before the browser can paint.
    const hiddenUnits = [...collapseUnits.keys()].filter((unit) =>
      unit.classList.contains('lg-navbar__collapse-hidden'),
    );
    hiddenUnits.forEach((unit) => unit.classList.remove('lg-navbar__collapse-hidden'));
    let flow = flowItems();
    let measured = flow.map(widthOf);
    if (measured.some((width) => width === undefined)) {
      restoreAll();
      flow = flowItems();
      measured = flow.map(widthOf);
    }
    let widthsForLayout = measured.map((width) => width ?? 0);
    const equal = nav.classList.contains('lg-navbar--equal') || equalWidth;
    const widest = equal ? Math.max(0, ...widthsForLayout) : 0;
    if (equal && multi) {
      widthsForLayout = widthsForLayout.map((width) => (width ? widest : 0));
      nav.style.setProperty('--_lg-equal-width', `${widest}px`);
    } else nav.style.removeProperty('--_lg-equal-width');
    const widthFor = new Map(flow.map((button, index) => [button, widthsForLayout[index] ?? 0]));
    const active = flow.filter((button) => (widthFor.get(button) ?? 0) > 0);
    const rowKeys = perRow ? [...new Set(active.map(rowOfItem))].sort((a, b) => a - b) : usesOverflow ? [0] : [];
    for (const row of moreByRow.keys()) if (!rowKeys.includes(row)) removeMore(row);

    const room = availableWidth();
    const space = horizontalSpace(nav);
    const rowLimit = usesOverflow ? (maxRows ?? (multi ? Infinity : 1)) : Infinity;

    function onRow(button: NavbarItem): number | undefined {
      return authoredRows
        ? rowOfItem(button)
        : multi
          ? rowOf(homeOf(button) === nav ? button : homeOf(button))
          : undefined;
    }

    function unitsFor(visible: NavbarItem[], entry?: More, moreHome?: HTMLElement, triggerWidth = 0, row = 0): Unit[] {
      const units: Unit[] = [];
      const byHome = new Map<HTMLElement, number[]>();
      for (const button of visible) {
        const home = homeOf(button);
        const width = widthFor.get(button) ?? 0;
        if (home === nav) units.push({ element: button, width, row: onRow(button) });
        else {
          const widths = byHome.get(home) ?? [];
          widths.push(width);
          byHome.set(home, widths);
        }
      }
      const last = visible.at(-1);
      const triggerRow = perRow ? row : collapseToggle ? mainRow() : last && onRow(last);
      if (entry && moreHome === nav) units.push({ element: entry.button, width: triggerWidth, row: triggerRow });
      else if (entry && moreHome) byHome.set(moreHome, [...(byHome.get(moreHome) ?? []), triggerWidth]);

      const adjustable = new Map<HTMLElement, { count: number; overhead: number; natural: number }>();
      for (const section of sections().slice(1)) {
        const members = byHome.get(section);
        if (!members?.length) continue;
        const sectionSpace = horizontalSpace(section);
        const overhead = sectionSpace.pad + sectionSpace.gap * (members.length - 1);
        const equalSection = section.hasAttribute('data-navbar-equal') && !vertical();
        const natural = equalSection ? Math.max(...members) : 0;
        if (equalSection) adjustable.set(section, { count: members.length, overhead, natural });
        units.push({
          element: section,
          width: overhead + (equalSection ? natural * members.length : members.reduce((sum, width) => sum + width, 0)),
          row: authoredRows ? (rowOf(section) ?? 1) : multi ? rowOf(section) : undefined,
        });
      }
      // Equal sections share the room left by other pills on the same row.
      const rows = new Map<number, Unit[]>();
      for (const unit of units) {
        const row = unit.row ?? 1;
        rows.set(row, [...(rows.get(row) ?? []), unit]);
      }
      for (const line of rows.values()) {
        const padded = space.pad + space.gap * Math.max(0, line.length - 1);
        let fixed = padded;
        let flexible = 0;
        for (const unit of line) {
          const section = adjustable.get(unit.element);
          if (!section) fixed += unit.width;
          else {
            fixed += section.overhead;
            flexible += section.natural * section.count;
          }
        }
        const ratio = flexible ? Math.min(1, Math.max(0, (room - fixed) / flexible)) : 1;
        for (const unit of line) {
          const section = adjustable.get(unit.element);
          if (!section) continue;
          const width = Math.max(1, section.natural * ratio);
          unit.width = section.overhead + section.count * width;
          unit.equalItemWidth = width;
        }
      }
      return units.sort((a, b) => (a.row ?? 1) - (b.row ?? 1));
    }

    const fits = (units: Unit[]): boolean => {
      const lines = breakLines(units, room, space.gap, space.pad, !multi, lockRows);
      return lines.length <= rowLimit && lines.every((line) => lineWidth(line, space.gap, space.pad) <= room + 0.5);
    };
    const plans: { entry: More; away: NavbarItem[]; host?: HTMLElement }[] = [];
    const arranged: Unit[] = [];
    if (!usesOverflow) arranged.push(...unitsFor(active));
    for (const row of rowKeys) {
      const entry = ensureMore(row);
      const members = perRow ? active.filter((button) => rowOfItem(button) === row) : active;
      const home = members.at(-1) ? homeOf(members.at(-1)!) : nav;
      if (entry.button.parentElement !== home && !entry.button.parentElement?.isConnected) home.append(entry.button);
      if (perRow && home === nav) entry.button.dataset.navbarRow = String(row);
      else delete entry.button.dataset.navbarRow;
      const moreWidth = Math.max(measureMore(entry), widest);
      const movable = members.filter((button) => button.getAttribute('data-navbar-overflow') !== 'never');
      const candidates =
        collapseOptions && authoredRows && !perRow
          ? [...movable].sort((a, b) => Number(collapsibleItem(a)) - Number(collapsibleItem(b)))
          : movable;
      const limit = resolveVisibleLimit(
        perRow ? (overflow?.rowLimits?.[row] ?? overflow?.maxVisible) : overflow?.maxVisible,
      );
      const counts = new Map<HTMLElement, number>();
      const kept = new Set(
        candidates
          .filter((button) => {
            const section = homeOf(button);
            const count = counts.get(section) ?? 0;
            if (count >= sectionLimit(section)) return false;
            counts.set(section, count + 1);
            return true;
          })
          .slice(0, limit),
      );
      const fixed = new Set(members.filter((button) => !movable.includes(button)));
      const visible = () => members.filter((button) => fixed.has(button) || kept.has(button));
      const collapseHome = collapseToggle?.parentElement ?? undefined;
      const host = !perRow && collapseHome ? collapseHome : home;
      let units: Unit[];
      let needsMore: boolean;
      // Fit the trigger together with the items. If a particular row is too wide,
      // evict from that row before touching a different row.
      while (true) {
        needsMore = kept.size < movable.length;
        units = unitsFor(visible(), needsMore ? entry : undefined, host, moreWidth, row);
        if (fits(units)) break;
        if (!needsMore && kept.size) {
          const withTrigger = unitsFor(visible(), entry, host, moreWidth, row);
          units = withTrigger;
        }
        const overfull = breakLines(units, room, space.gap, space.pad, !multi, lockRows).find(
          (line) => lineWidth(line, space.gap, space.pad) > room + 0.5,
        );
        const offendingRow = overfull?.[0]?.row;
        const remove = candidates.findLast(
          (button) => kept.has(button) && (offendingRow === undefined || onRow(button) === offendingRow),
        );
        if (!remove) break;
        kept.delete(remove);
      }
      const away = movable.filter((button) => !kept.has(button));
      arranged.push(...unitsFor(visible(), needsMore ? entry : undefined, host, moreWidth, row));
      plans.push(needsMore ? { entry, away, host } : { entry, away });
    }

    // Restore all returning items before moving any item to its next menu.
    for (const [button] of homes) {
      const plan = plans.find(({ away }) => away.includes(button));
      if (!plan?.entry.host.contains(button)) restore(button);
    }
    hiddenUnits.forEach((unit) => unit.classList.add('lg-navbar__collapse-hidden'));
    for (const plan of plans) applyOverflow(plan.entry, plan.away, plan.host);
    const overflowed = flow.filter((button) => homes.has(button));
    if (overflowed.length !== lastOverflow.length || overflowed.some((item, index) => lastOverflow[index] !== item)) {
      lastOverflow = overflowed;
      options.onOverflowChange?.([...overflowed]);
    }
    for (const { element, equalItemWidth } of arranged) {
      if (equalItemWidth === undefined) continue;
      equalSections.add(element);
      element.style.setProperty('--_lg-section-equal-width', `${equalItemWidth}px`);
    }
    const displayed = arranged.filter(
      ({ element, row }) => !(collapseSpring.value === 0 && isCollapsedUnit(element, row)),
    );
    if (multi) applyRows(breakLines(displayed, room, space.gap, space.pad, false, lockRows), space, split);
    else clearRows();
    paintCollapse();
  }

  function resolveVisibleLimit(limit: NavbarVisibleLimit | undefined): number {
    return resolveLimit(limit, window.innerWidth);
  }

  function sectionLimit(section: HTMLElement): number {
    return section === nav ? Infinity : parseSectionLimit(section.dataset.navbarMaxVisible, window.innerWidth);
  }

  function measureMore({ button }: More): number {
    const wasHidden = button.hidden;
    button.hidden = false;
    const cached = widths.get(button);
    const key = widthKey(button);
    const width = compact && cached?.key === key ? cached.width : naturalWidth(button);
    if (!compact) widths.set(button, { key, width });
    button.hidden = wasHidden;
    return width;
  }

  function applyOverflow(entry: More, away: NavbarItem[], moreHost: HTMLElement | undefined): void {
    const focused = document.activeElement;
    const { button, host, popover } = entry;
    for (const [index, item] of away.entries()) {
      if (!host.contains(item)) {
        stopGlide(item);
        const anchor = document.createComment('navbar overflow');
        homes.set(item, homeOf(item));
        item.before(anchor);
        anchors.set(item, anchor);
        parkedItems.set(anchor, item);
      }
      if (host.children[index] !== item) host.insertBefore(item, host.children[index] ?? null);
    }
    button.hidden = !moreHost;
    if (moreHost && (button.parentElement !== moreHost || button.nextElementSibling)) moreHost.append(button);
    if ((!moreHost || (collapsed && isCollapsedUnit(moreHost))) && popover.open) popover.hide();
    if (
      focused instanceof HTMLElement &&
      focused !== document.activeElement &&
      focused.isConnected &&
      host.contains(focused)
    ) {
      (popover.open ? focused : button).focus({ preventScroll: true });
    }
    entry.dot.hidden = !away.some((item) => badges.entries.has(item));
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
    breaks.forEach((node, index) => {
      node.style.order = String(index * 2 + 1);
    });
    collapseLines = lines;
    paintCollapse();
    paintRowSurfaces(split ? lines : [], space.pad / 2);
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
      const boxes = group.map((element) =>
        host === nav
          ? boxOf(element)
          : {
              left: element.offsetLeft,
              top: element.offsetTop,
              width: element.offsetWidth,
              height: element.offsetHeight,
            },
      );
      const left = Math.min(...boxes.map((box) => box.left)) - pad;
      const top = Math.min(...boxes.map((box) => box.top)) - pad;
      const right = Math.max(...boxes.map((box) => box.left + box.width)) + pad;
      const bottom = Math.max(...boxes.map((box) => box.top + box.height)) + pad;
      Object.assign(surface.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${right - left}px`,
        height: `${bottom - top}px`,
      });
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

  function openOverflow({ focus = false, row }: { focus?: boolean; row?: number } = {}): void {
    const more = row === undefined ? allMore().findLast(({ button }) => isAvailable(button)) : moreByRow.get(row);
    if (more) showMore(more, focus);
  }

  function showMore(more: More, focus = false): void {
    if (!isAvailable(more.button)) return;
    for (const entry of allMore()) if (entry !== more) entry.popover.hide();
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
      reflow: all || Boolean(pick.reflow),
      popovers: all || Boolean(pick.popovers),
      tap: all || Boolean(pick.tap),
      badges: all || Boolean(pick.badges),
    };
    nav.classList.toggle('lg-navbar--anim-tap', animations.tap);
  }

  // Reflow glide: before a layout pass, note where every item is; after it, each moved item starts from its old
  // place (an offset) and springs to the new one.
  const glides = new Map<
    NavbarItem,
    { spring: Spring; dx: number; dy: number; entering: boolean; translate: string; opacity: string }
  >();
  const reflowing = (): boolean =>
    mounted &&
    motionOn('reflow') &&
    !gesture?.dragging &&
    !nav.classList.contains('lg-navbar--compacting') &&
    enabled();

  function snapshot(): Map<NavbarItem, DOMRect> {
    const rects = new Map<NavbarItem, DOMRect>();
    for (const item of items())
      if (!moreFor(item)?.host.contains(item) && isAvailable(item)) rects.set(item, item.getBoundingClientRect());
    return rects;
  }

  function glide(before: Map<NavbarItem, DOMRect>): void {
    for (const item of items()) {
      if (moreFor(item)?.host.contains(item) || !isAvailable(item)) continue;
      const now = item.getBoundingClientRect();
      const state = glides.get(item);
      const progress = state?.spring.value ?? 0;
      // Where the item really sits, without the offset of a glide still under way.
      const left = now.left - (state ? state.dx * progress : 0);
      const top = now.top - (state ? state.dy * progress : 0);
      const old = before.get(item);
      const dx = old ? old.left - left : 0;
      const dy = old ? old.top - top : 10;
      if (old && Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      const entry = state ?? {
        dx: 0,
        dy: 0,
        entering: !old,
        translate: item.style.translate,
        opacity: item.style.opacity,
        spring: createSpring(
          0,
          (value) => {
            const glideState = glides.get(item);
            if (!glideState) return;
            item.style.translate = `${(glideState.dx * value).toFixed(2)}px ${(glideState.dy * value).toFixed(2)}px`;
            if (glideState.entering) item.style.opacity = String(Math.min(1, Math.max(0, 1 - value)));
          },
          { response: 0.42, dampingRatio: 0.86, precision: 0.002, onRest: () => stopGlide(item) },
        ),
      };
      entry.dx = dx;
      entry.dy = dy;
      glides.set(item, entry);
      entry.spring.set(1);
      entry.spring.to(0);
    }
  }

  const exits = new Map<NavbarItem, { overlay: HTMLElement; motion: Spring }>();

  function fadeOut(item: NavbarItem, rect: DOMRect | undefined): void {
    if (!rect || reducedMotion.matches || !enabled()) return;
    clearExit(item);
    const ghost = item.cloneNode(true) as HTMLElement;
    for (const node of [ghost, ...ghost.querySelectorAll('[id]')]) node.removeAttribute('id');
    for (const { name } of [...ghost.attributes])
      if (name.startsWith('data-') || name === 'aria-current') ghost.removeAttribute(name);
    const { left, top } = nav.getBoundingClientRect();
    const style = getComputedStyle(item);
    Object.assign(ghost.style, {
      position: 'absolute',
      left: `${rect.left - left - nav.clientLeft}px`,
      top: `${rect.top - top - nav.clientTop}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      boxSizing: 'border-box',
      color: style.color,
      pointerEvents: 'none',
      order: '',
      translate: 'none',
      display: style.display,
      justifyItems: style.justifyItems,
      alignContent: style.alignContent,
      gap: style.gap,
      padding: style.padding,
      background: 'transparent',
      border: '0',
      font: style.font,
    });
    ghost.inert = true;
    ghost.setAttribute('aria-hidden', 'true');
    ghost.setAttribute('data-navbar-generated', '');
    // Keep the visual copy out of item discovery and the tab order.
    const overlay = document.createElement('span');
    overlay.style.display = 'contents';
    overlay.append(ghost);
    nav.append(overlay);
    const motion = createSpring(
      1,
      (value) => {
        ghost.style.opacity = String(value);
        ghost.style.translate = `0 ${(1 - value) * 8}px`;
      },
      { precision: 0.002, onRest: () => clearExit(item) },
    );
    exits.set(item, { overlay, motion });
    motion.to(0);
  }

  function clearExit(item: NavbarItem): void {
    const exit = exits.get(item);
    if (!exit) return;
    exit.motion.stop();
    exit.overlay.remove();
    exits.delete(item);
  }

  function stopGlide(item: NavbarItem): void {
    const state = glides.get(item);
    if (!state) return;
    state.spring.stop();
    item.style.translate = state.translate;
    item.style.opacity = state.opacity;
    if (item.getAttribute('style') === '') item.removeAttribute('style');
    glides.delete(item);
  }

  function requireItem(item: NavbarItem): void {
    if (!items().includes(item)) throw new Error('The button does not belong to this navbar.');
  }

  const runtimeVisibility = new WeakSet<NavbarItem>();

  function setItemHidden(item: NavbarItem, hidden: boolean): void {
    requireItem(item);
    runtimeVisibility.add(item);
    if (item.hidden === hidden) return;
    if (!hidden) clearExit(item);
    const before =
      !reducedMotion.matches && enabled() && !gesture?.dragging && !collapseSpring.moving ? snapshot() : undefined;
    if (hidden) {
      fadeOut(item, before?.get(item));
      if (item.contains(document.activeElement)) {
        const next = items().find((other) => other !== item && nav.contains(other) && isAvailable(other));
        next?.focus({ preventScroll: true });
      }
      popovers.get(item)?.hide();
      stopGlide(item);
    }
    item.hidden = hidden;
    syncNow(false);
    if (before) glide(before);
  }

  let updating = false;

  function update(replacement: HTMLElement, settings: NavbarUpdateOptions = {}): void {
    const { key, animate = true } = settings;
    if (signal.aborted || replacement === nav || nav.contains(replacement)) return;
    contextActions.hide(false);
    const focused = document.activeElement;
    const before = animate && !reducedMotion.matches && enabled() ? snapshot() : undefined;
    const focusWasInside = focused instanceof HTMLElement && nav.contains(focused);
    hideMore();
    restoreAll();
    clearInk();
    updating = true;
    try {
      reconcile(replacement, key, before);
      if (settings.layout !== undefined) layout = settings.layout;
      if (settings.maxRows !== undefined) maxRows = settings.maxRows ?? undefined;
      if (settings.collapsible !== undefined) configureCollapse(settings.collapsible);
    } finally {
      updating = false;
    }
    syncNow(!before);
    if (before) glide(before);
    if (focusWasInside && focused instanceof HTMLElement) {
      const target =
        focused.isConnected && !focused.closest('[inert]') && focused.getClientRects().length
          ? focused
          : (lensTarget() ?? collapseToggle ?? allMore().at(-1)?.button);
      target?.focus({ preventScroll: true });
    }
  }

  function reconcile(
    replacement: HTMLElement,
    key: NavbarUpdateOptions['key'],
    before?: Map<NavbarItem, DOMRect>,
  ): void {
    const old = new Set(items().filter((item) => item !== collapseToggle && !isMore(item)));
    for (const item of old) stopGlide(item);
    const oldSections = sections().slice(1);
    const adopt = replacement.ownerDocument !== document || !replacement.isConnected;
    const identify = (element: HTMLElement): string | undefined => key?.(element) ?? defaultKey(element);
    const match = <T extends HTMLElement>(nodes: Iterable<T>, incoming: T): T | undefined =>
      findKeyedMatch(nodes, incoming, identify, authored);
    function patch(node: HTMLElement, incoming: HTMLElement, managed: ReadonlySet<string>): void {
      if (node === incoming) return;
      for (const { name } of [...node.attributes]) {
        if (!managed.has(name) && !incoming.hasAttribute(name)) node.removeAttribute(name);
      }
      for (const { name, value } of incoming.attributes) {
        if (!managed.has(name) && node.getAttribute(name) !== value) node.setAttribute(name, value);
      }
    }
    const sectionStyles = [
      '--lg-nav-refraction-filter',
      '--lg-nav-blur',
      '--lg-nav-rim',
      '--lg-nav-highlight',
      '--lg-nav-shadow',
    ];
    const busyClass = 'lg-navbar__glass--busy';
    const authored = (node: HTMLElement, incoming: HTMLElement): boolean => {
      const clone = node.cloneNode(true) as HTMLElement;
      clone.style.removeProperty('order');
      clone.removeAttribute('data-lg-navbar-run');
      if (clone.getAttribute('style') === '') clone.removeAttribute('style');
      if (node instanceof HTMLButtonElement || node instanceof HTMLAnchorElement) {
        if (generatedLabels.has(node)) clone.removeAttribute('aria-label');
        for (const generated of clone.querySelectorAll('.lg-navbar__badge, .lg-navbar__sr')) generated.remove();
      }
      if (node.hasAttribute('data-navbar-section')) {
        clone.classList.remove(busyClass);
        if (!clone.className && !incoming.hasAttribute('class')) clone.removeAttribute('class');
        for (const property of sectionStyles) {
          if (!incoming.style.getPropertyValue(property)) clone.style.removeProperty(property);
        }
        if (!clone.getAttribute('style')) clone.removeAttribute('style');
        return clone.cloneNode(false).isEqualNode(incoming.cloneNode(false));
      }
      return clone.isEqualNode(incoming);
    };
    function reconcileItem(incoming: NavbarItem): NavbarItem {
      const item = match(old, incoming);
      if (!item) {
        const added = adopt ? incoming : (incoming.cloneNode(true) as NavbarItem);
        if (added.getAttribute('data-navbar-hidden') === 'false') added.hidden = false;
        return added;
      }
      old.delete(item);
      releaseCollapseUnit(item);
      if (generatedLabels.delete(item)) item.removeAttribute('aria-label');
      const badge = badges.entries.get(item);
      const managed = new Set(['data-lg-navbar-run']);
      if (badge) managed.add('aria-describedby');
      if (popovers.has(item)) ['aria-controls', 'aria-expanded', 'aria-haspopup'].forEach((name) => managed.add(name));
      const explicitVisibility = incoming.getAttribute('data-navbar-hidden');
      if (incoming.hidden || explicitVisibility === 'false') runtimeVisibility.delete(item);
      if (runtimeVisibility.has(item)) managed.add('hidden');
      patch(item, incoming, managed);
      if (explicitVisibility === 'false') item.hidden = false;
      const content = Array.from(item.childNodes).filter((child) => child !== badge?.badge && child !== badge?.text);
      if (
        content.length !== incoming.childNodes.length ||
        content.some((child, index) => !child.isEqualNode(incoming.childNodes[index]))
      ) {
        for (const child of content) child.parentNode?.removeChild(child);
        item.prepend(...Array.from(incoming.childNodes, (child) => child.cloneNode(true)));
      }
      widths.delete(item);
      return item;
    }
    for (const incoming of replacement.querySelectorAll<HTMLElement>(`${sectionSelector}, ${ITEM_SELECTOR}`)) {
      if (!incoming.hasAttribute('data-navbar-section')) {
        nav.append(reconcileItem(incoming as NavbarItem));
        continue;
      }
      const reused = match(oldSections, incoming);
      const section = reused ?? (adopt ? incoming : (incoming.cloneNode(false) as HTMLElement));
      if (reused) {
        oldSections.splice(oldSections.indexOf(reused), 1);
        releaseCollapseUnit(reused);
        const busy = reused.classList.contains(busyClass);
        const glass = sectionStyles.map((property) => [property, reused.style.getPropertyValue(property)] as const);
        patch(reused, incoming, new Set());
        if (busy) reused.classList.add(busyClass);
        for (const [property, value] of glass) {
          if (value && !reused.style.getPropertyValue(property)) reused.style.setProperty(property, value);
        }
      }
      for (const item of buttonsIn(incoming)) {
        const next = reconcileItem(item);
        if (section !== incoming) section.append(next);
        else if (next !== item) item.replaceWith(next);
      }
      nav.append(section);
    }
    for (const item of old) {
      fadeOut(item, before?.get(item));
      popovers.get(item)?.destroy();
      const badge = badges.entries.get(item);
      if (badge) {
        badge.badge.remove();
        badge.text.remove();
        if (badge.describedBy === null) item.removeAttribute('aria-describedby');
        else item.setAttribute('aria-describedby', badge.describedBy);
        badges.forget(item);
      }
      if (generatedLabels.delete(item)) item.removeAttribute('aria-label');
      releaseCollapseUnit(item);
      item.remove();
      homes.delete(item);
      presses.get(item)?.stop();
      presses.delete(item);
      magnifySprings.get(item)?.stop();
      magnifySprings.delete(item);
    }
    oldSections.forEach((section) => {
      releaseCollapseUnit(section);
      section.remove();
    });
  }

  let syncing = false;

  function sync(immediate = false): void {
    if (updating || signal.aborted || syncing) return;
    const before = reflowing() && !collapseSpring.moving ? snapshot() : undefined;
    // With reflow glide on, the lens springs to its tab too instead of jumping.
    syncNow(before ? false : immediate);
    if (before) glide(before);
  }

  function syncNow(immediate: boolean): void {
    if (signal.aborted || syncing) return;
    syncing = true;
    try {
      paintLayout(immediate);
    } finally {
      syncing = false;
    }
  }

  function paintLayout(immediate: boolean): void {
    // The gradual highlight only lives while the lens moves; never let it outlast the motion.
    if (ink && !spring.moving && !crossSpring.moving && !gesture?.dragging) clearInk();
    const isEnabled = enabled();
    nav.classList.toggle('lg-navbar--enabled', isEnabled);
    labelItems();
    const groups = sections().slice(1);
    nav.classList.toggle('lg-navbar--sectioned', groups.length > 0);
    // Mid-compact, labels are still drawn while they shrink, so measuring now would keep items behind More.
    if (!(compact && nav.classList.contains('lg-navbar--compacting'))) layoutPass();
    paintMixed(groups.length > 0);
    const split = nav.classList.contains('lg-navbar--split');
    const glass = groups.length ? groups : split ? surfaces.filter((surface) => surface.parentElement === nav) : [nav];
    const more = openMore();
    if (more) {
      if (more.host.classList.contains('lg-navbar__overflow--individual')) {
        paintSurfaces(
          buttonsIn(more.host).map((button) => [button]),
          more.host,
          0,
        );
      }
      if (more.host.classList.contains('lg-navbar__overflow--shared')) glass.push(more.host);
      else if (more.host.classList.contains('lg-navbar__overflow--individual'))
        glass.push(...surfaces.filter((surface) => surface.parentElement === more!.host));
    }
    refraction?.sync(isEnabled ? glass : []);
    fitEqualWidth();
    nav.classList.toggle('lg-navbar--free', freeSwipe());
    tint.update();
    if (followCollapsePreview()) return;
    const target = lensTarget();
    if (!target) {
      lens.hidden = true;
      spring.stop();
      crossSpring.stop();
      clearInk();
      return;
    }
    placeLens(target, undefined, !immediate && isEnabled);
    const { start } = measure(target as NavbarItem);
    // A swipe that just ended hands its speed to the spring, so the lens carries on and settles.
    const velocity =
      releaseVelocity && performance.now() - releaseVelocity.at < 600 ? releaseVelocity.value : undefined;
    releaseVelocity = undefined;
    if (immediate || !isEnabled) {
      if (!gesture?.dragging) clearInk();
      spring.set(start);
    } else {
      if (Math.abs(spring.value - start) > 0.5 || spring.moving || crossSpring.moving) startInk();
      if (
        Math.abs(spring.target - start) > 0.05 ||
        (!spring.moving && Math.abs(spring.value - start) > 0.05) ||
        velocity !== undefined
      )
        spring.to(start, velocity);
    }
  }

  function freeSwipe(): boolean {
    if (vertical() || reorderMode) return false;
    return (
      nav.classList.contains('lg-navbar--multirow') ||
      allMore().some(({ button }) => !button.hidden) ||
      popovers.size > 0
    );
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
    const original = peers(order[0]).filter((button) => !isMore(button));
    if (
      !section ||
      order.length !== original.length ||
      new Set(order).size !== order.length ||
      order.some((button) => !original.includes(button) || !items().includes(button))
    ) {
      throw new Error('Pass every button in one navbar section exactly once.');
    }
    const focused = document.activeElement;
    const slots = original.map((button) => {
      const slot = document.createComment('navbar reorder');
      button.before(slot);
      return slot;
    });
    slots.forEach((slot, index) => slot.replaceWith(order[index]!));
    if ((focused instanceof HTMLButtonElement || focused instanceof HTMLAnchorElement) && order.includes(focused))
      focused.focus({ preventScroll: true });
    options.onReorder?.([...order], section);
    sync(true);
  }

  function moveTo(button: NavbarItem, target: NavbarItem): void {
    if (button === target) return;
    const order = peers(button).filter((peer) => !isMore(peer));
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
      spring = createSpring(
        0,
        (value) => {
          if (Math.abs(value) < 0.001) item.style.removeProperty('--_lg-press');
          else item.style.setProperty('--_lg-press', value.toFixed(4));
        },
        { response: 0.28, dampingRatio: 0.55, precision: 0.002 },
      );
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
      spring = createSpring(
        0,
        (value) => {
          if (Math.abs(value) < 0.001) icon.style.removeProperty('--_lg-bounce');
          else icon.style.setProperty('--_lg-bounce', value.toFixed(4));
        },
        { response: 0.5, dampingRatio: 0.42, precision: 0.002 },
      );
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
    if (button === collapseToggle) {
      activateCollapse();
      return;
    }
    const overflowEntry = moreFor(button);
    if (overflowEntry?.button === button) {
      if (!keepOpen && overflowEntry.popover.open) overflowEntry.popover.hide({ reason: 'trigger' });
      else showMore(overflowEntry, keyboard);
      return;
    }
    const context = contextActions.state;
    if (context?.back && button === context.back) {
      const { onBack } = context;
      contextActions.hide(keyboard);
      onBack?.();
      return;
    }
    const popover = popovers.get(button);
    if (popover) {
      if (keepOpen) popover.show();
      else popover.toggle({ focus: keyboard });
      return;
    }
    const fromOverflow = overflowEntry?.host.contains(button);
    if (isAction(button)) options.onAction?.(button);
    // A link is followed like a tap: its click selects it, then the browser navigates.
    else if (swipe && button instanceof HTMLAnchorElement) button.click();
    else select(button);
    if (fromOverflow) overflowEntry?.popover.hide({ reason: 'selection', restoreFocus: keyboard });
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
    const first = points[0],
      last = points[points.length - 1];
    const seconds = (last.time - first.time) / 1000;
    return seconds > 0 ? (last.position - first.position) / seconds : 0;
  }

  function candidates(): NavbarItem[] {
    if (gesture?.draggedItem)
      return peers(gesture.draggedItem).filter((button) => isAvailable(button) && !isMore(button));
    return items().filter((button) => isAvailable(button) && (allowsSwipe(button) || button === collapseToggle));
  }

  function closest(buttons: NavbarItem[], position: number): NavbarItem | undefined {
    return buttons.reduce<NavbarItem | undefined>((best, next) => {
      const { start, size } = measure(next);
      if (!best) return next;
      const current = measure(best);
      return Math.abs(start + size / 2 - position) < Math.abs(current.start + current.size / 2 - position)
        ? next
        : best;
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

  /** Whether a point is on an element or within `margin` pixels of it. */
  const near = (element: HTMLElement, point: { x: number; y: number }, margin: number): boolean => {
    const box = boxOf(element);
    return (
      point.x >= box.left - margin &&
      point.x <= box.left + box.width + margin &&
      point.y >= box.top - margin &&
      point.y <= box.top + box.height + margin
    );
  };

  function finish(event: PointerEvent, cancelled = false): void {
    if (!gesture || gesture.id !== event.pointerId) return;
    const { dragging, draggedItem, free, openedOverflow, collapseBeforePreview } = gesture;
    const point = pointOf(event);
    let target =
      dragging && !cancelled
        ? free
          ? freeTarget(candidates(), point)
          : closest(candidates(), eventPosition(event))
        : undefined;
    // A swipe can preview More from its column, but committing it requires releasing on the trigger.
    if (target && (isMore(target) || target === collapseToggle) && !near(target, point, 4)) target = undefined;
    if (target && moreFor(target)?.host.contains(target) && !near(target, point, 4)) target = undefined;
    gesture = undefined;
    if (dragging) releaseVelocity = { value: velocityOf(samples), at: performance.now() };
    samples = [];
    nav.classList.remove('lg-navbar--pressed', 'lg-navbar--dragging', 'lg-navbar--lens-away');
    items().forEach((button) => button.classList.remove('lg-navbar__preview'));
    if (nav.hasPointerCapture(event.pointerId)) nav.releasePointerCapture(event.pointerId);
    if (dragging) suppressClick = true;
    const committedPreview =
      collapseBeforePreview !== undefined &&
      target !== undefined &&
      (target === collapseToggle || (collapseBeforePreview && collapsibleItem(target) && near(target, point, 4)));
    if (collapseBeforePreview !== undefined) {
      if (committedPreview) commitCollapse(collapsed);
      else {
        applyCollapse(collapseBeforePreview);
        if (target && collapsibleItem(target) && collapseBeforePreview) target = undefined;
      }
    }
    if (target && !(committedPreview && target === collapseToggle)) {
      if (draggedItem) moveTo(draggedItem, target);
      else activate(target, { swipe: true, keepOpen: openedOverflow?.button === target });
    }
    // More opened by sliding onto it during this swipe closes again unless the finger lifted on More or inside it.
    if (openedOverflow && target !== openedOverflow.button && !(target && openedOverflow.host.contains(target))) {
      openedOverflow.popover.hide({ reason: 'selection' });
    }
    sync();
    if (heldCompact !== undefined) setCompact(heldCompact);
  }

  // Links can be dragged out of the page by default, which cancels the swipe as soon as it starts.
  nav.addEventListener(
    'dragstart',
    (event) => {
      if (enabled() && buttonAt(event)) event.preventDefault();
    },
    { signal },
  );
  nav.addEventListener(
    'pointerdown',
    (event) => {
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
      };
      nav.classList.add('lg-navbar--pressed');
    },
    { signal },
  );
  window.addEventListener(
    'pointermove',
    (event) => {
      if (!gesture || gesture.id !== event.pointerId) return;
      let buttons = candidates();
      const canReveal = buttons.some(isMore);
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
        try {
          nav.setPointerCapture(event.pointerId);
        } catch {
          /* The window still tracks this gesture. */
        }
        startInk();
        release();
        nav.classList.add('lg-navbar--dragging');
      }
      if (gesture.free) return dragFree(event, buttons);
      const position = eventPosition(event);
      const target = closest(buttons, position);
      if (!target) return;
      samples = [
        ...samples.filter((sample) => event.timeStamp - sample.time < 100),
        { position, time: event.timeStamp },
      ];
      // The lens follows the finger, its size blending between the two items it's between; past the first or last
      // item it gives like a rubber band instead of stopping dead.
      buttons = buttons.filter((button) => !moreFor(button)?.host.contains(button));
      const spans = buttons.map(measure).sort((a, b) => a.start - b.start);
      const size = blendedSize(spans, position);
      const offset = position - size / 2;
      const min = spans[0].start,
        max = spans[spans.length - 1].start + spans[spans.length - 1].size - size;
      placeLens(target, size);
      spring.set(rubberBanded(offset, min, max, size));
      items().forEach((button) => button.classList.toggle('lg-navbar__preview', button === target));
    },
    { passive: true, signal },
  );

  /** The item a free swipe points at. With More open, a finger off to the side of its items means the bar. */
  function freeTarget(buttons: NavbarItem[], point: { x: number; y: number }): NavbarItem | undefined {
    const more = openMore();
    if (more && !near(more.host, point, 12)) {
      const inBar = buttons.filter((button) => !more.host.contains(button));
      if (inBar.length) return closestTo(inBar, point);
    }
    return closestTo(buttons, point);
  }

  function towardRevealedRows(point: { x: number; y: number }): boolean {
    if (!collapseToggle) return false;
    const trigger = boxOf(collapseToggle);
    return collapseElements().some((element) => {
      if (!isCollapsedUnit(element) || !element.getClientRects().length) return false;
      const row = boxOf(element);
      if (near(element, point, 12)) return true;
      // Bridge the gap from the top of the trigger to the revealed row.
      return (
        row.top < trigger.top &&
        point.y >= row.top &&
        point.y <= trigger.top + trigger.height / 3 &&
        point.x >= Math.min(row.left, trigger.left) - 12 &&
        point.x <= Math.max(row.left + row.width, trigger.left + trigger.width) + 12
      );
    });
  }

  function dragFree(event: PointerEvent, buttons: NavbarItem[]): void {
    if (!gesture) return;
    let point = pointOf(event);
    let target = freeTarget(buttons, point);
    if (!target) return;
    const overToggle = collapseToggle && target === collapseToggle && near(collapseToggle, point, 4);
    if (overToggle && gesture.collapseBeforePreview === undefined) {
      gesture.collapseBeforePreview = collapsed;
      applyCollapse(!collapsed);
      buttons = candidates();
      point = pointOf(event);
    } else if (!overToggle && gesture.collapseBeforePreview !== undefined) {
      const intoRevealedRows = gesture.collapseBeforePreview && towardRevealedRows(point);
      if (!intoRevealedRows) {
        const previous = gesture.collapseBeforePreview;
        delete gesture.collapseBeforePreview;
        applyCollapse(previous);
        buttons = candidates();
        point = pointOf(event);
        target = freeTarget(buttons, point);
        if (!target) return;
      }
    }
    // Preview More when the lens reaches its column. Keep the preview while moving
    // through the gap toward the menu, and close it when the lens leaves that area.
    const more = moreFor(target);
    const overTrigger = more?.button === target && inColumn(target, point);
    const opened = gesture.openedOverflow;
    const overMenu = opened?.host.contains(target) && near(opened.host, point, 12);
    if (overTrigger && !more.popover.open) {
      showMore(more);
      if (more.popover.open) gesture.openedOverflow = more;
      reink();
    } else if (opened?.popover.open && !overTrigger && !overMenu) {
      opened.popover.hide({ reason: 'selection' });
      reink();
    }
    samples = [
      ...samples.filter((sample) => event.timeStamp - sample.time < 100),
      { position: point.x, time: event.timeStamp },
    ];
    items().forEach((button) => button.classList.toggle('lg-navbar__preview', button === target));
    const inMenu = inMoreMenu(target);
    nav.classList.toggle('lg-navbar--lens-away', inMenu);
    if (inMenu) return;
    const box = boxOf(target);
    const row = buttons.filter((button) => {
      if (moreFor(button)?.host.contains(button) !== more?.host.contains(target)) return false;
      return Math.abs(boxOf(button).top - box.top) < 4;
    });
    const spans = row
      .map((button) => ({ start: boxOf(button).left, size: boxOf(button).width }))
      .sort((a, b) => a.start - b.start);
    const size = blendedSize(spans, point.x);
    const min = spans[0].start,
      max = spans[spans.length - 1].start + spans[spans.length - 1].size - size;
    placeLens(target, size);
    spring.set(rubberBanded(point.x - size / 2, min, max, size));
  }

  nav.addEventListener(
    'pointerdown',
    (event) => {
      if (!event.isPrimary || event.button !== 0 || !motionOn('tap')) return;
      const item = buttonAt(event);
      if (item) pressSpring(item).to(1);
    },
    { signal },
  );
  window.addEventListener('pointerup', release, { signal });
  window.addEventListener('pointercancel', release, { signal });
  window.addEventListener('pointerup', (event) => finish(event), { signal });
  window.addEventListener('pointercancel', (event) => finish(event, true), { signal });
  nav.addEventListener(
    'lostpointercapture',
    (event) => {
      if (event.target === nav) finish(event, true);
    },
    { signal },
  );
  nav.addEventListener(
    'click',
    (event) => {
      if (suppressClick && event.detail > 0) {
        suppressClick = false;
        event.stopPropagation();
        return;
      }
      const button = buttonAt(event);
      if (!button || reorderMode) return;
      activate(button, { keyboard: event.detail === 0 });
      sync();
    },
    { signal },
  );

  bindKeyboard(nav, signal, disposer, options, {
    vertical,
    buttonAt,
    reorderPeers: (button) => peers(button).filter((peer) => isAvailable(peer) && !isMore(peer)),
    moveTo,
  });

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
    if (
      equalWidth &&
      equalOverflow === 'natural' &&
      !nav.classList.contains('lg-navbar--multirow') &&
      items().some((button) => isAvailable(button) && !moreFor(button)?.host.contains(button) && !fits(button))
    ) {
      nav.classList.remove('lg-navbar--equal');
    }
  }

  // Does the button's content (icon, label) fit inside it? Labels don't wrap, so they overflow when it's too narrow.
  function fits(button: NavbarItem): boolean {
    const style = getComputedStyle(button);
    const room = button.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return [...button.children].every(
      (child) =>
        child.classList.contains('lg-navbar__badge') ||
        child.classList.contains('lg-navbar__sr') ||
        child.getBoundingClientRect().width <= room + 1,
    );
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
    if (background !== undefined && !CSS.supports('background', background))
      throw new Error('Invalid navbar background.');
    if (background === undefined) nav.style.removeProperty('--lg-nav-background');
    else nav.style.setProperty('--lg-nav-background', background);
  }

  function setLens({ style, accent, background, radius, blur, pressScale, dragScale }: NavbarLensOptions = {}): void {
    function cssScale(scale: NavbarLensScale | undefined): string | undefined {
      if (scale === undefined) return undefined;
      const axes = typeof scale === 'number' ? [scale] : scale;
      if (axes.some((axis) => !Number.isFinite(axis) || axis <= 0))
        throw new RangeError('Lens scales must be positive finite numbers.');
      return axes.join(' ');
    }

    if (blur !== undefined && (!Number.isFinite(blur) || blur < 0))
      throw new RangeError('Lens blur must be a non-negative finite number.');
    const pressed = cssScale(pressScale);
    const dragging = cssScale(dragScale);
    if (style) lens.dataset.navbarLens = style;
    else delete lens.dataset.navbarLens;
    for (const [property, value] of [
      ['--lg-nav-lens-accent', accent],
      ['--lg-nav-lens-background', background],
      ['--lg-nav-lens-radius', radius],
      ['--lg-nav-lens-blur', blur === undefined ? undefined : `${blur}px`],
      ['--lg-nav-lens-press-scale', pressed],
      ['--lg-nav-lens-drag-scale', dragging],
    ] as const) {
      if (value === undefined) lens.style.removeProperty(property);
      else lens.style.setProperty(property, value);
    }
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
  const contextActions = createContextActions(nav, COLOR_VARIABLES, {
    items,
    closePopovers: () => {
      hideMore();
      for (const popover of popovers.values()) popover.hide();
    },
    markCurrent,
    sync: () => sync(true),
    lastMore: () => allMore().at(-1)?.button,
  });
  const originalColors = new Map(
    Object.values(COLOR_VARIABLES).map((variable) => [
      variable,
      { value: nav.style.getPropertyValue(variable), priority: nav.style.getPropertyPriority(variable) },
    ]),
  );
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
    refreshColors();
  }

  function refreshColors(): void {
    if (!ink) return;
    clearInk();
    startInk();
    paintInk();
  }

  // ---- Collapsible rows ----

  let collapseOptions = options.collapsible === true ? {} : options.collapsible || undefined;
  let collapsed = collapseOptions?.initial === 'collapsed';
  let committedCollapsed = collapsed;
  let collapseEndPending = false;
  let collapsePress = false;
  let pendingOverflow: { value: LiquidGlassNavbarOptions['overflow'] } | undefined;
  const collapsePressSpring = createSpring(0, () => {}, {
    response: 0.48,
    dampingRatio: 1,
    precision: 0.003,
    onRest: () => {
      collapsePress = false;
      sync();
    },
  });
  let collapseLines: Unit[][] = [];
  let collapseToggle: HTMLElement | undefined;
  let restoreCollapseToggle: (() => void) | undefined;
  const collapseUnits = new Map<HTMLElement, { inert: boolean }>();
  let collapseGap = 0;
  const collapseSpring = createSpring(
    collapsed ? 0 : 1,
    () => {
      paintCollapse();
      if (nav.classList.contains('lg-navbar--split')) paintRowSurfaces(collapseLines, horizontalSpace(nav).pad / 2);
      if (!followCollapsePreview()) followActive(true);
    },
    {
      response: 0.4,
      dampingRatio: 1,
      ...collapseOptions?.spring,
      precision: 0.001,
      onRest: finishCollapse,
    },
  );

  function finishCollapse(): void {
    crossOffset = crossOrigin();
    crossReference = undefined;
    if (pendingOverflow && gesture?.collapseBeforePreview === undefined) {
      const { value } = pendingOverflow;
      pendingOverflow = undefined;
      replaceOverflow(value);
    } else syncNow(reducedMotion.matches);
    if (gesture?.collapseBeforePreview !== undefined || !collapseEndPending) return;
    collapseEndPending = false;
    options.onCollapseEnd?.(committedCollapsed);
  }

  let warnedCurrent: NavbarItem[] = [];
  function currentItem(): NavbarItem | undefined {
    const current = flowItems().filter((item) => item.getAttribute('aria-current') === 'page');
    if (
      options.warnOnMultipleCurrent &&
      current.length > 1 &&
      (current.length !== warnedCurrent.length || current.some((item, index) => item !== warnedCurrent[index]))
    ) {
      console.warn(
        'Liquid Glass Navbar: multiple items have aria-current="page". The highest row wins, then markup order.',
        nav,
      );
    }
    warnedCurrent = current;
    return current.reduce<NavbarItem | undefined>(
      (best, item) => (!best || (layout === 'rows' && rowOfItem(item) > rowOfItem(best)) ? item : best),
      undefined,
    );
  }

  function lensTarget(): NavbarItem | undefined {
    const active = currentItem();
    const activeMore = moreFor(active);
    for (const { button } of allMore())
      button.toggleAttribute('data-navbar-overflow-current', activeMore?.button === button);
    const opened = openMore();
    if (opened && isAvailable(opened.button)) return opened.button;
    const toggle =
      collapseToggle instanceof HTMLButtonElement || collapseToggle instanceof HTMLAnchorElement
        ? collapseToggle
        : undefined;
    if (collapsePress && toggle && nav.contains(toggle) && isAvailable(toggle)) return toggle;
    if (active && collapsibleItem(active) && (collapsed || !isAvailable(activeMore?.button ?? active))) {
      const returning = activeMore?.button ?? active;
      if (!collapsed && collapseSpring.value > 0.35 && returning.getClientRects().length && !returning.hidden)
        return returning;
      return (
        flowItems().find(
          (item) =>
            item.hasAttribute('data-navbar-collapsed-current') &&
            !collapsibleItem(item) &&
            isAvailable(item) &&
            !homes.has(item),
        ) ??
        (toggle && nav.contains(toggle) && isAvailable(toggle) ? toggle : undefined) ??
        (activeMore && isAvailable(activeMore.button) ? activeMore.button : undefined) ??
        tabs().find((item) => !collapsibleItem(item) && !homes.has(item))
      );
    }
    const target = activeMore?.button ?? active;
    return target && isAvailable(target) ? target : undefined;
  }

  function followCollapsePreview(): boolean {
    if (!gesture?.dragging || gesture.collapseBeforePreview === undefined) return false;
    const preview = items().find((item) => item.classList.contains('lg-navbar__preview') && isAvailable(item));
    if (preview && !moreFor(preview)?.host.contains(preview)) {
      placeLens(preview, lensSize);
      if (preview === collapseToggle) {
        const { start, size } = measure(preview);
        spring.set(start + (size - lensSize) / 2);
      }
    }
    return true;
  }

  function paintRowSurfaces(lines: Unit[][], pad: number): void {
    paintSurfaces(
      lines.map((line) => line.map(({ element }) => element)),
      nav,
      pad,
    );
    if (!collapseOptions) return;
    const rowSurfaces = surfaces.filter((surface) => surface.parentElement === nav);
    const last = mainRow();
    lines.forEach((line, index) => {
      const collapsing = line.every(({ element, row }) => isCollapsedUnit(element, row, last));
      rowSurfaces[index]?.style.setProperty('opacity', collapsing ? String(collapseSpring.value) : '1');
    });
  }

  function collapseElements(): HTMLElement[] {
    const away = [...homes.keys()].filter((item) => homes.get(item) === nav);
    return [...nav.querySelectorAll<HTMLElement>(sectionSelector), ...buttonsIn(nav), ...away].filter(
      (element) => element !== collapseToggle && !isMore(element),
    );
  }

  function mainRow(): number {
    return Math.max(1, ...collapseElements().map((element) => rowOf(element) ?? 1));
  }

  function isCollapsedUnit(element: HTMLElement, row = rowOf(element) ?? 1, last = mainRow()): boolean {
    return Boolean(
      collapseOptions &&
        multiRowActive() &&
        layout === 'rows' &&
        element !== collapseToggle &&
        (!isMore(element) || overflow?.perRow === true) &&
        !element.contains(collapseToggle ?? null) &&
        (collapseOptions.rows?.includes(row) ?? row < last),
    );
  }

  function placeCollapseToggle(): void {
    if (!collapseOptions || !collapseToggle?.hasAttribute('data-navbar-generated')) return;
    const last = mainRow();
    const host =
      [...nav.querySelectorAll<HTMLElement>(sectionSelector)]
        .reverse()
        .find((section) => !section.hidden && (rowOf(section) ?? 1) === last) ?? nav;
    const moreButton = allMore().find(({ button }) => button.parentElement === host)?.button ?? null;
    if (collapseToggle.parentElement !== host || (host !== nav && collapseToggle.nextElementSibling !== moreButton)) {
      host.insertBefore(collapseToggle, moreButton);
    }
    if (host === nav) collapseToggle.dataset.navbarRow = String(last);
    else delete collapseToggle.dataset.navbarRow;
    collapseToggle.hidden =
      !multiRowActive() ||
      layout !== 'rows' ||
      !collapseElements().some((element) => isCollapsedUnit(element, rowOf(element) ?? 1, last));
  }

  function releaseCollapseUnit(element: HTMLElement): void {
    const previous = collapseUnits.get(element);
    if (!previous) return;
    element.inert = previous.inert;
    element.classList.remove('lg-navbar__collapse-unit', 'lg-navbar__collapse-hidden');
    element.style.removeProperty('--_lg-collapse-height');
    element.style.removeProperty('--_lg-collapse-padding');
    element.style.removeProperty('--_lg-collapse-x');
    element.style.removeProperty('--_lg-collapse-y');
    collapseUnits.delete(element);
  }

  function paintCollapse(remeasure = false): void {
    const progress = Math.min(1, Math.max(0, collapseSpring.value));
    const animating = progress > 0 && progress < 1;
    const active = Boolean(collapseOptions && multiRowActive() && layout === 'rows' && !contextActions.state);
    const last = mainRow();
    const units = active
      ? [
          ...collapseElements(),
          ...allMore()
            .filter(({ button }) => button.parentElement === nav && !button.hidden)
            .map(({ button }) => button),
        ].filter(
          (element) => !moreFor(element)?.host.contains(element) && isCollapsedUnit(element, rowOf(element) ?? 1, last),
        )
      : [];
    for (const element of collapseUnits.keys())
      if (!units.includes(element) || (!animating && !collapsed && progress === 1)) releaseCollapseUnit(element);
    if (!active) {
      nav.classList.remove('lg-navbar--collapsing');
      return;
    }

    if (animating && !nav.classList.contains('lg-navbar--collapsing')) {
      collapseGap = px(getComputedStyle(nav).rowGap) * 2;
    }
    nav.classList.toggle('lg-navbar--collapsing', animating);
    nav.style.setProperty('--_lg-collapse-progress', String(progress));
    const needsMeasurement =
      progress > 0 && units.some((element) => remeasure || !element.style.getPropertyValue('--_lg-collapse-height'));
    const toggleBox = needsMeasurement ? collapseToggle?.getBoundingClientRect() : undefined;
    for (const element of units) {
      if (!collapsed && progress === 1) continue;
      if (!collapseUnits.has(element)) collapseUnits.set(element, { inert: element.inert });
      if ((remeasure || !element.style.getPropertyValue('--_lg-collapse-height')) && progress > 0) {
        element.classList.remove('lg-navbar__collapse-unit', 'lg-navbar__collapse-hidden');
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        element.style.setProperty('--_lg-collapse-height', `${box.height}px`);
        if (toggleBox) {
          element.style.setProperty(
            '--_lg-collapse-x',
            `${toggleBox.left + (toggleBox.width - box.width) / 2 - box.left}px`,
          );
          const towardToggle = Math.sign(toggleBox.top - box.top) * Math.min(20, Math.abs(toggleBox.top - box.top));
          element.style.setProperty('--_lg-collapse-y', `${towardToggle}px`);
        }
        element.style.setProperty('--_lg-collapse-padding', style.paddingTop);
      }
      element.inert = true;
      element.classList.toggle('lg-navbar__collapse-hidden', progress === 0);
      element.classList.toggle('lg-navbar__collapse-unit', animating);
    }
    breaks.forEach((line, index) => {
      const adjacent = [collapseLines[index], collapseLines[index + 1]];
      const shrinks = adjacent.some((group) => group?.every(({ element, row }) => isCollapsedUnit(element, row, last)));
      if (animating) line.style.height = `${collapseGap * (shrinks ? progress : 1)}px`;
      else line.style.removeProperty('height');
    });
  }

  function collapsibleItem(item: NavbarItem): boolean {
    const home = homes.get(item) ?? item.closest<HTMLElement>('[data-navbar-section]');
    return isCollapsedUnit(home && home !== nav ? home : item);
  }

  function setCollapsed(value: boolean): void {
    if (!collapseOptions || signal.aborted) return;
    if (gesture) delete gesture.collapseBeforePreview;
    const changed = committedCollapsed !== value;
    if (changed) collapseEndPending = true;
    committedCollapsed = value;
    applyCollapse(value);
    if (changed) options.onCollapse?.(value);
    if (!collapseSpring.moving) finishCollapse();
  }

  function commitCollapse(value: boolean): void {
    if (committedCollapsed !== value) {
      collapseEndPending = true;
      committedCollapsed = value;
      options.onCollapse?.(value);
    }
    if (!collapseSpring.moving) finishCollapse();
  }

  function activateCollapse(): void {
    if (!reducedMotion.matches && enabled()) {
      collapsePress = true;
      collapsePressSpring.set(0);
      collapsePressSpring.to(1);
    }
    setCollapsed(!collapsed);
    sync();
  }

  function applyCollapse(value: boolean): void {
    if (!collapseOptions || value === collapsed || signal.aborted) return;
    if (value && document.activeElement instanceof HTMLElement) {
      const focused = document.activeElement;
      const home = items().find((item) => item === focused || item.contains(focused));
      const unit = home && (homes.get(home) ?? home.closest<HTMLElement>('[data-navbar-section]') ?? home);
      if (unit && isCollapsedUnit(unit))
        (
          collapseToggle ??
          tabs().find((tab) => !isCollapsedUnit(tab.closest<HTMLElement>('[data-navbar-section]') ?? tab))
        )?.focus({ preventScroll: true });
    }
    collapsed = value;
    hideMore();
    labelCollapseToggle();
    if (reducedMotion.matches || !enabled() || layout !== 'rows' || vertical()) {
      collapseSpring.set(value ? 0 : 1);
      syncNow(true);
    } else {
      crossReference ??= navTop();
      if (!value && collapseSpring.value === 0) {
        // Reintroduce the rows at natural size for one synchronous layout, then clip to the spring value.
        for (const element of collapseUnits.keys()) releaseCollapseUnit(element);
        collapseSpring.set(0.0001);
        syncNow(false);
        paintCollapse(true);
      } else if (!collapseSpring.moving) paintCollapse(true);
      collapseSpring.to(value ? 0 : 1);
    }
  }

  function labelCollapseToggle(): void {
    if (!collapseToggle || !collapseOptions) return;
    collapseToggle.setAttribute('aria-expanded', String(!collapsed));
    if (!collapseToggle.classList.contains('lg-navbar__collapse-toggle')) return;
    const label = collapsed ? (collapseOptions.showLabel ?? 'Show') : (collapseOptions.hideLabel ?? 'Hide');
    collapseToggle.setAttribute('aria-label', label);
    const visible = collapseToggle.querySelector('[data-navbar-label]:not(.lg-navbar__collapse-sizing)');
    if (visible) visible.textContent = label;
    const sizing = collapseToggle.querySelector<HTMLElement>('.lg-navbar__collapse-sizing');
    if (sizing)
      sizing.dataset.label = collapsed ? (collapseOptions.hideLabel ?? 'Hide') : (collapseOptions.showLabel ?? 'Show');
  }

  function mountCollapse(): void {
    if (!collapseOptions || collapseOptions.toggle === false) return;
    if (collapseOptions.toggle instanceof HTMLElement) {
      collapseToggle = collapseOptions.toggle;
      const toggle = collapseToggle;
      const toggleListeners = new AbortController();
      const attrs = ['data-navbar-action', 'data-navbar-overflow', 'aria-expanded'];
      const previous = attrs.map((name) => toggle.getAttribute(name));
      restoreCollapseToggle = () => {
        toggleListeners.abort();
        attrs.forEach((name, index) => {
          const value = previous[index];
          if (value === null) toggle.removeAttribute(name);
          else toggle.setAttribute(name, value);
        });
      };
      toggle.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          event.stopPropagation();
          activateCollapse();
        },
        { signal: toggleListeners.signal },
      );
    } else {
      const button = document.createElement('button');
      collapseToggle = button;
      button.type = 'button';
      button.className = 'lg-navbar__collapse-toggle';
      button.setAttribute('data-navbar-generated', '');
      button.setAttribute('data-navbar-no-swipe', '');
      const icon = svgIcon('M6 9l6 6 6-6');
      icon.setAttribute('data-navbar-icon', '');
      icon.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.setAttribute('data-navbar-label', '');
      const sizing = label.cloneNode() as HTMLElement;
      sizing.className = 'lg-navbar__collapse-sizing';
      sizing.setAttribute('aria-hidden', 'true');
      button.append(icon, label, sizing);
    }
    collapseToggle.setAttribute('data-navbar-action', '');
    collapseToggle.setAttribute('data-navbar-overflow', 'never');
    labelCollapseToggle();
  }

  function unmountCollapseToggle(): void {
    if (collapseToggle?.hasAttribute('data-navbar-generated')) collapseToggle.remove();
    restoreCollapseToggle?.();
    restoreCollapseToggle = undefined;
    collapseToggle = undefined;
  }

  function configureCollapse(next: NonNullable<LiquidGlassNavbarOptions['collapsible']>): void {
    const previous = collapseOptions;
    collapseOptions = next === true ? {} : next || undefined;
    if (!previous || !collapseOptions || (previous.toggle ?? 'auto') !== (collapseOptions.toggle ?? 'auto')) {
      unmountCollapseToggle();
      mountCollapse();
    }
    const state = collapseOptions ? (previous ? committedCollapsed : collapseOptions.initial === 'collapsed') : false;
    if (!collapseOptions || !previous) {
      collapsed = committedCollapsed = state;
      collapseEndPending = false;
      collapseSpring.set(state ? 0 : 1);
    }
    labelCollapseToggle();
    paintCollapse(true);
  }

  function replaceOverflow(next: LiquidGlassNavbarOptions['overflow']): void {
    const nextOptions = overflowSettings(next);
    if (
      nextOptions?.style !== overflow?.style ||
      nextOptions?.surface !== overflow?.surface ||
      nextOptions?.trigger !== overflow?.trigger ||
      nextOptions?.label !== overflow?.label ||
      nextOptions?.icon !== overflow?.icon ||
      nextOptions?.moreLabel !== overflow?.moreLabel ||
      nextOptions?.boundary !== overflow?.boundary
    )
      removeMore();
    overflow = nextOptions;
    sync(false);
  }

  // ---- Compact ----

  let stopScroll: (() => void) | undefined;
  // Compacting animates: each label's width, height and opacity follow one spring (0 = labels, 1 = icons only),
  // so the tabs and the lens resize smoothly and a change of direction mid-way turns round from where it is.
  // At rest the plain `lg-navbar--compact` class takes over and the bar lays out normally again.
  const compactLabels = new Set<HTMLElement>();
  const compactSpring = createSpring(
    0,
    (value) => {
      nav.style.setProperty('--_lg-compact', value.toFixed(4));
      followActive();
    },
    { response: 0.34, dampingRatio: 1, precision: 0.002, onRest: (value) => finishCompact(value > 0.5) },
  );

  function followActive(collapseFrame = false): void {
    const target = lensTarget();
    // Mid-swipe the finger owns the lens; the swipe's own end settles it.
    if (gesture?.dragging) return;
    // lensTarget already vets availability; a row opening mid-spring is inert but still a valid target.
    if (!target?.getClientRects().length) {
      lens.hidden = true;
      return;
    }
    placeLens(target, undefined, collapseFrame && !reducedMotion.matches);
    const start = measure(target).start;
    if (collapseFrame && !reducedMotion.matches) {
      if (Math.abs(start - spring.target) > 0.05) {
        startInk();
        spring.to(start);
      }
    } else {
      spring.set(start);
      clearInk();
    }
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
    if (collapseSpring.moving) paintCollapse(true);
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

  // ---- Magnify: each icon's amount (0..1) is its own spring, so passing over it rises and settles smoothly ----

  let magnify: Required<NavbarMagnifyOptions> | undefined;
  const magnifySprings = new Map<NavbarItem, ReturnType<typeof createSpring>>();
  let magnifyPoint: { x: number; y: number } | undefined;
  let magnifyFrame = 0;

  function magnifySpring(item: NavbarItem): ReturnType<typeof createSpring> {
    let spring = magnifySprings.get(item);
    if (!spring) {
      spring = createSpring(
        0,
        (value) => {
          if (value < 0.001) item.style.removeProperty('--_lg-magnify');
          else item.style.setProperty('--_lg-magnify', value.toFixed(4));
        },
        { response: 0.28, dampingRatio: 1, precision: 0.001 },
      );
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
      const inMenu = inMoreMenu(item);
      if (point && isAvailable(item) && !inMenu) {
        const box = boxOf(item);
        const dx = point.x - (box.left + box.width / 2);
        const dy = point.y - (box.top + box.height / 2);
        // Along the bar the falloff is smooth; across it, only rows the pointer is near react.
        const along = vertical() ? Math.abs(dy) : Math.abs(dx);
        const across = Math.max(0, vertical() ? Math.abs(dx) - box.width / 2 : Math.abs(dy) - box.height / 2);
        const distance = Math.hypot(along, across * 1.5);
        // Mid-swipe only the row the lens is in reacts; the point is already level with it.
        const otherRow = Boolean(gesture?.dragging) && across > 0;
        amount = distance < range && !otherRow ? (1 + Math.cos((Math.PI * distance) / range)) / 2 : 0;
      }
      const spring = magnifySprings.get(item);
      if (amount > 0 || (spring && spring.target !== 0)) magnifySpring(item).to(amount);
    }
  }

  function magnifyAt(point: { x: number; y: number } | undefined): void {
    if (!magnify || reducedMotion.matches) return;
    magnifyPoint = point;
    if (!point) {
      applyMagnify();
      return;
    }
    if (!magnifyFrame) magnifyFrame = disposer.frame(applyMagnify);
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
    magnify = settings
      ? { scale: settings.scale ?? 1.4, lift: settings.lift ?? 10, range: settings.range ?? 110 }
      : undefined;
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

  nav.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'mouse' && !gesture) magnifyAt(pointOf(event));
    },
    { signal, passive: true },
  );
  nav.addEventListener(
    'pointerleave',
    (event) => {
      if (event.pointerType === 'mouse' && !gesture) magnifyAt(undefined);
    },
    { signal },
  );
  // A finger magnifies while it's down and sliding; the window sees those moves once the nav captures them.
  window.addEventListener(
    'pointermove',
    (event) => {
      if (!gesture || gesture.id !== event.pointerId) return;
      const point = pointOf(event);
      // Mid-swipe the finger drives the row the lens is in, however far off the bar it's held.
      if (gesture.dragging && !lens.hidden && !nav.classList.contains('lg-navbar--lens-away')) {
        const box = boxOf(lens);
        if (vertical()) point.x = box.left + box.width / 2;
        else point.y = box.top + box.height / 2;
      }
      magnifyAt(point);
    },
    { signal, passive: true },
  );
  window.addEventListener(
    'pointerup',
    (event) => {
      if (event.pointerType !== 'mouse') magnifyAt(undefined);
    },
    { signal },
  );
  window.addEventListener('pointercancel', () => magnifyAt(undefined), { signal });
  reducedMotion.addEventListener(
    'change',
    () => {
      if (!reducedMotion.matches) return;
      clearMagnify();
      if (collapseSpring.moving) {
        collapseSpring.set(collapsed ? 0 : 1);
        finishCollapse();
      }
      if (compactSpring.moving) {
        compactSpring.stop();
        finishCompact(compact);
      }
      if (spring.moving || crossSpring.moving) syncNow(true);
      for (const item of glides.keys()) stopGlide(item);
      for (const item of exits.keys()) clearExit(item);
    },
    { signal },
  );

  // While compacting animates, the spring keeps the lens in place; the full layout runs once it settles.
  let observed = false;
  let resizeFrame = 0;
  let reportedSize: { width: number; height: number } | undefined;
  const observer = disposer.observe(
    new ResizeObserver(() => {
      if (signal.aborted) return;
      if (resizeFrame) return;
      resizeFrame = disposer.frame(() => {
        resizeFrame = 0;
        if (!gesture?.dragging && !collapseSpring.moving && !nav.classList.contains('lg-navbar--compacting')) {
          if (!observed) syncNow(true);
          else sync(true);
        }
        observed = true;
        const { width, height } = nav.getBoundingClientRect();
        if (!reportedSize || reportedSize.width !== width || reportedSize.height !== height) {
          reportedSize = { width, height };
          options.onResize?.({ width, height });
        }
      });
    }),
  );
  observer.observe(nav);
  if (nav.parentElement) observer.observe(nav.parentElement);
  // A bar that fell back to natural widths may fit equal ones again after the window grows, without itself resizing.
  let windowFrame = 0;
  addEventListener(
    'resize',
    () => {
      // One layout per frame however many resize events arrive.
      if (windowFrame) return;
      windowFrame = disposer.frame(() => {
        windowFrame = 0;
        if ((equalWidth || overflow || layout !== 'row') && !gesture?.dragging) sync(true);
      });
    },
    { signal, passive: true },
  );
  // Web fonts change label widths after the first layout.
  document.fonts?.addEventListener?.('loadingdone', () => sync(true), { signal });
  equalWidth = options.equalWidth ?? false;
  equalOverflow = options.equalWidthOverflow ?? 'natural';
  compact = options.compact ?? false;
  nav.classList.toggle('lg-navbar--compact', compact);
  nav.classList.toggle('lg-navbar--no-labels', !(options.labels ?? true));
  setBackground(options.background);
  tint.setTransparency(options.transparency);
  setColors(options.colors);
  const stopHoverNavigation =
    options.hoverNavigation &&
    bindHoverNavigation(
      nav,
      options.hoverNavigation === true ? {} : options.hoverNavigation,
      (element) => {
        const item = element?.closest<NavbarItem>('button, a[href]');
        return item &&
          items().includes(item) &&
          isAvailable(item) &&
          !isAction(item) &&
          allowsSwipe(item) &&
          !item.closest('[data-navbar-no-hover]')
          ? item
          : undefined;
      },
      () => enabled() && !reorderMode,
      signal,
    );
  setLens(options.lens);
  tint.setContrast(options.contrast);
  setScrollCompact(options.scrollCompact);
  setMagnify(options.magnify);
  setAnimations(options.animations);
  const initiallyCollapsed = collapsed;
  if (initiallyCollapsed) {
    collapsed = false;
    collapseSpring.set(1);
  }
  mountCollapse();
  setPosition(placement);
  if (initiallyCollapsed) {
    collapsed = true;
    labelCollapseToggle();
    collapseSpring.set(0);
    syncNow(true);
  }
  // From here on, changes may animate; the first layout above never does.
  mounted = true;

  return {
    sync: () => sync(),
    setPosition,
    setLabels,
    setEqualWidth,
    setBackground,
    setTransparency: tint.setTransparency,
    refreshRefraction: () => refraction?.refreshSources(),
    setColors,
    refreshColors,
    setLens,
    setCollapsed,
    get collapsed() {
      return gesture?.collapseBeforePreview ?? collapsed;
    },
    setItemHidden,
    update,
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
      if (collapseSpring.moving) pendingOverflow = { value: next };
      else replaceOverflow(next);
    },
    get overflowItems() {
      return [...lastOverflow];
    },
    openOverflow,
    closeOverflow() {
      hideMore();
    },
    setBadge(item, badge) {
      if (!items().includes(item) && !item.closest('.lg-navbar__overflow'))
        throw new Error('The button does not belong to this navbar.');
      badges.set(item, badge);
      sync(true);
    },
    setCompact,
    setScrollCompact,
    get compact() {
      return compact;
    },
    setContrast: tint.setContrast,
    setBackdrop: tint.setBackdrop,
    showContextActions: (nodes, settings) => contextActions.show(nodes, settings),
    hideContextActions: () => contextActions.hide(),
    get contextActive() {
      return contextActions.state !== undefined;
    },
    setMagnify,
    setAnimations,
    createPopover(trigger, content, popoverOptions = {}) {
      if (!items().includes(trigger)) throw new Error('The button does not belong to this navbar.');
      popovers.get(trigger)?.destroy();
      const popover = createAnchoredPopover(trigger, content, {
        container: nav,
        anchor: trigger.parentElement ?? nav,
        spring: () => motionOn('popovers'),
        ...popoverOptions,
        bindTrigger: false,
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
      if (stopHoverNavigation) stopHoverNavigation();
      contextActions.hide(false);
      for (const popover of [...popovers.values()]) popover.destroy();
      badges.destroy();
      clearInk();
      for (const item of glides.keys()) stopGlide(item);
      for (const item of exits.keys()) clearExit(item);
      for (const [item, spring] of presses) {
        spring.stop();
        item.style.removeProperty('--_lg-press');
      }
      presses.clear();
      for (const [icon, spring] of bounces) {
        spring.stop();
        (icon as HTMLElement).style.removeProperty('--_lg-bounce');
      }
      bounces.clear();
      listeners.abort();
      collapseSpring.stop();
      crossSpring.stop();
      spring.stop();
      for (const element of collapseUnits.keys()) releaseCollapseUnit(element);
      nav.style.removeProperty('--_lg-collapse-progress');
      collapsePressSpring.stop();
      unmountCollapseToggle();
      tint.destroy();
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
      clearSectionWidths();
      refraction?.destroy();
      spring.stop();
      if (gesture && nav.hasPointerCapture(gesture.id)) nav.releasePointerCapture(gesture.id);
      items().forEach((button) => button.classList.remove('lg-navbar__preview'));
      generatedLabels.forEach((button) => button.removeAttribute('aria-label'));
      delete nav.dataset.lgNavbarPosition;
      nav.removeAttribute('data-lg-navbar-backdrop');
      nav.style.removeProperty('--lg-nav-background');
      nav.style.removeProperty('--lg-nav-tint');
      setColors();
      for (const name of [...nav.classList])
        if (name === 'lg-navbar' || name.startsWith('lg-navbar--')) nav.classList.remove(name);
      lens.remove();
      for (const element of [nav, ...nav.querySelectorAll('*')]) {
        const authored = authoredAttributes.get(element);
        for (const name of ['class', 'style'] as const) {
          if (!authored?.[name] && element.getAttribute(name)?.trim() === '') element.removeAttribute(name);
        }
      }
    },
  };
}
