import { expect, test } from '@playwright/test';

for (const framework of ['react', 'vue']) {
  test(`${framework}: mounts, calls the latest onSelect, and destroys on unmount`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/tests/${framework}.html`);
    const nav = page.locator('#nav');
    await expect(nav).toHaveAttribute('data-ready', 'true');
    await expect(nav).toHaveClass(/lg-navbar/);

    await page.locator('#count').click();
    await page.locator('#count').click();
    await page.getByRole('button', { name: 'Two' }).click();
    await expect(page.locator('#nav [aria-current="page"]')).toHaveText('Two');
    expect(await page.evaluate(() => (window as unknown as { log: unknown[] }).log)).toEqual([['select', 'Two', 2]]);

    await page.locator('#remove').click();
    await expect(nav).toHaveCount(0);
    // The bar's generated nodes went with it; nothing was left in the document.
    expect(await page.locator('.lg-navbar__lens, .lg-navbar__refraction-assets, .lg-popover').count()).toBe(0);
    expect(errors).toEqual([]);
  });
}
