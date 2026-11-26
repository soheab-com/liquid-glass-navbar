// Keeps a named navbar live during same-document View Transitions.
export function mountViewTransition(nav: HTMLElement, name: string | undefined): (() => void) | undefined {
  if (!name || name === 'none' || name === 'auto' || name === 'match-element' || !CSS.supports('view-transition-name', name)) return;
  const properties = ['view-transition-name', 'view-transition-class'];
  const previous = properties.map((property) => [nav.style.getPropertyValue(property), nav.style.getPropertyPriority(property)] as const);
  nav.style.setProperty('view-transition-name', name);
  nav.style.setProperty('view-transition-class', 'lg-navbar-live');
  // Name-based rules apply everywhere; some engines parse class selectors without matching them.
  const styles = document.createElement('style');
  {
    const selector = CSS.escape(name);
    styles.textContent = `
      ::view-transition-group(${selector}) { animation: none; }
      ::view-transition-image-pair(${selector}) { isolation: auto; }
      ::view-transition-old(${selector}) { display: none; }
      ::view-transition-new(${selector}) { animation: none; mix-blend-mode: normal; opacity: 1; }
    `;
    document.head.append(styles);
  }
  return () => {
    styles.remove();
    properties.forEach((property, index) => nav.style.setProperty(property, ...previous[index]!));
  };
}
