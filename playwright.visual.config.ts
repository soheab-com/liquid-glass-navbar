import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Screenshot comparisons of the glass states, per browser. Rendering differs between machines (fonts, GPU), so these
// run on demand rather than in CI: `npm run test:visual`, and `npm run test:visual -- --update-snapshots` after an
// intended visual change.
export default defineConfig({
  ...base,
  testDir: 'visual',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
});
