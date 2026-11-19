"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Briefcase, Check, User, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AuthScreen, BackHomeLink, SignInLink, type BrandPoint } from "@/features/auth/AuthScreen";
import { clearFullSession } from "@/lib/session";
import { AUTH_FORM_ROUTES } from "@/features/tenant-ui/form-routes";

import { CUSTOMER_PORTAL_URL, PARTNER_PORTAL_URL } from "@/lib/portal-urls";

type Mode = "signin" | "signup";

type PortalOption = {
  key: "customer" | "partner";
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  href: string;
  external: boolean;
  cta: string;
};

// Brand panel for the signup chooser, from the "loantris-redesigned" customer sign-in layout.
const SIGNUP_ASIDE_POINTS: BrandPoint[] = [
  { title: "Individual and business profiles" },
  { title: "Loan applications in one place" },
  { title: "Secure document storage and sharing" },
  { title: "Clear application status updates" },
];

function buildOptions(mode: Mode): PortalOption[] {
  const customerSignup = mode === "signup";
  return [
    {
      key: "customer",
      icon: User,
      title: "Customer",
      description: "Apply for a loan and track it from one place.",
      features: ["Track application status", "Upload and manage documents"],
      href: customerSignup ? AUTH_FORM_ROUTES.signup : CUSTOMER_PORTAL_URL,
      external: !customerSignup,
      cta: customerSignup ? "Create customer account" : "Continue as customer",
    },
    {
      key: "partner",
      icon: Briefcase,
      title: "Partner",
      description: "Refer and manage applications for your clients.",
      features: ["Submit applications on behalf of clients", "Follow every case in your pipeline"],
      href: mode === "signup" ? `${PARTNER_PORTAL_URL}/auth/register/` : PARTNER_PORTAL_URL,
      external: true,
      cta: mode === "signup" ? "Request partner access" : "Continue as partner",
    },
  ];
}

function OptionCard({ option }: { option: PortalOption }) {
  const cardClass =
    "group flex h-full flex-col gap-4 rounded-[14px] border border-border bg-card p-5 shadow-[0_3px_14px_rgba(44,63,82,0.035)] transition-colors duration-150 hover:border-primary hover:shadow-md";
  const body = (
    <>
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground">
        <option.icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <h2 className="font-display text-lg font-bold tracking-tight text-muted-foreground">{option.title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{option.description}</p>
      </div>
      <ul className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">
        {option.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" strokeWidth={3} aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-primary">
        {option.cta}
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
      </span>
    </>
  );

  return option.external ? (
    <a href={option.href} className={cardClass}>
      {body}
    </a>
  ) : (
    <Link href={option.href} className={cardClass}>
      {body}
    </Link>
  );
}

export function PortalChooser({ mode }: { mode: Mode }) {
  const isSignin = mode === "signin";
  const options = buildOptions(mode);

  // Same reset the individual login/register screens perform.
  useEffect(() => {
    if (isSignin) clearFullSession();
  }, [isSignin]);

  if (!isSignin) {
    return (
      <AuthScreen
        topRight={<SignInLink />}
        asideTitle="Your loans. One organised place."
        asideDescription="Manage your personal and business profiles, apply for financing and keep every document close at hand."
        asideFootnote="For customers and business owners"
        points={SIGNUP_ASIDE_POINTS}
        contentClassName="max-w-[440px]"
      >
        <div>
          <h1 className="font-display text-[30px] font-extrabold leading-9 tracking-[-0.035em] text-muted-foreground">
            Create your Loantris account
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Choose how you use Loantris.</p>
        </div>

        <div className="flex flex-col gap-3.5">
          {options.map((option) => (
            <OptionCard key={option.key} option={option} />
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-[13px] text-muted-foreground">
            Already have an account?{" "}
            <Link href={AUTH_FORM_ROUTES.signin} className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
          <BackHomeLink />
        </div>
      </AuthScreen>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-card text-foreground">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="flex w-full max-w-[720px] flex-col gap-8">
          <div className="text-center">
            <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.035em]">Sign in to Loantris</h1>
            <p className="mt-2 text-sm text-muted-foreground">Choose how you use Loantris.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {options.map((option) => (
              <OptionCard key={option.key} option={option} />
            ))}
          </div>

          <p className="text-center text-[13px] text-muted-foreground">
            New to Loantris?{" "}
            <Link href={AUTH_FORM_ROUTES.signup} className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
