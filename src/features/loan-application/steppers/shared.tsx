"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Circle,
  CircleCheck,
  FileText,
  IndianRupee,
  Landmark,
  Layers,
  ShieldCheck,
  UserCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormTemplate, WizardStepStatus } from "@/types";

export interface StepperStep {
  key: string;
  label: string;
  index: number;
  state: "active" | "done" | "upcoming";
  canNavigate: boolean;
  iconName?: string;
}

export interface StepperProps {
  templates: FormTemplate[];
  currentStep: number;
  stepStatuses: WizardStepStatus[];
  onStepClick?: (index: number) => void;
}

const NAMED_ICONS: Record<string, LucideIcon> = {
  user: UserRound,
  building: Landmark,
  landmark: Landmark,
  business: Landmark,
  file: FileText,
  document: FileText,
  documents: FileText,
  money: IndianRupee,
  currency: IndianRupee,
  financial: IndianRupee,
  layers: Layers,
  loan: Layers,
  shield: ShieldCheck,
  check: CircleCheck,
  review: CircleCheck,
  approval: UserCheck,
  arrow: ArrowRight,
  disbursal: ArrowRight,
};

const ICON_RULES: [RegExp, LucideIcon][] = [
  [/review|summary/, CircleCheck],
  [/bank|verif|kyc|shield/, ShieldCheck],
  [/approv/, UserCheck],
  [/disburs|payout|sanction/, ArrowRight],
  [/document|upload|file/, FileText],
  [/financ|income|revenue|money/, IndianRupee],
  [/owner|promoter|director|person|applicant|guarantor/, UserRound],
  [/loan|facility|product|term/, Layers],
  [/business|company|entity|firm/, Landmark],
];

export function toStepperSteps(
  templates: FormTemplate[],
  currentStep: number,
  stepStatuses: WizardStepStatus[]
): StepperStep[] {
  const items = [
    ...templates.map((template, index) => ({
      key: template.code,
      label: template.title,
      index,
      iconName: template.icon,
    })),
    { key: "review", label: "Review", index: templates.length, iconName: "review" },
  ];

  return items.map((step) => {
    const isCurrent = step.index === currentStep;
    const isCompleted =
      step.index < templates.length && Boolean(stepStatuses[step.index]?.completed);
    const done = !isCurrent && (step.index < currentStep || isCompleted);
    return {
      ...step,
      state: isCurrent ? "active" : done ? "done" : "upcoming",
      canNavigate: step.index <= currentStep || isCompleted,
    };
  });
}

export function iconForStep(step: StepperStep): LucideIcon {
  const named = step.iconName?.trim().toLowerCase();
  if (named && NAMED_ICONS[named]) return NAMED_ICONS[named];
  const haystack = `${named ?? ""} ${step.label}`.toLowerCase();
  for (const [pattern, icon] of ICON_RULES) {
    if (pattern.test(haystack)) return icon;
  }
  return Circle;
}

export function StepGlyph({ step, className }: { step: StepperStep; className?: string }) {
  const Icon = iconForStep(step);
  return <Icon className={className} strokeWidth={1.8} aria-hidden />;
}

function trackInset(count: number): string {
  if (count <= 0) return "0%";
  return `${50 / count}%`;
}

function trackFill(count: number, currentStep: number): number {
  if (count <= 1) return 0;
  return Math.min(100, Math.max(0, (currentStep / (count - 1)) * 100));
}

export function StepTrack({
  count,
  currentStep,
  topClass,
}: {
  count: number;
  currentStep: number;
  topClass: string;
}) {
  const inset = trackInset(count);
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute z-0 h-0.5 bg-slate-200", topClass)}
      style={{ left: inset, right: inset }}
    >
      <div
        className="h-full bg-primary transition-[width] duration-200 ease-out"
        style={{ width: `${trackFill(count, currentStep)}%` }}
      />
    </div>
  );
}

export function StepLabel({ step, className }: { step: StepperStep; className?: string }) {
  return (
    <span
      title={step.label}
      className={cn(
        "mt-2.5 max-w-[100px] text-xs font-medium leading-snug text-slate-500 max-[900px]:text-[10px]",
        step.state === "active" && "font-bold text-primary",
        step.state === "done" && "text-slate-700",
        className
      )}
    >
      {step.label}
    </span>
  );
}

export function StepButton({
  step,
  onStepClick,
  className,
  children,
}: {
  step: StepperStep;
  onStepClick?: (index: number) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={!step.canNavigate}
      onClick={() => {
        if (step.canNavigate) onStepClick?.(step.index);
      }}
      aria-current={step.state === "active" ? "step" : undefined}
      className={cn(
        "relative z-[1] flex min-w-0 flex-col items-center bg-transparent px-0.5 text-center",
        "transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
        step.canNavigate
          ? "cursor-pointer hover:-translate-y-0.5 active:scale-[0.98]"
          : "cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}

export function DesktopSteps({
  count,
  currentStep,
  trackTopClass,
  className,
  children,
}: {
  count: number;
  currentStep: number;
  trackTopClass?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("relative hidden min-[601px]:grid", className)}
      style={{ gridTemplateColumns: `repeat(${Math.max(count, 1)}, minmax(0, 1fr))` }}
      aria-label="Application steps"
    >
      {trackTopClass ? (
        <StepTrack count={count} currentStep={currentStep} topClass={trackTopClass} />
      ) : null}
      {children}
    </div>
  );
}

export function MobileStepMenu({
  steps,
  onStepClick,
}: {
  steps: StepperStep[];
  onStepClick?: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = steps.find((step) => step.state === "active") ?? steps[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!current) return null;

  return (
    <div ref={rootRef} className="relative min-[601px]:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2.5 rounded-[11px] border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition-all duration-200 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-primary-soft text-xs font-bold text-primary">
          {current.index + 1}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[13px] font-bold text-foreground">{current.label}</span>
          <span className="text-[11px] text-slate-500">
            Step {current.index + 1} of {steps.length}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label="Application steps"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-[min(60vh,360px)] overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_28px_rgba(23,43,77,0.16)]"
        >
          {steps.map((step) => {
            const status = step.state === "active" ? "Current" : step.state === "done" ? "Done" : "";
            return (
              <button
                key={step.key}
                type="button"
                role="option"
                aria-selected={step.state === "active"}
                aria-current={step.state === "active" ? "step" : undefined}
                disabled={!step.canNavigate}
                onClick={() => {
                  if (!step.canNavigate) return;
                  onStepClick?.(step.index);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-all duration-200 ease-out",
                  step.state === "active" ? "bg-primary-soft text-primary" : "text-foreground hover:bg-slate-50",
                  step.canNavigate ? "cursor-pointer active:scale-[0.98]" : "cursor-not-allowed opacity-60"
                )}
              >
                <span
                  className={cn(
                    "grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500",
                    step.state === "active" && "bg-primary text-white",
                    step.state === "done" && "bg-primary-soft text-primary"
                  )}
                >
                  {step.state === "done" ? <Check className="h-3 w-3" strokeWidth={2.5} /> : step.index + 1}
                </span>
                <span className="min-w-0 flex-1 text-xs font-semibold">{step.label}</span>
                <span
                  className={cn(
                    "text-[10px] text-slate-500",
                    step.state === "active" && "font-bold text-primary"
                  )}
                >
                  {status}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const MARKER = {
  minimal:
    "grid h-[30px] w-[30px] place-items-center rounded-full border-[1.5px] border-slate-200 bg-white text-xs font-bold text-slate-500 shadow-[0_1px_2px_rgba(23,43,77,0.04)] max-[900px]:h-[26px] max-[900px]:w-[26px] max-[900px]:text-[10px]",
  pill: "grid h-9 w-[min(82px,84%)] place-items-center rounded-full bg-slate-100 text-[13px] font-bold text-slate-500 max-[900px]:h-8 max-[900px]:w-[82%] max-[900px]:text-xs",
  icon: "grid h-[38px] w-[38px] place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 max-[900px]:h-8 max-[900px]:w-8",
} as const;

export function markerClass(step: StepperStep, variant: keyof typeof MARKER): string {
  return cn(
    MARKER[variant],
    "transition-all duration-200 ease-out",
    step.state === "active" &&
      variant === "pill" &&
      "bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-[0_5px_12px_hsl(var(--primary)/0.18)]",
    step.state === "active" &&
      variant !== "pill" &&
      "border-primary bg-primary text-primary-foreground shadow-[0_4px_10px_hsl(var(--primary)/0.22)]",
    step.state === "done" && variant === "minimal" && "border-primary/25 bg-primary-soft text-primary shadow-none",
    step.state === "done" && variant === "pill" && "bg-primary-soft text-primary shadow-none",
    step.state === "done" && variant === "icon" && "border-primary/20 bg-primary-soft text-primary shadow-none"
  );
}
