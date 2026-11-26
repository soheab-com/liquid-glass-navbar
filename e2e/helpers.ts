import { expect, type Page } from '@playwright/test';

/** Tabs as markup: `tab('Home')`, `tab('Docs', 'aria-current="page"')`, `link('Two', '#two')`. */
export const tab = (label: string, attributes = ''): string =>
  `<button type="button" data-navbar-key="${label.toLowerCase()}" ${attributes}>`
  + `<svg data-navbar-icon viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="currentColor"/></svg>`
  + `<span data-navbar-label>${label}</span></button>`;
export const link = (label: string, href: string, attributes = ''): string =>
  `<a href="${href}" data-navbar-key="${label.toLowerCase()}" ${attributes}><span data-navbar-label>${label}</span></a>`;
export const tabs = (...labels: string[]): string =>
  labels.map((label, index) => tab(label, index === 0 ? 'aria-current="page"' : '')).join('');

/** Options that survive JSON. Callbacks are recorded in `window.calls` as `[name, ...serialized args]`. */
export type MountOptions = Record<string, unknown>;

export async function open(page: Page): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
}

/** Renders `<nav id="nav">` with `markup`, then mounts it with recorded callbacks as `window.bar`. */
export async function mount(page: Page, markup: string, options: MountOptions = {}, navAttributes = 'aria-label="Test"'): Promise<void> {
  await open(page);
  await page.evaluate(({ markup, options, navAttributes }) => {
    const app = document.querySelector('#app')!;
    app.innerHTML = `<nav id="nav" ${navAttributes}>${markup}</nav>`;
    const label = (item: Element) => item.querySelector('[data-navbar-label]')?.textContent ?? item.textContent?.trim();
    const record = (name: string) => (...args: unknown[]) => window.calls.push([name, ...args.map((arg) =>
      arg instanceof Element ? label(arg) : arg)]);
    window.calls = [];
    (window as unknown as { bar: unknown }).bar = window.lg.mountLiquidGlassNavbar(document.querySelector('#nav')!, {
      onSelect: record('select'),
      onAction: record('action'),
      onCollapse: record('collapse'),
      onCollapseEnd: record('collapseEnd'),
      onResize: record('resize'),
      // As in the quick start: a positioned bar lays out as a row.
      position: 'bottom',
      ...options,
    });
  }, { markup, options, navAttributes });
  await expect(page.locator('#nav.lg-navbar')).toBeVisible();
  // onResize reports the initial layout; until then the first sync may still place the lens without motion.
  await page.waitForFunction(() => window.calls.some((call) => call[0] === 'resize'));
}

export const calls = (page: Page, name?: string): Promise<unknown[][]> =>
  page.evaluate((name) => window.calls.filter((call) => !name || call[0] === name), name);

/** The lens's horizontal centre in viewport pixels. */
export const lensCenter = (page: Page): Promise<number> => page.locator('#nav .lg-navbar__lens').evaluate((lens) => {
  const box = lens.getBoundingClientRect();
  return box.left + box.width / 2;
});

/** Waits until the lens is centred on `selector` (springs included). */
export async function expectLensOn(page: Page, selector: string): Promise<void> {
  await expect.poll(async () => {
    const target = await page.locator(selector).first().evaluate((element) => {
      const box = element.getBoundingClientRect();
      return box.left + box.width / 2;
    });
    return Math.abs((await lensCenter(page)) - target);
  }, { timeout: 5000 }).toBeLessThan(2);
}

export const current = (page: Page) => page.locator('#nav [aria-current="page"]');

/** Drags with a real mouse from one element's centre to another's, in `steps` pointermoves. */
export async function drag(page: Page, from: string, to: { x: number; y: number } | string, steps = 12, release = true): Promise<void> {
  const start = await page.locator(from).first().boundingBox();
  const end = typeof to === 'string' ? await page.locator(to).first().boundingBox() : undefined;
  if (!start) throw new Error(`No box for ${from}`);
  const target = end ? { x: end.x + end.width / 2, y: end.y + end.height / 2 } : to as { x: number; y: number };
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps });
  if (release) await page.mouse.up();
}
