import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateQuoteAmounts } from '../src/features/requests/quote-amounts.ts';

test('quote amounts use exact paise and round each line before summing', () => {
  const result = calculateQuoteAmounts([
    { quantity: '12.345', ratePaise: 300n },
    { quantity: '0.005', ratePaise: 300n },
    { quantity: '1', ratePaise: 0n },
  ]);
  assert.deepEqual(result, { linePaise: [3704n, 2n, 0n], totalPaise: 3706n });
});

test('quote amounts reject missing lines, invalid decimals and out-of-range rates', () => {
  assert.throws(() => calculateQuoteAmounts([]), RangeError);
  for (const quantity of ['0', '-1', '1e3', '1.0000001', '1\n']) {
    assert.throws(() => calculateQuoteAmounts([{ quantity, ratePaise: 300n }]), RangeError);
  }
  assert.throws(() => calculateQuoteAmounts([{ quantity: '1', ratePaise: -1n }]), RangeError);
  assert.throws(() => calculateQuoteAmounts([{ quantity: '1', ratePaise: 1_000_000_000n }]), RangeError);
});
