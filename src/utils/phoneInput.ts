/** Phone numbers are 10 digits, 0-9 only (the server accepts digits only). Keeps what is typed or pasted to digits, at most 10; a pasted
 * "+91 98765 43210" or "098765 43210" becomes "9876543210" rather than losing its last digits. */
export function limitPhone(value: string): string {
  let digits = (value || "").replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length > 10 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export const PHONE_MAX_DIGITS = 10;

export const NOT_DIGITS_MESSAGE = "Only numbers (0–9) are allowed here. Letters and symbols can't be entered.";
export const TOO_MANY_DIGITS_MESSAGE = "A phone number has 10 digits.";

/**
 * What a phone field does with a change: the value to keep (digits only), and what to tell the person when something they typed or
 * pasted was dropped. Letters and symbols never show in the field; the message says why.
 */
export function readPhone(raw: string): { value: string; message: string | null } {
  const value = limitPhone(raw);
  // spaces (a number written "98765 43210") and one leading "+" (a pasted country code) are not mistakes; anything else that is not 0-9 is
  const compact = (raw || "").replace(/\s+/g, "").replace(/^\+(?=\d)/, "");
  if (/\D/.test(compact)) return { value, message: NOT_DIGITS_MESSAGE };
  const digits = compact;
  // more digits than a number has, other than a pasted country code or leading zero
  if (digits.length > 10 && value.length === 10 && !/^(91|0)/.test(digits)) return { value, message: TOO_MANY_DIGITS_MESSAGE };
  return { value, message: null };
}

/** Same for any field that takes only numbers (codes, counts): digits kept, a message when something else was dropped */
export function readDigits(raw: string, maxLength?: number): { value: string; message: string | null } {
  const digits = (raw || "").replace(/\D/g, "");
  const value = maxLength ? digits.slice(0, maxLength) : digits;
  return { value, message: digits.length !== (raw || "").replace(/\s/g, "").length ? NOT_DIGITS_MESSAGE : null };
}
