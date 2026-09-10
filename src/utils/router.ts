import { useState, useEffect } from 'react';

export interface RouteState {
  path: string;
  category?: 'workshops' | 'technical' | 'non-technical';
  slug?: string;
  regId?: string;
}

export function parseCurrentRoute(): RouteState {
  let path = window.location.pathname;
  // Support hash routing fallback if running in subpaths or static preview
  if (window.location.hash && window.location.hash.startsWith('#/')) {
    path = window.location.hash.slice(1);
  }

  // Normalize path
  path = path.replace(/\/+$/, '') || '/';

  if (path === '/' || path === '') {
    return { path: '/' };
  }
  if (path === '/register') {
    return { path: '/register' };
  }
  if (path === '/ticket' || path.startsWith('/ticket/')) {
    const parts = path.split('/');
    return { path: '/ticket', regId: parts[2] };
  }
  if (path === '/admin') {
    return { path: '/admin' };
  }

  // /events/workshops, /events/technical, /events/non-technical
  if (path === '/events/workshops') {
    return { path: '/events', category: 'workshops' };
  }
  if (path === '/events/technical') {
    return { path: '/events', category: 'technical' };
  }
  if (path === '/events/non-technical') {
    return { path: '/events', category: 'non-technical' };
  }

  // Event detail pages: e.g. /events/workshops/silicon-2-gds or /events/silicon-2-gds
  const eventMatch = path.match(/^\/events\/(workshops|technical|non-technical)\/([a-z0-9-]+)$/i);
  if (eventMatch) {
    return {
      path: '/event-detail',
      category: eventMatch[1].toLowerCase() as any,
      slug: eventMatch[2].toLowerCase(),
    };
  }

  const directMatch = path.match(/^\/events\/([a-z0-9-]+)$/i);
  if (directMatch) {
    return {
      path: '/event-detail',
      slug: directMatch[1].toLowerCase(),
    };
  }

  return { path: '/' };
}

export function navigateTo(targetPath: string) {
  if (targetPath.startsWith('/')) {
    window.history.pushState({}, '', targetPath);
    // Dispatch popstate so listener triggers
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export function useAppRoute(): [RouteState, (path: string) => void] {
  const [route, setRoute] = useState<RouteState>(parseCurrentRoute);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseCurrentRoute());
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const navigate = (newPath: string) => {
    navigateTo(newPath);
    setRoute(parseCurrentRoute());
  };

  return [route, navigate];
}
