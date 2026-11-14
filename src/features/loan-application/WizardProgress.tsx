"use client";

import type { ComponentType } from "react";
import { CardStepper } from "@/features/loan-application/steppers/CardStepper";
import { FilledPillStepper } from "@/features/loan-application/steppers/FilledPillStepper";
import { IconConnectorStepper } from "@/features/loan-application/steppers/IconConnectorStepper";
import { MinimalLineStepper } from "@/features/loan-application/steppers/MinimalLineStepper";
import type { StepperProps } from "@/features/loan-application/steppers/shared";
import type { StepperVariant } from "@/types";
import { resolveStepperVariant } from "@/utils/stepper-variant";

const STEPPERS: Record<StepperVariant, ComponentType<StepperProps>> = {
  minimal: MinimalLineStepper,
  pills: FilledPillStepper,
  icons: IconConnectorStepper,
  cards: CardStepper,
};

interface WizardProgressProps extends StepperProps {
  /** Program form config `ui.stepper`. Missing or unknown values use Minimal line. */
  variant?: unknown;
}

export function WizardProgress({ variant, ...props }: WizardProgressProps) {
  const Stepper = STEPPERS[resolveStepperVariant(variant)];
  return <Stepper {...props} />;
}

export { CardStepper, FilledPillStepper, IconConnectorStepper, MinimalLineStepper };
