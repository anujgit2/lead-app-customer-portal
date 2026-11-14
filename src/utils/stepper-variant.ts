import type { StepperVariant } from "@/types";

/** Named steppers the wizard can render. The first entry is the default. */
export const STEPPER_CATALOG = [
  { value: "minimal", name: "Minimal line" },
  { value: "pills", name: "Filled pill" },
  { value: "icons", name: "Icon connector" },
  { value: "cards", name: "Card" },
] as const satisfies readonly { value: StepperVariant; name: string }[];

export const DEFAULT_STEPPER: StepperVariant = STEPPER_CATALOG[0].value;

const ALIASES: Record<string, StepperVariant> = {
  minimal: "minimal",
  "minimal-line": "minimal",
  "minimal_line": "minimal",
  minimalline: "minimal",
  line: "minimal",
  "1": "minimal",
  pills: "pills",
  pill: "pills",
  "filled-pill": "pills",
  "filled_pill": "pills",
  filledpill: "pills",
  "filled pill": "pills",
  "filled pills": "pills",
  "2": "pills",
  icons: "icons",
  icon: "icons",
  "icon-connector": "icons",
  "icon_connector": "icons",
  iconconnector: "icons",
  "icon connector": "icons",
  "3": "icons",
  cards: "cards",
  card: "cards",
  "card-style": "cards",
  "card_style": "cards",
  "card style": "cards",
  "mini-cards": "cards",
  "mini_cards": "cards",
  minicards: "cards",
  "mini cards": "cards",
  "4": "cards",
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

/** Maps a config string or 1-based index onto a known stepper. Anything else is Minimal line. */
export function resolveStepperVariant(value: unknown): StepperVariant {
  if (typeof value === "number" && Number.isInteger(value)) {
    return ALIASES[String(value)] ?? DEFAULT_STEPPER;
  }
  if (typeof value !== "string") return DEFAULT_STEPPER;
  const key = value.trim().toLowerCase().replace(/\s+/g, " ");
  return ALIASES[key] ?? ALIASES[key.replace(/[\s_]+/g, "-")] ?? DEFAULT_STEPPER;
}

function pickStepper(record: Record<string, unknown> | undefined): unknown {
  if (!record) return undefined;
  if (record.stepper != null) return record.stepper;
  if (record.stepperStyle != null) return record.stepperStyle;
  if (record.stepperVariant != null) return record.stepperVariant;
  return undefined;
}

/**
 * Reads the stepper from a program or form-config payload.
 * Looks at `ui.stepper`, then `ui.wizard.stepper`, then a root `stepper`.
 */
export function readStepperConfig(source: unknown): StepperVariant {
  const root = asRecord(source);
  if (!root) return DEFAULT_STEPPER;
  const ui = asRecord(root.ui);
  const wizard = asRecord(ui?.wizard);
  return resolveStepperVariant(pickStepper(ui) ?? pickStepper(wizard) ?? pickStepper(root));
}
