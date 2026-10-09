/** Normalizes a phone number to E.164. Ten-digit numbers are treated as Indian mobiles. */
export function toE164(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let compact = trimmed.replace(/[^\d+]/g, "");
  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;

  if (compact.startsWith("+")) {
    const national = compact.slice(1);
    if (!/^[1-9]\d{7,14}$/.test(national)) return null;
    return `+${national}`;
  }

  const digits = compact.replace(/\D/g, "");
  if (/^0\d{10}$/.test(digits)) return `+91${digits.slice(1)}`;
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  if (/^91\d{10}$/.test(digits)) return `+${digits}`;
  if (/^[1-9]\d{7,14}$/.test(digits)) return `+${digits}`;
  return null;
}
