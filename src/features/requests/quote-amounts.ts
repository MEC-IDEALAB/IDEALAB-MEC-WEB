export type QuoteLineInput = Readonly<{
  quantity: string;
  ratePaise: bigint;
}>;

const quantityPattern = /^(0|[1-9][0-9]{0,8})(?:\.([0-9]{1,6}))?$/u;
const maxRatePaise = BigInt(999_999_999);
const zero = BigInt(0);
const two = BigInt(2);

/** Call on the server with rates resolved from the approved catalog. */
export function calculateQuoteAmounts(lines: readonly QuoteLineInput[]) {
  if (lines.length === 0 || lines.length > 50) throw new RangeError('Invalid quote line count');

  const linePaise = lines.map(({ quantity, ratePaise }) => {
    const match = quantityPattern.exec(quantity);
    if (!match || match[0] !== quantity || ratePaise < zero || ratePaise > maxRatePaise) {
      throw new RangeError('Invalid quote quantity or rate');
    }
    const fraction = match[2] ?? '';
    const denominator = BigInt(10) ** BigInt(fraction.length);
    const numerator = BigInt(match[1] + fraction);
    if (numerator === zero) throw new RangeError('Quote quantity must be positive');
    // Round each positive line to the nearest paise, with exact halves up.
    return (two * numerator * ratePaise + denominator) / (two * denominator);
  });

  return { linePaise, totalPaise: linePaise.reduce((total, line) => total + line, zero) };
}
