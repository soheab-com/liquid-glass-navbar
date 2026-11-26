// A React app that mounts the bar with useLiquidGlassNavbar. Clicking "Count" changes state that onSelect reads,
// and "Remove" unmounts the bar, to check the latest callback is used and destroy() runs.
import { createElement as h, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useLiquidGlassNavbar } from '../src/react.js';

const log: unknown[][] = [];
Object.assign(window, { log });

function Bar({ count }: { count: number }) {
  const ref = useRef<HTMLElement>(null);
  const navbar = useLiquidGlassNavbar(ref, {
    position: 'bottom',
    onSelect: (item) => log.push(['select', item.textContent, count]),
  });
  return h(
    'nav',
    { ref, id: 'nav', 'aria-label': 'React', 'data-ready': navbar ? 'true' : 'false' },
    ['One', 'Two', 'Three'].map((label, index) =>
      h('button', { key: label, type: 'button', 'aria-current': index === 0 ? 'page' : undefined }, label),
    ),
  );
}

function App() {
  const [count, setCount] = useState(0);
  const [shown, setShown] = useState(true);
  return h(
    'main',
    null,
    h('button', { id: 'count', type: 'button', onClick: () => setCount((value) => value + 1) }, `Count ${count}`),
    h('button', { id: 'remove', type: 'button', onClick: () => setShown(false) }, 'Remove'),
    shown ? h(Bar, { count }) : null,
  );
}

createRoot(document.querySelector('#app')!).render(h(App));
