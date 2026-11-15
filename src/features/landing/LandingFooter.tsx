"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLockup } from "@/components/Logo";
import { useSupport } from "@/features/tenant-ui/use-support";
import { CUSTOMER_PORTAL_URL, PARTNER_PORTAL_URL } from "@/lib/portal-urls";

const LINK = "text-[#8fa5bc] transition-colors duration-200 hover:text-white";

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <nav aria-label={title} className="min-w-0">
      <h4 className="mb-1.5 text-xs font-semibold text-white">{title}</h4>
      <ul className="flex flex-col gap-0.5 text-xs leading-5">{children}</ul>
    </nav>
  );
}

export function LandingFooter() {
  const year = new Date().getFullYear();
  const { email, legalEntity, registration } = useSupport();

  return (
    <footer className="bg-[#0a1824] py-7 text-[#8fa5bc]">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
        <div className="grid gap-6 md:grid-cols-[2fr_1fr_1fr]">
          <div className="min-w-0">
            <Link href="/" aria-label="Loantris home" className="inline-flex">
              <BrandLockup className="text-white" wordmarkClassName="text-[24px]" />
            </Link>
            <p className="mt-1.5 max-w-[48ch] text-xs leading-5">
              A connected platform for customer profiles, loan applications, secure documents and lending partners.
            </p>
            {email && (
              <a href={`mailto:${email}`} className={`mt-1.5 block text-xs ${LINK}`}>
                {email}
              </a>
            )}
          </div>

          <FooterColumn title="Customer">
            <li>
              <a href={CUSTOMER_PORTAL_URL} className={LINK}>
                Customer sign in
              </a>
            </li>
            <li>
              <a href={`${CUSTOMER_PORTAL_URL}/auth/register/`} className={LINK}>
                Create account
              </a>
            </li>
          </FooterColumn>

          <FooterColumn title="Partner">
            <li>
              <a href={PARTNER_PORTAL_URL} className={LINK}>
                Partner sign in
              </a>
            </li>
          </FooterColumn>
        </div>

        <div className="mt-6 flex flex-col gap-1 border-t border-[#1e3044] pt-3 text-[11px] leading-4 text-[#6b8099] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p>
            © {year} Loantris{legalEntity ? ` · ${legalEntity}` : ""} ·{" "}
            <Link href="/privacy" className="hover:text-white">
              Privacy policy
            </Link>{" "}
            ·{" "}
            <Link href="/terms" className="hover:text-white">
              Terms of use
            </Link>
          </p>
          <p>Loantris is a technology platform. Loans are offered and assessed by the relevant lender.</p>
          {registration && <p>{registration}</p>}
        </div>
      </div>
    </footer>
  );
}
