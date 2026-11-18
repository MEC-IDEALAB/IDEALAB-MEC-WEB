import assert from 'node:assert/strict';
import test from 'node:test';
import { memberDestinationId } from '../src/lib/member-route.mjs';

test('member navigation resolves specific destinations before the /app home route', () => {
  const cases = [
    ['/app', 'home'],
    ['/app/lab', 'lab'],
    ['/app/events', 'events'],
    ['/app/events/manage', 'events'],
    ['/app/projects', 'projects'],
    ['/app/projects/one', 'projects'],
    ['/app/visits', 'visits'],
    ['/app/requests/new', 'make-borrow'],
    ['/app/borrowing', 'make-borrow'],
    ['/app/settings', 'settings'],
    ['/app/profile', 'profile'],
    ['/app/unknown', undefined],
  ];
  for (const [path, expected] of cases) assert.equal(memberDestinationId(path), expected, path);
});
