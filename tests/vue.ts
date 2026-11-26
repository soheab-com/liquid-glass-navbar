// A Vue app that mounts the bar with useLiquidGlassNavbar, mirroring tests/react.ts.
import { createApp, defineComponent, h, ref } from 'vue';
import { useLiquidGlassNavbar } from '../src/vue.js';

const log: unknown[][] = [];
Object.assign(window, { log });

const Bar = defineComponent({
  props: { count: { type: Number, required: true } },
  setup(props) {
    const nav = ref<HTMLElement>();
    const navbar = useLiquidGlassNavbar(nav, () => ({
      position: 'bottom',
      onSelect: (item) => log.push(['select', item.textContent, props.count]),
    }));
    return () =>
      h(
        'nav',
        { ref: nav, id: 'nav', 'aria-label': 'Vue', 'data-ready': navbar.value ? 'true' : 'false' },
        ['One', 'Two', 'Three'].map((label, index) =>
          h('button', { key: label, type: 'button', 'aria-current': index === 0 ? 'page' : undefined }, label),
        ),
      );
  },
});

createApp({
  setup() {
    const count = ref(0);
    const shown = ref(true);
    return () =>
      h('main', [
        h('button', { id: 'count', type: 'button', onClick: () => count.value++ }, `Count ${count.value}`),
        h('button', { id: 'remove', type: 'button', onClick: () => (shown.value = false) }, 'Remove'),
        shown.value ? h(Bar, { count: count.value }) : null,
      ]);
  },
}).mount('#app');
