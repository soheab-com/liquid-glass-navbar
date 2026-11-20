import { createSpring } from './spring.js';

export interface LiquidGlassNavbarOptions {
  onSelect: (button: HTMLButtonElement) => void;
  enabled?: () => boolean;
}

/** Mount a glass selection lens on a nav whose direct children are tab buttons. */
export function mountLiquidGlassNavbar(nav: HTMLElement, { onSelect, enabled = () => true }: LiquidGlassNavbarOptions) {
  const buttons = [...nav.querySelectorAll<HTMLButtonElement>(':scope > button')];
  if (buttons.length === 0) throw new Error('Liquid Glass Navbar needs at least one tab button.');
  const listeners = new AbortController();
  const { signal } = listeners;
  nav.classList.add('lg-navbar');
  const lens = document.createElement('span');
  lens.className = 'lg-navbar__lens';
  lens.setAttribute('aria-hidden', 'true');
  nav.prepend(lens);

  const position = createSpring(0, (x) => { lens.style.translate = `${x}px 0`; },
    { response: .38, dampingRatio: .78 });
  const active = (): HTMLButtonElement => buttons.find((button) => button.getAttribute('aria-current') === 'page') ?? buttons[0];
  let gesture: { id: number; x: number; y: number; dragging: boolean } | undefined;
  let suppressClick = false;

  function sizeFor(button: HTMLButtonElement): void {
    lens.style.width = `${button.offsetWidth}px`;
    lens.style.height = `${button.offsetHeight}px`;
    lens.style.top = `${button.offsetTop}px`;
  }

  function settle(immediate = false): void {
    if (signal.aborted) return;
    const isEnabled = enabled();
    nav.classList.toggle('lg-navbar--enabled', isEnabled);
    const button = active();
    sizeFor(button);
    if (immediate || !isEnabled) position.set(button.offsetLeft);
    else position.to(button.offsetLeft);
  }

  function nearest(clientX: number): HTMLButtonElement {
    const x = clientX - nav.getBoundingClientRect().left - nav.clientLeft;
    return buttons.reduce((closest, button) => {
      const distance = (item: HTMLButtonElement): number => Math.abs(item.offsetLeft + item.offsetWidth / 2 - x);
      return distance(button) < distance(closest) ? button : closest;
    });
  }

  function end(event: PointerEvent, cancelled = false): void {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dragged = gesture.dragging;
    gesture = undefined;
    nav.classList.remove('lg-navbar--pressed', 'lg-navbar--dragging');
    buttons.forEach((button) => button.classList.remove('lg-navbar__preview'));
    if (nav.hasPointerCapture(event.pointerId)) nav.releasePointerCapture(event.pointerId);
    if (dragged && !cancelled) {
      suppressClick = true;
      onSelect(nearest(event.clientX));
    }
    settle();
  }

  nav.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick = false;
    if (!enabled() || buttons.length < 2) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
    nav.classList.add('lg-navbar--pressed');
  }, { signal });
  window.addEventListener('pointermove', (event) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = Math.abs(event.clientX - gesture.x);
    if (!gesture.dragging) {
      if (dx < 6 || dx < Math.abs(event.clientY - gesture.y)) return;
      gesture.dragging = true;
      try { nav.setPointerCapture(event.pointerId); } catch {
        // Window listeners continue to track the gesture without capture.
      }
      nav.classList.add('lg-navbar--dragging');
    }
    const button = nearest(event.clientX);
    sizeFor(button);
    const x = event.clientX - nav.getBoundingClientRect().left - nav.clientLeft - button.offsetWidth / 2;
    const edges = buttons.map((item) => item.offsetLeft);
    position.set(Math.max(Math.min(...edges), Math.min(Math.max(...edges), x)));
    buttons.forEach((item) => item.classList.toggle('lg-navbar__preview', item === button));
  }, { passive: true, signal });
  window.addEventListener('pointerup', (event) => end(event), { signal });
  window.addEventListener('pointercancel', (event) => end(event, true), { signal });
  nav.addEventListener('lostpointercapture', (event) => {
    if (event.target === nav) end(event, true);
  }, { signal });
  nav.addEventListener('click', (event) => {
    if (suppressClick && event.detail > 0) {
      suppressClick = false;
      event.stopPropagation();
      return;
    }
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (button instanceof HTMLButtonElement && buttons.includes(button)) onSelect(button);
  }, { signal });

  const observer = new ResizeObserver(() => { if (!gesture?.dragging) settle(true); });
  observer.observe(nav);
  settle(true);

  return {
    sync: () => settle(),
    destroy() {
      listeners.abort();
      observer.disconnect();
      position.stop();
      if (gesture && nav.hasPointerCapture(gesture.id)) nav.releasePointerCapture(gesture.id);
      buttons.forEach((button) => button.classList.remove('lg-navbar__preview'));
      nav.classList.remove('lg-navbar', 'lg-navbar--enabled', 'lg-navbar--pressed', 'lg-navbar--dragging');
      lens.remove();
    },
  };
}
