import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesFormAccount } from '../src/lib/form-account.ts';

test('stale, missing, duplicated or malformed account fields cannot authorize a profile action', () => {
  const account = '11111111-2222-4333-8444-555555555555';
  const other = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  const form = new FormData();
  assert.equal(matchesFormAccount(form, account), false);
  form.append('expected_account', account);
  assert.equal(matchesFormAccount(form, account), true);
  assert.equal(matchesFormAccount(form, other), false);
  assert.equal(matchesFormAccount(form, account.toUpperCase()), true);
  form.append('expected_account', account);
  assert.equal(matchesFormAccount(form, account), false);
  form.delete('expected_account');
  for (const value of [account + '\n', 'invalid', new Blob(['fixture'])]) {
    form.set('expected_account', value);
    assert.equal(matchesFormAccount(form, account), false);
  }
});
