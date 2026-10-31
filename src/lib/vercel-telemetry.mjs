const publicRoutes = new Set(['/', '/events', '/explore', '/lab', '/projects']);

function normalizePath(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) return null;
  const normalized = pathname.replace(/\/+$/, '');
  return normalized || '/';
}

export function isPublicAnalyticsPath(pathname) {
  return publicRoutes.has(normalizePath(pathname));
}

export function shouldLoadVercelTelemetry(pathname, vercelEnvironment) {
  return vercelEnvironment === 'production' && isPublicAnalyticsPath(pathname);
}

export function sanitizeVercelEvent(event, origin) {
  if (!event || typeof event.url !== 'string' || typeof origin !== 'string') return null;

  let base;
  let url;
  try {
    base = new URL(origin);
    url = new URL(event.url, base);
  } catch {
    return null;
  }

  if (url.origin !== base.origin) return null;
  const pathname = normalizePath(url.pathname);
  if (!publicRoutes.has(pathname)) return null;

  return {
    ...event,
    url: `${base.origin}${pathname}`,
    ...(Object.hasOwn(event, 'route') ? { route: pathname } : {}),
  };
}
