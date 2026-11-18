import test from 'node:test';
import assert from 'node:assert/strict';
import { formatSessionElapsed, sessionElapsedSeconds, sessionNeedsCheckoutReminder, SESSION_CHECKOUT_REMINDER_MS } from '../src/lib/active-session.ts';

const checkin = '2026-11-03T08:00:00.000Z';
const started = Date.parse(checkin);

test('elapsed timer is based on the saved check-in timestamp and never goes negative', () => {
  assert.equal(sessionElapsedSeconds(checkin, started), 0);
  assert.equal(sessionElapsedSeconds(checkin, started + 3_661_000), 3661);
  assert.equal(sessionElapsedSeconds(checkin, started - 1000), 0);
  assert.equal(sessionElapsedSeconds('not-a-time', started), null);
});

test('elapsed timer formats long sessions without wrapping after 24 hours', () => {
  assert.equal(formatSessionElapsed(0), '00:00:00');
  assert.equal(formatSessionElapsed(3661), '01:01:01');
  assert.equal(formatSessionElapsed(90_061), '25:01:01');
  assert.equal(formatSessionElapsed(null), '--:--:--');
});

test('checkout reminder appears at two hours and remains tied to the saved session', () => {
  assert.equal(SESSION_CHECKOUT_REMINDER_MS, 7_200_000);
  assert.equal(sessionNeedsCheckoutReminder(checkin, started + SESSION_CHECKOUT_REMINDER_MS - 1000), false);
  assert.equal(sessionNeedsCheckoutReminder(checkin, started + SESSION_CHECKOUT_REMINDER_MS), true);
  assert.equal(sessionNeedsCheckoutReminder('invalid', started + SESSION_CHECKOUT_REMINDER_MS), false);
});
