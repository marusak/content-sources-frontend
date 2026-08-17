import {
  findSubnavPortalInsertionPoint,
  insertSubnavPortalContainer,
  MAIN_CONTAINER_SELECTOR,
  PORTAL_CLASS_NAME,
} from './subnavPortalInsertion';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('findSubnavPortalInsertionPoint', () => {
  it('targets drawer__main when main-container is a sibling of drawer__content (Chrome stage layout)', () => {
    document.body.innerHTML = `
      <div class="pf-v6-c-drawer__main">
        <div class="pf-v6-c-drawer__content"></div>
        <div class="pf-v6-c-page__main-container"></div>
      </div>
    `;
    const drawerMain = document.querySelector('.pf-v6-c-drawer__main') as HTMLElement;
    const mainContainer = document.querySelector(MAIN_CONTAINER_SELECTOR) as HTMLElement;

    expect(findSubnavPortalInsertionPoint(mainContainer)).toEqual({
      parent: drawerMain,
      before: mainContainer,
    });
  });

  it('targets drawer__content when main-container is nested inside it', () => {
    document.body.innerHTML = `
      <div class="pf-v6-c-drawer__content">
        <div class="some-wrapper">
          <div class="pf-v6-c-page__main-container"></div>
        </div>
      </div>
    `;
    const drawerContent = document.querySelector('.pf-v6-c-drawer__content') as HTMLElement;
    const wrapper = document.querySelector('.some-wrapper') as HTMLElement;
    const mainContainer = document.querySelector(MAIN_CONTAINER_SELECTOR) as HTMLElement;

    expect(findSubnavPortalInsertionPoint(mainContainer)).toEqual({
      parent: drawerContent,
      before: wrapper,
    });
  });

  it('targets pf-v6-c-page when main-container is not inside a drawer', () => {
    document.body.innerHTML = `
      <div class="pf-v6-c-page">
        <header class="pf-v6-c-masthead"></header>
        <div class="pf-v6-c-page__main-container"></div>
      </div>
    `;
    const page = document.querySelector('.pf-v6-c-page') as HTMLElement;
    const mainContainer = document.querySelector(MAIN_CONTAINER_SELECTOR) as HTMLElement;

    expect(findSubnavPortalInsertionPoint(mainContainer)).toEqual({
      parent: page,
      before: mainContainer,
    });
  });
});

describe('insertSubnavPortalContainer', () => {
  it('inserts portal between drawer__content and page__main-container under drawer__main', () => {
    document.body.innerHTML = `
      <div class="pf-v6-c-drawer__main">
        <div class="pf-v6-c-drawer__content"></div>
        <div class="pf-v6-c-page__main-container"></div>
      </div>
    `;
    const drawerMain = document.querySelector('.pf-v6-c-drawer__main') as HTMLElement;
    const drawerContent = document.querySelector('.pf-v6-c-drawer__content') as HTMLElement;
    const mainContainer = document.querySelector(MAIN_CONTAINER_SELECTOR) as HTMLElement;

    const portal = insertSubnavPortalContainer(mainContainer);

    expect(portal).not.toBeNull();
    expect(portal?.className).toBe(PORTAL_CLASS_NAME);
    expect(portal?.parentElement).toBe(drawerMain);
    expect(portal?.previousElementSibling).toBe(drawerContent);
    expect(portal?.nextElementSibling).toBe(mainContainer);
  });

  it('uses the drawer-content that contains page__main-container when multiple drawers exist', () => {
    document.body.innerHTML = `
      <div class="pf-v6-c-drawer__content">
        <div class="outer-chrome-drawer">no main container here</div>
      </div>
      <div class="pf-v6-c-drawer__content">
        <div class="pf-v6-c-page__main-container"></div>
      </div>
    `;
    const drawerContents = document.querySelectorAll('.pf-v6-c-drawer__content');
    const mainContainer = document.querySelector(MAIN_CONTAINER_SELECTOR) as HTMLElement;

    const portal = insertSubnavPortalContainer(mainContainer);

    expect(portal?.parentElement).toBe(drawerContents[1]);
    expect(portal?.nextElementSibling).toBe(mainContainer);
  });
});
