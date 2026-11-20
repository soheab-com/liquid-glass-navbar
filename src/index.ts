import { createSpring } from './spring.js';

export type NavbarPosition = 'top' | 'bottom' | 'left' | 'right';

export interface ItemVisibility {
  icon?: boolean;
  label?: boolean;
}

export interface LiquidGlassNavbarOptions {
  onSelect?: (button: HTMLButtonElement) => void;
  autoSelect?: boolean;
  onAction?: (button: HTMLButtonElement) => void;
  onReorder?: (order: readonly HTMLButtonElement[], section: HTMLElement) => void;
  enabled?: () => boolean;
  position?: NavbarPosition;
  labels?: boolean;
  background?: string;
  transparency?: number;
  reorderable?: boolean;
}

export interface LiquidGlassNavbar {
  sync(): void;
  setPosition(position?: NavbarPosition): void;
  setLabels(visible: boolean): void;
  setBackground(background?: string): void;
  setTransparency(percentage?: number): void;
  setItemVisibility(item: HTMLButtonElement, visibility: ItemVisibility): void;
  setReorderMode(active: boolean): void;
  reorder(order: readonly HTMLButtonElement[]): void;
  destroy(): void;
}

interface Gesture {
  id: number;
  start: number;
  crossStart: number;
  dragging: boolean;
  draggedItem: HTMLButtonElement | null;
}

const sectionSelector = ':scope > [data-navbar-section]';
const buttonsIn = (section: HTMLElement): HTMLButtonElement[] =>
  [...section.querySelectorAll<HTMLButtonElement>(':scope > button')];
const isAction = (button: HTMLButtonElement): boolean => button.hasAttribute('data-navbar-action');
const isAvailable = (button: HTMLButtonElement): boolean => !button.hidden && !button.disabled
  && !(button.hasAttribute('data-navbar-hide-icon') && button.hasAttribute('data-navbar-hide-label'));

export function mountLiquidGlassNavbar(nav: HTMLElement, options: LiquidGlassNavbarOptions): LiquidGlassNavbar {
  const listeners = new AbortController();
  const { signal } = listeners;
  const lens = document.createElement('span');
  lens.className = 'lg-navbar__lens';
  lens.setAttribute('aria-hidden', 'true');
  nav.classList.add('lg-navbar');
  nav.prepend(lens);

  let placement = options.position;
  let reorderMode = false;
  let gesture: Gesture | undefined;
  let suppressClick = false;
  const generatedLabels = new Set<HTMLButtonElement>();
  const enabled = options.enabled ?? (() => true);
  const vertical = (): boolean => placement === 'left' || placement === 'right';
  const sections = (): HTMLElement[] => [nav, ...nav.querySelectorAll<HTMLElement>(sectionSelector)];
  const items = (): HTMLButtonElement[] => sections().flatMap(buttonsIn);
  const tabs = (): HTMLButtonElement[] => items().filter((button) => isAvailable(button) && !isAction(button));
  const spring = createSpring(0, (offset) => {
    lens.style.translate = vertical() ? `0 ${offset}px` : `${offset}px 0`;
  }, { response: .38, dampingRatio: .78 });

  function offsetOf(button: HTMLButtonElement): { left: number; top: number } {
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

  function measure(button: HTMLButtonElement): { start: number; size: number } {
    const { left, top } = offsetOf(button);
    const isVertical = vertical();
    return isVertical ? { start: top, size: button.offsetHeight } : { start: left, size: button.offsetWidth };
  }

  function placeLens(button: HTMLButtonElement): void {
    const { left, top } = offsetOf(button);
    lens.style.width = `${button.offsetWidth}px`;
    lens.style.height = `${button.offsetHeight}px`;
    lens.style.left = vertical() ? `${left}px` : '0';
    lens.style.top = vertical() ? '0' : `${top}px`;
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
    nav.classList.toggle('lg-navbar--sectioned', sections().length > 1);
    labelItems();
    const active = tabs().find((button) => button.getAttribute('aria-current') === 'page');
    if (!active) {
      lens.hidden = true;
      spring.stop();
      return;
    }
    placeLens(active);
    const { start } = measure(active);
    if (immediate || !isEnabled) spring.set(start);
    else spring.to(start);
  }

  function buttonAt(event: Event): HTMLButtonElement | null {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    return button instanceof HTMLButtonElement && items().includes(button) && isAvailable(button) ? button : null;
  }

  function eventPosition(event: PointerEvent): number {
    const rect = nav.getBoundingClientRect();
    return vertical() ? event.clientY - rect.top - nav.clientTop : event.clientX - rect.left - nav.clientLeft;
  }

  function peers(button: HTMLButtonElement): HTMLButtonElement[] {
    return button.parentElement ? buttonsIn(button.parentElement) : [];
  }

  function reorder(order: readonly HTMLButtonElement[]): void {
    if (order.length === 0) return;
    const section = order[0].parentElement;
    const original = peers(order[0]);
    if (!section || order.length !== original.length || new Set(order).size !== order.length ||
        order.some((button) => !original.includes(button) || !items().includes(button))) {
      throw new Error('Pass every button in one navbar section exactly once.');
    }
    const focused = document.activeElement;
    section.append(...order);
    if (focused instanceof HTMLButtonElement && order.includes(focused)) focused.focus({ preventScroll: true });
    options.onReorder?.([...order], section);
    sync(true);
  }

  function moveTo(button: HTMLButtonElement, target: HTMLButtonElement): void {
    if (button === target) return;
    const order = peers(button);
    const index = order.indexOf(target);
    order.splice(order.indexOf(button), 1);
    order.splice(index, 0, button);
    reorder(order);
  }

  function select(button: HTMLButtonElement): void {
    if (options.autoSelect !== false) {
      for (const current of nav.querySelectorAll('[aria-current="page"]')) current.removeAttribute('aria-current');
      button.setAttribute('aria-current', 'page');
    }
    options.onSelect?.(button);
  }

  function candidates(): HTMLButtonElement[] {
    return gesture?.draggedItem ? peers(gesture.draggedItem).filter(isAvailable) : items().filter(isAvailable);
  }

  function closest(buttons: HTMLButtonElement[], position: number): HTMLButtonElement | undefined {
    return buttons.reduce<HTMLButtonElement | undefined>((best, next) => {
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
    nav.classList.remove('lg-navbar--pressed', 'lg-navbar--dragging');
    items().forEach((button) => button.classList.remove('lg-navbar__preview'));
    if (nav.hasPointerCapture(event.pointerId)) nav.releasePointerCapture(event.pointerId);
    if (target) {
      suppressClick = true;
      if (draggedItem) moveTo(draggedItem, target);
      else if (isAction(target)) options.onAction?.(target);
      else select(target);
    }
    sync();
  }

  nav.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick = false;
    const button = buttonAt(event);
    if (!button || !enabled() || (!reorderMode && isAction(button))) return;
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
    const starts = buttons.map((button) => measure(button).start);
    const offset = position - measure(target).size / 2;
    placeLens(target);
    spring.set(Math.max(Math.min(...starts), Math.min(Math.max(...starts), offset)));
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

  function setLabels(visible: boolean): void {
    nav.classList.toggle('lg-navbar--no-labels', !visible);
    sync(true);
  }

  function setBackground(background?: string): void {
    if (background !== undefined && !CSS.supports('background', background)) throw new Error('Invalid navbar background.');
    if (background === undefined) nav.style.removeProperty('--lg-nav-background');
    else nav.style.setProperty('--lg-nav-background', background);
  }

  function setTransparency(percentage?: number): void {
    if (percentage !== undefined && (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)) {
      throw new RangeError('Navbar transparency must be between 0 and 100.');
    }
    nav.classList.toggle('lg-navbar--custom-tint', percentage !== undefined);
    if (percentage === undefined) nav.style.removeProperty('--lg-nav-tint');
    else nav.style.setProperty('--lg-nav-tint', String(1 - percentage / 100));
  }

  const observer = new ResizeObserver(() => { if (!gesture?.dragging) sync(true); });
  observer.observe(nav);
  setPosition(placement);
  setLabels(options.labels ?? true);
  setBackground(options.background);
  setTransparency(options.transparency);

  return {
    sync: () => sync(),
    setPosition,
    setLabels,
    setBackground,
    setTransparency,
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
      observer.disconnect();
      spring.stop();
      if (gesture && nav.hasPointerCapture(gesture.id)) nav.releasePointerCapture(gesture.id);
      items().forEach((button) => button.classList.remove('lg-navbar__preview'));
      generatedLabels.forEach((button) => button.removeAttribute('aria-label'));
      delete nav.dataset.lgNavbarPosition;
      nav.style.removeProperty('--lg-nav-background');
      nav.style.removeProperty('--lg-nav-tint');
      for (const name of [...nav.classList]) if (name === 'lg-navbar' || name.startsWith('lg-navbar--')) nav.classList.remove(name);
      lens.remove();
    },
  };
}
