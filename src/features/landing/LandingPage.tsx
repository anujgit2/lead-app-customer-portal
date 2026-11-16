import { Briefcase, Check, ChevronDown, Files, FileText, History, Share2, UserCircle, Users } from "lucide-react";
import { LandingHeader } from "@/features/landing/LandingHeader";
import { LandingFooter } from "@/features/landing/LandingFooter";
import {
  CUSTOMER_CHECKS,
  CUSTOMER_STEPS,
  FAQS,
  PARTNER_CHECKS,
  PARTNER_STEPS,
  SECURITY_POINTS,
  TOOLKIT,
} from "@/features/landing/landing-content";
import { CUSTOMER_PORTAL_URL, PARTNER_PORTAL_URL } from "@/lib/portal-urls";
import { cn } from "@/lib/utils";

const TOOLKIT_ICONS = [UserCircle, FileText, Files, Share2, Briefcase, Users];

const LANDING_CARD_FEATURES = [
  { icon: FileText, title: "Guided application", description: "Saved at every step, so you can stop and come back." },
  { icon: History, title: "A profile with history", description: "Your details are kept once, and every change is remembered." },
  { icon: Files, title: "Documents in one place", description: "Upload files and keep the earlier versions on record." },
  { icon: Share2, title: "Secure sharing", description: "Send a private link to your lender that you control." },
];

const interactive = "transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]";

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
      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#3d8574]">{eyebrow}</p>
      <h2
        id={id}
        className="font-display mt-3 text-[30px] font-extrabold leading-[36px] tracking-[-0.035em] text-[#1a2e40] sm:text-[42px] sm:leading-[46px]"
      >
        {title}
      </h2>
      {description && <p className="mt-3 text-base leading-7 text-[#4e6373]">{description}</p>}
    </div>
  );
}

function CheckList({ items, tone }: { items: string[]; tone: "light" | "dark" }) {
  return (
    <ul className={cn("mt-5 mb-6 flex flex-col gap-2.5 text-[13px]", tone === "dark" ? "text-[#b8cad6]" : "text-[#3a5060]")}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <Check className={cn("mt-0.5 h-4 w-4 shrink-0", tone === "dark" ? "text-[#79d7c2]" : "text-[#3d8574]")} strokeWidth={3} aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <LandingHeader />

      <main className="flex flex-col">
        {/* Hero */}
        <section aria-label="Overview" className="relative overflow-hidden bg-[linear-gradient(120deg,#eef3f7,#dfeaf1,#d9e9e4,#e2ecf0)]">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-36 -top-64 h-[580px] w-[580px] rounded-full bg-[radial-gradient(circle,rgba(58,140,168,0.32),transparent_68%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-80 -left-72 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(61,133,116,0.28),transparent_70%)]"
          />
          <div className="relative mx-auto grid max-w-[1180px] items-center gap-14 px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="min-w-0">
              <span className="lp-rise inline-flex items-center gap-2 rounded-full border border-[#c5dae6] bg-white/85 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#2b6b8a]">
                <span className="h-[7px] w-[7px] rounded-full bg-[#3d8574]" aria-hidden />
                A connected lending workspace
              </span>
              <h1 className="font-display lp-rise mt-6 max-w-[620px] text-[40px] font-extrabold leading-[1.08] tracking-[-0.055em] text-[#0f2030] sm:text-[58px]" style={{ animationDelay: "0.08s" }}>
                Make every step of the{" "}
                <span className="bg-[linear-gradient(90deg,#2b6b8a,#3d8574,#3a8ca8,#2b6b8a)] bg-[length:300%_100%] bg-clip-text text-transparent">
                  loan journey
                </span>{" "}
                feel simpler.
              </h1>
              <p className="lp-rise mt-5 max-w-[555px] text-base leading-[1.8] text-[#3e5565]" style={{ animationDelay: "0.16s" }}>
                One organised platform for customer and business profiles, loan applications, documents and secure sharing — with a dedicated workspace for lending partners to manage leads and applications.
              </p>
              <div className="lp-rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: "0.24s" }}>
                <a
                  href={CUSTOMER_PORTAL_URL}
                  className={cn("inline-flex h-12 items-center rounded-lg bg-gradient-to-br from-[#2b6b8a] to-[#3a8ca8] px-6 text-[15px] font-semibold text-white shadow-md", interactive)}
                >
                  Get started <span className="ml-2" aria-hidden>→</span>
                </a>
                <a
                  href="#platform"
                  className={cn("inline-flex h-12 items-center rounded-lg border border-[#c5d3db] bg-white/85 px-6 text-[15px] font-semibold text-[#3a5a6e] hover:bg-white", interactive)}
                >
                  Explore the platform
                </a>
              </div>
              <div className="lp-rise mt-6 flex items-center gap-2.5 text-xs font-medium text-[#3e5565]" style={{ animationDelay: "0.32s" }}>
                <span className="grid h-[19px] w-[19px] place-items-center rounded-full bg-[#d4eae2] text-[11px] font-extrabold text-[#2b6b5a]" aria-hidden>
                  ✓
                </span>
                <span>One workspace. Clearer collaboration. More organised applications.</span>
              </div>
              <p className="lp-rise mt-4 text-[11px] leading-relaxed text-[#8a97a5]" style={{ animationDelay: "0.38s" }}>
                Loantris supports the application journey. Lending decisions are made by the relevant lender.
              </p>
            </div>

            <div className="lp-rise relative mx-auto flex min-h-[435px] w-full max-w-[505px] items-center justify-center" style={{ animationDelay: "0.3s" }}>
              <div className="relative w-full rotate-[0.5deg] overflow-hidden rounded-[18px] border border-[#d5dee4] bg-white shadow-[0_30px_80px_rgba(30,55,75,0.16)]">
                <div className="flex items-center gap-1.5 border-b border-[#e3eaee] bg-[#f3f7f6] px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e7b4ab]" aria-hidden />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ecd39a]" aria-hidden />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#8cc4b0]" aria-hidden />
                  <span className="ml-3 text-xs font-medium text-[#5e7080]">Your application</span>
                </div>
                <div className="relative h-[190px] overflow-hidden border-b border-[#e3eaee] bg-[#e6f1ee]">
                  <span className="lp-drift absolute -right-6 -top-8 h-28 w-28 rounded-full bg-[#d4eae2]/70" aria-hidden />
                  <span className="lp-drift absolute -bottom-10 -left-8 h-32 w-32 rounded-full bg-[#d4eae2]/60" style={{ animationDelay: "-4s" }} aria-hidden />
                  <svg viewBox="0 0 320 170" className="relative h-full w-full" role="img" aria-label="Documents checked and shared securely">
                    <rect x="8" y="30" width="72" height="100" rx="9" fill="#ffffff" stroke="#c5d9d1" strokeWidth="1.5" />
                    <rect x="20" y="20" width="78" height="104" rx="9" fill="#ffffff" stroke="#b9d3c9" strokeWidth="1.5" />
                    <rect x="32" y="36" width="30" height="7" rx="3.5" fill="#2b6b5a" />
                    <rect x="32" y="54" width="54" height="5" rx="2.5" fill="#d3e3dd" />
                    <rect x="32" y="66" width="46" height="5" rx="2.5" fill="#d3e3dd" />
                    <rect x="32" y="78" width="50" height="5" rx="2.5" fill="#d3e3dd" />
                    <rect x="32" y="90" width="36" height="5" rx="2.5" fill="#d3e3dd" />
                    <circle className="lp-pop" cx="74" cy="106" r="11" fill="#2b6b5a" style={{ animationDelay: "0.9s" }} />
                    <path className="lp-pop" d="M69 106l3.5 3.5 6-7" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ animationDelay: "0.9s" }} />
                    <line className="lp-flow" x1="106" y1="85" x2="126" y2="85" stroke="#2b6b5a" strokeWidth="2" strokeLinecap="round" />
                    <g className="lp-float">
                      <path d="M160 48l26 9v23c0 17-11 29-26 36-15-7-26-19-26-36V57z" fill="#2b6b5a" />
                      <path d="M149 84l8 8 15-17" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                    <line className="lp-flow" x1="194" y1="85" x2="214" y2="85" stroke="#2b6b5a" strokeWidth="2" strokeLinecap="round" style={{ animationDelay: "-0.6s" }} />
                    <rect x="222" y="22" width="76" height="110" rx="11" fill="#ffffff" stroke="#b9d3c9" strokeWidth="1.5" />
                    <rect x="234" y="36" width="52" height="22" rx="5" fill="#d4eae2" />
                    <path d="M247 47l4 4 8-8" fill="none" stroke="#2b6b5a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="234" y="70" width="40" height="5" rx="2.5" fill="#d3e3dd" />
                    <rect x="234" y="82" width="30" height="5" rx="2.5" fill="#d3e3dd" />
                    <rect x="234" y="108" width="52" height="14" rx="7" fill="#2b6b5a" />
                  </svg>
                </div>
                <div className="grid grid-cols-2 gap-px bg-[#e3eaee]">
                  {LANDING_CARD_FEATURES.map((feature) => (
                    <div key={feature.title} className="flex items-start gap-4 bg-white p-6">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#2b6b5a] text-white" aria-hidden>
                        <feature.icon size={16} strokeWidth={2.2} />
                      </span>
                      <div className="min-w-0">
                        <strong className="block text-[13px] font-bold leading-tight text-[#1a2e40]">{feature.title}</strong>
                        <small className="mt-1.5 block text-[11px] leading-relaxed text-[#5e7080]">{feature.description}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Two portals */}
        <section id="platform" aria-labelledby="platform-h" className="scroll-mt-16 bg-white py-16 sm:py-20">
          <div className="mx-auto flex max-w-[1180px] flex-col gap-10 px-4 sm:px-6">
            <SectionHeading
              id="platform-h"
              eyebrow="Two connected workspaces"
              title="Built for customers and the people who help them"
              description="A shared journey with the right tools for each role. Customers stay in control of their information while partners keep their pipeline organised."
              align="center"
            />
            <div className="grid gap-[18px] lg:grid-cols-2">
              <article className={cn("flex flex-col rounded-2xl border border-[#d5dee6] bg-white p-7 shadow-[0_8px_28px_rgba(30,53,71,0.06)] hover:shadow-[0_20px_44px_rgba(30,53,71,0.12)]", interactive)}>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#3d8574]">Customer portal</span>
                <h3 className="font-display mt-4 text-[23px] font-bold tracking-tight text-[#1a2e40]">
                  Your business details, documents and applications — organised.
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#4e6373]">
                  Keep your information organised and make applying for financing easier, whether you&apos;re borrowing as an individual or for your business.
                </p>
                <CheckList items={CUSTOMER_CHECKS} tone="light" />
                <a href={CUSTOMER_PORTAL_URL} className="mt-auto inline-flex h-11 w-fit items-center rounded-lg bg-[#e0edf4] px-4 text-sm font-bold text-[#2b5f7d] hover:bg-[#d3e5ef]">
                  Enter customer portal →
                </a>
              </article>
              <article className={cn("flex flex-col rounded-2xl bg-[linear-gradient(145deg,#1a2e40,#243e52)] p-7 text-white shadow-[0_8px_28px_rgba(30,53,71,0.2)] hover:shadow-[0_20px_44px_rgba(30,53,71,0.3)]", interactive)}>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#7dc4b8]">Partner portal</span>
                <h3 className="font-display mt-4 text-[23px] font-bold tracking-tight text-white">
                  A structured workspace for leads and loan applications.
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#c0ccdc]">
                  Manage the customer journey from first enquiry through application submission, with visibility for your team.
                </p>
                <CheckList items={PARTNER_CHECKS} tone="dark" />
                <a href={PARTNER_PORTAL_URL} className="mt-auto inline-flex h-11 w-fit items-center rounded-lg bg-white px-4 text-sm font-bold text-[#1a2e40] hover:bg-white/90">
                  Enter partner portal →
                </a>
              </article>
            </div>
          </div>
        </section>

        {/* Toolkit */}
        <section id="features" aria-labelledby="feat-h" className="scroll-mt-16 border-y border-[#e4eaf0] bg-[#f3f6f8] py-16 sm:py-20">
          <div className="mx-auto flex max-w-[1180px] flex-col gap-10 px-4 sm:px-6">
            <SectionHeading
              id="feat-h"
              eyebrow="The Loantris toolkit"
              title="A more organised lending workflow"
              description="Bring the essential parts of the lending application journey into one secure workspace."
              align="center"
            />
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {TOOLKIT.map((item, index) => {
                const Icon = TOOLKIT_ICONS[index];
                return (
                  <article
                    key={item.title}
                    className={cn("flex flex-col gap-3 rounded-[14px] border border-[#d5dee6] bg-white p-[22px] shadow-[0_4px_18px_rgba(30,53,71,0.04)] hover:shadow-[0_16px_36px_rgba(30,53,71,0.1)]", interactive)}
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-[10px] border border-[#cddfe0] bg-gradient-to-br from-[#e4f0ee] to-[#dde9f2] text-[#2b6b5a]">
                      <Icon className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <h3 className="mt-2 text-base font-semibold tracking-tight text-[#1a2e40]">{item.title}</h3>
                    <p className="text-[13px] leading-6 text-[#4e6373]">{item.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" aria-labelledby="how-h" className="scroll-mt-16 bg-white py-16 sm:py-20">
          <div className="mx-auto flex max-w-[1180px] flex-col gap-10 px-4 sm:px-6">
            <SectionHeading
              id="how-h"
              eyebrow="A clear process"
              title="From profile to application progress"
              description="Customers and partners work together, with each side seeing the information and actions relevant to them."
              align="center"
            />
            <div className="flex flex-col gap-5">
              {[CUSTOMER_STEPS, PARTNER_STEPS].map((group, groupIndex) => (
                <ol key={groupIndex} className="grid gap-5 sm:grid-cols-3">
                  {group.map((step) => (
                    <li
                      key={step.label}
                      className={cn("rounded-b-[15px] border-t-[3px] border-t-[#3d8574] bg-white p-6 text-left shadow-[0_4px_18px_rgba(30,53,71,0.04)] hover:shadow-[0_16px_36px_rgba(30,53,71,0.1)]", interactive)}
                    >
                      <span className="inline-block rounded-md bg-[#3d8574] px-2.5 py-1 text-[11px] font-extrabold text-white">{step.label}</span>
                      <h3 className="mt-3 text-[17px] font-semibold text-[#1a2e40]">{step.title}</h3>
                      <p className="mt-2 text-[13px] leading-6 text-[#4e6373]">{step.description}</p>
                    </li>
                  ))}
                </ol>
              ))}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section id="security" aria-labelledby="trust-h" className="scroll-mt-16 border-y border-[#e4eaf0] bg-[#f3f6f8] py-16 sm:py-20">
          <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
            <div className="relative overflow-hidden rounded-[18px] bg-[linear-gradient(145deg,#1a2e40,#243e52)] p-8 text-[#c5d8e4]">
              <span className="inline-block rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#8ec4b8]">
                Privacy by design
              </span>
              <h3 id="trust-h" className="font-display mt-4 text-2xl font-bold text-white">
                Built around responsible information handling.
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#a8c0d0]">
                Loantris is designed to help customers manage sensitive financial documents and share information only when it is needed for an application.
              </p>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#3d8574]">Trust &amp; control</p>
              <h2 className="font-display mt-3 text-[30px] font-extrabold leading-9 tracking-[-0.035em] text-[#1a2e40] sm:text-[38px]">
                Clear permissions. More organised collaboration.
              </h2>
              <div className="mt-6 grid gap-5">
                {SECURITY_POINTS.map((point) => (
                  <div key={point.title}>
                    <strong className="font-display text-base font-bold text-[#1a2e40]">{point.title}</strong>
                    <p className="mt-1 text-[13px] leading-6 text-[#4e6373]">{point.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-h" className="scroll-mt-16 bg-white py-16 sm:py-20">
          <div className="mx-auto flex max-w-[1180px] flex-col gap-10 px-4 sm:px-6">
            <SectionHeading id="faq-h" eyebrow="FAQs" title="Good to know" description="A few things to help you get started." align="center" />
            <div className="mx-auto w-full max-w-[800px]">
              {FAQS.map((item, index) => (
                <details key={item.question} open={index === 0} className="group border-b border-[#dde5ea] py-[18px]">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-bold text-[#1a2e40] [&::-webkit-details-marker]:hidden">
                    {item.question}
                    <ChevronDown className="h-4 w-4 shrink-0 text-[#40566b] transition-transform duration-200 group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="mt-2 text-sm leading-[1.65] text-[#4e6373]">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section aria-labelledby="cta-h" className="bg-[linear-gradient(135deg,#1a2e40_0%,#243e52_50%,#1e3648_100%)] py-14">
          <div className="mx-auto flex max-w-[1180px] flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6">
            <div className="min-w-0">
              <h2 id="cta-h" className="font-display text-[26px] font-extrabold leading-8 tracking-[-0.03em] text-white sm:text-[30px] sm:leading-9">
                Bring more clarity to your lending journey.
              </h2>
              <p className="mt-2 max-w-[54ch] text-[15px] leading-6 text-[#a0b8c8]">
                Choose the workspace that matches the way you use Loantris.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <a href={CUSTOMER_PORTAL_URL} className={cn("inline-flex h-12 items-center rounded-lg bg-white px-5 text-[15px] font-semibold text-[#1a2e40]", interactive)}>
                I&apos;m a customer →
              </a>
              <a href={PARTNER_PORTAL_URL} className={cn("inline-flex h-12 items-center rounded-lg border border-white/30 px-5 text-[15px] font-semibold text-white hover:bg-white/10", interactive)}>
                I&apos;m a partner →
              </a>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
