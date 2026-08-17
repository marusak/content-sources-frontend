const DRAWER_MAIN_SELECTOR = '.pf-v6-c-drawer__main';
const DRAWER_CONTENT_SELECTOR = '.pf-v6-c-drawer__content';
const PAGE_SELECTOR = '.pf-v6-c-page';
export const MAIN_CONTAINER_SELECTOR = '.pf-v6-c-page__main-container';
export const PORTAL_CLASS_NAME = 'lightwell-subnav-portal';

export type SubnavPortalInsertionPoint = {
  parent: HTMLElement;
  before: HTMLElement;
};

/**
 * Resolves where to insert the subnav portal relative to Chrome's Page/Drawer shell.
 *
 * Chrome (stage) layout — panel is a sibling between drawer__content and
 * page__main-container under drawer__main:
 *
 *   drawer__main
 *     drawer__content
 *     [portal]
 *     page__main-container
 *
 * PatternFly Page with notification drawer — main-container may be nested inside
 * drawer__content; portal goes inside drawer__content before the block that wraps main.
 *
 * Page without drawer — portal goes inside pf-v6-c-page before the block that wraps main.
 */
export function findSubnavPortalInsertionPoint(
  mainContainer: HTMLElement,
): SubnavPortalInsertionPoint | null {
  const drawerMain = mainContainer.closest<HTMLElement>(DRAWER_MAIN_SELECTOR);

  // Chrome: main-container is a direct child of drawer__main (sibling of drawer__content).
  if (drawerMain && mainContainer.parentElement === drawerMain) {
    return { parent: drawerMain, before: mainContainer };
  }

  const drawerContent = mainContainer.closest<HTMLElement>(DRAWER_CONTENT_SELECTOR);
  if (drawerContent) {
    return {
      parent: drawerContent,
      before: topLevelDescendant(drawerContent, mainContainer),
    };
  }

  const page = mainContainer.closest<HTMLElement>(PAGE_SELECTOR);
  if (page) {
    return {
      parent: page,
      before: topLevelDescendant(page, mainContainer),
    };
  }

  return null;
}

function topLevelDescendant(ancestor: HTMLElement, descendant: HTMLElement): HTMLElement {
  let target: HTMLElement = descendant;
  while (target.parentElement && target.parentElement !== ancestor) {
    target = target.parentElement;
  }
  return target;
}

export function insertSubnavPortalContainer(
  mainContainer: HTMLElement,
): HTMLDivElement | null {
  const insertion = findSubnavPortalInsertionPoint(mainContainer);
  if (!insertion) {
    return null;
  }

  const el = document.createElement('div');
  el.className = PORTAL_CLASS_NAME;
  insertion.parent.insertBefore(el, insertion.before);
  return el;
}

export function findPageMainContainer(root: ParentNode = document): HTMLElement | null {
  return root.querySelector<HTMLElement>(MAIN_CONTAINER_SELECTOR);
}
