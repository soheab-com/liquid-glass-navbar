import { mountRefraction, supportsBackdropRefraction } from './refraction.js';
import { createSpring, rubberBanded } from './spring.js';

export type NavbarPosition = 'top' | 'bottom' | 'left' | 'right';

/** What equal widths do when the widest item doesn't fit the bar. */
export type EqualWidthOverflow = 'natural' | 'truncate' | 'grow';

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
  destroy(): void;
}

interface Gesture {
  id: number;
  start: number;
  crossStart: number;
  dragging: boolean;
  draggedItem: NavbarItem | null;
}

/** A tab or action: a `<button>`, or an `<a href>` for sites where each tab is its own page. */
export type NavbarItem = HTMLButtonElement | HTMLAnchorElement;

const ITEM_SELECTOR = ':scope > button, :scope > a[href]';

const sectionSelector = ':scope > [data-navbar-section]';
const buttonsIn = (section: HTMLElement): NavbarItem[] =>
  [...section.querySelectorAll<NavbarItem>(ITEM_SELECTOR)];
const isAction = (button: NavbarItem): boolean => button.hasAttribute('data-navbar-action');
const allowsSwipe = (button: NavbarItem): boolean => !button.closest('[data-navbar-no-swipe]');
const isAvailable = (button: NavbarItem): boolean => !button.hidden
  && !(button instanceof HTMLButtonElement && button.disabled)
  // Hidden by the page's own CSS (display: none), for example an item that moved into a "More" menu.
  && button.getClientRects().length > 0
  && !(button.hasAttribute('data-navbar-hide-icon') && button.hasAttribute('data-navbar-hide-label'));

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
  const generatedLabels = new Set<NavbarItem>();
  const enabled = options.enabled ?? (() => true);
  const vertical = (): boolean => placement === 'left' || placement === 'right';
  const sections = (): HTMLElement[] => [nav, ...nav.querySelectorAll<HTMLElement>(sectionSelector)];
  const items = (): NavbarItem[] => sections().flatMap(buttonsIn);
  const tabs = (): NavbarItem[] => items().filter((button) => isAvailable(button) && !isAction(button));
  let lensSize = 0;
  const spring = createSpring(0, (offset) => {
    lens.style.translate = vertical() ? `0 ${offset}px` : `${offset}px 0`;
  }, { response: .38, dampingRatio: .78 });
  let releaseVelocity: { value: number; at: number } | undefined;
  let samples: { position: number; time: number }[] = [];

  function offsetOf(button: NavbarItem): { left: number; top: number } {
    let left = 0;
    let top = 0;
    let node: HTMLElement | null = button;
    while (node && node !== nav) {
      left += node.offsetLeft;
      top += node.offsetTop;
      node = node.offsetParent instanceof HTMLElement ? node.offsetParent : null;
    }
    return { left, top };
  }

  function measure(button: NavbarItem): { start: number; size: number } {
    const { left, top } = offsetOf(button);
    const isVertical = vertical();
    return isVertical ? { start: top, size: button.offsetHeight } : { start: left, size: button.offsetWidth };
  }

  function placeLens(button: NavbarItem, size?: number): void {
    const { left, top } = offsetOf(button);
    const width = vertical() ? button.offsetWidth : size ?? button.offsetWidth;
    const height = vertical() ? size ?? button.offsetHeight : button.offsetHeight;
    lens.style.width = `${width}px`;
    lens.style.height = `${height}px`;
    lens.style.left = vertical() ? `${left}px` : '0';
    lens.style.top = vertical() ? '0' : `${top}px`;
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

  function sync(immediate = false): void {
    if (signal.aborted) return;
    const isEnabled = enabled();
    nav.classList.toggle('lg-navbar--enabled', isEnabled);
    const groups = sections().slice(1);
    nav.classList.toggle('lg-navbar--sectioned', groups.length > 0);
    refraction?.sync(isEnabled ? (groups.length ? groups : [nav]) : []);
    labelItems();
    fitEqualWidth();
    const active = tabs().find((button) => button.getAttribute('aria-current') === 'page');
    if (!active) {
      lens.hidden = true;
      spring.stop();
      return;
    }
    placeLens(active);
    const { start } = measure(active);
    // A swipe that just ended hands its speed to the spring, so the lens carries on and settles.
    const velocity = releaseVelocity && performance.now() - releaseVelocity.at < 600 ? releaseVelocity.value : undefined;
    releaseVelocity = undefined;
    if (immediate || !isEnabled) spring.set(start);
    else spring.to(start, velocity);
  }

  function buttonAt(event: Event): NavbarItem | null {
    const button = event.target instanceof Element ? event.target.closest<NavbarItem>('button, a[href]') : null;
    return button && items().includes(button) && isAvailable(button) ? button : null;
  }

  function eventPosition(event: PointerEvent): number {
    const rect = nav.getBoundingClientRect();
    return vertical() ? event.clientY - rect.top - nav.clientTop : event.clientX - rect.left - nav.clientLeft;
  }

  function peers(button: NavbarItem): NavbarItem[] {
    return button.parentElement ? buttonsIn(button.parentElement) : [];
  }

  function reorder(order: readonly NavbarItem[]): void {
    if (order.length === 0) return;
    const section = order[0].parentElement;
    const original = peers(order[0]);
    if (!section || order.length !== original.length || new Set(order).size !== order.length ||
        order.some((button) => !original.includes(button) || !items().includes(button))) {
      throw new Error('Pass every button in one navbar section exactly once.');
    }
    const focused = document.activeElement;
    section.append(...order);
    if ((focused instanceof HTMLButtonElement || focused instanceof HTMLAnchorElement) && order.includes(focused)) focused.focus({ preventScroll: true });
    options.onReorder?.([...order], section);
    sync(true);
  }

  function moveTo(button: NavbarItem, target: NavbarItem): void {
    if (button === target) return;
    const order = peers(button);
    const index = order.indexOf(target);
    order.splice(order.indexOf(button), 1);
    order.splice(index, 0, button);
    reorder(order);
  }

  function select(button: NavbarItem): void {
    if (options.autoSelect !== false) {
      for (const current of nav.querySelectorAll('[aria-current="page"]')) current.removeAttribute('aria-current');
      button.setAttribute('aria-current', 'page');
    }
    options.onSelect?.(button);
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
    if (gesture?.draggedItem) return peers(gesture.draggedItem).filter(isAvailable);
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

  function finish(event: PointerEvent, cancelled = false): void {
    if (!gesture || gesture.id !== event.pointerId) return;
    const { dragging, draggedItem } = gesture;
    const target = dragging && !cancelled ? closest(candidates(), eventPosition(event)) : undefined;
    gesture = undefined;
    if (dragging) releaseVelocity = { value: velocityOf(samples), at: performance.now() };
    samples = [];
    nav.classList.remove('lg-navbar--pressed', 'lg-navbar--dragging');
    items().forEach((button) => button.classList.remove('lg-navbar__preview'));
    if (nav.hasPointerCapture(event.pointerId)) nav.releasePointerCapture(event.pointerId);
    if (target) {
      suppressClick = true;
      if (draggedItem) moveTo(draggedItem, target);
      else if (isAction(target)) options.onAction?.(target);
      // A link is followed like a tap: its click selects it, then the browser navigates.
      else if (target instanceof HTMLAnchorElement) target.click();
      else select(target);
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
      dragging: false,
      draggedItem: reorderMode ? button : null,
    };
    nav.classList.add('lg-navbar--pressed');
  }, { signal });
  window.addEventListener('pointermove', (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const buttons = candidates();
    if (buttons.length < 2) return;
    if (!gesture.dragging) {
      const delta = Math.abs((vertical() ? event.clientY : event.clientX) - gesture.start);
      const crossDelta = Math.abs((vertical() ? event.clientX : event.clientY) - gesture.crossStart);
      if (delta < 6 || delta < crossDelta) return;
      gesture.dragging = true;
      try { nav.setPointerCapture(event.pointerId); } catch { /* The window still tracks this gesture. */ }
      nav.classList.add('lg-navbar--dragging');
    }
    const position = eventPosition(event);
    const target = closest(buttons, position);
    if (!target) return;
    samples = [...samples.filter((sample) => event.timeStamp - sample.time < 100), { position, time: event.timeStamp }];
    // The lens follows the finger, its size blending between the two items it's between; past the first or last
    // item it gives like a rubber band instead of stopping dead.
    const spans = buttons.map(measure).sort((a, b) => a.start - b.start);
    const size = blendedSize(spans, position);
    const offset = position - size / 2;
    const min = spans[0].start, max = spans[spans.length - 1].start + spans[spans.length - 1].size - size;
    placeLens(target, size);
    spring.set(rubberBanded(offset, min, max, size));
    items().forEach((button) => button.classList.toggle('lg-navbar__preview', button === target));
  }, { passive: true, signal });
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
    if (isAction(button)) options.onAction?.(button);
    else select(button);
    sync();
  }, { signal });
  nav.addEventListener('keydown', (event) => {
    if (!options.reorderable || !event.altKey) return;
    const button = buttonAt(event);
    if (!button) return;
    const direction = event.key === (vertical() ? 'ArrowUp' : 'ArrowLeft') ? -1
      : event.key === (vertical() ? 'ArrowDown' : 'ArrowRight') ? 1 : 0;
    const available = peers(button).filter(isAvailable);
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
    if (equalWidth && equalOverflow === 'natural'
        && items().some((button) => isAvailable(button) && !fits(button))) {
      nav.classList.remove('lg-navbar--equal');
    }
  }

  // Does the button's content (icon, label) fit inside it? Labels don't wrap, so they overflow when it's too narrow.
  function fits(button: NavbarItem): boolean {
    const style = getComputedStyle(button);
    const room = button.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return [...button.children].every((child) => child.getBoundingClientRect().width <= room + 1);
  }

  function setEqualWidth(equal: boolean, overflow: EqualWidthOverflow = equalOverflow): void {
    equalWidth = equal;
    equalOverflow = overflow;
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

  function setTransparency(percentage?: number): void {
    if (percentage !== undefined && (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)) {
      throw new RangeError('Navbar transparency must be between 0 and 100.');
    }
    nav.classList.toggle('lg-navbar--custom-tint', percentage !== undefined);
    nav.classList.toggle('lg-navbar--clear', percentage === 100);
    refraction?.setTransparency(percentage);
    if (percentage === undefined) nav.style.removeProperty('--lg-nav-tint');
    else nav.style.setProperty('--lg-nav-tint', String(1 - percentage / 100));
  }

  const observer = new ResizeObserver(() => { if (!gesture?.dragging) sync(true); });
  observer.observe(nav);
  // A bar that fell back to natural widths may fit equal ones again after the window grows, without itself resizing.
  addEventListener('resize', () => { if (equalWidth && !gesture?.dragging) sync(true); }, { signal, passive: true });
  setPosition(placement);
  setLabels(options.labels ?? true);
  setEqualWidth(options.equalWidth ?? false, options.equalWidthOverflow ?? 'natural');
  setBackground(options.background);
  setTransparency(options.transparency);
  setColors(options.colors);

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
    },
    reorder,
    destroy() {
      listeners.abort();
      refraction?.destroy();
      observer.disconnect();
      spring.stop();
      if (gesture && nav.hasPointerCapture(gesture.id)) nav.releasePointerCapture(gesture.id);
      items().forEach((button) => button.classList.remove('lg-navbar__preview'));
      generatedLabels.forEach((button) => button.removeAttribute('aria-label'));
      delete nav.dataset.lgNavbarPosition;
      nav.style.removeProperty('--lg-nav-background');
      nav.style.removeProperty('--lg-nav-tint');
      setColors();
      for (const name of [...nav.classList]) if (name === 'lg-navbar' || name.startsWith('lg-navbar--')) nav.classList.remove(name);
      lens.remove();
    },
  };
}
