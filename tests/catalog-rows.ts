import { type LiquidGlassNavbarOptions, mountLiquidGlassNavbar } from '../src/index.js';

const fixture = document.querySelector<HTMLElement>('#fixture')!;
const result = document.querySelector<HTMLOutputElement>('#result')!;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const phone = innerWidth < 900;
const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const failures: string[] = [];
const passed: string[] = [];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
async function until(test: () => boolean, message: string): Promise<void> {
  const end = performance.now() + 7000;
  while (!test() && performance.now() < end) await frame();
  assert(test(), message);
}
function navWith(markup: string): HTMLElement {
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Catalog test');
  nav.innerHTML = markup;
  return nav;
}
function withBar(markup: string, options: LiquidGlassNavbarOptions) {
  const nav = navWith(markup);
  fixture.append(nav);
  const bar = mountLiquidGlassNavbar(nav, { refractionSources: false, ...options });
  const get = <T extends HTMLElement = HTMLButtonElement>(selector: string) => nav.querySelector<T>(selector)!;
  const lens = get<HTMLElement>('.lg-navbar__lens');
  const aligned = (item: HTMLElement) => {
    const a = lens.getBoundingClientRect();
    const b = item.getBoundingClientRect();
    return !lens.hidden && b.width > 0 && Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
  };
  return {
    nav,
    bar,
    get,
    lens,
    aligned,
    dispose: () => {
      bar.destroy();
      nav.remove();
    },
  };
}
const test = async (name: string, run: () => void | Promise<void>): Promise<void> => {
  try {
    await run();
    passed.push(name);
  } catch (error) {
    failures.push(`${name}: ${error instanceof Error ? error.message : error}`);
  }
};
const button = (key: string, label = key, attrs = '') =>
  `<button data-navbar-key="${key}" ${attrs}><span data-navbar-label>${label}</span></button>`;
const section = (row: number, content: string, attrs = '') =>
  `<div data-navbar-section data-navbar-row="${row}" ${attrs}>${content}</div>`;
const key = (name: string) => `[data-navbar-key="${name}"]`;
const pinned = 'data-navbar-overflow="never"';
const main = button('Home', 'Home', `${pinned} aria-current="page"`) + button('Search') + button('Filters');

await test('1. Collapse retains the main row budget', async () => {
  const markup =
    section(1, ['p1', 'p2', 'p3', 'p4', 'p5'].map((name) => button(name)).join('')) +
    section(2, main + ['More A', 'More B', 'More C'].map((name) => button(name)).join(''));
  const { bar, get, dispose } = withBar(markup, {
    layout: 'rows',
    maxRows: 2,
    collapsible: true,
    overflow: { maxVisible: 2 },
  });
  try {
    const row = get('[data-navbar-row="2"]');
    const items = () =>
      Array.from(row.querySelectorAll<HTMLButtonElement>('button[data-navbar-key]')).map(
        (item) => item.dataset.navbarKey,
      );
    const before = items();
    assert(before.includes('Search') && before.includes('Filters'), `Unexpected initial row ${before}`);
    bar.setCollapsed(true);
    await until(() => get('[data-navbar-row="1"]').getBoundingClientRect().height === 0, 'Row did not settle closed');
    assert(items().join() === before.join(), 'Main row gained or lost items');
    assert(Math.abs(get(key('Home')).offsetTop - get(key('Filters')).offsetTop) < 2, 'Main row wrapped');
  } finally {
    dispose();
  }
});

await test('2. Re-entrant overflow changes and interrupted collapse', async () => {
  const events: string[] = [];
  const markup = section(1, button('Preset')) + section(2, main + button('Other'));
  const opts = { maxVisible: 2, moreLabel: false };
  const { bar, get, dispose } = withBar(markup, {
    layout: 'rows',
    maxRows: 2,
    overflow: opts,
    collapsible: true,
    onCollapse(state) {
      events.push(`start:${state}`);
      bar.setOverflow({ ...opts });
    },
    onCollapseEnd(state) {
      events.push(`end:${state}`);
    },
  });
  try {
    const search = get(key('Search'));
    const filters = get(key('Filters'));
    const row = search.parentElement;
    const stable = () =>
      [search, filters].every((item) => item.parentElement === row && item.getBoundingClientRect().width > 0);
    const toggle = get('.lg-navbar__collapse-toggle');
    toggle.click();
    if (!reduced) await frame();
    assert(stable(), 'Persistent items vanished in the closing frame');
    toggle.click();
    await until(() => {
      assert(stable(), 'Persistent items vanished in an opening frame');
      return events.at(-1) === 'end:false';
    }, 'Missing settled callback after retargeting');
    assert(
      events.join() === (reduced ? 'start:true,end:true,start:false,end:false' : 'start:true,start:false,end:false'),
      `Wrong collapse callback order ${events}`,
    );
  } finally {
    dispose();
  }
});

await test('3 and 10. Section caps exclude pinned items and respond to viewport width', () => {
  const markup = section(1, main + button('Other'), 'data-navbar-max-visible="0:2 900:none"');
  const { bar, get, dispose } = withBar(markup, { layout: 'rows', overflow: {} });
  try {
    assert(
      !bar.overflowItems.includes(get(key('Home'))) && !bar.overflowItems.includes(get(key('Filters'))),
      'Pinned item used a movable slot',
    );
    assert(bar.overflowItems.includes(get(key('Other'))) === phone, 'Wrong section limit for this viewport');
  } finally {
    dispose();
  }
});

await test('4. Five equal presets fit and truncate', () => {
  const markup = section(
    1,
    ['All presets', 'Recently updated', 'Favorites', 'Languages represented', 'Popular']
      .map((name) => button(name))
      .join(''),
    'data-navbar-equal',
  );
  const { nav, get, dispose } = withBar(markup, { layout: 'rows' });
  try {
    const items = [...nav.querySelectorAll('button')];
    const widths = items.map((item) => item.getBoundingClientRect().width);
    const bounds = get('[data-navbar-section]').getBoundingClientRect();
    assert(widths.length === 5 && Math.max(...widths) - Math.min(...widths) < 1, 'Item widths differ');
    assert(bounds.left >= 11 && bounds.right <= innerWidth - 11, 'Equal section exceeded available room');
    const label = get<HTMLElement>(`${key('Languages represented')} [data-navbar-label]`);
    if (phone)
      assert(
        getComputedStyle(label).textOverflow === 'ellipsis' && label.scrollWidth > label.clientWidth,
        'Long labels did not truncate',
      );
  } finally {
    dispose();
  }
});

await test('5. First mount and update pick the highest current row', async () => {
  const markup =
    section(1, button('Preset', 'Preset', 'aria-current="page"')) +
    section(2, button('Activity', 'Activity', 'aria-current="page"'));
  const originalWarn = console.warn;
  let warnings = 0;
  console.warn = () => {
    warnings++;
  };
  const { bar, get, aligned, dispose } = withBar(markup, { layout: 'rows', warnOnMultipleCurrent: true });
  try {
    const activity = get(key('Activity'));
    assert(aligned(activity), 'Mount picked the preset');
    bar.update(navWith(markup));
    await until(() => aligned(activity), 'Update did not pick the same item');
    assert(activity === get(key('Activity')), 'Keyed activity was replaced');
    assert(warnings === 1, 'Expected one warning for duplicate current items');
  } finally {
    console.warn = originalWarn;
    dispose();
  }
});

await test('6. Keyed update keeps runtime visibility unless explicitly overridden', () => {
  const initial = section(1, main + button('Top'));
  const { bar, get, dispose } = withBar(initial, { overflow: { maxVisible: 2 } });
  try {
    const top = get(key('Top'));
    bar.setItemHidden(top, true);
    const before = bar.overflowItems;
    bar.update(navWith(initial));
    assert(top === get(key('Top')) && top.hidden, 'Hidden Top flashed visible or lost identity');
    assert(bar.overflowItems.join() === before.join(), 'Neighbours reflowed into More');
    const explicit = (attrs: string) => navWith(section(1, main + button('Top', 'Top', attrs)));
    bar.update(explicit('data-navbar-hidden="false"'));
    assert(!top.hidden, 'Explicit visible override was ignored');
    bar.setItemHidden(top, false);
    bar.update(explicit('hidden'));
    assert(top.hidden, 'Explicit hidden override was ignored');
  } finally {
    dispose();
  }
});

await test('7. More and the collapse chevron get the lens', async () => {
  const markup = section(1, button('Preset')) + section(2, main + button('Other'));
  const { bar, get, aligned, dispose } = withBar(markup, {
    layout: 'rows',
    collapsible: true,
    overflow: { maxVisible: 1 },
  });
  try {
    const home = get(key('Home'));
    const more = get('.lg-navbar__more:not([hidden])');
    more.click();
    await until(() => aligned(more), 'Lens did not reach open More');
    assert(more.getAttribute('aria-expanded') === 'true', 'More did not open');
    bar.closeOverflow();
    await until(() => aligned(home), 'Lens did not return after More closed');
    const toggle = get('.lg-navbar__collapse-toggle');
    toggle.click();
    if (!reduced) {
      let reached = false;
      await until(() => {
        reached ||= aligned(toggle);
        return reached;
      }, 'Lens did not press the collapse chevron');
    }
    await until(() => aligned(home), 'Lens did not return after the chevron press');
  } finally {
    dispose();
  }
});

await test('8 and 9. Collapsed selection falls back with one visible chevron label', async () => {
  const markup =
    section(1, button('Preset', 'Preset', 'aria-current="page"')) +
    section(2, button('Home', 'Home', 'data-navbar-collapsed-current'));
  const { bar, get, lens, aligned, dispose } = withBar(markup, { layout: 'rows', collapsible: true });
  try {
    const toggle = get('.lg-navbar__collapse-toggle');
    const checkLabel = (label: string, expanded: string) =>
      assert(
        toggle.innerText.trim() === label &&
          toggle.textContent?.trim() === label &&
          toggle.getAttribute('aria-label') === label &&
          toggle.getAttribute('aria-expanded') === expanded,
        `Wrong toggle label or state for ${label}`,
      );
    checkLabel('Hide', 'true');
    bar.setCollapsed(true);
    checkLabel('Show', 'false');
    await until(() => aligned(get(key('Home'))), 'Lens did not reach the marked fallback');
    get(key('Home')).removeAttribute('data-navbar-collapsed-current');
    bar.sync();
    await until(() => aligned(toggle), 'Lens did not fall back to the chevron');
    bar.setCollapsed(false);
    checkLabel('Hide', 'true');
    await until(() => {
      assert(!lens.hidden, 'Lens disappeared while the selected row opened');
      return aligned(get(key('Preset')));
    }, 'Lens did not return to the selected row');
  } finally {
    dispose();
  }
});

await test('11. Keyed update changes layout and collapsible rows', async () => {
  const { nav, bar, get, aligned, dispose } = withBar(section(3, main), { layout: 'row' });
  try {
    const home = get(key('Home'));
    const next = section(1, button('Filter')) + section(2, button('Preset')) + section(3, main);
    bar.update(navWith(next), { layout: 'rows', maxRows: 3, collapsible: { rows: [2], initial: 'collapsed' } });
    assert(
      home === get(key('Home')) && nav.classList.contains('lg-navbar--multirow'),
      'Mounted layout or item identity was lost',
    );
    assert(
      bar.collapsed &&
        get(key('Preset')).getBoundingClientRect().width === 0 &&
        get(key('Filter')).getBoundingClientRect().width > 0,
      'Wrong collapsible row',
    );
    await until(() => aligned(home), 'Lens did not settle on the persistent item');
    bar.update(navWith(section(3, main)), { layout: 'row', maxRows: null, collapsible: false });
    assert(
      !get('.lg-navbar__collapse-toggle') && !nav.classList.contains('lg-navbar--multirow'),
      'Old collapse toggle or layout survived',
    );
  } finally {
    dispose();
  }
});

await test('12 and 13. Stacked rows share size and own their menus', async () => {
  const markup =
    section(1, button('Language') + button('Library') + button('Framework')) +
    section(2, button('Preset')) +
    section(3, main + button('Other'));
  let height = 0;
  const { nav, bar, get, dispose } = withBar(markup, {
    layout: 'rows',
    maxRows: 3,
    collapsible: true,
    overflow: { perRow: true, rowLimits: { 1: 1, 3: 1 } },
    onResize(size) {
      height = size.height;
    },
  });
  try {
    await until(() => height === nav.getBoundingClientRect().height, 'Initial stack size was not reported');
    const expandedHeight = height;
    const filterMore = get('[data-navbar-row="1"] .lg-navbar__more');
    const mainMore = get('[data-navbar-row="3"] .lg-navbar__more');
    assert(filterMore && mainMore && !filterMore.hidden && !mainMore.hidden, 'Missing row-specific More');
    bar.openOverflow({ row: 1 });
    assert(
      filterMore.getAttribute('aria-expanded') === 'true' && mainMore.getAttribute('aria-expanded') === 'false',
      'Wrong filter menu opened',
    );
    assert(
      get(key('Library')).closest('.lg-navbar__overflow')?.parentElement?.id ===
        filterMore.getAttribute('aria-controls') ||
        get(key('Library')).closest('.lg-popover')?.id === filterMore.getAttribute('aria-controls'),
      'Row 1 item is in the wrong menu',
    );
    bar.openOverflow({ row: 3 });
    assert(
      filterMore.getAttribute('aria-expanded') === 'false' && mainMore.getAttribute('aria-expanded') === 'true',
      'Menus remained open together',
    );
    bar.setCollapsed(true);
    await until(
      () => height < expandedHeight * 0.6 && Math.abs(height - nav.getBoundingClientRect().height) < 1,
      'Collapsed stack size was not reported',
    );
    await until(() => filterMore.getBoundingClientRect().height === 0, 'Filter More did not finish collapsing');
    assert(
      mainMore.getBoundingClientRect().height > 0 && filterMore.getBoundingClientRect().height === 0,
      'Wrong More survived collapse',
    );
  } finally {
    dispose();
  }
});

await test('14. Named View Transition uses only the live navbar snapshot', async () => {
  const markup = section(1, main + button('Top'));
  const { nav, bar, get, dispose } = withBar(markup, { viewTransitionName: 'test-catalog-navigation' });
  try {
    if (!document.startViewTransition) return;
    const top = get(key('Top'));
    bar.setItemHidden(top, true);
    assert(
      getComputedStyle(nav).getPropertyValue('view-transition-name') === 'test-catalog-navigation',
      'Missing snapshot name',
    );
    const transition = document.startViewTransition(() => {
      bar.update(navWith(markup));
    });
    await transition.ready;
    const old = getComputedStyle(document.documentElement, '::view-transition-old(test-catalog-navigation)');
    const next = getComputedStyle(document.documentElement, '::view-transition-new(test-catalog-navigation)');
    assert(
      old.display === 'none' && next.mixBlendMode === 'normal' && next.animationName === 'none',
      'Old and new snapshots blended',
    );
    assert(top === get(key('Top')) && top.hidden, 'Update in the transition changed Top visibility');
    await transition.finished;
  } finally {
    dispose();
  }
});

result.dataset.passed = String(!failures.length);
result.value = failures.length ? failures.join('\n') : `PASS (${passed.length} scenarios)`;
