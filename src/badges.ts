// Badges: a count, dot or status on an item, with screen-reader text linked through aria-describedby.
import { createSpring } from './spring.js';
import type { NavbarBadge, NavbarItem } from './types.js';

let badgeSequence = 0;

export interface BadgeEntry {
  badge: HTMLElement;
  text: HTMLElement;
  /** The item's own aria-describedby, restored when the badge goes. */
  describedBy: string | null;
}

export interface Badges {
  /** Items with a badge. Read by layout (More's dot) and keyed updates. */
  readonly entries: ReadonlyMap<NavbarItem, BadgeEntry>;
  set(item: NavbarItem, badge: NavbarBadge | null): void;
  /** Forget an item's badge without touching its nodes (keyed updates replace them). */
  forget(item: NavbarItem): void;
  destroy(): void;
}

export function createBadges(animate: () => boolean): Badges {
  const entries = new Map<NavbarItem, BadgeEntry>();

  // Badge motion: one spring on the badge's scale.
  function pop(node: HTMLElement, from: number, to: number, onRest?: () => void): void {
    if (!animate()) {
      onRest?.();
      return;
    }
    const spring = createSpring(
      from,
      (value) => {
        node.style.scale = String(Math.max(0, value));
      },
      {
        response: 0.38,
        dampingRatio: 0.5,
        precision: 0.002,
        onRest: () => {
          node.style.removeProperty('scale');
          onRest?.();
        },
      },
    );
    spring.set(from);
    spring.to(to);
  }

  function set(item: NavbarItem, badge: NavbarBadge | null): void {
    const existing = entries.get(item);
    const shown = badge && !('count' in badge && badge.count <= 0) ? badge : null;
    if (existing) {
      existing.text.remove();
      if (existing.describedBy === null) item.removeAttribute('aria-describedby');
      else item.setAttribute('aria-describedby', existing.describedBy);
      entries.delete(item);
      // A badge that stays is updated in place and pulses if it changed; one that goes shrinks away.
      if (!shown) {
        const node = existing.badge;
        pop(node, 1, 0, () => node.remove());
      }
    }
    if (!shown) return;
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
    entries.set(item, { badge: node, text, describedBy });
    if (!existing) pop(node, 0, 1);
    else if (before !== node.textContent + (node.dataset.kind ?? '') + (node.dataset.tone ?? '')) pop(node, 1.35, 1);
  }

  return {
    entries,
    set,
    forget: (item) => {
      entries.delete(item);
    },
    destroy() {
      for (const [item, entry] of entries) {
        entry.badge.remove();
        entry.text.remove();
        if (entry.describedBy === null) item.removeAttribute('aria-describedby');
        else item.setAttribute('aria-describedby', entry.describedBy);
      }
      entries.clear();
    },
  };
}
