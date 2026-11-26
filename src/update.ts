// Identity rules for keyed `update()`: which existing node a replacement node stands for.

/** The default identity: `data-navbar-key`, then `id`, then a section's row, then a link's literal `href`. */
export function defaultKey(element: HTMLElement): string | undefined {
  if (element.dataset.navbarKey !== undefined) return `key:${element.dataset.navbarKey}`;
  if (element.id) return `id:${element.id}`;
  const row = element.getAttribute('data-navbar-row');
  if (element.hasAttribute('data-navbar-section') && row) return `row:${row}`;
  const href = element.getAttribute('href');
  if (href !== null) return `href:${href}`;
  return undefined;
}

/**
 * Finds the existing node an incoming node replaces. The same node always matches. Keyed nodes match by key
 * within the same tag. Unkeyed nodes match an unkeyed node of the same tag whose authored markup is equal.
 */
export function findKeyedMatch<T extends HTMLElement>(
  nodes: Iterable<T>,
  incoming: T,
  identify: (element: HTMLElement) => string | undefined,
  authored: (node: T, incoming: T) => boolean,
): T | undefined {
  const same = [...nodes].filter((node) => node.tagName === incoming.tagName);
  const identity = identify(incoming);
  return same.find((node) => node === incoming) ?? (identity === undefined
    ? same.find((node) => identify(node) === undefined && authored(node, incoming))
    : same.find((node) => identify(node) === identity));
}
