import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CircleAlert, Files, Share2, User, type LucideIcon } from "lucide-react";
import { BrandWordmark, Logo } from "@/components/Logo";
import { useSupport } from "@/features/tenant-ui/use-support";
import { cn } from "@/lib/utils";
import { lendingSiteHome } from "@/lib/portal-urls";

export type BrandPoint = {
  icon?: LucideIcon;
  title: string;
  description?: string;
};

const AUTH_LINKS = [
  { label: "Privacy policy", href: "/privacy" },
  { label: "Terms of use", href: "/terms" },
];

/** Brand panel points for the customer sign-in and signup screens, from the redesign. */
export const CUSTOMER_ASIDE_POINTS: BrandPoint[] = [
  { title: "Individual and business profiles" },
  { title: "Loan applications in one place" },
  { title: "Secure document storage and sharing" },
  { title: "Clear application status updates" },
];

/**
 * "split": brand panel on the left, form on the right (default).
 * "card": a single centred card with the Loantris logo, for the customer portal.
 */
export function AuthScreen({
  topRight,
  children,
  asideTitle = "",
  asideDescription = "",
  asideFootnote,
  points = [],
  contentClassName,
  variant = "split",
}: {
  topRight?: ReactNode;
  children: ReactNode;
  asideTitle?: string;
  asideDescription?: string;
  asideFootnote?: string;
  points?: BrandPoint[];
  contentClassName?: string;
  variant?: "split" | "card";
}) {
  const year = new Date().getFullYear();
  const { legalEntity } = useSupport();

  if (variant === "card") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-[18px] py-10 text-foreground">
        <main className="auth-card w-full max-w-[420px] rounded-[10px] border border-border bg-card p-7 shadow-2 sm:p-10">
          <a href={lendingSiteHome()} aria-label="Loantris home" className="inline-block">
            <BrandWordmark className="text-[26px] text-muted-foreground" />
          </a>
          <div className="mt-8 flex flex-col gap-5">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen bg-card text-foreground lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)]">
      <aside
        aria-label="About Loantris"
        className="hidden flex-col justify-between gap-8 bg-muted px-10 py-12 text-muted-foreground lg:flex xl:px-16"
      >
        <div>
          <BrandWordmark className="text-[26px]" />
          <h2 className="font-display mt-12 max-w-[18ch] text-[35px] font-extrabold leading-[41px] tracking-[-0.035em] text-foreground">
            {asideTitle}
          </h2>
          <p className="mt-3.5 max-w-[420px] text-[15px] leading-7 text-muted-foreground">{asideDescription}</p>
        </div>
        <ul className="flex max-w-[420px] flex-col gap-3.5 text-[13px] text-muted-foreground">
          {points.map((point) => (
            <li key={point.title} className="flex items-start gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={3} aria-hidden />
              <span>{point.title}</span>
            </li>
          ))}
        </ul>
        {asideFootnote && <small className="text-xs text-muted-foreground">{asideFootnote}</small>}
      </aside>
      <div className="flex min-w-0 flex-col">
        <main className="flex flex-1 flex-col px-5 py-5 sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <Logo className="lg:hidden" />
            {topRight}
          </div>
          <div className="flex flex-1 items-center justify-center py-8">
            <div className={cn("flex w-full max-w-[380px] flex-col gap-5", contentClassName)}>
              {children}
            </div>
          </div>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 px-5 pb-4 text-xs leading-[18px] text-muted-foreground sm:px-8">
          <span>
            © {year} Loantris{legalEntity ? ` · ${legalEntity}` : ""}
          </span>
          <nav aria-label="Support and legal" className="flex flex-wrap gap-x-4">
            {AUTH_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="inline-flex min-h-7 items-center transition-colors duration-150 hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </footer>
      </div>

    </div>
  );
}

export function BackHomeLink() {
  return (
    <Link
      href="/"
      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Back to home
    </Link>
  );
}

export function SignInLink() {
  return (
    <p className="text-[13px] text-muted-foreground">
      <span className="hidden sm:inline">Have an account? </span>
      <Link
        href="/auth/login"
        className="font-semibold text-primary transition-colors duration-150 hover:underline"
      >
        Sign in
      </Link>
    </p>
  );
}

export function FieldError({ id, children }: { id?: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="flex items-start gap-1.5 text-xs leading-[18px] text-danger-strong">
      <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

const STEPS = [
  { n: 1, label: "Your details" },
  { n: 2, label: "Verify email" },
  { n: 3, label: "Ready" },
];

export function SignupProgress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <ol aria-label="Sign-up progress" className="grid grid-cols-3">
      {STEPS.map((item, index) => {
        const done = step > item.n || (step === 3 && item.n === 3);
        const current = step === item.n && !done;
        return (
          <li
            key={item.label}
            aria-current={step === item.n ? "step" : undefined}
            className={cn(
              "relative flex flex-col items-center gap-1.5 text-center text-xs leading-4",
              step >= item.n ? "font-semibold text-foreground" : "font-normal text-muted-foreground"
            )}
          >
            {index > 0 && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[calc(-50%+16px)] right-[calc(50%+16px)] top-[11px] h-0.5 rounded-full transition-colors duration-200",
                  step >= item.n ? "bg-primary" : "bg-border"
                )}
              />
            )}
            <span
              className={cn(
                "relative z-[1] grid h-6 w-6 place-items-center rounded-full border-2 text-[11px] font-semibold transition-colors duration-150",
                done && "border-primary bg-primary text-primary-foreground",
                current && "border-primary bg-card text-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.16)]",
                !done && !current && "border-input bg-card text-muted-foreground"
              )}
            >
              {done ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : item.n}
            </span>
            {item.label}
          </li>
        );
      })}
    </ol>
  );
}

export function passwordMeter(password: string) {
  if (!password) return { level: 0, label: "" };
  let level = 0;
  if (password.length >= 8) level += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) level += 1;
  if (/\d/.test(password)) level += 1;
  if (/[^A-Za-z0-9]/.test(password)) level += 1;
  level = Math.max(level, 1);
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  return { level, label: labels[level] };
}

export function meterColor(level: number) {
  if (level <= 1) return "bg-danger";
  if (level === 2) return "bg-warning";
  if (level === 3) return "bg-info";
  return "bg-success";
}

export const SIGN_UP_POINTS: BrandPoint[] = [
  {
    icon: User,
    title: "One profile, kept for you",
    description: "Reused for every application, with a history of changes.",
  },
  {
    icon: Files,
    title: "Documents in one place",
    description: "Upload files and keep every earlier version.",
  },
  {
    icon: Share2,
    title: "Share securely with your lender",
    description: "Private links that you control and can stop at any time.",
  },
];

export const signUpAside = {
  title: "Set up once. Use it everywhere.",
  description:
    "After you confirm your email, you can build your profile and start your first application.",
};
