// Builds dist/: one ESM bundle for the browser, per-module declarations from tsc, and the stylesheet.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { copyFileSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  platform: 'neutral',
  sourcemap: true,
  outfile: 'dist/index.js',
});
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.build.json'], { stdio: 'inherit' });
copyFileSync('src/navbar.css', 'dist/navbar.css');
