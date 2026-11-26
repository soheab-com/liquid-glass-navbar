import { mountLiquidGlassNavbar, type LiquidGlassNavbar, type NavbarPosition, type EqualWidthOverflow, type NavbarColors } from '../src/index.js';

interface ExampleItem {
  name: string;
  path?: string;
  action?: boolean;
  label?: boolean;
}

const examples: ExampleItem[] = [
  { name: 'Overview', path: 'M3 10 12 3l9 7v10h-6v-6H9v6H3z' },
  { name: 'Schedule', path: 'M5 4h14v16H5zM5 9h14M9 2v4m6-4v4' },
  { name: 'Map', path: 'M12 21s-6-6-6-11a6 6 0 1 1 12 0c0 5-6 11-6 11z M12 8v4m-2-2h4' },
  { name: 'Help', action: true },
  { name: 'Search', label: false, path: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm5-2 4 4', action: true },
];

const nav = document.querySelector<HTMLElement>('#example-navbar')!;
const caption = document.querySelector<HTMLElement>('#caption')!;
const status = document.querySelector<HTMLElement>('#status')!;
const position = document.querySelector<HTMLSelectElement>('#position')!;
const background = document.querySelector<HTMLSelectElement>('#background')!;
const transparency = document.querySelector<HTMLInputElement>('#transparency')!;
const colors = document.querySelector<HTMLSelectElement>('#colors')!;
const COLOR_PRESETS: Record<string, NavbarColors | undefined> = {
  orange: { selected: '#e8590c' },
  'two-tone': { selected: '#7048e8', selectedLabel: '#1c7ed6', unselectedIcon: '#868e96' },
};
const transparencyValue = document.querySelector<HTMLOutputElement>('#transparency-value')!;
const groups = document.querySelector<HTMLInputElement>('#groups')!;
const labels = document.querySelector<HTMLInputElement>('#labels')!;
const equal = document.querySelector<HTMLInputElement>('#equal')!;
const equalOverflow = document.querySelector<HTMLSelectElement>('#equal-overflow')!;
const mapIcon = document.querySelector<HTMLInputElement>('#map-icon')!;
const mapLabel = document.querySelector<HTMLInputElement>('#map-label')!;
const reorderMode = document.querySelector<HTMLInputElement>('#reorder')!;

const parameters = new URLSearchParams(location.search);
const positions: NavbarPosition[] = ['top', 'bottom', 'left', 'right'];
const requestedPosition = parameters.get('position');
position.value = positions.find((edge) => edge === requestedPosition) ?? 'bottom';
groups.checked = parameters.get('groups') !== 'off';
labels.checked = parameters.get('labels') !== 'off';
equal.checked = parameters.has('equal');
equalOverflow.value = ['truncate', 'grow'].includes(parameters.get('equal') ?? '') ? parameters.get('equal')! : 'natural';
mapIcon.checked = parameters.get('mapIcon') !== 'off';
mapLabel.checked = parameters.get('mapLabel') !== 'off';
reorderMode.checked = parameters.has('reorder');
document.body.classList.toggle('dark', parameters.has('dark'));
document.body.classList.toggle('preview', parameters.has('preview'));
const requestedTint = parameters.get('tint');
if (requestedTint !== null) transparency.value = requestedTint;
const requestedBackground = parameters.get('background');
if (requestedBackground === 'solid') background.selectedIndex = 1;
if (requestedBackground === 'gradient') background.selectedIndex = 2;
caption.textContent = parameters.get('caption') ?? 'Try placement, sections, labels, tint, and reorder mode.';

function makeButton({ name, path, action, label: hasLabel = true }: ExampleItem): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.name = name;
  if (action) button.setAttribute('data-navbar-action', '');
  if (name === 'Overview') button.setAttribute('aria-current', 'page');
  if (path) {
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    icon.setAttribute('data-navbar-icon', '');
    const drawing = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    drawing.setAttribute('d', path);
    icon.append(drawing);
    button.append(icon);
  }
  if (hasLabel) {
    const label = document.createElement('span');
    label.setAttribute('data-navbar-label', '');
    label.textContent = name;
    button.append(label);
  } else button.setAttribute('aria-label', name);
  return button;
}

const buttons = examples.map(makeButton);
const mapButton = buttons[2];
const primary = document.createElement('div');
const actions = document.createElement('div');
for (const section of [primary, actions]) section.setAttribute('data-navbar-section', '');
let navbar: LiquidGlassNavbar | undefined;

function mount(): void {
  navbar?.destroy();
  buttons[3].hidden = !labels.checked || parameters.has('searchOnly');
  if (groups.checked) {
    primary.replaceChildren(...buttons.slice(0, 3));
    actions.replaceChildren(...buttons.slice(3));
    nav.replaceChildren(primary, actions);
  } else {
    nav.replaceChildren(...buttons);
  }
  const edge = positions.find((choice) => choice === position.value);
  const palette = COLOR_PRESETS[colors.value];
  navbar = mountLiquidGlassNavbar(nav, {
    ...(edge ? { position: edge } : {}),
    labels: labels.checked,
    equalWidth: equal.checked,
    equalWidthOverflow: equalOverflow.value as EqualWidthOverflow,
    ...(background.value ? { background: background.value } : {}),
    transparency: Number(transparency.value),
    ...(palette ? { colors: palette } : {}),
    reorderable: true,
    onSelect(button) {
      status.textContent = `Selected ${button.dataset.name}.`;
    },
    onAction(button) {
      status.textContent = `Opened ${button.dataset.name}.`;
    },
    onReorder(order) {
      status.textContent = order.map((button) => button.dataset.name).join(' · ');
    },
  });
  navbar.setItemVisibility(mapButton, { icon: mapIcon.checked, label: mapLabel.checked });
  navbar.setReorderMode(reorderMode.checked);
  transparencyValue.value = `${transparency.value}%`;
}

position.addEventListener('change', () => navbar?.setPosition(positions.find((edge) => edge === position.value)));
groups.addEventListener('change', mount);
labels.addEventListener('change', () => {
  navbar?.setLabels(labels.checked);
  buttons[3].hidden = !labels.checked || parameters.has('searchOnly');
  navbar?.sync();
});
const applyEqual = () => navbar?.setEqualWidth(equal.checked, equalOverflow.value as EqualWidthOverflow);
equal.addEventListener('change', applyEqual);
equalOverflow.addEventListener('change', applyEqual);
mapIcon.addEventListener('change', () => navbar?.setItemVisibility(mapButton, { icon: mapIcon.checked }));
mapLabel.addEventListener('change', () => navbar?.setItemVisibility(mapButton, { label: mapLabel.checked }));
colors.addEventListener('change', () => navbar?.setColors(COLOR_PRESETS[colors.value]));
background.addEventListener('change', () => navbar?.setBackground(background.value || undefined));
transparency.addEventListener('input', () => {
  navbar?.setTransparency(Number(transparency.value));
  transparencyValue.value = `${transparency.value}%`;
});
reorderMode.addEventListener('change', () => navbar?.setReorderMode(reorderMode.checked));
document.querySelector('#reverse')?.addEventListener('click', () => {
  const section = groups.checked ? primary : nav;
  const order = [...section.querySelectorAll<HTMLButtonElement>(':scope > button')];
  navbar?.reorder(order.reverse());
});
mount();
