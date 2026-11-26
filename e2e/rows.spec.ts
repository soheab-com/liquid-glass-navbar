import { expect, test } from '@playwright/test';
import { calls, mount, tab } from './helpers';

const rows =
  `<div data-navbar-section data-navbar-row="1">${tab('Filter A')}${tab('Filter B')}</div>` +
  `<div data-navbar-section data-navbar-row="2">${tab('Home', 'aria-current="page"')}${tab('Search')}</div>`;
type Bar = { setCollapsed(value: boolean): void; collapsed: boolean };

test('collapse and expand with the chevron, setCollapsed and callbacks', async ({ page }) => {
  await mount(page, rows, { layout: 'rows', collapsible: true });
  const toggle = page.locator('#nav .lg-navbar__collapse-toggle');
  const filter = page.getByRole('button', { name: 'Filter A' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(filter).toBeVisible();
  const before = (await page.locator('#nav').boundingBox())!.height;

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(filter).toBeHidden();
  await expect.poll(() => calls(page, 'collapseEnd')).toEqual([['collapseEnd', true]]);
  expect(await calls(page, 'collapse')).toEqual([['collapse', true]]);
  const after = (await page.locator('#nav').boundingBox())!.height;
  expect(after).toBeLessThan(before);
  await expect.poll(async () => (await calls(page, 'resize')).at(-1)?.[1]).toMatchObject({ height: after });

  await page.evaluate(() => (window as unknown as { bar: Bar }).bar.setCollapsed(false));
  expect(await page.evaluate(() => (window as unknown as { bar: Bar }).bar.collapsed)).toBe(false);
  await expect(filter).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(await calls(page, 'collapse')).toEqual([
    ['collapse', true],
    ['collapse', false],
  ]);
});

test('the toggle exposes only its current label', async ({ page }) => {
  await mount(page, rows, { layout: 'rows', collapsible: true });
  const toggle = page.locator('#nav .lg-navbar__collapse-toggle');
  await expect(toggle).toHaveAccessibleName('Hide');
  await toggle.click();
  await expect(toggle).toHaveAccessibleName('Show');
  expect(await toggle.evaluate((element) => (element as HTMLElement).innerText.trim())).toBe('Show');
});

test('first-layout lens alignment in rows (manual page)', async ({ page }) => {
  await page.goto('/tests/rows-lens.html');
  await expect(page.locator('#result')).toHaveAttribute('data-passed', 'true');
});

test('catalog adoption scenarios (self-checking page)', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 820 });
  await page.goto('/tests/catalog-rows.html');
  await expect(page.locator('#result')).toHaveAttribute('data-passed', /true|false/, { timeout: 80_000 });
  expect(await page.locator('#result').evaluate((element) => (element as HTMLOutputElement).value)).toMatch(/^PASS/);
});
