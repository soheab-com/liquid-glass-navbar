// Importing the built package must not touch browser globals (server rendering, static generation).
// Node 21+ defines its own `navigator`, so only the DOM globals are asserted absent.
import assert from 'node:assert/strict';

for (const name of ['window', 'document', 'matchMedia', 'CSS']) assert.equal(typeof globalThis[name], 'undefined', name);
const navbar = await import('../dist/index.js');
assert.equal(typeof navbar.mountLiquidGlassNavbar, 'function');
console.log('SSR import OK:', Object.keys(navbar).join(', '));
