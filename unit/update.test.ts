// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { defaultKey, findKeyedMatch } from '../src/update.js';

const html = (markup: string): HTMLElement => {
  const host = document.createElement('div');
  host.innerHTML = markup;
  return host.firstElementChild as HTMLElement;
};

describe('defaultKey', () => {
  it('prefers data-navbar-key, then id, then a section row, then href', () => {
    expect(defaultKey(html('<a data-navbar-key="k" id="i" href="/x"></a>'))).toBe('key:k');
    expect(defaultKey(html('<a id="i" href="/x"></a>'))).toBe('id:i');
    expect(defaultKey(html('<div data-navbar-section data-navbar-row="2"></div>'))).toBe('row:2');
    expect(defaultKey(html('<div data-navbar-row="2"></div>'))).toBeUndefined();
    expect(defaultKey(html('<a href="/x"></a>'))).toBe('href:/x');
    expect(defaultKey(html('<button></button>'))).toBeUndefined();
    expect(defaultKey(html('<button data-navbar-key=""></button>'))).toBe('key:');
  });
});

describe('findKeyedMatch', () => {
  const identify = (element: HTMLElement) => defaultKey(element);
  const sameMarkup = (node: HTMLElement, incoming: HTMLElement) => node.isEqualNode(incoming);

  it('matches the same node first', () => {
    const node = html('<button data-navbar-key="a"></button>');
    expect(findKeyedMatch([node], node, identify, sameMarkup)).toBe(node);
  });
  it('matches by key within the same tag only', () => {
    const button = html('<button data-navbar-key="a">Old</button>');
    const anchor = html('<a data-navbar-key="a" href="/a">Old</a>');
    expect(findKeyedMatch([anchor, button], html('<button data-navbar-key="a">New</button>'), identify, sameMarkup)).toBe(button);
    expect(findKeyedMatch([button], html('<button data-navbar-key="b"></button>'), identify, sameMarkup)).toBeUndefined();
  });
  it('matches unkeyed nodes by authored markup, never a keyed one', () => {
    const keyed = html('<button data-navbar-key="x">Same</button>');
    const plain = html('<button>Same</button>');
    expect(findKeyedMatch([keyed, plain], html('<button>Same</button>'), identify, sameMarkup)).toBe(plain);
    expect(findKeyedMatch([keyed, plain], html('<button>Other</button>'), identify, sameMarkup)).toBeUndefined();
  });
  it('uses a custom identity', () => {
    const node = html('<button data-id="7">A</button>');
    const custom = (element: HTMLElement) => element.dataset.id;
    expect(findKeyedMatch([node], html('<button data-id="7">B</button>'), custom, sameMarkup)).toBe(node);
  });
});
