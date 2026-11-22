const svgNamespace = 'http://www.w3.org/2000/svg';
let filterSequence = 0;

function svgElement<K extends keyof SVGElementTagNameMap>(
  name: K,
  attributes: Record<string, number | string>,
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(svgNamespace, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function rimMap(width: number, height: number, corner: number): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const image = context.createImageData(width, height);
  const radius = Math.max(4, Math.min(corner, width / 2, height / 2));
  const rim = Math.min(22, radius * .6);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x + .5 - width / 2;
      const dy = y + .5 - height / 2;
      // Measure from the nearest point on the pill's centerline.
      const nx = Math.sign(dx) * Math.max(0, Math.abs(dx) - (width / 2 - radius));
      const ny = Math.sign(dy) * Math.max(0, Math.abs(dy) - (height / 2 - radius));
      const length = Math.hypot(nx, ny);
      const edge = Math.min(1, Math.max(0, (length - radius + rim) / rim));
      const strength = edge * edge * (3 - 2 * edge);
      const index = (y * width + x) * 4;
      image.data[index] = 128 - nx / (length || 1) * strength * 127;
      image.data[index + 1] = 128 - ny / (length || 1) * strength * 127;
      image.data[index + 2] = 128;
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

const filterProperty = '--lg-nav-refraction-filter';

interface RefractionLayer {
  filter: SVGFilterElement;
  width: number;
  height: number;
  radius: number;
}

export function supportsBackdropRefraction(): boolean {
  // WebKit and Firefox can parse the syntax without rendering the SVG backdrop.
  return /Chrome\//.test(navigator.userAgent) && CSS.supports('backdrop-filter', 'url(#lg-navbar-test)');
}

export function mountRefraction(nav: HTMLElement) {
  const assets = svgElement('svg', { 'aria-hidden': 'true', class: 'lg-navbar__refraction-assets' });
  const layers = new Map<HTMLElement, RefractionLayer>();
  const reduced = matchMedia('(prefers-reduced-transparency: reduce)');
  const listeners = new AbortController();
  let transparency: number | undefined;
  let pending = 0;

  function createLayer(target: HTMLElement): RefractionLayer {
    const id = `lg-navbar-refraction-${++filterSequence}`;
    const filter = svgElement('filter', {
      id, filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB',
    });
    assets.append(filter);
    observer.observe(target);
    return { filter, width: 0, height: 0, radius: 0 };
  }

  function paint(): void {
    pending = 0;
    const active = transparency === undefined ? !reduced.matches : transparency > 0;
    const clarity = (transparency ?? 60) / 100;

    for (const [target, layer] of layers) {
      if (!active) {
        target.style.removeProperty(filterProperty);
        continue;
      }

      const rect = target.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (width < 8 || height < 8) continue;

      // Pills use half their height; multi-row surfaces have smaller rounded corners.
      const radius = Math.round(Math.min(parseFloat(getComputedStyle(target).borderTopLeftRadius) || Infinity, width / 2, height / 2));
      if (width !== layer.width || height !== layer.height || radius !== layer.radius) {
        const map = rimMap(width, height, radius);
        if (!map) continue;
        layer.width = width;
        layer.height = height;
        layer.radius = radius;
        const pad = 20;
        for (const [name, value] of Object.entries({ x: -pad, y: -pad, width: width + 2 * pad, height: height + 2 * pad })) {
          layer.filter.setAttribute(name, String(value));
        }
        layer.filter.replaceChildren(
          svgElement('feImage', { href: map, x: 0, y: 0, width, height, preserveAspectRatio: 'none', result: 'rim' }),
          svgElement('feDisplacementMap', { in: 'SourceGraphic', in2: 'rim', xChannelSelector: 'R', yChannelSelector: 'G' }),
        );
      }

      const scale = String(Math.min(18, Math.max(6, Math.min(width, height) * .31)) * clarity);
      const displacement = layer.filter.lastElementChild;
      if (displacement?.getAttribute('scale') !== scale) displacement?.setAttribute('scale', scale);
      target.style.setProperty(filterProperty, `url(#${layer.filter.id})`);
    }
  }

  function schedule(): void {
    if (!pending) pending = requestAnimationFrame(paint);
  }

  const observer = new ResizeObserver(schedule);
  reduced.addEventListener('change', schedule, { signal: listeners.signal });
  nav.after(assets);

  function removeLayer(target: HTMLElement, layer: RefractionLayer): void {
    observer.unobserve(target);
    layer.filter.remove();
    target.style.removeProperty(filterProperty);
    layers.delete(target);
  }

  return {
    sync(targets: readonly HTMLElement[]): void {
      for (const [target, layer] of layers) {
        if (!targets.includes(target)) removeLayer(target, layer);
      }
      for (const target of targets) {
        if (!layers.has(target)) layers.set(target, createLayer(target));
      }
      schedule();
    },
    setTransparency(value?: number): void {
      transparency = value;
      schedule();
    },
    destroy(): void {
      listeners.abort();
      observer.disconnect();
      cancelAnimationFrame(pending);
      for (const [target, layer] of layers) removeLayer(target, layer);
      assets.remove();
    },
  };
}
