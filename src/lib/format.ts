/**
 * Money and String Formatting Utilities for SafeSwap
 * Strict adherence to minor unit integers (centavos / cents)
 */

export const CURRENCY_SYMBOLS: Record<string, string> = {
  PHP: '₱',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/**
 * Format minor unit integer into localized currency string.
 * Example: formatMoney(17500000, 'PHP') -> "₱175,000.00"
 */
export function formatMoney(
  amountInMinorUnits: number | bigint,
  currency = 'PHP'
): string {
  const numeric = typeof amountInMinorUnits === 'bigint'
    ? Number(amountInMinorUnits)
    : amountInMinorUnits;
  const major = numeric / 100;
  const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()] || currency;

  return `${symbol}${major.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Convert user input major unit string (e.g. "1,500.50") to minor unit integer (150050)
 */
export function toMinorUnits(majorAmount: number | string): number {
  const clean = typeof majorAmount === 'string'
    ? majorAmount.replace(/[^0-9.]/g, '')
    : majorAmount;
  const parsed = typeof clean === 'string' ? parseFloat(clean) : clean;
  if (isNaN(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

/**
 * Convert minor units to major units float for input fields
 */
export function toMajorUnits(minorAmount: number): number {
  return minorAmount / 100;
}

/**
 * SafeSwap standard escrow service fee calculation (3% default)
 */
export function calculateServiceFee(
  amountInMinorUnits: number,
  feeRate = 0.03
): number {
  return Math.round(amountInMinorUnits * feeRate);
}

/**
 * Shorten UUID for compact UI display
 */
export function truncateId(id: string): string {
  if (!id) return '';
  return id.length > 8 ? `#${id.slice(0, 8)}` : `#${id}`;
}

/**
 * Format ISO date string into human readable local time
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return 'Pending';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}
