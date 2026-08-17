import { renderHook, waitFor } from '@testing-library/react';
import { useDrawerContentSubnavPortal } from './useDrawerContentSubnavPortal';
import { PORTAL_CLASS_NAME } from './subnavPortalInsertion';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useDrawerContentSubnavPortal', () => {
  it('inserts portal under drawer__main for Chrome stage layout', () => {
    document.body.innerHTML = `
      <div class="pf-v6-c-drawer__main">
        <div class="pf-v6-c-drawer__content"></div>
        <div class="pf-v6-c-page__main-container"></div>
      </div>
    `;
    const drawerMain = document.querySelector('.pf-v6-c-drawer__main') as HTMLElement;
    const drawerContent = document.querySelector('.pf-v6-c-drawer__content') as HTMLElement;
    const mainContainer = document.querySelector('.pf-v6-c-page__main-container') as HTMLElement;

    const { result } = renderHook(() => useDrawerContentSubnavPortal());

    expect(result.current).not.toBeNull();
    expect(result.current?.parentElement).toBe(drawerMain);
    expect(result.current?.previousElementSibling).toBe(drawerContent);
    expect(result.current?.nextElementSibling).toBe(mainContainer);
  });

  it('returns null when page__main-container is not in the document', () => {
    const { result } = renderHook(() => useDrawerContentSubnavPortal());

    expect(result.current).toBeNull();
  });

  it('finds the target via MutationObserver when Chrome mounts main-container after mount', async () => {
    document.body.innerHTML = `
      <div class="pf-v6-c-drawer__main">
        <div class="pf-v6-c-drawer__content"></div>
      </div>
    `;
    const drawerMain = document.querySelector('.pf-v6-c-drawer__main') as HTMLElement;

    const { result } = renderHook(() => useDrawerContentSubnavPortal());
    expect(result.current).toBeNull();

    const mainContainer = document.createElement('div');
    mainContainer.className = 'pf-v6-c-page__main-container';
    drawerMain.appendChild(mainContainer);

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current?.parentElement).toBe(drawerMain);
    expect(result.current?.nextElementSibling).toBe(mainContainer);
  });

  it('removes the inserted container on unmount', () => {
    document.body.innerHTML = `
      <div class="pf-v6-c-drawer__main">
        <div class="pf-v6-c-drawer__content"></div>
        <div class="pf-v6-c-page__main-container"></div>
      </div>
    `;

    const { unmount } = renderHook(() => useDrawerContentSubnavPortal());

    expect(document.querySelector(`.${PORTAL_CLASS_NAME}`)).not.toBeNull();

    unmount();

    expect(document.querySelector(`.${PORTAL_CLASS_NAME}`)).toBeNull();
  });
});
