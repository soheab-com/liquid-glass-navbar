import { expect, test } from '@playwright/test';
import { calls, current, expectLensOn, mount, tabs } from './helpers';

test('tapping a tab moves aria-current and fires onSelect once', async ({ page }) => {
  await mount(page, tabs('One', 'Two', 'Three'));
  await page.getByRole('button', { name: 'Two' }).click();
  await expect(current(page)).toHaveText('Two');
  await expect(page.locator('#nav [aria-current]')).toHaveCount(1);
  expect(await calls(page, 'select')).toEqual([['select', 'Two']]);
  await expectLensOn(page, '[data-navbar-key="two"]');
});

test('select() moves the selection without firing onSelect', async ({ page }) => {
  await mount(page, tabs('One', 'Two', 'Three'));
  await page.evaluate(() => {
    const bar = (window as unknown as { bar: { select(item: Element): void } }).bar;
    bar.select(document.querySelector('[data-navbar-key="three"]')!);
  });
  await expect(current(page)).toHaveText('Three');
  expect(await calls(page, 'select')).toEqual([]);
  await expectLensOn(page, '[data-navbar-key="three"]');
});

test.describe('touch', () => {
  test.use({ hasTouch: true });
  test('a tap selects once', async ({ page }) => {
    await mount(page, tabs('One', 'Two', 'Three'));
    await page.getByRole('button', { name: 'Three' }).tap();
    await expect(current(page)).toHaveText('Three');
    expect(await calls(page, 'select')).toEqual([['select', 'Three']]);
  });
});

test('action items call onAction and keep the selection', async ({ page }) => {
  await mount(page, `${tabs('One', 'Two')}<button type="button" data-navbar-action><span data-navbar-label>Search</span></button>`);
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(current(page)).toHaveText('One');
  expect(await calls(page, 'action')).toEqual([['action', 'Search']]);
  expect(await calls(page, 'select')).toEqual([]);
});
