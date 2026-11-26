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

interface RimShape {
  rim: number;
  scale: number;
  /** Clear glass squeezes the bevel toward the edge; tinted glass folds content in from the inside. */
  bevel: boolean;
}

/** @internal Exported for unit tests. */
export function rimShape(radius: number, clear: boolean): RimShape {
  if (clear) {
    // A deep bevel (most of a pill's half-height) whose content is pulled out toward the edge, so the backdrop
    // smears along the outline: roads follow the corners and a bar turns into streaks, like iOS sheets and tab bars.
    const rim = Math.max(6, Math.min(48, radius * .95));
    return { rim, scale: Math.ceil(rim * 1.05), bevel: true };
  }
  // A band about a third of the surface deep bends like a thick lens and mirrors the content; the center stays clear.
  return { rim: Math.max(6, radius * .7), scale: Math.round(radius * 3), bevel: false };
}

/**
 * @internal The displacement map as RGBA pixels: red and green carry the x and y pull around 128, blue is 128 and
 * alpha 255. Exported for unit tests; `rimMap` turns it into an image.
 */
export function rimPixels(width: number, height: number, corner: number, clear: boolean): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  const radius = Math.max(4, Math.min(corner, width / 2, height / 2));
  const { rim, scale, bevel } = rimShape(radius, clear);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x + .5 - width / 2;
      const dy = y + .5 - height / 2;
      // Measure from the nearest point on the pill's centerline.
      const nx = Math.sign(dx) * Math.max(0, Math.abs(dx) - (width / 2 - radius));
      const ny = Math.sign(dy) * Math.max(0, Math.abs(dy) - (height / 2 - radius));
      const length = Math.hypot(nx, ny);
      // Pixels the backdrop is pulled outward along the outline's normal (negative pulls inward).
      let outward: number;
      if (bevel) {
        // Each pixel shows the backdrop from a flattened depth, so the whole bevel repeats a thin strip near the edge.
        const depth = Math.min(rim, Math.max(0, radius - length));
        outward = depth - rim * (depth / rim) ** 4;
      } else {
        const edge = Math.min(1, Math.max(0, (length - radius + rim) / rim));
        // Convex profile: flat inside, steep at the edge, so content folds over near the rim.
        outward = -(1 - Math.sqrt(1 - edge * edge)) * scale / 2;
      }
      const unit = outward * 255 / scale / (length || 1);
      const index = (y * width + x) * 4;
      data[index] = Math.min(255, Math.max(0, 128 + nx * unit));
      data[index + 1] = Math.min(255, Math.max(0, 128 + ny * unit));
      data[index + 2] = 128;
      data[index + 3] = 255;
    }
  }
  return data;
}

// Rim maps are pure functions of their size, corner and clearness. Bars, rows and More menus of the same size share
// one, and a bar that resizes back and forth (compact, collapse) reuses the earlier map instead of redrawing it.
const rimMaps = new Map<string, string>();
const RIM_MAP_CACHE_SIZE = 24;

function rimMap(width: number, height: number, corner: number, clear: boolean): string | null {
  const key = `${width}x${height}r${corner}${clear ? 'c' : 't'}`;
  const cached = rimMaps.get(key);
  if (cached) {
    // Most recently used last, so the oldest entry is evicted first.
    rimMaps.delete(key);
    rimMaps.set(key, cached);
    return cached;
  }
  const url = drawRimMap(width, height, corner, clear);
  if (url) {
    rimMaps.set(key, url);
    if (rimMaps.size > RIM_MAP_CACHE_SIZE) rimMaps.delete(rimMaps.keys().next().value!);
  }
  return url;
}

function drawRimMap(width: number, height: number, corner: number, clear: boolean): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const image = context.createImageData(width, height);
  image.data.set(rimPixels(width, height, corner, clear));
  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

const filterProperty = '--lg-nav-refraction-filter';
const blurProperty = '--lg-nav-blur';

interface RefractionLayer {
  filter: SVGFilterElement;
  /** Copy mode: the box inside the glass that clips to its shape and holds the bent copies. */
  copy?: HTMLElement;
  /** Bumped whenever the filter graph changes, because WebKit keeps serving cached output for an unchanged id. */
  version: number;
  /** Copy mode: an identical filter under a second id. Safari caches filter output and doesn't redraw it when the
   * copy inside moves, so every move switches to the other id. */
  twin?: SVGFilterElement;
  flipped?: boolean;
  width: number;
  height: number;
  radius: number;
  clear: boolean;
}

/** How the glass bends: the live backdrop, or a copy of the marked backdrop elements. */
export type RefractionMode = 'backdrop' | 'copy';

/**
 * Whether this engine draws SVG filters inside `backdrop-filter`. The only engine check in the package: it can't be
 * feature-detected, because WebKit and Gecko both report `CSS.supports('backdrop-filter', 'url(#id)')` and then
 * draw nothing (WebKit bug 245510, Gecko bug 1578503), and reading back rendered backdrop pixels isn't possible from
 * script. Only Blink renders them. `navigator.userAgentData` is a Blink-only API, so it is checked first; the
 * user-agent string covers Blink builds without it. iOS browsers are WebKit and don't send `Chrome/`.
 */
function rendersBackdropSvgFilters(): boolean {
  const data = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData;
  if (data?.brands?.some(({ brand }) => brand === 'Chromium')) return true;
  return /Chrome\//.test(navigator.userAgent);
}

export function refractionMode(): RefractionMode | undefined {
  // Blink bends the live backdrop through backdrop-filter. Every engine that renders SVG filters in plain `filter`
  // (WebKit and Gecko) bends a copy of the marked backdrop instead.
  if (CSS.supports('backdrop-filter', 'url(#lg-navbar-test)') && rendersBackdropSvgFilters()) return 'backdrop';
  if (CSS.supports('filter', 'url(#lg-navbar-test)')) return 'copy';
  return undefined;
}

/** Elements whose look the glass bends in copy mode. */
export type RefractionSources = string | (() => Iterable<Element>);

export function mountRefraction(nav: HTMLElement, mode: RefractionMode, chosen?: RefractionSources) {
  const sources = chosen ?? '[data-navbar-refract]';
  const assets = svgElement('svg', { 'aria-hidden': 'true', class: 'lg-navbar__refraction-assets' });
  const layers = new Map<HTMLElement, RefractionLayer>();
  const reduced = matchMedia('(prefers-reduced-transparency: reduce)');
  const listeners = new AbortController();
  let transparency: number | undefined;
  let pending = 0;

  function createLayer(target: HTMLElement): RefractionLayer {
    const id = `lg-navbar-refraction-${++filterSequence}`;
    // WebKit blanks the element with userSpaceOnUse filters, so copy mode works in bounding-box units.
    const units = mode === 'copy' ? 'objectBoundingBox' : 'userSpaceOnUse';
    const filter = svgElement('filter', { id, filterUnits: units, primitiveUnits: units, 'color-interpolation-filters': 'sRGB' });
    assets.append(filter);
    observer.observe(target);
    const layer: RefractionLayer = { filter, version: 0, width: 0, height: 0, radius: 0, clear: false };
    if (mode === 'copy') {
      layer.copy = document.createElement('span');
      layer.copy.className = 'lg-navbar__refraction-copy';
      layer.copy.setAttribute('aria-hidden', 'true');
      // The outer box clips to the glass shape, the middle one carries the bend, and the inner one clips the copies.
      // Safari sizes a bounding-box filter to everything inside the filtered element, clipped or not, so the
      // clipping has to happen below it or a tall copy stretches the bend into a zoom.
      const lens = document.createElement('span');
      lens.className = 'lg-navbar__refraction-lens';
      const frame = document.createElement('span');
      frame.className = 'lg-navbar__refraction-frame';
      lens.append(frame);
      layer.copy.append(lens);
      target.prepend(layer.copy);
      fillCopy(layer.copy);
    }
    return layer;
  }

  const opaque = (color: string) => Boolean(color) && color !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(color);

  /** The colour an element is painted on: its own background or its nearest ancestor's. */
  function backgroundBehind(element: Element): string {
    for (let node: Element | null = element; node; node = node.parentElement) {
      const color = getComputedStyle(node).backgroundColor;
      if (opaque(color)) return color;
    }
    return 'canvas';
  }

  function pinnedToViewport(element: Element): boolean {
    for (let node: Element | null = element; node; node = node.parentElement) {
      const position = getComputedStyle(node).position;
      if (position === 'fixed') return true;
      if (position === 'sticky') return false;
    }
    return false;
  }

  function sourceElements(): Element[] {
    const found = typeof sources === 'string' ? document.querySelectorAll(sources) : sources();
    // A copy of content that scrolls has to be moved from script, which trails iOS scrolling a little. Elements passed
    // in explicitly are taken as they are; the default lookup only takes scrolling content marked
    // data-navbar-refract="scroll". Fixed backdrops never need moving.
    return [...found].filter((element) => !nav.contains(element)
      && (chosen !== undefined || element.getAttribute('data-navbar-refract') === 'scroll' || pinnedToViewport(element)));
  }

  const lensOf = (copy: HTMLElement) => copy.firstElementChild as HTMLElement;
  const frameOf = (copy: HTMLElement) => lensOf(copy).firstElementChild as HTMLElement;

  function pointLens(layer: RefractionLayer): void {
    if (!layer.copy || !layer.version) return;
    const filter = layer.flipped && layer.twin ? layer.twin : layer.filter;
    lensOf(layer.copy).style.filter = `url(#${filter.id})`;
  }
  const clones = new Map<HTMLElement, [source: Element, clone: HTMLElement][]>();

  function fillCopy(copy: HTMLElement): void {
    const pairs: [Element, HTMLElement][] = [];
    for (const source of sourceElements()) {
      const clone = source.cloneNode(true) as HTMLElement;
      clone.removeAttribute('id');
      for (const element of clone.querySelectorAll('[id]')) element.removeAttribute('id');
      clone.inert = true;
      // The copy covers the real element inside the glass, so it gets the background it sits on; otherwise the unbent
      // original shows through between the copied letters.
      if (!opaque(getComputedStyle(source).backgroundColor)) clone.style.backgroundColor = backgroundBehind(source);
      pairs.push([source, clone]);
    }
    frameOf(copy).replaceChildren(...pairs.map(([, clone]) => clone));
    clones.set(copy, pairs);
  }

  // A scroll-driven animation would track iOS scrolling more closely, but Safari (iOS 27) then stops drawing the
  // filtered copy altogether, so the copy is moved straight from the scroll handler instead.

  function align(): void {
    aligning = 0;
    for (const [target, layer] of layers) {
      if (!layer.copy) continue;
      const box = target.getBoundingClientRect();
      layer.flipped = !layer.flipped;
      pointLens(layer);
      for (const [source, clone] of clones.get(layer.copy) ?? []) {
        const rect = source.getBoundingClientRect();
        const style = clone.style;
        // The filter makes the copy a containing block, so fixed sources are placed by hand like everything else.
        style.setProperty('position', 'absolute', 'important');
        style.setProperty('inset', 'auto', 'important');
        style.setProperty('margin', '0', 'important');
        style.setProperty('box-sizing', 'border-box', 'important');
        style.left = '0';
        style.top = '0';
        style.width = `${rect.width}px`;
        style.height = `${rect.height}px`;
        let x = rect.left - box.left;
        let y = rect.top - box.top;
        style.translate = `${x}px ${y}px`;
        // The copy is its own formatting context, so a child margin that collapsed through the source's edge on the
        // page stays inside the copy and shifts its content. Line the first child up again to undo that.
        const first = source.firstElementChild;
        const copied = clone.firstElementChild;
        if (first && copied) {
          const want = first.getBoundingClientRect();
          const got = copied.getBoundingClientRect();
          x += want.left - got.left;
          y += want.top - got.top;
          if (x !== rect.left - box.left || y !== rect.top - box.top) style.translate = `${x}px ${y}px`;
        }
      }
    }
  }

  let aligning = 0;
  function scheduleAlign(): void {
    if (!aligning) aligning = requestAnimationFrame(align);
  }

  function paint(): void {
    pending = 0;
    const active = transparency === undefined ? !reduced.matches : transparency > 0;
    const clear = transparency === 100;

    for (const [target, layer] of layers) {
      // Copy mode with nothing marked to copy has nothing to bend: keep the frosted glass rather than a sharp, flat one.
      if (!active || (layer.copy && !clones.get(layer.copy)?.length)) {
        target.style.removeProperty(filterProperty);
        target.style.removeProperty(blurProperty);
        if (layer.copy) lensOf(layer.copy).style.removeProperty('filter');
        continue;
      }

      const rect = target.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (width < 8 || height < 8) continue;

      // Pills use half their height; multi-row surfaces have smaller rounded corners.
      const radius = Math.round(Math.min(parseFloat(getComputedStyle(target).borderTopLeftRadius) || Infinity, width / 2, height / 2));
      if (width !== layer.width || height !== layer.height || radius !== layer.radius || clear !== layer.clear) {
        const map = rimMap(width, height, radius, clear);
        if (!map) continue;
        layer.width = width;
        layer.height = height;
        layer.radius = radius;
        layer.clear = clear;
        const scale = rimShape(radius, clear).scale;
        if (layer.copy) void buildCopyFilter(layer, map, width, height, scale);
        else {
          const pad = Math.ceil(radius * 1.7);
          for (const [name, value] of Object.entries({ x: -pad, y: -pad, width: width + 2 * pad, height: height + 2 * pad })) {
            layer.filter.setAttribute(name, String(value));
          }
          layer.filter.replaceChildren(
            svgElement('feImage', { href: map, x: 0, y: 0, width, height, preserveAspectRatio: 'none', result: 'rim' }),
            svgElement('feDisplacementMap', { in: 'SourceGraphic', in2: 'rim', xChannelSelector: 'R', yChannelSelector: 'G', scale }),
          );
        }
      }

      if (!layer.copy) target.style.setProperty(filterProperty, `url(#${layer.filter.id})`);
      else pointLens(layer);
      // Bent glass stays sharp; frosting would smear the lens away.
      target.style.setProperty(blurProperty, '0px');
    }
  }

  function hasOwnContent(element: Element): boolean {
    if (element instanceof HTMLImageElement || element instanceof HTMLVideoElement || element instanceof HTMLCanvasElement
      || element instanceof SVGSVGElement || element instanceof HTMLIFrameElement) return true;
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) return true;
    }
    return getComputedStyle(element).backgroundImage !== 'none';
  }

  type Rgb = readonly [number, number, number];
  const imageColors = new Map<string, Rgb | null | Promise<void>>();

  /** The average colour of an image, worked out once from an 8×8 downscale. Undefined until it has loaded. */
  function imageColor(url: string): Rgb | null | undefined {
    const known = imageColors.get(url);
    if (known === undefined) {
      const image = new Image();
      if (new URL(url, location.href).origin !== location.origin) image.crossOrigin = 'anonymous';
      image.src = url;
      imageColors.set(url, image.decode().then(() => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 8;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('no canvas');
        context.drawImage(image, 0, 0, 8, 8);
        const data = context.getImageData(0, 0, 8, 8).data;
        let r = 0, g = 0, b = 0, weight = 0;
        for (let k = 0; k < data.length; k += 4) {
          const a = data[k + 3]! / 255;
          r += data[k]! * a; g += data[k + 1]! * a; b += data[k + 2]! * a; weight += a;
        }
        imageColors.set(url, weight ? [r / weight, g / weight, b / weight] : null);
        scheduleCheck();
      }).catch(() => { imageColors.set(url, null); }));
      return undefined;
    }
    return known instanceof Promise ? undefined : known;
  }

  /** The image an element shows: an <img>'s source, or its first CSS background image. */
  function imageOf(element: Element): string | undefined {
    if (element instanceof HTMLImageElement) return element.currentSrc || element.src || undefined;
    const match = /url\(["']?([^"')]+)["']?\)/.exec(getComputedStyle(element).backgroundImage);
    return match?.[1];
  }

  /** What sits behind this glass, sampled on a grid across its box: whether there is any content, and the average
   * colour of the images among it. */
  function behind(target: HTMLElement): { busy: boolean; color?: Rgb } {
    const box = target.getBoundingClientRect();
    if (!box.width || !box.height) return { busy: false };
    let busy = false;
    let r = 0, g = 0, b = 0, hits = 0;
    for (const fy of [.2, .5, .8]) {
      for (let i = 0; i < 7; i++) {
        const x = box.left + box.width * (i + .5) / 7;
        const y = box.top + box.height * fy;
        for (const element of document.elementsFromPoint(x, y)) {
          if (nav.contains(element) || element === document.documentElement || element === document.body) continue;
          if (!hasOwnContent(element)) continue;
          busy = true;
          const url = imageOf(element);
          const color = url ? imageColor(url) : undefined;
          if (color) { r += color[0]; g += color[1]; b += color[2]; hits++; }
          break;
        }
      }
    }
    // Only tint the edge when images cover a fair part of the glass, not when one corner grazes one.
    return hits >= 5 ? { busy, color: [r / hits, g / hits, b / hits] } : { busy };
  }

  const mix = (color: Rgb, toward: number, amount: number) => color.map((c) => Math.round(c + (toward - c) * amount)).join(' ');

  let checking = 0;
  function checkBehind(): void {
    checking = 0;
    for (const target of layers.keys()) {
      const { busy, color } = behind(target);
      target.classList.toggle('lg-navbar__glass--busy', busy);
      // Over images the rim, the top highlight and the shadow take the image's colour, like iOS glass picking up
      // what's under it.
      if (color) {
        target.style.setProperty('--lg-nav-rim', `rgb(${mix(color, 255, .45)} / .8)`);
        target.style.setProperty('--lg-nav-highlight', `rgb(${mix(color, 255, .7)} / .95)`);
        target.style.setProperty('--lg-nav-shadow', `rgb(${mix(color, 0, .35)} / .38)`);
      } else {
        for (const name of ['--lg-nav-rim', '--lg-nav-highlight', '--lg-nav-shadow']) target.style.removeProperty(name);
      }
    }
  }
  function scheduleCheck(): void {
    if (!checking) checking = requestAnimationFrame(checkBehind);
  }

  // While the page is hidden nothing is drawn, so skip the work and catch up once it is visible again.
  let stale = false;
  function schedule(): void {
    if (document.hidden) { stale = true; return; }
    if (!pending) pending = requestAnimationFrame(paint);
    scheduleAlign();
    scheduleCheck();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(pending); cancelAnimationFrame(aligning); cancelAnimationFrame(checking);
      if (pending || aligning || checking) stale = true;
      pending = aligning = checking = 0;
    } else if (stale) {
      stale = false;
      schedule();
    }
  }, { signal: listeners.signal });

  async function buildCopyFilter(layer: RefractionLayer, map: string, width: number, height: number, scale: number): Promise<void> {
    // feImage loads data URLs asynchronously and WebKit caches whatever the filter drew while the map was missing,
    // so decode the map first.
    const image = new Image();
    image.src = map;
    try { await image.decode(); } catch { return; }
    if (layer.width !== width || layer.height !== height || !layer.copy) return;
    // In bounding-box units the displacement scales with each side, so the scale is given per the shorter side and
    // the longer axis is squeezed to match: the bend comes out the same number of pixels both ways.
    const short = Math.min(width, height);
    const kx = short / width;
    const ky = short / height;
    for (const [name, value] of Object.entries({ x: 0, y: 0, width: 1, height: 1 })) layer.filter.setAttribute(name, String(value));
    layer.filter.replaceChildren(
      svgElement('feImage', { href: map, x: 0, y: 0, width: 1, height: 1, preserveAspectRatio: 'none', result: 'raw' }),
      svgElement('feColorMatrix', {
        in: 'raw', type: 'matrix', result: 'rim',
        values: `${kx} 0 0 0 ${(1 - kx) / 2} 0 ${ky} 0 0 ${(1 - ky) / 2} 0 0 1 0 0 0 0 0 1 0`,
      }),
      svgElement('feDisplacementMap', { in: 'SourceGraphic', in2: 'rim', xChannelSelector: 'R', yChannelSelector: 'G', scale: scale / short }),
    );
    layer.filter.id = `${layer.filter.id.replace(/-v\d+$/, '')}-v${++layer.version}`;
    layer.twin?.remove();
    layer.twin = layer.filter.cloneNode(true) as SVGFilterElement;
    layer.twin.id = `${layer.filter.id}-b`;
    layer.filter.after(layer.twin);
    const apply = () => pointLens(layer);
    apply();
    // WebKit doesn't repaint when the map finishes loading inside the filter; point at it again once it has.
    setTimeout(apply, 60);
    setTimeout(apply, 250);
  }

  const observer = new ResizeObserver(schedule);
  reduced.addEventListener('change', schedule, { signal: listeners.signal });
  // Items only get a readability halo while something is actually behind them.
  addEventListener('scroll', scheduleCheck, { capture: true, passive: true, signal: listeners.signal });
  if (mode === 'copy') {
    // Follow scrolling in the scroll event itself rather than a frame later, so the copy trails the page as little
    // as Safari allows.
    addEventListener('scroll', align, { capture: true, passive: true, signal: listeners.signal });
    // Content growing or shrinking changes where things sit and how far the page scrolls.
    observer.observe(document.documentElement);
    addEventListener('resize', scheduleAlign, { passive: true, signal: listeners.signal });
  }
  nav.after(assets);

  function removeLayer(target: HTMLElement, layer: RefractionLayer): void {
    observer.unobserve(target);
    layer.filter.remove();
    layer.twin?.remove();
    target.style.removeProperty(filterProperty);
    target.style.removeProperty(blurProperty);
    target.classList.remove('lg-navbar__glass--busy');
    for (const name of ['--lg-nav-rim', '--lg-nav-highlight', '--lg-nav-shadow']) target.style.removeProperty(name);
    if (layer.copy) {
      clones.delete(layer.copy);
      layer.copy.remove();
    }
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
    /** Copy the source elements again, after their content changed. */
    refreshSources(): void {
      for (const layer of layers.values()) if (layer.copy) fillCopy(layer.copy);
      // Sources appearing or disappearing switch between bent and frosted glass.
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
      cancelAnimationFrame(aligning);
      cancelAnimationFrame(checking);
      for (const [target, layer] of layers) removeLayer(target, layer);
      assets.remove();
    },
  };
}
