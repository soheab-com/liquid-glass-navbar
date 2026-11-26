// Serves the examples and test pages with esbuild, bundling the TypeScript entries on request.
// Unlike `esbuild --serve` on the command line, this keeps running without an open stdin (Playwright, CI).
import { context } from 'esbuild';

const port = Number(process.env.PORT ?? 4173);
const ctx = await context({
  entryPoints: [
    'examples/demo.ts', 'examples/features.ts', 'examples/catalog.ts',
    'tests/rows-lens.ts', 'tests/more-tap.ts', 'tests/hover-navigation.ts', 'tests/catalog-rows.ts', 'tests/fixture.ts', 'tests/glass.ts',
  ],
  bundle: true,
  format: 'esm',
  outdir: '.',
  outbase: '.',
  write: false,
});
const { port: actual } = await ctx.serve({ servedir: '.', host: '127.0.0.1', port });
console.log(`Serving http://127.0.0.1:${actual}/`);
