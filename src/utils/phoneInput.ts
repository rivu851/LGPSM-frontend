/** Phone numbers are 10 digits. Keeps what is typed or pasted to digits only, at most 10; a pasted "+91 98765 43210" or
 * "098765 43210" becomes "9876543210" rather than losing its last digits. */
export function limitPhone(value: string): string {
  let digits = (value || "").replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length > 10 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export const PHONE_MAX_DIGITS = 10;
