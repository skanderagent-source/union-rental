/** Light phone display mask for PII fields — stores formatted string; submit with digits intact. */
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 15);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `+${digits.slice(0, digits.length - 10)} (${digits.slice(-10, -7)}) ${digits.slice(-7, -4)}-${digits.slice(-4)}`;
}

export function phoneDigitCount(value: string): number {
  return value.replace(/\D/g, '').length;
}
