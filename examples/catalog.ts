import { mountLiquidGlassNavbar, type NavbarItem, type NavbarLensStyle, type NavbarLensOptions } from '../src/index.js';

const root = document.documentElement;
const nav = document.querySelector<HTMLElement>('#catalog-nav')!;
const status = document.querySelector<HTMLElement>('#selection')!;
const entries = document.querySelector<HTMLElement>('#entries')!;
const theme = document.querySelector<HTMLSelectElement>('#theme')!;
const effects = document.querySelector<HTMLInputElement>('#effects')!;
const lensStyle = document.querySelector<HTMLSelectElement>('#lens-style')!;
const lensAccent = document.querySelector<HTMLInputElement>('#lens-accent')!;
const customLensAccent = document.querySelector<HTMLInputElement>('#custom-lens-accent')!;
const lensBlur = document.querySelector<HTMLInputElement>('#lens-blur')!;
const lensPressScale = document.querySelector<HTMLInputElement>('#lens-press-scale')!;
const lensDragScale = document.querySelector<HTMLInputElement>('#lens-drag-scale')!;
const lensOptions = (): NavbarLensOptions => ({
  style: lensStyle.value as NavbarLensStyle,
  accent: customLensAccent.checked ? lensAccent.value : undefined,
  blur: lensBlur.valueAsNumber,
  // Each slider keeps the original ratio of horizontal to vertical growth.
  pressScale: [lensPressScale.valueAsNumber, 1 + (lensPressScale.valueAsNumber - 1) * .05 / .08],
  dragScale: [lensDragScale.valueAsNumber, 1 + (lensDragScale.valueAsNumber - 1) * .38 / .22],
});
const pin = document.querySelector<HTMLButtonElement>('#top-visibility')!;
const paths = {
  filter: 'M4 7h16M7 12h10m-7 5h4',
  star: 'm12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.4l6.1-.9z',
  library: 'M4 5h4v14H4zm6 0h4v14h-4zm6 1 3-1 4 13-3 1z',
  grid: 'M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z',
  top: 'M12 20V5m-5 5 5-5 5 5',
} as const;

let packages = false;
let pinned = false;
let top: NavbarItem;

function item(key: string, label: string, icon: keyof typeof paths): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.navbarKey = key;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('data-navbar-icon', '');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', paths[icon]);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.65');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  const text = document.createElement('span');
  text.dataset.navbarLabel = '';
  text.textContent = label;
  button.append(svg, text);
  return button;
}

function section(row: number, ...buttons: HTMLButtonElement[]): HTMLElement {
  const group = document.createElement('div');
  group.dataset.navbarSection = '';
  group.dataset.navbarRow = String(row);
  group.append(...buttons);
  return group;
}

function build(): HTMLElement {
  const replacement = document.createElement('nav');
  const filters = section(1, ...['All', 'TypeScript', 'Python', 'Rust'].map((label) => item(label.toLowerCase(), label, 'filter')));
  filters.dataset.navbarMaxVisible = '3';
  const presets = section(2, item('recent', 'Recent', 'star'), item('favorites', 'Favorites', 'star'));
  presets.dataset.navbarEqual = '';
  const libraries = item('libraries', 'Libraries', 'library');
  const secondary = packages ? item('packages', 'Packages', 'grid') : item('activity', 'Activity', 'grid');
  (packages ? secondary : libraries).setAttribute('aria-current', 'page');
  libraries.dataset.navbarOverflow = 'never';
  secondary.dataset.navbarOverflow = 'never';
  const about = item('about', 'About', 'grid');
  const up = item('top', 'Top', 'top');
  up.dataset.navbarAction = '';
  up.dataset.navbarOverflow = 'never';
  up.hidden = !pinned && scrollY < 240;
  replacement.append(filters, presets, section(3, libraries, secondary, about, up));
  return replacement;
}

function render(label: string): void {
  status.textContent = label;
  entries.replaceChildren(...Array.from({ length: 24 }, (_, index) => {
    const entry = document.createElement('li');
    const name = document.createElement('strong');
    name.textContent = `${label} ${index + 1}`;
    const details = document.createElement('small');
    details.textContent = ['TypeScript', 'Python', 'Rust'][index % 3];
    entry.append(name, details);
    return entry;
  }));
}

nav.append(...build().children);
top = nav.querySelector<NavbarItem>('[data-navbar-key="top"]')!;
const bar = mountLiquidGlassNavbar(nav, {
  layout: 'rows',
  collapsible: { rows: [1, 2], initial: localStorage.getItem('navbar-demo-collapsed') === 'true' ? 'collapsed' : 'open' },
  onCollapse: (collapsed) => localStorage.setItem('navbar-demo-collapsed', String(collapsed)),
  onResize: ({ height }) => root.style.setProperty('--catalog-space', `${height}px`),
  overflow: { maxVisible: { 0: 8, 900: 12 }, moreLabel: false },
  lens: lensOptions(),
  colors: { selected: 'color-mix(in srgb, var(--accent) 75%, var(--text))' },
  scrollCompact: { threshold: 24 },
  contrast: { halo: false, glow: false },
  animations: true,
  magnify: true,
  onSelect: (button) => render(button.getAttribute('aria-label') ?? button.textContent ?? ''),
  onAction: () => scrollTo({ top: 0, behavior: 'instant' }),
});

function updateTop(): void {
  bar.setItemHidden(top, !pinned && scrollY < 240);
}
addEventListener('scroll', updateTop, { passive: true });
pin.addEventListener('click', () => {
  pinned = !pinned;
  pin.setAttribute('aria-pressed', String(pinned));
  updateTop();
});
document.querySelector('#replace')!.addEventListener('click', () => {
  packages = !packages;
  bar.update(build());
  top = nav.querySelector<NavbarItem>('[data-navbar-key="top"]') ?? bar.overflowItems.find((item) => item.dataset.navbarKey === 'top')!;
  render(packages ? 'Packages' : 'Libraries');
});
const darkScheme = matchMedia('(prefers-color-scheme: dark)');
function applyTheme(): void {
  root.dataset.theme = theme.value;
  const dark = theme.value === 'system' ? darkScheme.matches : theme.value === 'dark';
  document.querySelector('.catalog')!.setAttribute('data-navbar-backdrop', dark ? 'dark busy' : 'light busy');
  bar.refreshColors();
  bar.sync();
}
theme.addEventListener('change', applyTheme);
darkScheme.addEventListener('change', applyTheme);
applyTheme();
document.querySelector<HTMLInputElement>('#accent')!.addEventListener('input', (event) => {
  root.style.setProperty('--accent', (event.currentTarget as HTMLInputElement).value);
  bar.refreshColors();
});
for (const slider of [lensBlur, lensPressScale, lensDragScale]) {
  slider.addEventListener('input', () => {
    const output = document.querySelector<HTMLOutputElement>(`output[for="${slider.id}"]`)!;
    output.value = slider.value + (slider === lensBlur ? ' px' : '×');
    bar.setLens(lensOptions());
  });
}
lensStyle.addEventListener('change', () => bar.setLens(lensOptions()));
lensAccent.addEventListener('input', () => bar.setLens(lensOptions()));
customLensAccent.addEventListener('change', () => {
  lensAccent.disabled = !customLensAccent.checked;
  bar.setLens(lensOptions());
});
effects.addEventListener('change', () => bar.setContrast({ halo: effects.checked, glow: effects.checked }));
render('Libraries');
