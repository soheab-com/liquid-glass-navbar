// Keyboard: arrow keys move focus through the bar in screen order (and through an open popover's items), and
// Alt+Arrow reorders items when the bar is reorderable, announcing the new position to screen readers.
import type { Disposer } from './lifecycle.js';
import type { LiquidGlassNavbarOptions, NavbarItem } from './types.js';

export interface KeyboardDeps {
  vertical(): boolean;
  /** The bar item an event happened on, if it is available. */
  buttonAt(event: Event): NavbarItem | null;
  /** The items an item can swap places with, in markup order. */
  reorderPeers(item: NavbarItem): NavbarItem[];
  moveTo(item: NavbarItem, target: NavbarItem): void;
}

export function bindKeyboard(
  nav: HTMLElement,
  signal: AbortSignal,
  disposer: Disposer,
  options: Pick<LiquidGlassNavbarOptions, 'keyboardNavigation' | 'reorderable' | 'reorderAnnouncement'>,
  deps: KeyboardDeps,
): void {
  /** Controls a key press can move between: the bar's own (items, More, chevron), or an open popover's items. */
  function keyboardControls(from: HTMLElement): HTMLElement[] {
    const popover = from.closest<HTMLElement>('.lg-popover');
    const scope: Element = popover ?? nav;
    return [...scope.querySelectorAll<HTMLElement>('button, a[href]')].filter((control) => {
      if (control.closest('[inert]') || control.hidden || !control.getClientRects().length) return false;
      if (control instanceof HTMLButtonElement && control.disabled) return false;
      // From the bar, controls inside popovers (More menus, context actions) are out of reach.
      return Boolean(popover) || !control.closest('.lg-popover');
    });
  }

  /** Screen order: rows top to bottom, each in reading direction. */
  function readingOrder(controls: HTMLElement[], rtl: boolean): HTMLElement[][] {
    const boxes = controls.map((control) => ({ control, box: control.getBoundingClientRect() }));
    boxes.sort((a, b) => a.box.top - b.box.top);
    const rows: (typeof boxes)[] = [];
    for (const entry of boxes) {
      const row = rows.at(-1);
      const centre = entry.box.top + entry.box.height / 2;
      if (row && centre < row[0]!.box.bottom) row.push(entry);
      else rows.push([entry]);
    }
    return rows.map((row) =>
      row.sort((a, b) => (rtl ? b.box.left - a.box.left : a.box.left - b.box.left)).map(({ control }) => control),
    );
  }

  nav.addEventListener(
    'keydown',
    (event) => {
      if (options.keyboardNavigation === false || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        return;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      const from = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('button, a[href]') : null;
      if (!from || !nav.contains(from)) return;
      const controls = keyboardControls(from);
      if (!controls.includes(from)) return;
      const rtl = getComputedStyle(nav).direction === 'rtl';
      const inMenu = Boolean(from.closest('.lg-popover'));
      const columnar = inMenu || deps.vertical();
      const rows = columnar ? [controls] : readingOrder(controls, rtl);
      const flat = rows.flat();
      let target: HTMLElement | undefined;
      if (event.key === 'Home') target = flat[0];
      else if (event.key === 'End') target = flat.at(-1);
      else if (columnar) {
        const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        target = flat[(flat.indexOf(from) + step + flat.length) % flat.length];
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        // Visual direction: Right always moves right, also in right-to-left layouts.
        const forward = (event.key === 'ArrowRight') !== rtl;
        target = flat[(flat.indexOf(from) + (forward ? 1 : -1) + flat.length) % flat.length];
      } else {
        const rowIndex = rows.findIndex((row) => row.includes(from));
        const next = rows[rowIndex + (event.key === 'ArrowDown' ? 1 : -1)];
        if (!next) return;
        const box = from.getBoundingClientRect();
        const centre = box.left + box.width / 2;
        target = next.reduce((best, control) => {
          const distance = (control: HTMLElement) => {
            const other = control.getBoundingClientRect();
            return Math.abs(other.left + other.width / 2 - centre);
          };
          return distance(control) < distance(best) ? control : best;
        });
      }
      if (!target || target === from) return;
      event.preventDefault();
      target.focus();
    },
    { signal },
  );

  // Alt+Arrow reordering is announced, since the focused item keeps its name and only its position changes.
  let announcer: HTMLElement | undefined;
  function announce(message: string): void {
    if (!announcer) {
      announcer = document.createElement('span');
      announcer.className = 'lg-navbar__sr';
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      nav.append(announcer);
      disposer.add(() => announcer?.remove());
    }
    announcer.textContent = '';
    // A new text node after clearing makes screen readers repeat a message that is the same as the last one.
    disposer.frame(() => {
      if (announcer) announcer.textContent = message;
    });
  }

  nav.addEventListener(
    'keydown',
    (event) => {
      if (!options.reorderable || !event.altKey) return;
      const button = deps.buttonAt(event);
      if (!button) return;
      // Visual direction: in right-to-left layouts, Alt+Right moves the item towards the start of the markup.
      const rtl = !deps.vertical() && getComputedStyle(nav).direction === 'rtl';
      const visual =
        event.key === (deps.vertical() ? 'ArrowUp' : 'ArrowLeft')
          ? -1
          : event.key === (deps.vertical() ? 'ArrowDown' : 'ArrowRight')
            ? 1
            : 0;
      const direction = rtl ? -visual : visual;
      const available = deps.reorderPeers(button);
      const target = available[available.indexOf(button) + direction];
      if (!direction || !target) return;
      event.preventDefault();
      deps.moveTo(button, target);
      const order = deps.reorderPeers(button);
      const position = order.indexOf(button) + 1;
      announce(
        options.reorderAnnouncement?.(button, position, order.length) ??
          `Moved ${button.getAttribute('aria-label') || button.textContent?.trim() || 'item'} to position ${position} of ${order.length}`,
      );
    },
    { signal },
  );
}
