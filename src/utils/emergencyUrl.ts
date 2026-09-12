/**
 * Utility functions for building and parsing role-based URLs.
 * - Public Bystander Emergency: /emergency/{emergencyId} or /
 * - Ambulance Dashboard: /ambulance
 * - Government/Admin Portal: /admin
 */

export type AppRoute =
  | { type: 'bystander'; emergencyId?: string }
  | { type: 'ambulance' }
  | { type: 'admin' };

export function getEmergencyUrl(emergencyId: string): string {
  const origin =
    typeof window !== 'undefined' && window.location && window.location.origin
      ? window.location.origin
      : 'https://resqride.app';
  return `${origin}/emergency/${encodeURIComponent(emergencyId)}`;
}

export function parseEmergencyIdFromLocation(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Check pathname: /emergency/{emergencyId}
  const pathMatch = window.location.pathname.match(/\/emergency\/([^/?#]+)/i);
  if (pathMatch && pathMatch[1]) {
    return decodeURIComponent(pathMatch[1]).trim();
  }

  // 2. Check hash: #/emergency/{emergencyId}
  const hashMatch = window.location.hash.match(/#\/?emergency\/([^/?#]+)/i);
  if (hashMatch && hashMatch[1]) {
    return decodeURIComponent(hashMatch[1]).trim();
  }

  // 3. Check query param: ?emergency={emergencyId}
  const searchParams = new URLSearchParams(window.location.search);
  const emergencyParam = searchParams.get('emergency');
  if (emergencyParam) {
    return decodeURIComponent(emergencyParam).trim();
  }

  return null;
}

export function parseCurrentRoute(): AppRoute {
  if (typeof window === 'undefined') return { type: 'bystander' };

  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  const routeParam = searchParams.get('route')?.toLowerCase();

  // Ambulance protected route: /ambulance, #/ambulance, ?route=ambulance
  if (
    path.startsWith('/ambulance') ||
    hash.startsWith('#/ambulance') ||
    routeParam === 'ambulance'
  ) {
    return { type: 'ambulance' };
  }

  // Government/Admin protected route: /admin, #/admin, ?route=admin
  if (
    path.startsWith('/admin') ||
    hash.startsWith('#/admin') ||
    routeParam === 'admin'
  ) {
    return { type: 'admin' };
  }

  // Public Bystander emergency route
  const emergencyId = parseEmergencyIdFromLocation();
  return {
    type: 'bystander',
    emergencyId: emergencyId || undefined,
  };
}
