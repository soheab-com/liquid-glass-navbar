// Builds dist/: ESM bundles for the core and the framework bindings, per-module declarations from tsc, and the
// stylesheet. The bindings import the core from ./index.js and their framework from the app, so nothing is duplicated.

import { execFileSync } from 'node:child_process';
import { copyFileSync, rmSync } from 'node:fs';
import { build } from 'esbuild';

rmSync('dist', { recursive: true, force: true });
const shared = { bundle: true, format: 'esm', target: 'es2022', platform: 'neutral', sourcemap: true, outdir: 'dist' };
await build({ ...shared, entryPoints: ['src/index.ts'] });
await build({
  ...shared,
  entryPoints: ['src/react.ts', 'src/vue.ts'],
  external: ['react', 'vue'],
  plugins: [
    {
      name: 'core-external',
      setup(builder) {
        builder.onResolve({ filter: /^\.\/index\.js$/ }, () => ({ path: './index.js', external: true }));
      },
    },
  ],
});
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.build.json'], { stdio: 'inherit' });
copyFileSync('src/navbar.css', 'dist/navbar.css');
