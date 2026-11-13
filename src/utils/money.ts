// The platform bills in Indian rupees. Every price shown to a person goes through here, so there is one currency and one way of
// writing it (₹12,34,567.50: Indian digit grouping). The amounts themselves are never converted: a stored 12 is shown as ₹12.00.
export const PLATFORM_CURRENCY = "INR";
export const PLATFORM_LOCALE = "en-IN";

export interface MoneyOptions {
  /** most decimals shown (default 2) */
  maxFractionDigits?: number;
  /** fewest decimals shown (default: as many as max, so prices line up) */
  minFractionDigits?: number;
  /** ₹12.3L style, for dashboard cards */
  compact?: boolean;
}

export function formatMoney(amount: number | null | undefined, options: MoneyOptions = {}): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return "—";
  const max = options.maxFractionDigits ?? 2;
  const min = options.minFractionDigits ?? (options.compact ? 0 : max);
  return new Intl.NumberFormat(PLATFORM_LOCALE, {
    style: "currency",
    currency: PLATFORM_CURRENCY,
    maximumFractionDigits: max,
    minimumFractionDigits: Math.min(min, max),
    ...(options.compact ? { notation: "compact" as const } : {}),
  }).format(Number(amount));
}
