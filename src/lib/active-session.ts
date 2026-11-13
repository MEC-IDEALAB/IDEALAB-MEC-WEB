export const SESSION_CHECKOUT_REMINDER_MS = 2 * 60 * 60 * 1000;

export function sessionElapsedSeconds(checkinTime: string, now = Date.now()) {
  const startedAt = Date.parse(checkinTime);
  if (!Number.isFinite(startedAt) || !Number.isFinite(now)) return null;
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

export function formatSessionElapsed(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) return '--:--:--';
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const remainder = wholeSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export function sessionNeedsCheckoutReminder(checkinTime: string, now = Date.now()) {
  const elapsed = sessionElapsedSeconds(checkinTime, now);
  return elapsed !== null && elapsed * 1000 >= SESSION_CHECKOUT_REMINDER_MS;
}
