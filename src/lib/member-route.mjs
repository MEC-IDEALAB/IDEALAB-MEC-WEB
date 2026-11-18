const routes = [
  ['/app/make-and-borrow', 'make-borrow'],
  ['/app/notifications', 'notifications'],
  ['/app/borrowing', 'make-borrow'],
  ['/app/requests', 'make-borrow'],
  ['/app/projects', 'projects'],
  ['/app/events', 'events'],
  ['/app/visits', 'visits'],
  ['/app/settings', 'settings'],
  ['/app/profile', 'profile'],
  ['/app/lab', 'lab'],
].sort((left, right) => right[0].length - left[0].length);

/** Resolve the most specific member route before its /app parent can match. */
export function memberDestinationId(pathname) {
  const match = routes.find(([href]) => pathname === href || pathname.startsWith(`${href}/`));
  return match?.[1] ?? (pathname === '/app' ? 'home' : undefined);
}
