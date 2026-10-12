import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CircleAlert, Files, Share2, User, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/Logo";
import { CurvedGrid } from "@/components/CurvedGrid";
import { siteCopy } from "@/lib/site";
import { cn } from "@/lib/utils";

export type BrandPoint = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const AUTH_LINKS = [
  { label: "Help centre", href: "#" },
  { label: "Contact us", href: "#" },
  { label: "Privacy policy", href: "#" },
  { label: "Terms of use", href: "#" },
];

export function AuthScreen({
  topRight,
  children,
  asideTitle,
  asideDescription,
  points,
  contentClassName,
}: {
  topRight?: ReactNode;
  children: ReactNode;
  asideTitle: string;
  asideDescription: string;
  points: BrandPoint[];
  contentClassName?: string;
}) {
  const year = new Date().getFullYear();

  return (
    <div className="grid min-h-screen bg-card text-foreground lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
      <div className="flex min-w-0 flex-col">
        <main className="flex flex-1 flex-col px-5 py-5 sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <Logo />
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
            © {year} LoanPortal · {siteCopy.legalEntity}
          </span>
          <nav aria-label="Support and legal" className="flex flex-wrap gap-x-4">
            {AUTH_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="inline-flex min-h-7 items-center transition-all duration-200 ease-out hover:-translate-y-0.5 hover:text-foreground active:scale-[0.98]"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </footer>
      </div>

      <aside aria-label="About LoanPortal" className="hidden p-3 lg:block">
        <div className="lp-hero-bg relative flex h-full flex-col justify-center gap-8 overflow-hidden rounded-2xl px-10 py-12 text-white shadow-lg xl:px-16">
          <CurvedGrid />
          <div className="relative max-w-[420px]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-glow" />
              LoanPortal
            </span>
            <h2 className="mt-4 max-w-[15ch] text-[34px] font-semibold leading-[40px] tracking-[-0.035em]">
              {asideTitle}
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-white/75">{asideDescription}</p>
          </div>
          <ul className="relative flex max-w-[420px] flex-col gap-3">
            {points.map((point) => (
              <li
                key={point.title}
                className="flex items-start gap-3.5 rounded-xl border border-white/15 bg-white/[0.08] px-4 py-3.5 backdrop-blur-md transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/[0.12]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-brand-deep shadow-sm">
                  <point.icon className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-5 text-white">{point.title}</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-white/65">{point.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

export function BackHomeLink() {
  return (
    <Link
      href="/"
      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-muted hover:text-foreground active:scale-[0.98]"
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
        className="font-semibold text-primary transition-all duration-200 ease-out hover:underline"
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
                "relative z-[1] grid h-6 w-6 place-items-center rounded-full border-2 text-[11px] font-semibold transition-all duration-200",
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
    description: "Upload files and import verified ones from DigiLocker.",
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
