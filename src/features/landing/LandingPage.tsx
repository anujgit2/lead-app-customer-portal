"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  Info,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingHeader } from "@/features/landing/LandingHeader";
import { LandingFooter } from "@/features/landing/LandingFooter";
import {
  GRANT_PROGRAMS,
  LOAN_PROGRAMS,
  STATS,
  STEPS,
  type ProgramCard,
} from "@/features/landing/landing-content";
import { cn } from "@/lib/utils";

function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <span className="inline-flex items-center rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-xs font-medium tracking-tight text-slate-600">
        {eyebrow}
      </span>
      <h2 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
        {title}
      </h2>
      <p className="mt-3 text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}

function ProgramGrid({
  programs,
  columns,
}: {
  programs: ProgramCard[];
  columns: 3 | 4;
}) {
  return (
    <div
      className={cn(
        "grid gap-5 sm:grid-cols-2",
        columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
      )}
    >
      {programs.map((program) => (
        <article
          key={program.name}
          className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_12px_40px_rgb(0,0,0,0.07)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary transition-all duration-200 ease-out group-hover:bg-primary group-hover:text-white">
            <program.icon className="h-5 w-5" />
          </div>

          <h3 className="mt-4 font-semibold tracking-tight text-slate-900">
            {program.name}
          </h3>
          <p className="mt-1 font-semibold tracking-tight text-primary">
            {program.amount}
          </p>
          <p className="mt-2.5 text-sm leading-relaxed text-slate-500">
            {program.summary}
          </p>

          <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            {program.highlights.map((highlight) => (
              <li key={highlight} className="flex gap-2 text-sm text-slate-600">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span className="leading-relaxed">{highlight}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/40 pt-28 pb-16 sm:pt-36 sm:pb-20">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 lg:grid-cols-2 lg:gap-16">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                <Sparkles className="h-3 w-3" />
                Collateral-free MSME credit up to ₹10 crore
              </span>

              <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
                Government-backed funding for Indian businesses
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-500">
                Compare MUDRA, CGTMSE, Stand-Up India, and PMEGP alongside
                startup grants and subsidies. Build your profile once and apply
                without running between bank branches.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="xl"
                  className="gap-2 transition-all duration-200 ease-out hover:-translate-y-0.5"
                >
                  <Link href="/auth/register">
                    Get started free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="xl"
                  variant="outline"
                  className="transition-all duration-200 ease-out hover:-translate-y-0.5"
                >
                  <Link href="/auth/login">Sign in</Link>
                </Button>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Bank-grade encryption
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Free to check your eligibility
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-3xl border border-slate-100 shadow-[0_20px_60px_rgb(0,0,0,0.10)]">
                <Image
                  src="/images/hero-india-msme.jpg"
                  alt="Two Indian small business owners reviewing their loan application on a tablet in their textile workshop"
                  width={1600}
                  height={1066}
                  priority
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="absolute -bottom-6 -left-4 hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_12px_40px_rgb(0,0,0,0.08)] sm:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold tracking-tight text-slate-900">
                      ₹20 lakh
                    </p>
                    <p className="text-xs text-slate-500">
                      MUDRA ceiling under Tarun Plus
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-slate-100 bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-10 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-semibold tracking-tight text-slate-900">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Business loans */}
        <section id="business-loans" className="scroll-mt-20 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading
              eyebrow="Business loans"
              title="Four schemes that cover most Indian MSMEs"
              description="These are central government schemes delivered through scheduled banks, RRBs, small finance banks, and NBFCs — with the government guaranteeing part of the risk so you can borrow without pledging property."
            />

            <div className="mt-10">
              <ProgramGrid programs={LOAN_PROGRAMS} columns={4} />
            </div>
          </div>
        </section>

        {/* Grants and subsidies */}
        <section id="grants" className="scroll-mt-20 bg-slate-50/70 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="order-2 overflow-hidden rounded-3xl border border-slate-100 shadow-[0_20px_60px_rgb(0,0,0,0.08)] lg:order-1">
                <Image
                  src="/images/grants-india-startup.jpg"
                  alt="A young Indian startup team examining a hardware prototype in an incubator workshop"
                  width={1200}
                  height={800}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="order-1 lg:order-2">
                <SectionHeading
                  eyebrow="Grants & subsidies"
                  title="Support you do not pay back"
                  description="India runs subsidies and seed grants alongside its lending schemes. They are narrower than loans and competitively assessed, but they reduce what you borrow rather than adding to it."
                />

                <div className="mt-5 flex gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-5">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p className="text-sm leading-relaxed text-amber-900">
                    <span className="font-medium">Worth knowing:</span> most
                    Indian &ldquo;grants&rdquo; are really subsidies attached to
                    a loan. PMEGP and CLCSS reduce your principal, not your
                    paperwork. Only the Startup India Seed Fund pays out as a
                    true non-repayable grant.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <ProgramGrid programs={GRANT_PROGRAMS} columns={3} />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading
              eyebrow="How it works"
              title="From sign-up to submitted in three steps"
              description="One profile, reused across every scheme you apply to."
            />

            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <div
                  key={step.title}
                  className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgb(0,0,0,0.07)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary transition-all duration-200 ease-out group-hover:bg-primary group-hover:text-white">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-slate-300">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 font-semibold tracking-tight text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-white pb-16 sm:pb-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-14 text-center sm:px-16">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl"
              />

              <div className="relative">
                <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  See which schemes your business qualifies for
                </h2>
                <p className="mx-auto mt-3 max-w-xl leading-relaxed text-slate-300">
                  Create an account in two minutes. No invitation needed and no
                  commitment to apply.
                </p>

                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button
                    asChild
                    size="xl"
                    className="gap-2 bg-white text-slate-900 shadow transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-100"
                  >
                    <Link href="/auth/register">
                      Create your account
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="xl"
                    variant="outline"
                    className="border-white/20 bg-transparent text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
                  >
                    <Link href="/auth/login">I already have an account</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
