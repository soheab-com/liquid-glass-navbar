import type { NavbarItem } from './index.js';

export interface NavbarHoverOptions {
  /** Time before previewing an item, in milliseconds. Defaults to zero. */
  delay?: number;
  /** Keep the previewed scroll position when the pointer leaves. Defaults to false. */
  keep?: boolean;
  /** Preview while dragging a finger or pointer along the bar. Defaults to true. */
  swipe?: boolean;
  /** Bars with the same group ID share drag previews and can select across bars. */
  group?: string;
  /** Override the same-page link scroll, for example to preview a button tab. */
  onPreview?: (item: NavbarItem) => void;
  /** Called when an active preview is rolled back. */
  onPreviewEnd?: () => void;
}

type HoverBar = { itemAt: (target: Element | null) => NavbarItem | undefined; enabled: () => boolean };
const groups = new Map<string, Set<HoverBar>>();

export function bindHoverNavigation(
  nav: HTMLElement, options: NavbarHoverOptions, itemAt: (element: Element | null) => NavbarItem | undefined,
  enabled: () => boolean, signal: AbortSignal,
): () => void {
  const group = options.group ? groups.get(options.group) ?? new Set<HoverBar>() : undefined;
  const bar = { itemAt, enabled };
  if (group && options.group) {
    if (options.swipe !== false) nav.classList.add('lg-navbar--hover-group');
    group.add(bar);
    groups.set(options.group, group);
  }
  function hit(target: Element | null, dragging: boolean): NavbarItem | undefined {
    const own = itemAt(target);
    if (own || !dragging || !group) return own;
    for (const other of group) {
      if (other === bar || !other.enabled()) continue;
      const item = other.itemAt(target);
      if (item) return item;
    }
    return undefined;
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let start: { id: number; x: number; y: number } | undefined;
  let touchPointer: number | undefined;
  let finger: { id: number; x: number; y: number } | undefined;
  let item: NavbarItem | undefined;
  let pending: ReturnType<typeof setTimeout> | undefined;
  let origin: { scroller: Window | HTMLElement; x: number; y: number }[] | undefined;
  let previewing = false;
  let x = 0;
  let y = 0;

  function end(restore: boolean): void {
    clearTimeout(pending);
    item = undefined;
    const previous = origin;
    origin = undefined;
    if (!previewing) return;
    previewing = false;
    if (restore && !options.keep) {
      for (const { scroller, x, y } of previous ?? []) {
        scroller.scrollTo({ left: x, top: y, behavior: reduced.matches ? 'instant' : 'smooth' });
      }
      options.onPreviewEnd?.();
    }
  }

  function preview(next: NavbarItem, dragging: boolean): void {
    if (options.onPreview) {
      previewing = true;
      options.onPreview(next);
      return;
    }
    if (!(next instanceof HTMLAnchorElement)) return;
    const destination = new URL(next.href);
    const current = new URL(location.href);
    if (!destination.hash || destination.origin !== current.origin
      || destination.pathname !== current.pathname || destination.search !== current.search) return;
    let id: string;
    try { id = decodeURIComponent(destination.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;
    origin ??= [{ scroller: window, x: scrollX, y: scrollY }];
    for (let parent = target.parentElement; parent && parent !== document.scrollingElement; parent = parent.parentElement) {
      if (!origin.some(({ scroller }) => scroller === parent)
        && (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth)) {
        origin.push({ scroller: parent, x: parent.scrollLeft, y: parent.scrollTop });
      }
    }
    previewing = true;
    target.scrollIntoView({ block: 'start', behavior: dragging || reduced.matches ? 'instant' : 'smooth' });
  }

  function track(event: Pick<PointerEvent, 'clientX' | 'clientY'>, dragging = false): void {
    x = event.clientX;
    y = event.clientY;
    const next = enabled() ? hit(document.elementFromPoint(x, y), dragging) : undefined;
    if (!next) return end(true);
    if (item === next) return;
    clearTimeout(pending);
    item = next;
    const delay = Number.isFinite(options.delay) ? Math.max(0, options.delay ?? 0) : 0;
    const dwell = () => { if (enabled() && hit(document.elementFromPoint(x, y), dragging) === next) preview(next, dragging); };
    if (delay) pending = setTimeout(dwell, delay);
    else dwell();
  }

  const hover = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch' && !event.buttons) track(event);
  };
  nav.addEventListener('pointerover', hover, { signal });
  nav.addEventListener('pointermove', hover, { signal });
  nav.addEventListener('pointerleave', () => { if (!start && !finger) end(true); }, { signal });
  nav.addEventListener('pointerdown', (event) => {
    end(false);
    if (options.swipe !== false && event.pointerType === 'touch' && event.isPrimary) touchPointer = event.pointerId;
    if (options.swipe !== false && event.pointerType !== 'touch' && event.isPrimary && event.button === 0 && event.target instanceof Element && itemAt(event.target)) {
      start = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }
  }, { signal });
  window.addEventListener('pointermove', (event) => {
    if (start?.id === event.pointerId && Math.hypot(start.x - event.clientX, start.y - event.clientY) >= 8) track(event, true);
  }, { signal, passive: true });
  window.addEventListener('pointerup', (event) => {
    if (start?.id !== event.pointerId && !(finger && touchPointer === event.pointerId)) return;
    const point = document.elementFromPoint(event.clientX, event.clientY);
    const own = itemAt(point);
    const target = enabled() ? hit(point, true) : undefined;
    const initial = start ?? finger;
    start = undefined;
    if (target && !own && initial && Math.hypot(event.clientX - initial.x, event.clientY - initial.y) >= 8) {
      finger = undefined;
      end(false);
      event.stopImmediatePropagation();
      window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: event.pointerId }));
      target.click();
    } else if (event.pointerType !== 'touch') {
      end(!own);
    }
  }, { capture: true, signal });
  window.addEventListener('pointercancel', (event) => {
    if (start?.id !== event.pointerId) return;
    start = undefined;
    end(true);
  }, { signal });
  nav.addEventListener('touchstart', (event) => {
    if (options.swipe === false || !enabled() || event.touches.length !== 1
      || !(event.target instanceof Element) || !itemAt(event.target)) return;
    const touch = event.touches[0]!;
    finger = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
  }, { signal, passive: true });
  nav.addEventListener('touchmove', (event) => {
    const touch = event.touches.length === 1 ? event.touches[0] : undefined;
    if (finger && touch?.identifier === finger.id
      && Math.hypot(touch.clientX - finger.x, touch.clientY - finger.y) >= 8) track(touch, true);
  }, { signal, passive: true });
  nav.addEventListener('touchend', (event) => {
    if (!finger) return;
    const touch = [...event.changedTouches].find((entry) => entry.identifier === finger?.id);
    if (!touch) return;
    const startTouch = finger;
    finger = undefined;
    const point = document.elementFromPoint(touch.clientX, touch.clientY);
    const own = itemAt(point);
    const target = enabled() ? hit(point, true) : undefined;
    if (target && !own && Math.hypot(touch.clientX - startTouch.x, touch.clientY - startTouch.y) >= 8) {
      end(false);
      if (touchPointer !== undefined) window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: touchPointer }));
      if (event.cancelable) event.preventDefault();
      target.click();
    } else {
      end(!own);
    }
    touchPointer = undefined;
  }, { signal });
  nav.addEventListener('touchcancel', () => {
    if (!finger) return;
    finger = undefined;
    end(true);
  }, { signal });
  window.addEventListener('wheel', () => end(false), { signal, passive: true });
  nav.addEventListener('click', () => end(false), { signal, capture: true });
  return () => {
    start = finger = undefined;
    end(false);
    if (group && options.group) {
      nav.classList.remove('lg-navbar--hover-group');
      group.delete(bar);
      if (!group.size) groups.delete(options.group);
    }
  };
}
