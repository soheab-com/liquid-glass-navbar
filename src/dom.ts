// Markup conventions and small DOM helpers shared by the navbar.
import type { LiquidGlassNavbarOptions, NavbarItem, NavbarOverflowOptions } from './types.js';

export const ITEM_SELECTOR = ':scope > button, :scope > a[href]';
export const CONTEXT = 'data-navbar-context';
export const ELLIPSIS = 'M5 12h.01M12 12h.01M19 12h.01';
export const VERTICAL_ELLIPSIS = 'M12 5h.01M12 12h.01M12 19h.01';

export const sectionSelector = ':scope > [data-navbar-section]';
export const buttonsIn = (section: Element): NavbarItem[] => [...section.querySelectorAll<NavbarItem>(ITEM_SELECTOR)];
export const isAction = (button: NavbarItem): boolean => button.hasAttribute('data-navbar-action');
export const allowsSwipe = (button: NavbarItem): boolean => !button.closest('[data-navbar-no-swipe]');
export const isAvailable = (button: NavbarItem): boolean =>
  !button.hidden &&
  !(button instanceof HTMLButtonElement && button.disabled) &&
  // Hidden by the page's own CSS (display: none), for example an item that moved into a "More" menu.
  !button.closest('[inert]') &&
  button.getClientRects().length > 0 &&
  !(button.hasAttribute('data-navbar-hide-icon') && button.hasAttribute('data-navbar-hide-label'));
export const rowOf = (element: Element): number | undefined => {
  const value = Number(element.getAttribute('data-navbar-row'));
  return Number.isFinite(value) && value > 0 ? value : undefined;
};
export const px = (value: string): number => parseFloat(value) || 0;

export function svgIcon(path: string): SVGSVGElement {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  for (const [name, value] of Object.entries({
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2.6',
    'stroke-linecap': 'round',
    'aria-hidden': 'true',
  }))
    svg.setAttribute(name, value);
  svg.setAttribute('data-navbar-icon', '');
  const line = document.createElementNS(namespace, 'path');
  line.setAttribute('d', path);
  svg.append(line);
  return svg;
}

export function overflowSettings(value: LiquidGlassNavbarOptions['overflow']): NavbarOverflowOptions | undefined {
  if (!value) return undefined;
  if (value === true) return { style: 'menu' };
  if (typeof value === 'string') return { style: value };
  return value;
}
