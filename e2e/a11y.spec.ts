import { expect, test } from '@playwright/test';
import { createRequire } from 'node:module';

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

for (const path of ['/examples/index.html', '/examples/features.html', '/examples/catalog.html']) {
  test(`no axe violations in the navbars on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.locator('.lg-navbar').first().waitFor();
    await page.addScriptTag({ path: axePath });
    const violations = await page.evaluate(async () => {
      const axe = (window as unknown as { axe: { run(context: unknown, options: unknown): Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe;
      const { violations } = await axe.run(
        { include: [...document.querySelectorAll('.lg-navbar')].map((nav) => [nav]) },
        {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
          // Page-structure rules judge the demo page around the navbar, not the navbar. label-content-name-mismatch
          // (experimental in axe) counts a badge's visible count as part of the label; the navbar announces it
          // through aria-describedby instead ("Chats", described as "3 unread").
          rules: Object.fromEntries(['region', 'landmark-one-main', 'page-has-heading-one', 'scrollable-region-focusable',
            'label-content-name-mismatch']
            .map((id) => [id, { enabled: false }])),
        },
      );
      return violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`);
    });
    expect(violations).toEqual([]);
  });
}
