export const OTP_LENGTH = 6;

export function emptyOtpDigits(): string[] {
  return Array.from({ length: OTP_LENGTH }, () => "");
}

export function otpCode(digits: string[]): string {
  const code = digits.join("");
  return digits.length === OTP_LENGTH && /^\d{6}$/.test(code) ? code : "";
}

export function typeOtpDigit(
  digits: string[],
  index: number,
  raw: string
): { digits: string[]; focusIndex: number } {
  const numbers = raw.replace(/\D/g, "");
  if (!numbers) return { digits, focusIndex: index };
  if (numbers.length > 1) return pasteOtpDigits(numbers);
  const next = digits.slice(0, OTP_LENGTH);
  while (next.length < OTP_LENGTH) next.push("");
  next[index] = numbers[0] ?? "";
  return { digits: next, focusIndex: Math.min(index + 1, OTP_LENGTH - 1) };
}

export function pasteOtpDigits(raw: string): { digits: string[]; focusIndex: number } {
  const numbers = raw.replace(/\D/g, "").slice(0, OTP_LENGTH);
  const digits = emptyOtpDigits();
  for (let index = 0; index < numbers.length; index += 1) digits[index] = numbers[index] ?? "";
  const focusIndex = numbers.length === 0 ? 0 : Math.min(numbers.length, OTP_LENGTH) - 1;
  return { digits, focusIndex };
}

export function backspaceOtpDigit(
  digits: string[],
  index: number
): { digits: string[]; focusIndex: number } {
  const next = digits.slice(0, OTP_LENGTH);
  while (next.length < OTP_LENGTH) next.push("");
  if (next[index]) {
    next[index] = "";
    return { digits: next, focusIndex: index };
  }
  const previous = Math.max(0, index - 1);
  next[previous] = "";
  return { digits: next, focusIndex: previous };
}
