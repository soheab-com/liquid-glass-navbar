import { expect, test } from '@playwright/test';

test('hovering a same-page link scrolls to it, and leaving restores the position', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto('/tests/hover-navigation.html');
  await page.locator('#main.lg-navbar').waitFor();
  await page.locator('#main a[href="#two"]').hover();
  await expect.poll(() => page.evaluate(() => scrollY), { timeout: 4000 }).toBeGreaterThan(700);
  await page.mouse.move(640, 100);
  await expect.poll(() => page.evaluate(() => scrollY), { timeout: 4000 }).toBeLessThan(50);
});

test('dragging from one grouped bar onto another moves the lens there, and back', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto('/tests/hover-navigation.html');
  await page.locator('#main.lg-navbar').waitFor();
  const from = (await page.locator('#main a').first().boundingBox())!;
  const to = (await page.locator('#sub a').first().boundingBox())!;
  const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const end = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  const state = () =>
    page.evaluate(() => {
      const lens = document.querySelector('#sub .lg-navbar__lens')!.getBoundingClientRect();
      const three = document.querySelector('#sub a')!.getBoundingClientRect();
      return {
        subPreview: [...document.querySelectorAll('#sub .lg-navbar__preview')].map((item) => item.textContent),
        mainAway: document.querySelector('#main')!.classList.contains('lg-navbar--lens-away'),
        subLensOnItem: Math.abs(lens.left + lens.width / 2 - (three.left + three.width / 2)) < 2,
        mainInk: document.querySelectorAll('#main .lg-navbar__ink').length,
      };
    });
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 20 });
  await expect.poll(state).toEqual({ subPreview: ['Three'], mainAway: true, subLensOnItem: true, mainInk: 0 });
  await page.mouse.move(start.x + 20, start.y, { steps: 20 });
  await expect.poll(async () => (await state()).subPreview).toEqual([]);
  expect((await state()).mainAway).toBe(false);
  await page.mouse.move(end.x, end.y, { steps: 20 });
  await page.mouse.up();
  await expect(page.locator('#sub [aria-current="page"]')).toHaveText('Three');
  await expect(page.locator('#main')).not.toHaveClass(/lg-navbar--lens-away/);
});
