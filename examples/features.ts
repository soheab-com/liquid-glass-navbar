import { type LiquidGlassNavbar, type LiquidGlassNavbarOptions, mountLiquidGlassNavbar } from '../src/index.js';

const icon = 'M4 12h16M12 4v16';
const status = document.querySelector<HTMLOutputElement>('#status')!;
const names = ['Home', 'Files', 'Chat', 'Tasks', 'People', 'Calendar', 'Alerts', 'Settings'];

function button(label: string, extra: Record<string, string> = {}): HTMLButtonElement {
  const item = document.createElement('button');
  item.type = 'button';
  item.innerHTML = `<svg data-navbar-icon viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="${icon}"/></svg><span data-navbar-label></span>`;
  item.querySelector('span')!.textContent = label;
  item.dataset.id = label;
  for (const [name, value] of Object.entries(extra)) item.setAttribute(name, value);
  return item;
}

export const bars: Record<string, LiquidGlassNavbar> = {};
function mount(
  id: string,
  labels: string[],
  options: LiquidGlassNavbarOptions,
  build?: (nav: HTMLElement) => void,
): LiquidGlassNavbar {
  const nav = document.querySelector<HTMLElement>(`#${id} nav`)!;
  if (build) build(nav);
  else nav.append(...labels.map((label) => button(label)));
  nav.querySelector('button:not([data-navbar-action])')?.setAttribute('aria-current', 'page');
  const bar = mountLiquidGlassNavbar(nav, {
    onSelect: (item) => {
      status.value = `${id}: ${item.dataset.id} selected`;
    },
    onAction: (item) => {
      status.value = `${id}: ${item.dataset.id} pressed`;
    },
    ...options,
  });
  bars[id] = bar;
  return bar;
}

mount('wrap', names, { layout: 'wrap', transparency: 60, magnify: true });
mount('rows', names, { layout: 'rows', transparency: 60 });
mount('manual', [], { layout: 'rows' }, (nav) => {
  const groups = [
    ['Create', 'Upload'],
    ['Alerts', 'Chat'],
    ['Home', 'Files', 'People', 'Calendar'],
  ];
  groups.forEach((group, index) => {
    const section = document.createElement('div');
    section.setAttribute('data-navbar-section', '');
    section.dataset.navbarRow = String(3 - index);
    section.append(...group.map((label) => button(label, index === 0 ? { 'data-navbar-action': '' } : {})));
    nav.append(section);
  });
});
mount('limit', [...names, 'Reports', 'Archive', 'Photos', 'Music'], { layout: 'wrap', maxRows: 2, overflow: 'menu' });
mount('overflow', [...names, 'Reports', 'Archive'], { overflow: true, magnify: true });
mount('expand', names.slice(0, 6), { overflow: { style: 'expand', maxVisible: 3 } });
const create = mount('create', [], { transparency: 60 }, (nav) => {
  nav.append(button('Notes'), button('Chats'), button('Updates'), button('Create', { 'data-navbar-action': '' }));
});
const items = [...document.querySelectorAll<HTMLButtonElement>('#create nav button')];
create.setBadge(items[1]!, { count: 3, label: '3 unread' });
create.setBadge(items[2]!, { dot: true, label: 'New updates' });
const menu = ['New note', 'New checklist', 'New folder'].map((label) => {
  const entry = document.createElement('button');
  entry.type = 'button';
  entry.textContent = label;
  entry.className = 'menu-entry';
  entry.addEventListener('click', () => {
    status.value = `${label} pressed`;
  });
  return entry;
});
create.createPopover(items[3]!, menu, { label: 'Create' });
(window as unknown as { bars: typeof bars; contextNodes: () => HTMLElement[] }).contextNodes = () => {
  const actions = document.createElement('div');
  actions.setAttribute('data-navbar-section', '');
  actions.append(button('Share', { 'data-navbar-action': '' }), button('Move', { 'data-navbar-action': '' }));
  const done = document.createElement('div');
  done.setAttribute('data-navbar-section', '');
  done.append(button('Done', { 'data-navbar-action': '' }));
  return [actions, done];
};
mount('compact', ['Read', 'Saved', 'Browse'], {
  transparency: 100,
  scrollCompact: { source: () => document.querySelector<HTMLElement>('#compact .feed') },
  contrast: { adaptiveTint: true },
});
(window as unknown as { bars: typeof bars }).bars = bars;
