import { expect, test } from '@playwright/test';
import { calls, current, drag, expectLensOn, lensCenter, mount, tabs } from './helpers';

const five = tabs('One', 'Two', 'Three', 'Four', 'Five');

test('a swipe across tabs selects the tab under release', async ({ page }) => {
  await mount(page, five);
  await drag(page, '[data-navbar-key="one"]', '[data-navbar-key="four"]');
  await expect(current(page)).toHaveText('Four');
  expect(await calls(page, 'select')).toEqual([['select', 'Four']]);
  await expectLensOn(page, '[data-navbar-key="four"]');
});

test('the lens follows the pointer while dragging', async ({ page }) => {
  await mount(page, five);
  await drag(page, '[data-navbar-key="one"]', '[data-navbar-key="three"]', 12, false);
  await expect(page.locator('#nav')).toHaveClass(/lg-navbar--dragging/);
  await expect(page.locator('[data-navbar-key="three"]')).toHaveClass(/lg-navbar__preview/);
  await page.mouse.up();
  await expect(current(page)).toHaveText('Three');
});

test('dragging past the first tab rubber-bands, then springs back', async ({ page }) => {
  await mount(page, five);
  const first = (await page.locator('[data-navbar-key="one"]').boundingBox())!;
  const nav = (await page.locator('#nav').boundingBox())!;
  const resting = await lensCenter(page);
  await drag(
    page,
    '[data-navbar-key="two"]',
    { x: Math.max(1, nav.x - 200), y: first.y + first.height / 2 },
    20,
    false,
  );
  const stretched = await lensCenter(page);
  // Past the edge, but by far less than the 200px the pointer travelled beyond the bar.
  expect(stretched).toBeLessThan(resting - 1);
  expect(resting - stretched).toBeLessThan(120);
  await page.mouse.up();
  await expect(current(page)).toHaveText('One');
  await expectLensOn(page, '[data-navbar-key="one"]');
});

test('a short wobble is a tap, not a swipe', async ({ page }) => {
  await mount(page, five);
  const box = (await page.locator('[data-navbar-key="two"]').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 3, box.y + box.height / 2);
  await page.mouse.up();
  await expect(current(page)).toHaveText('Two');
  expect(await calls(page, 'select')).toEqual([['select', 'Two']]);
});
