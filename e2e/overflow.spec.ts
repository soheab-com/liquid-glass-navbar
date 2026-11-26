import { expect, test } from '@playwright/test';
import { calls, current, mount, tabs } from './helpers';

const six = tabs('One', 'Two', 'Three', 'Four', 'Five', 'Six');
const more = '#nav .lg-navbar__more';
const visibleInBar = (page: import('@playwright/test').Page) => page.locator('#nav > [data-navbar-key]')
  .evaluateAll((items) => items.filter((item) => (item as HTMLElement).getClientRects().length > 0
    && !item.closest('.lg-navbar__overflow')).map((item) => item.getAttribute('data-navbar-key')));

test('items beyond maxVisible move to More', async ({ page }) => {
  await mount(page, six, { overflow: { maxVisible: 3 } });
  await expect(page.locator(more)).toBeVisible();
  expect(await visibleInBar(page)).toEqual(['one', 'two', 'three']);
});

test('maxVisible breakpoints follow the viewport width', async ({ page }) => {
  await page.setViewportSize({ width: 500, height: 700 });
  await mount(page, six, { overflow: { maxVisible: { 0: 2, 800: 5 } } });
  expect(await visibleInBar(page)).toHaveLength(2);
  await page.setViewportSize({ width: 1000, height: 700 });
  await expect.poll(() => visibleInBar(page).then((items) => items.length)).toBe(5);
});

test('More opens and closes, and Escape returns focus to it', async ({ page }) => {
  await mount(page, six, { overflow: { maxVisible: 3 } });
  const trigger = page.locator(more);
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'Five' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('choosing an item inside More selects it (0.11.2 regression)', async ({ page }) => {
  await mount(page, six, { overflow: { maxVisible: 3 } });
  await page.locator(more).click();
  await page.getByRole('button', { name: 'Five' }).click();
  await expect(current(page)).toHaveText('Five');
  expect(await calls(page, 'select')).toEqual([['select', 'Five']]);
  await expect(page.locator(more)).toHaveAttribute('aria-expanded', 'false');
});

test.describe('touch', () => {
  test.use({ hasTouch: true });
  test('tapping More, then a menu item, selects it', async ({ page }) => {
    await page.goto('/tests/more-tap.html');
    await page.locator('.lg-navbar__more').tap();
    await page.locator('.lg-popover :is(button, a)', { hasText: 'Settings' }).or(page.getByRole('menuitem', { name: 'Settings' })).first().tap();
    await expect(page.locator('#result')).toHaveText('PASS');
  });
});

test('the lens moves to More while its menu is open', async ({ page }) => {
  await mount(page, six, { overflow: { maxVisible: 3 } });
  await page.locator(more).click();
  await expect.poll(() => page.evaluate(() => {
    const lens = document.querySelector('#nav .lg-navbar__lens')!.getBoundingClientRect();
    const trigger = document.querySelector('#nav .lg-navbar__more')!.getBoundingClientRect();
    return Math.abs(lens.left + lens.width / 2 - (trigger.left + trigger.width / 2));
  })).toBeLessThan(2);
});
