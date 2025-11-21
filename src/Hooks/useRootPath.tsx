import { useMemo } from 'react';
import { useHref } from 'react-router-dom';

function useRootPath(): string {
  // React Router's useHref safely resolves the 'content' path because it's based on route context
  // useLocation().pathname uses raw user input from the browser location which could be spoofed
  const path = useHref('content');
  return useMemo(() => path.split('content')[0] + 'content', [path]);
}

export default useRootPath;
