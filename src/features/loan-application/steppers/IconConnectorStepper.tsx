"use client";

import {
  DesktopSteps,
  MobileStepMenu,
  StepButton,
  StepGlyph,
  StepLabel,
  markerClass,
  toStepperSteps,
  type StepperProps,
} from "@/features/loan-application/steppers/shared";

/** Icon connector — a step icon in each circle, joined by a progress track. */
export function IconConnectorStepper({
  templates,
  currentStep,
  stepStatuses,
  onStepClick,
}: StepperProps) {
  const steps = toStepperSteps(templates, currentStep, stepStatuses);

  return (
    <div>
      <MobileStepMenu steps={steps} onStepClick={onStepClick} />
      <DesktopSteps count={steps.length} currentStep={currentStep} trackTopClass="top-[18px] max-[900px]:top-[15px]">
        {steps.map((step) => (
          <StepButton key={step.key} step={step} onStepClick={onStepClick}>
            <span className={markerClass(step, "icon")}>
              <StepGlyph step={step} className="h-[18px] w-[18px] max-[900px]:h-3.5 max-[900px]:w-3.5" />
            </span>
            <StepLabel step={step} />
          </StepButton>
        ))}
      </DesktopSteps>
    </div>
  );
}
