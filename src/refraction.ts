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

function rimMap(width: number, height: number): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const image = context.createImageData(width, height);
  const radius = Math.min(width, height) / 2;
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

interface Mirror {
  clip: HTMLDivElement;
  view: HTMLDivElement;
  content: HTMLElement;
}

interface RefractionLayer {
  mirror: Mirror | undefined;
  filter: SVGFilterElement;
  width: number;
  height: number;
}

export function supportsBackdropRefraction(): boolean {
  // WebKit and Firefox can parse the syntax without rendering the SVG backdrop.
  return /Chrome\//.test(navigator.userAgent) && CSS.supports('backdrop-filter', 'url(#lg-navbar-test)');
}

export function mountRefraction(nav: HTMLElement, native: boolean, source?: HTMLElement) {
  const assets = svgElement('svg', { 'aria-hidden': 'true', class: 'lg-navbar__refraction-assets' });
  const layers = new Map<HTMLElement, RefractionLayer>();
  const reduced = matchMedia('(prefers-reduced-transparency: reduce)');
  const listeners = new AbortController();
  let transparency: number | undefined;
  let pending = 0;

  function copyContent(viewport: HTMLElement): HTMLElement {
    const content = viewport.cloneNode(true) as HTMLElement;
    content.querySelectorAll('script, iframe, object, embed, audio, video, dialog').forEach((element) => element.remove());
    content.querySelectorAll('[id], [name], [autofocus]').forEach((element) => {
      for (const attribute of ['id', 'name', 'autofocus']) element.removeAttribute(attribute);
    });
    for (const attribute of ['id', 'name', 'autofocus', 'tabindex']) content.removeAttribute(attribute);
    content.classList.add('lg-navbar__refraction-content');
    return content;
  }

  function createMirror(target: HTMLElement, viewport: HTMLElement): Mirror {
    const clip = document.createElement('div');
    clip.className = 'lg-navbar__refraction';
    clip.setAttribute('aria-hidden', 'true');
    clip.inert = true;
    clip.hidden = true;
    const view = document.createElement('div');
    view.className = 'lg-navbar__refraction-view';
    const content = copyContent(viewport);
    view.append(content);
    clip.append(view);
    target.append(clip);
    return { clip, view, content };
  }

  function createLayer(target: HTMLElement): RefractionLayer {
    const mirror = !native && source ? createMirror(target, source) : undefined;
    const id = `lg-navbar-refraction-${++filterSequence}`;
    const filter = svgElement('filter', {
      id, filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB',
    });
    assets.append(filter);
    observer.observe(target);
    return { mirror, filter, width: 0, height: 0 };
  }

  function paint(): void {
    pending = 0;
    const active = transparency === undefined ? !reduced.matches : transparency > 0;
    const viewport = native ? undefined : source;
    const sourceRect = viewport?.getBoundingClientRect();
    const style = viewport && getComputedStyle(viewport);
    const clarity = (transparency ?? 60) / 100;

    for (const [target, layer] of layers) {
      const { mirror } = layer;
      if (mirror) mirror.clip.hidden = !active;
      if (!active) {
        target.style.removeProperty(filterProperty);
        continue;
      }

      const rect = (mirror?.clip ?? target).getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (width < 8 || height < 8) continue;

      if (width !== layer.width || height !== layer.height) {
        const map = rimMap(width, height);
        if (!map) {
          if (mirror) mirror.clip.hidden = true;
          continue;
        }
        layer.width = width;
        layer.height = height;
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
      const filter = `url(#${layer.filter.id})`;
      if (native) target.style.setProperty(filterProperty, filter);
      if (mirror && viewport && sourceRect && style) {
        mirror.view.style.filter = filter;
        mirror.content.style.width = `${viewport.clientWidth}px`;
        mirror.content.style.height = `${viewport.clientHeight}px`;
        mirror.content.style.transform = `translate3d(${sourceRect.left + viewport.clientLeft - rect.left}px, ${sourceRect.top + viewport.clientTop - rect.top}px, 0)`;
        mirror.content.style.background = style.background;
        mirror.content.style.color = style.color;
        mirror.content.style.font = style.font;
        mirror.content.scrollTop = viewport.scrollTop;
        mirror.content.scrollLeft = viewport.scrollLeft;
      }
    }
  }

  function schedule(): void {
    if (!pending) pending = requestAnimationFrame(paint);
  }

  const observer = new ResizeObserver(schedule);
  const mutations = new MutationObserver(() => {
    if (!source) return;
    for (const { mirror } of layers.values()) {
      if (!mirror) continue;
      const content = copyContent(source);
      mirror.content.replaceWith(content);
      mirror.content = content;
    }
    schedule();
  });
  if (!native && source) {
    observer.observe(source);
    mutations.observe(source, { attributes: true, childList: true, characterData: true, subtree: true });
    window.addEventListener('scroll', schedule, { capture: true, passive: true, signal: listeners.signal });
    window.addEventListener('resize', schedule, { passive: true, signal: listeners.signal });
  }
  reduced.addEventListener('change', schedule, { signal: listeners.signal });
  nav.after(assets);

  function removeLayer(target: HTMLElement, layer: RefractionLayer): void {
    observer.unobserve(target);
    layer.mirror?.clip.remove();
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
      mutations.disconnect();
      cancelAnimationFrame(pending);
      for (const [target, layer] of layers) removeLayer(target, layer);
      assets.remove();
    },
  };
}
