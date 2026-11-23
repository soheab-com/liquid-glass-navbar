import { createSpring, type Spring } from './spring.js';

export type PopoverPlacement = 'auto' | 'above' | 'below';
export type PopoverCloseReason = 'escape' | 'outside' | 'scroll' | 'selection' | 'trigger' | 'api';

export interface AnchoredPopoverOptions {
  /** Accessible name for the popover. Defaults to the trigger's name. */
  label?: string;
  /** Where to open. `auto` opens above a trigger in the lower half of the boundary and flips when there's no room. */
  placement?: PopoverPlacement;
  /** The area the popover must stay inside. Defaults to the viewport. */
  boundary?: HTMLElement;
  /** The positioned element the popover is inserted into. Defaults to the trigger's navbar, or `document.body`. */
  container?: HTMLElement;
  /** The element whose top or bottom edge the popover clears. Defaults to the trigger. */
  anchor?: HTMLElement | (() => HTMLElement | null | undefined);
  /** Draw the small pointer that connects the popover to its trigger. Default true. */
  pointer?: boolean;
  /** Space between the anchor and the popover, pointer included, in px. Default 10. */
  gap?: number;
  /** Extra class names for the popover element. */
  className?: string;
  /** Close after a button or link inside the popover is activated. Default true. */
  closeOnSelect?: boolean;
  /**
   * Close when the page scrolls, including a press outside that turns into a scroll. Default false: only a tap
   * outside closes it, and a finger that starts scrolling the page leaves it open.
   */
  closeOnScroll?: boolean;
  /** Toggle the popover when the trigger is clicked. Default true. The navbar turns this off for its own triggers. */
  bindTrigger?: boolean;
  onOpen?: () => void;
  onClose?: (reason: PopoverCloseReason) => void;
  /** Add a little overshoot to the spring the popover opens and closes on. Pass a function to decide each time. */
  spring?: boolean | (() => boolean);
}

export interface AnchoredPopover {
  /** The popover element. Style it with `.lg-popover`. */
  readonly element: HTMLElement;
  /** Where the content lives. Replace it with `setContent`. */
  readonly body: HTMLElement;
  readonly trigger: HTMLElement;
  readonly open: boolean;
  /** Open. Pass `focus: true` to move focus to the first control inside, as after keyboard activation. */
  show(options?: { focus?: boolean }): void;
  /** Close. Focus returns to the trigger when it was inside the popover, or when `restoreFocus` is true. */
  hide(options?: { restoreFocus?: boolean; reason?: PopoverCloseReason }): void;
  toggle(options?: { focus?: boolean }): void;
  /** Recalculate the position, for example after the content changed size. */
  position(): void;
  setContent(content: Node | readonly Node[]): void;
  destroy(): void;
}

let popoverSequence = 0;
const reducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;
const focusable = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A popover anchored to a trigger, with a pointer that stays aligned to the trigger when the popover shifts away
 * from an edge or flips to the other side. It closes on Escape, an outside press, or a selection inside it.
 */
export function createAnchoredPopover(
  trigger: HTMLElement, content: Node | readonly Node[], options: AnchoredPopoverOptions = {},
): AnchoredPopover {
  const listeners = new AbortController();
  const { signal } = listeners;
  const container = options.container ?? trigger.closest<HTMLElement>('.lg-navbar') ?? document.body;
  const fixed = container === document.body;
  const element = document.createElement('div');
  element.className = `lg-popover${options.className ? ` ${options.className}` : ''}`;
  element.id = `lg-popover-${++popoverSequence}`;
  element.hidden = true;
  element.setAttribute('role', 'group');
  const label = options.label ?? trigger.getAttribute('aria-label') ?? trigger.textContent?.trim();
  if (label) element.setAttribute('aria-label', label);
  if (fixed) element.style.position = 'fixed';
  const body = document.createElement('div');
  body.className = 'lg-popover__body';
  element.append(body);
  if (options.pointer !== false) {
    const pointer = document.createElement('span');
    pointer.className = 'lg-popover__pointer';
    pointer.setAttribute('aria-hidden', 'true');
    element.append(pointer);
  }
  container.append(element);

  const original = {
    controls: trigger.getAttribute('aria-controls'),
    expanded: trigger.getAttribute('aria-expanded'),
    popup: trigger.getAttribute('aria-haspopup'),
  };
  trigger.setAttribute('aria-controls', element.id);
  trigger.setAttribute('aria-expanded', 'false');

  let open = false;
  let motion: Animation | undefined;
  let frame = 0;

  function setContent(next: Node | readonly Node[]): void {
    body.replaceChildren(...(next instanceof Node ? [next] : next));
    if (open) position();
  }
  setContent(content);

  function boundsOf(): DOMRect {
    if (options.boundary) return options.boundary.getBoundingClientRect();
    const view = window.visualViewport;
    let left = view?.offsetLeft ?? 0;
    let top = view?.offsetTop ?? 0;
    let right = left + (view?.width ?? document.documentElement.clientWidth);
    let bottom = top + (view?.height ?? innerHeight);
    // Stay inside any ancestor that clips its content, such as a scrolling panel or a rounded card.
    for (let node = container.parentElement; node && node !== document.body; node = node.parentElement) {
      if (getComputedStyle(node).overflow === 'visible') continue;
      const box = node.getBoundingClientRect();
      left = Math.max(left, box.left);
      top = Math.max(top, box.top);
      right = Math.min(right, box.right);
      bottom = Math.min(bottom, box.bottom);
    }
    return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
  }

  function position(): void {
    if (!open) return;
    const bounds = boundsOf();
    const triggerBox = trigger.getBoundingClientRect();
    const anchor = typeof options.anchor === 'function' ? options.anchor() : options.anchor;
    const anchorBox = (anchor ?? trigger).getBoundingClientRect();
    const gap = options.gap ?? 10;
    const margin = 8;
    const roomAbove = anchorBox.top - bounds.top - margin;
    const roomBelow = bounds.bottom - anchorBox.bottom - margin;
    // Tall content scrolls inside the popover rather than running past the boundary.
    body.style.maxHeight = `${Math.max(120, Math.max(roomAbove, roomBelow) - gap - 10)}px`;
    // Never wider than the boundary: content that doesn't fit wraps instead of running past the edges.
    element.style.setProperty('--_lg-popover-room', `${Math.max(120, bounds.width - 2 * margin)}px`);
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    let side: 'above' | 'below' = options.placement === 'below' ? 'below'
      : options.placement === 'above' ? 'above'
      : triggerBox.top + triggerBox.height / 2 > bounds.top + bounds.height / 2 ? 'above' : 'below';
    if (side === 'above' && roomAbove < height + gap && roomBelow > roomAbove) side = 'below';
    else if (side === 'below' && roomBelow < height + gap && roomAbove > roomBelow) side = 'above';
    const centre = triggerBox.left + triggerBox.width / 2;
    const left = Math.max(bounds.left + margin, Math.min(centre - width / 2, bounds.right - margin - width));
    const top = side === 'above' ? anchorBox.top - gap - height : anchorBox.bottom + gap;
    let originX = 0;
    let originY = 0;
    if (!fixed) {
      const box = container.getBoundingClientRect();
      originX = box.left + container.clientLeft - container.scrollLeft;
      originY = box.top + container.clientTop - container.scrollTop;
    }
    element.style.left = `${Math.round(left - originX)}px`;
    element.style.top = `${Math.round(top - originY)}px`;
    element.dataset.side = side;
    const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) || 12;
    const inset = Math.min(width / 2, Math.max(10, Math.min(radius, height / 2)));
    element.style.setProperty('--lg-popover-pointer-x', `${Math.max(inset, Math.min(width - inset, centre - left))}px`);
  }

  function schedule(): void {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; position(); });
  }

  // One spring from 0 (closed) to 1 (open) drives the fade, the rise and the scale, so a popover closed while
  // still opening turns round from where it is. It's calm by default; `spring` adds a little overshoot.
  let openness: Spring | undefined;
  let bouncy: boolean | undefined;
  const springy = (): boolean => (typeof options.spring === 'function' ? options.spring() : Boolean(options.spring));
  function animateSpring(show: boolean): void {
    const bounce = springy();
    if (!openness || bouncy !== bounce) {
      const from = openness?.value ?? 0;
      openness?.stop();
      bouncy = bounce;
      openness = createSpring(from, (value) => {
        // Closing ends as soon as it's out of sight, rather than waiting for the spring to settle completely.
        if (!open && value < .04) return finishClosing();
        const shift = element.dataset.side === 'below' ? -6 : 6;
        element.style.opacity = String(Math.max(0, Math.min(1, value)));
        element.style.transform = `translateY(${(shift * (1 - value)).toFixed(2)}px) scale(${(.9 + .1 * value).toFixed(4)})`;
      }, {
        response: bounce ? .34 : .26, dampingRatio: bounce ? .72 : 1, precision: .002,
        onRest: (value) => {
          if (value < .5) return finishClosing();
          element.style.removeProperty('opacity');
          element.style.removeProperty('transform');
        },
      });
    }
    element.hidden = false;
    // A closing popover no longer takes clicks or taps.
    element.style.pointerEvents = show ? '' : 'none';
    if (show) element.removeAttribute('inert');
    else element.setAttribute('inert', '');
    openness.to(show ? 1 : 0);
  }

  function finishClosing(): void {
    openness?.stop();
    for (const property of ['opacity', 'transform', 'pointer-events']) element.style.removeProperty(property);
    element.removeAttribute('inert');
    element.hidden = true;
  }

  function animate(show: boolean): void {
    motion?.cancel();
    motion = undefined;
    if (reducedMotion() || typeof element.animate !== 'function') {
      openness?.set(show ? 1 : 0);
      element.hidden = !show;
      return;
    }
    animateSpring(show);
  }

  function show({ focus = false }: { focus?: boolean } = {}): void {
    if (signal.aborted) return;
    if (!open) {
      open = true;
      trigger.setAttribute('aria-expanded', 'true');
      element.hidden = false;
      position();
      animate(true);
      options.onOpen?.();
    }
    if (focus) element.querySelector<HTMLElement>(focusable)?.focus({ preventScroll: true });
  }

  function hide({ restoreFocus, reason = 'api' }: { restoreFocus?: boolean; reason?: PopoverCloseReason } = {}): void {
    if (!open) return;
    const focusInside = element.contains(document.activeElement);
    open = false;
    trigger.setAttribute('aria-expanded', 'false');
    animate(false);
    if (restoreFocus ?? focusInside) trigger.focus({ preventScroll: true });
    options.onClose?.(reason);
  }

  function toggle(opts?: { focus?: boolean }): void {
    if (open) hide({ reason: 'trigger' });
    else show(opts);
  }

  if (options.bindTrigger !== false) {
    trigger.addEventListener('click', (event) => toggle({ focus: event.detail === 0 }), { signal });
  }
  // An outside press closes the popover. Unless it closes on scroll, a press only counts once it ends as a tap:
  // a finger that moves, or that the browser takes over to scroll the page, leaves it open.
  let outsidePress: { id: number; x: number; y: number } | undefined;
  document.addEventListener('pointerdown', (event) => {
    if (!open || !(event.target instanceof Node)) return;
    if (element.contains(event.target) || trigger.contains(event.target)) return;
    if (options.closeOnScroll || event.pointerType === 'mouse') hide({ reason: 'outside' });
    else outsidePress = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }, { capture: true, signal });
  document.addEventListener('pointermove', (event) => {
    if (outsidePress?.id === event.pointerId && Math.hypot(event.clientX - outsidePress.x, event.clientY - outsidePress.y) > 10) outsidePress = undefined;
  }, { capture: true, passive: true, signal });
  document.addEventListener('pointercancel', () => { outsidePress = undefined; }, { capture: true, signal });
  document.addEventListener('pointerup', (event) => {
    if (outsidePress?.id !== event.pointerId) return;
    outsidePress = undefined;
    if (open) hide({ reason: 'outside' });
  }, { capture: true, signal });
  addEventListener('scroll', (event) => {
    if (outsidePress) outsidePress = undefined;
    // Scrolling inside the popover itself never closes it.
    if (options.closeOnScroll && open && !(event.target instanceof Node && element.contains(event.target))) hide({ reason: 'scroll' });
  }, { passive: true, capture: true, signal });
  document.addEventListener('keydown', (event) => {
    if (!open || event.key !== 'Escape') return;
    const inside = element.contains(document.activeElement) || trigger === document.activeElement;
    hide({ reason: 'escape', restoreFocus: inside });
  }, { signal });
  // Keyboard focus leaving the popover (Tab past the last item) closes it without stealing focus back.
  element.addEventListener('focusout', (event) => {
    const next = event.relatedTarget;
    if (open && next instanceof Node && !element.contains(next) && !trigger.contains(next)) hide({ reason: 'outside', restoreFocus: false });
  }, { signal });
  element.addEventListener('click', (event) => {
    if (options.closeOnSelect === false || !(event.target instanceof Element)) return;
    const control = event.target.closest('button, a[href]');
    if (control && element.contains(control)) hide({ reason: 'selection', restoreFocus: event.detail === 0 });
  }, { signal });
  addEventListener('resize', schedule, { passive: true, signal });
  addEventListener('scroll', schedule, { passive: true, capture: true, signal });
  const observer = new ResizeObserver(schedule);
  observer.observe(element);
  observer.observe(trigger);

  return {
    element,
    body,
    trigger,
    get open() { return open; },
    show,
    hide,
    toggle,
    position,
    setContent,
    destroy() {
      listeners.abort();
      observer.disconnect();
      cancelAnimationFrame(frame);
      motion?.cancel();
      openness?.stop();
      element.remove();
      for (const [name, value] of [['aria-controls', original.controls], ['aria-expanded', original.expanded], ['aria-haspopup', original.popup]] as const) {
        if (value === null) trigger.removeAttribute(name);
        else trigger.setAttribute(name, value);
      }
    },
  };
}
