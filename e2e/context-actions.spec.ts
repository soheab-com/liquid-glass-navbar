import { expect, test } from '@playwright/test';
import { current, mount, tabs } from './helpers';

type Bar = {
  showContextActions(nodes: HTMLElement[], options?: Record<string, unknown>): void;
  hideContextActions(): void;
  contextActionsShown?: boolean;
};

test('context actions replace the bar, Back restores it exactly', async ({ page }) => {
  await mount(page, tabs('One', 'Two', 'Three'));
  const keys = () =>
    page
      .locator('#nav')
      .evaluate((nav) => [...nav.querySelectorAll('[data-navbar-key]')].map((item) => item.textContent));
  const before = await keys();
  await page.getByRole('button', { name: 'Two' }).click();
  await page.evaluate(() => {
    const share = document.createElement('button');
    share.type = 'button';
    share.id = 'share';
    share.className = 'mine';
    share.innerHTML = '<span data-navbar-label>Share</span>';
    (window as unknown as { bar: Bar }).bar.showContextActions([share], {
      back: true,
      label: 'Actions for 1 file',
      onBack: () => window.calls.push(['back']),
    });
  });
  const nav = page.locator('#nav');
  await expect(nav).toHaveAttribute('aria-label', 'Actions for 1 file');
  await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'One', exact: true })).toBeHidden();

  await page.getByRole('button', { name: 'Back' }).click();
  await expect(nav).toHaveAttribute('aria-label', 'Test');
  await expect(page.locator('#share')).toHaveCount(0);
  await expect(page.locator('.lg-navbar__back')).toHaveCount(0);
  await expect(current(page)).toHaveText('Two');
  expect(await page.evaluate(() => window.calls.filter((call) => call[0] === 'back'))).toEqual([['back']]);
  expect(await keys()).toEqual(before);
});

test('context actions can sit beside the items, and keyboard focus moves into and out of them', async ({ page }) => {
  await mount(page, tabs('One', 'Two'));
  await page.getByRole('button', { name: 'One', exact: true }).focus();
  await page.evaluate(() => {
    const done = document.createElement('button');
    done.type = 'button';
    done.innerHTML = '<span data-navbar-label>Done</span>';
    (window as unknown as { bar: Bar }).bar.showContextActions([done], { placement: 'end' });
  });
  await expect(page.getByRole('button', { name: 'One', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Done' })).toBeFocused();
  await page.evaluate(() => (window as unknown as { bar: Bar }).bar.hideContextActions());
  await expect(page.getByRole('button', { name: 'Done' })).toHaveCount(0);
  await expect(current(page)).toBeFocused();
});
