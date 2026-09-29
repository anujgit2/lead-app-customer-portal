import type { CurrencyFormatConfig, FormField } from "@/types";
import type { NumberFormatValues } from "react-number-format";

export interface ResolvedCurrencyFormat {
  precision: number;
  decimalScale: number;
  fixedDecimalScale: boolean;
  thousandSeparator: string | boolean;
  decimalSeparator: string;
  allowNegative: boolean;
  allowLeadingZeros: boolean;
  useGrouping: boolean;
}

const DEFAULTS: ResolvedCurrencyFormat = {
  precision: 18,
  decimalScale: 2,
  fixedDecimalScale: true,
  thousandSeparator: ",",
  decimalSeparator: ".",
  allowNegative: false,
  allowLeadingZeros: false,
  useGrouping: true,
};

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asSeparator(value: unknown): string | boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

/** Reads the authored flat currency-format keys. Extra keys on other field types are ignored. */
export function parseCurrencyFormat(raw: Record<string, unknown>): CurrencyFormatConfig | undefined {
  const config: CurrencyFormatConfig = {
    precision: asNumber(raw.precision),
    scale: asNumber(raw.scale),
    decimalScale: asNumber(raw.decimalScale),
    fixedDecimalScale: asBoolean(raw.fixedDecimalScale),
    thousandSeparator: asSeparator(raw.thousandSeparator),
    decimalSeparator: typeof raw.decimalSeparator === "string" ? raw.decimalSeparator : undefined,
    allowNegative: asBoolean(raw.allowNegative),
    allowLeadingZeros: asBoolean(raw.allowLeadingZeros),
    useGrouping: asBoolean(raw.useGrouping),
  };

  return Object.values(config).some((v) => v !== undefined) ? config : undefined;
}

export function resolveCurrencyFormat(field: FormField): ResolvedCurrencyFormat {
  const authored = field.currencyFormat ?? {};
  const decimalScale = authored.decimalScale ?? authored.scale ?? DEFAULTS.decimalScale;
  return {
    precision: authored.precision ?? DEFAULTS.precision,
    decimalScale,
    fixedDecimalScale: authored.fixedDecimalScale ?? DEFAULTS.fixedDecimalScale,
    thousandSeparator: authored.thousandSeparator ?? DEFAULTS.thousandSeparator,
    decimalSeparator: authored.decimalSeparator ?? DEFAULTS.decimalSeparator,
    allowNegative: authored.allowNegative ?? DEFAULTS.allowNegative,
    allowLeadingZeros: authored.allowLeadingZeros ?? DEFAULTS.allowLeadingZeros,
    useGrouping: authored.useGrouping ?? DEFAULTS.useGrouping,
  };
}

export function isCurrencyValueAllowed(
  values: NumberFormatValues,
  format: ResolvedCurrencyFormat,
  max?: number
): boolean {
  const raw = values.value;
  if (raw === "" || raw === "-" || raw === "." || raw === "-.") return true;

  if (!format.allowNegative && values.floatValue !== undefined && values.floatValue < 0) {
    return false;
  }

  if (max !== undefined && values.floatValue !== undefined && values.floatValue > max) {
    return false;
  }

  const unsigned = raw.replace(/^-/, "");
  const [integerPart = "", fractionPart = ""] = unsigned.split(".");
  const integerDigits = integerPart.replace(/\D/g, "").length;
  const fractionDigits = fractionPart.replace(/\D/g, "").length;
  const maxIntegerDigits = Math.max(format.precision - format.decimalScale, 0);

  if (integerDigits > maxIntegerDigits) return false;
  if (fractionDigits > format.decimalScale) return false;
  if (integerDigits + fractionDigits > format.precision) return false;

  return true;
}
