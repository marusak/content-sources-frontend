import { useLayoutEffect, useRef, useState } from 'react';

import {
  findPageMainContainer,
  insertSubnavPortalContainer,
} from './subnavPortalInsertion';

// Insights Chrome renders its own Page/Drawer shell around this app, and there is no
// supported Chrome API for a federated module to inject content as a peer of
// `pf-v6-c-page__main-container`. This hook finds that live DOM structure and creates a
// container node so a horizontal subnav can be portaled outside the scrollable main content.
//
// On stage Chrome, `page__main-container` is typically a sibling of `drawer__content` under
// `drawer__main` — not nested inside `drawer__content`. Insertion logic must handle that.
//
// This is inherently coupled to Chrome's current markup/class names and could silently
// stop working if that markup changes.
export function useDrawerContentSubnavPortal(): HTMLDivElement | null {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    let observer: MutationObserver | undefined;
    let cancelled = false;

    const tryInsert = () => {
      if (cancelled || containerRef.current) {
        return true;
      }

      const mainContainer = findPageMainContainer();
      if (!mainContainer) {
        return false;
      }

      const el = insertSubnavPortalContainer(mainContainer);
      if (!el) {
        return false;
      }

      containerRef.current = el;
      setContainer(el);
      return true;
    };

    if (!tryInsert()) {
      observer = new MutationObserver(() => {
        if (tryInsert()) {
          observer?.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (containerRef.current?.parentElement) {
        containerRef.current.parentElement.removeChild(containerRef.current);
      }
      containerRef.current = null;
      setContainer(null);
    };
  }, []);

  return container;
}
