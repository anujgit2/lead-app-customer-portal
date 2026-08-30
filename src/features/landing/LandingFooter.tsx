import React from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";

const FOOTER_SECTIONS = [
  {
    title: "Funding",
    links: [
      { label: "Business loans", href: "#business-loans" },
      { label: "Grants & subsidies", href: "#grants" },
      { label: "How it works", href: "#how-it-works" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/auth/login" },
      { label: "Create account", href: "/auth/register" },
      { label: "Forgot password", href: "/auth/forgot-password" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-100 bg-slate-50/70">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold tracking-tight text-slate-900">
                LoanPortal
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              A single origination workspace for Indian MSME loans, subsidies,
              and startup grants.
            </p>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                {section.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-500 transition-all duration-200 ease-out hover:text-slate-900"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-slate-200/70 pt-8">
          <p className="text-xs leading-relaxed text-slate-500">
            LoanPortal is an independent loan origination platform. It is not a
            government body and is not affiliated with or endorsed by the
            Ministry of MSME, SIDBI, KVIC, DPIIT, or any bank. Scheme amounts,
            subsidy rates, and eligibility shown here reflect published
            Government of India guidance as of August 2026 and change by circular
            and budget announcement. Nothing here is an offer of credit or a
            guarantee of funding; every application is subject to lender or
            nodal agency approval.
          </p>
          <p className="mt-4 text-xs text-slate-400">
            © {new Date().getFullYear()} LoanPortal. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
