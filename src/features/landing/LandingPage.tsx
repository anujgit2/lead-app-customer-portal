import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  Files,
  History,
  Lock,
  Share2,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurvedGrid } from "@/components/CurvedGrid";
import { LandingHeader } from "@/features/landing/LandingHeader";
import { LandingFooter } from "@/features/landing/LandingFooter";
import {
  FAQS,
  HERO_POINTS,
  HOW_IT_WORKS,
  MORE_FEATURES,
  PROFILE_POINTS,
  SHARE_POINTS,
} from "@/features/landing/landing-content";
import {
  FaqIllustration,
  HeroIllustration,
  ShareIllustration,
  VersionsIllustration,
} from "@/features/landing/illustrations";
import { siteCopy } from "@/lib/site";
import { cn } from "@/lib/utils";

const HERO_ICONS = [FileText, History, Files, Share2];
const MORE_ICONS = [FileText, Files, Lock];
const TRUST = ["Saved as you go", "Private by default", "Earlier versions kept"];

const interactive =
  "transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]";

function IconTile({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm",
        className
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </span>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = "left",
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <span className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-soft-foreground ring-1 ring-inset ring-primary/20">
        {eyebrow}
      </span>
      <h2
        id={id}
        className="mt-3 text-[28px] font-semibold leading-[34px] tracking-[-0.03em] text-foreground sm:text-[34px] sm:leading-[40px]"
      >
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <LandingHeader />

      <main className="flex flex-col">
        {/* Hero */}
        <section aria-label="Overview" className="lp-hero-bg relative overflow-hidden text-white">
          <CurvedGrid />
          <div className="relative mx-auto grid max-w-[1160px] items-center gap-12 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:pb-24">
            <div className="min-w-0">
              <span
                className="lp-rise inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur"
                style={{ animationDelay: "0s" }}
              >
                <Sparkles className="h-3.5 w-3.5 text-brand-glow" aria-hidden />
                Guided loan applications, made simple
              </span>
              <h1
                className="lp-rise mt-5 max-w-[16ch] text-[38px] font-semibold leading-[44px] tracking-[-0.04em] sm:text-[52px] sm:leading-[58px]"
                style={{ animationDelay: "0.05s" }}
              >
                Apply for your loan online. Keep{" "}
                <span className="lp-accent-text">every document</span> in one place.
              </h1>
              <p
                className="lp-rise mt-5 max-w-[46ch] text-base leading-7 text-white/75 sm:text-[17px]"
                style={{ animationDelay: "0.15s" }}
              >
                One guided application, a profile that remembers your details, and secure sharing with your lender.
              </p>
              <div className="lp-rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: "0.25s" }}>
                <Button
                  asChild
                  size="lg"
                  className={cn(
                    "h-12 gap-2 bg-white px-6 text-[15px] font-semibold text-brand-deep shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] hover:bg-white/90",
                    interactive
                  )}
                >
                  <Link href="/auth/register">
                    Create an account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className={cn(
                    "h-12 border-white/25 bg-white/5 px-6 text-[15px] font-semibold text-white backdrop-blur hover:bg-white/15 hover:text-white",
                    interactive
                  )}
                >
                  <Link href="/auth/login">Sign in</Link>
                </Button>
              </div>
              <ul
                className="lp-rise mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/70"
                style={{ animationDelay: "0.35s" }}
              >
                {TRUST.map((item) => (
                  <li key={item} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-brand-glow" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <p
                className="lp-rise mt-6 max-w-[52ch] border-l-2 border-brand-glow/60 pl-3 text-[13px] leading-5 text-white/65"
                style={{ animationDelay: "0.42s" }}
              >
                Invited by a lender or agent? Open the link in your email and your application will be waiting for you.
              </p>
            </div>

            <div className="lp-rise relative mx-auto w-full max-w-[460px]" style={{ animationDelay: "0.2s" }}>
              <div aria-hidden className="absolute -inset-4 rounded-[28px] bg-brand-glow/20 blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl bg-card text-foreground shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/20">
                <div className="flex items-center gap-1.5 border-b border-border bg-muted/70 px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                  <span className="ml-3 text-xs font-medium text-muted-foreground">Your application</span>
                </div>
                <div className="border-b border-border bg-primary-soft">
                  <HeroIllustration />
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2">
                  {HERO_POINTS.map((point, index) => {
                    const Icon = HERO_ICONS[index];
                    return (
                      <li
                        key={point.title}
                        className={cn(
                          "flex items-start gap-3 border-border px-4 py-4",
                          index < HERO_POINTS.length - 1 && "border-b sm:border-b-0",
                          index < 2 && "sm:border-b",
                          index % 2 === 0 && "sm:border-r"
                        )}
                      >
                        <IconTile icon={Icon} className="h-8 w-8 rounded-md [&_svg]:h-4 [&_svg]:w-4" />
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold leading-5 text-foreground">{point.title}</p>
                          <p className="mt-0.5 text-xs leading-[18px] text-muted-foreground">{point.description}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how"
          aria-labelledby="how-h"
          className="scroll-mt-16 border-b border-border bg-card py-16 sm:py-20"
        >
          <div className="mx-auto flex max-w-[1160px] flex-col gap-10 px-4 sm:px-6">
            <SectionHeading
              id="how-h"
              eyebrow="How it works"
              title="From sign-up to your lender in four steps"
              align="center"
            />
            <ol className="lp-reveal relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <span
                aria-hidden
                className="absolute left-[12%] right-[12%] top-7 hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent lg:block"
              />
              {HOW_IT_WORKS.map((step, index) => (
                <li
                  key={step.title}
                  className={cn(
                    "relative flex flex-col items-center gap-3 rounded-xl border border-border bg-background p-6 text-center shadow-sm hover:border-primary/40 hover:shadow-md",
                    interactive
                  )}
                >
                  <span className="lp-glow grid h-10 w-10 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <h3 className="text-base font-semibold tracking-tight text-foreground">{step.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="features" aria-labelledby="feat-h" className="scroll-mt-16 py-16 sm:py-20">
          <div className="mx-auto flex max-w-[1160px] flex-col gap-10 px-4 sm:px-6">
            <SectionHeading
              id="feat-h"
              eyebrow="Features"
              title="Made for customers applying for a loan"
              description="Everything you need to apply, keep your records and share them with confidence."
            />

            <div className="lp-reveal grid gap-5 lg:grid-cols-2">
              <article
                className={cn(
                  "lp-hero-bg relative flex flex-col gap-4 overflow-hidden rounded-2xl p-7 text-white shadow-lg",
                  interactive
                )}
              >
                <CurvedGrid />
                <IconTile icon={History} className="relative bg-white text-brand-deep" />
                <h3 className="relative text-xl font-semibold tracking-tight">Your profile, with a full history</h3>
                <p className="relative max-w-[52ch] text-sm leading-6 text-white/75">
                  Your details are saved once and reused. Every change is remembered, so you can see what changed and return to an earlier version.
                </p>
                <ul className="relative flex flex-col gap-2 text-sm text-white/90">
                  {PROFILE_POINTS.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-glow" strokeWidth={3} aria-hidden />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <div className="relative mt-auto rounded-xl bg-card px-3 py-2 shadow-md">
                  <VersionsIllustration />
                </div>
              </article>

              <article
                className={cn(
                  "flex flex-col gap-4 rounded-2xl border border-border bg-card p-7 shadow-sm hover:border-primary/40 hover:shadow-lg",
                  interactive
                )}
              >
                <IconTile icon={ShieldCheck} />
                <h3 className="text-xl font-semibold tracking-tight text-foreground">Share only what you choose</h3>
                <p className="max-w-[52ch] text-sm leading-6 text-muted-foreground">
                  Send a private link to your lender. Recipients confirm their email with a one-time code before they can open anything.
                </p>
                <ul className="flex flex-col gap-2 text-sm text-foreground">
                  {SHARE_POINTS.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={3} aria-hidden />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto rounded-xl bg-primary-soft px-3 py-2">
                  <ShareIllustration />
                </div>
              </article>
            </div>

            <div className="lp-reveal grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MORE_FEATURES.map((feature, index) => (
                <div
                  key={feature.title}
                  className={cn(
                    "group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary/40 hover:shadow-md",
                    interactive
                  )}
                >
                  <IconTile
                    icon={MORE_ICONS[index]}
                    className="bg-primary-soft text-primary-soft-foreground shadow-none transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground"
                  />
                  <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{feature.title}</h3>
                  <p className="text-[13px] leading-5 text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          aria-labelledby="faq-h"
          className="lp-faq scroll-mt-16 border-y border-border bg-card py-16 sm:py-20"
        >
          <div className="mx-auto grid max-w-[1160px] gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.5fr] lg:gap-14">
            <div className="min-w-0">
              <SectionHeading
                id="faq-h"
                eyebrow="Questions"
                title="Questions people ask"
                description={`Need something else? Write to ${siteCopy.supportEmail} and we will reply within ${siteCopy.responseTime}.`}
              />
              <div className="lp-reveal mt-8 hidden max-w-[260px] lg:block">
                <FaqIllustration />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              {FAQS.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-xl border border-border bg-background transition-all duration-200 ease-out open:border-primary/40 open:bg-card open:shadow-md"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 rounded-xl px-5 py-4 text-[15px] font-semibold text-foreground transition-all duration-200 ease-out hover:text-primary active:scale-[0.98]">
                    {item.question}
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                      <ChevronDown className="lp-chev h-4 w-4 transition-transform duration-200" aria-hidden />
                    </span>
                  </summary>
                  <p className="max-w-[62ch] px-5 pb-5 text-sm leading-6 text-muted-foreground">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section aria-labelledby="cta-h" className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="lp-hero-bg relative mx-auto flex max-w-[1160px] flex-col items-start justify-between gap-6 overflow-hidden rounded-2xl px-7 py-10 text-white shadow-lg sm:flex-row sm:items-center sm:px-12">
            <CurvedGrid />
            <div className="relative min-w-0">
              <h2 id="cta-h" className="text-[26px] font-semibold leading-8 tracking-[-0.03em] sm:text-[30px] sm:leading-9">
                Ready to start your application?
              </h2>
              <p className="mt-2 max-w-[54ch] text-[15px] leading-6 text-white/75">
                Creating an account takes a few minutes. Your profile and documents will be waiting when you come back.
              </p>
            </div>
            <div className="relative flex shrink-0 flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className={cn("h-12 gap-2 bg-white px-6 font-semibold text-brand-deep hover:bg-white/90", interactive)}
              >
                <Link href="/auth/register">
                  Create an account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className={cn(
                  "h-12 border-white/25 bg-white/5 px-6 font-semibold text-white hover:bg-white/15 hover:text-white",
                  interactive
                )}
              >
                <Link href="/auth/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
