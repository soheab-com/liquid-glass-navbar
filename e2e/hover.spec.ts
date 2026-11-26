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
