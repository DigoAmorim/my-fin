function expandScientificNotation(value: string): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/.exec(value);
  if (!match) return value;

  const [, sign, whole, fraction = '', exponentText] = match;
  const digits = whole + fraction;
  const decimalPosition = whole.length + Number(exponentText);
  if (decimalPosition <= 0) return `${sign}0.${'0'.repeat(-decimalPosition)}${digits}`;
  if (decimalPosition >= digits.length) return `${sign}${digits}${'0'.repeat(decimalPosition - digits.length)}`;
  return `${sign}${digits.slice(0, decimalPosition)}.${digits.slice(decimalPosition)}`;
}

/** Converts a decimal amount to integer cents, rounding half up to two places. */
export function toMinorUnits(value: string | number): bigint {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new TypeError('Money value must be finite.');
  }

  const decimal = expandScientificNotation(String(value).trim());
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(decimal);
  if (!match) throw new TypeError('Money value must be a decimal amount.');

  const [, sign, whole, fraction = ''] = match;
  let minorUnits = BigInt(whole) * 100n + BigInt(fraction.slice(0, 2).padEnd(2, '0'));
  if (fraction[2] && fraction[2] >= '5') minorUnits += 1n;
  return sign && minorUnits > 0n ? -minorUnits : minorUnits;
}

/** Converts integer cents for APIs such as Intl.NumberFormat that consume numbers. */
export function minorUnitsToNumber(minorUnits: bigint): number {
  return Number(minorUnits) / 100;
}

/** Sums decimal amounts without binary floating-point accumulation. */
export function sumMinorUnits(values: Iterable<string | number>): bigint {
  let total = 0n;
  for (const value of values) total += toMinorUnits(value);
  return total;
}