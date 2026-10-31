import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicAnalyticsPath, sanitizeVercelEvent, shouldLoadVercelTelemetry } from '../src/lib/vercel-telemetry.mjs';

const origin = 'https://idealab.example';

test('only the public editorial pages enable telemetry', () => {
  for (const path of ['/', '/lab', '/events/', '/explore', '/projects']) {
    assert.equal(isPublicAnalyticsPath(path), true, `${path} should be public`);
  }
  for (const path of ['/sign-in', '/sign-up', '/account-access', '/app/profile', '/projects/123', null]) {
    assert.equal(isPublicAnalyticsPath(path), false, `${path} should stay private or untracked`);
  }
});

test('telemetry is enabled only for public pages in production', () => {
  assert.equal(shouldLoadVercelTelemetry('/', 'production'), true);
  assert.equal(shouldLoadVercelTelemetry('/', 'preview'), false);
  assert.equal(shouldLoadVercelTelemetry('/', undefined), false);
  assert.equal(shouldLoadVercelTelemetry('/app/profile', 'production'), false);
});

test('public page events discard query strings and fragments', () => {
  const event = { type: 'pageview', url: `${origin}/lab/?utm_source=mail&token=private#section` };
  assert.deepEqual(sanitizeVercelEvent(event, origin), {
    type: 'pageview',
    url: `${origin}/lab`,
  });
});

test('private, dynamic, malformed and cross-origin events are dropped', () => {
  for (const url of [
    `${origin}/sign-in?email=private@example.com`,
    `${origin}/app/profile?student=private`,
    `${origin}/projects/student-project-id`,
    'https://attacker.example/lab',
    'not a URL',
  ]) {
    assert.equal(sanitizeVercelEvent({ type: 'vital', url }, origin), null, `${url} should be dropped`);
  }
});

test('Speed Insights route labels are reduced to the sanitized public path', () => {
  const event = { type: 'vital', url: `${origin}/events?auth=secret`, route: '/events?auth=secret' };
  assert.deepEqual(sanitizeVercelEvent(event, origin), {
    type: 'vital',
    url: `${origin}/events`,
    route: '/events',
  });
});
