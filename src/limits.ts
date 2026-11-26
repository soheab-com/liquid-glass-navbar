// How many movable items a bar, row or section may show at a given viewport width.
import type { NavbarVisibleLimit } from './types.js';

/** Resolves a number, breakpoint map or function to a count. Missing or invalid limits mean no limit. */
export function resolveVisibleLimit(limit: NavbarVisibleLimit | undefined, width: number): number {
  const value = typeof limit === 'function' ? limit(width)
    : typeof limit === 'object' ? Object.entries(limit)
      .filter(([breakpoint]) => Number(breakpoint) <= width)
      .sort(([a], [b]) => Number(b) - Number(a))[0]?.[1]
    : limit;
  return value === undefined || Number.isNaN(value) ? Infinity : Math.max(0, Math.floor(value));
}

/** Parses `data-navbar-max-visible`: a count such as `"2"`, or breakpoints such as `"0:2 900:none"`. */
export function parseSectionLimit(value: string | undefined, width: number): number {
  const trimmed = value?.trim();
  if (!trimmed) return Infinity;
  if (!trimmed.includes(':')) return resolveVisibleLimit(Number(trimmed), width);
  const limits: Record<number, number> = {};
  for (const match of trimmed.matchAll(/(?:^|\s)(\d+):(\d+|none)(?=\s|$)/g)) {
    limits[Number(match[1])] = match[2] === 'none' ? Infinity : Number(match[2]);
  }
  return resolveVisibleLimit(limits, width);
}
