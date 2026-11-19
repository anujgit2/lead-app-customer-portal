"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { SignInMenu } from "@/features/landing/SignInMenu";
import { landingSectionHref } from "@/lib/portal-urls";

const NAV_LINKS = [
  { label: "Solutions", hash: "platform" },
  { label: "How it works", hash: "how" },
  { label: "Trust & security", hash: "security" },
  { label: "Resources", hash: "faq" },
];

const interactive =
  "transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]";

const noopSubscribe = () => () => {};

function NavLink({ label, hash }: { label: string; hash: string }) {
  // Server render and first client render use "/#hash"; after hydration the
  // href follows the host (customer hosts point at the landing host).
  const href = useSyncExternalStore(
    noopSubscribe,
    () => landingSectionHref(window.location, hash),
    () => `/#${hash}`
  );
  return (
    <a
      href={href}
      className="inline-flex h-9 items-center rounded-full px-4 text-sm font-medium text-foreground/70 transition-all duration-200 ease-out hover:bg-primary-soft hover:text-primary-soft-foreground active:scale-[0.98]"
    >
      {label}
    </a>
  );
}

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/85 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1160px] items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <Link href="/" aria-label="Loantris home" className="inline-flex shrink-0 items-center">
          <Image src="/brand/loantris-primary.svg" alt="Loantris" width={141} height={32} className="h-8 w-auto" />
        </Link>

        <nav aria-label="Page sections" className="hidden items-center gap-1 min-[881px]:flex">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.hash} label={link.label} hash={link.hash} />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <SignInMenu className={`font-semibold ${interactive}`} />
        </div>
      </div>
    </header>
  );
}
