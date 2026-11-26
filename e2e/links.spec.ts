import { expect, test } from '@playwright/test';
import { drag, link, mount } from './helpers';

const links =
  link('One', '/tests/fixture.html?page=one', 'aria-current="page"') +
  link('Two', '/tests/fixture.html?page=two') +
  link('Three', '/tests/fixture.html?page=three');

test('tapping a link tab navigates natively', async ({ page }) => {
  await mount(page, links);
  await Promise.all([page.waitForURL(/page=two/), page.getByRole('link', { name: 'Two' }).click()]);
});

test('a swipe that ends on a link tab follows it', async ({ page }) => {
  await mount(page, links);
  await Promise.all([
    page.waitForURL(/page=three/),
    drag(page, '[data-navbar-key="one"]', '[data-navbar-key="three"]'),
  ]);
});

test('modified clicks keep native link behaviour', async ({ page, context }) => {
  await mount(page, links);
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('link', { name: 'Two' }).click({ modifiers: [modifier] }),
  ]);
  await popup.close();
  await expect(page).toHaveURL(/fixture\.html$/);
});
