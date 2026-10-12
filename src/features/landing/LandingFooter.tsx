import Link from "next/link";
import { Landmark, Mail, Phone } from "lucide-react";
import { siteCopy } from "@/lib/site";

const EXPLORE = [
  { label: "How it works", href: "#how" },
  { label: "Features", href: "#features" },
  { label: "Questions", href: "#faq" },
];

const ACCOUNT = [
  { label: "Create account", href: "/auth/register" },
  { label: "Sign in", href: "/auth/login" },
  { label: "Forgot password", href: "/auth/forgot-password" },
];

const LEGAL = [
  { label: "Help centre", href: "#faq" },
  { label: "Contact us", href: "#faq" },
  { label: "Grievance redressal", href: "#faq" },
  { label: "Privacy policy", href: "/privacy" },
  { label: "Terms of use", href: "/terms" },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <nav aria-label={title} className="min-w-0">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-white">{title}</p>
      <ul className="flex flex-col gap-1">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="inline-flex min-h-7 items-center text-sm text-white/60 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:text-white active:scale-[0.98]"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-brand-deep text-white">
      <div className="mx-auto grid max-w-[1160px] grid-cols-2 gap-10 px-4 pt-14 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="col-span-2 flex min-w-0 flex-col gap-4 md:col-span-1">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <span className="grid h-8 w-8 place-items-center rounded-md bg-white text-brand-deep">
              <Landmark className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-base font-semibold tracking-[-0.01em]">LoanPortal</span>
          </Link>
          <p className="max-w-[36ch] text-sm leading-6 text-white/60">
            Apply for your loan online and keep every document in one place.
          </p>
          <div className="flex flex-col gap-2 text-[13px] text-white/60">
            <span className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4 text-brand-glow" aria-hidden />
              {siteCopy.supportEmail}
            </span>
            <span className="inline-flex items-center gap-2">
              <Phone className="h-4 w-4 text-brand-glow" aria-hidden />
              {siteCopy.supportPhone} · {siteCopy.supportHours}
            </span>
          </div>
        </div>

        <FooterColumn title="Explore" links={EXPLORE} />
        <FooterColumn title="Your account" links={ACCOUNT} />
        <FooterColumn title="Support and legal" links={LEGAL} />
      </div>

      <div className="mx-auto mt-12 flex max-w-[1160px] flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-white/10 px-4 py-5 text-xs leading-[18px] text-white/50 sm:px-6">
        <span>
          © {year} LoanPortal · {siteCopy.legalEntity}
        </span>
        <span>{siteCopy.registration}</span>
      </div>
    </footer>
  );
}
