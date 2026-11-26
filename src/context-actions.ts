// Context actions: temporarily show your own items or sections in the bar (replacing it, or beside its items),
// with an optional generated Back button, and put everything back exactly as it was afterwards.
import { CONTEXT, isAvailable, svgIcon } from './dom.js';
import type { ContextActionsOptions, NavbarColors, NavbarItem } from './types.js';

export interface ContextState {
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

export interface ContextActionsDeps {
  items(): NavbarItem[];
  /** Close More and item popovers before the bar changes. */
  closePopovers(): void;
  markCurrent(item: NavbarItem): void;
  /** Re-layout the bar. */
  sync(): void;
  /** The last More trigger, to focus when the actions go and the previous tab is gone. */
  lastMore(): HTMLElement | undefined;
}

export interface ContextActions {
  /** The actions showing now, if any. */
  readonly state: ContextState | undefined;
  show(nodes: readonly HTMLElement[], options?: ContextActionsOptions): void;
  /** Put the bar back. `focus` returns keyboard focus to the bar if it was inside the actions. */
  hide(focus?: boolean): void;
}

export function createContextActions(
  nav: HTMLElement,
  colorVariables: Record<keyof NavbarColors, string>,
  deps: ContextActionsDeps,
): ContextActions {
  let context: ContextState | undefined;

  function show(nodes: readonly HTMLElement[], contextOptions: ContextActionsOptions = {}): void {
    if (context) hide(false);
    deps.closePopovers();
    const focusInside = nav.contains(document.activeElement);
    const placement = contextOptions.placement ?? 'replace';
    const target = placement instanceof HTMLElement ? placement : undefined;
    if (target && (!nav.contains(target) || target === nav))
      throw new Error('The placement must be a section or item of this navbar.');
    // An item as the target takes the actions in its own section; anything else gets them in pills.
    const loose = target !== undefined && !target.hasAttribute('data-navbar-section');
    const restore = nodes.map((node) => ({ node, className: node.className, style: node.getAttribute('style') }));
    let back: HTMLButtonElement | undefined;
    if (contextOptions.back) {
      const settings = contextOptions.back === true ? {} : contextOptions.back;
      back = document.createElement('button');
      back.type = 'button';
      back.className = 'lg-navbar__back';
      for (const name of ['data-navbar-action', 'data-navbar-generated', 'data-navbar-overflow'])
        back.setAttribute(name, name === 'data-navbar-overflow' ? 'never' : '');
      const icon = settings.icon ? (settings.icon.cloneNode(true) as Element) : svgIcon('M15 5l-7 7 7 7');
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
      for (const [key, variable] of Object.entries(colorVariables) as [keyof NavbarColors, string][]) {
        const value = look.colors?.[key];
        if (value) node.style.setProperty(variable, value);
      }
      if (look.background !== undefined && CSS.supports('background', look.background))
        node.style.setProperty('--lg-nav-background', look.background);
      if (look.transparency !== undefined)
        node.style.setProperty('--lg-nav-tint', String(1 - Math.min(100, Math.max(0, look.transparency)) / 100));
    }
    context = {
      inserted,
      restore,
      back,
      replace: placement === 'replace',
      hidden: target,
      onBack: contextOptions.onBack,
      current: deps.items().find((button) => button.getAttribute('aria-current') === 'page'),
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
    deps.sync();
    if (focusInside)
      (back ?? deps.items().find((item) => inserted.some((node) => node.contains(item)) && isAvailable(item)))?.focus({
        preventScroll: true,
      });
  }

  function hide(focus = true): void {
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
    if (current?.isConnected) deps.markCurrent(current);
    deps.sync();
    if (focus && focusInside)
      (current && isAvailable(current) ? current : (deps.lastMore() ?? deps.items().find(isAvailable)))?.focus({
        preventScroll: true,
      });
  }

  return {
    get state() {
      return context;
    },
    show,
    hide,
  };
}
