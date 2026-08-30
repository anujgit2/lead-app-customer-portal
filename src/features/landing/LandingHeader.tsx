"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Business loans", href: "#business-loans" },
  { label: "Grants & subsidies", href: "#grants" },
  { label: "How it works", href: "#how-it-works" },
];

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-200 ease-out",
        scrolled
          ? "bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-all duration-200 ease-out active:scale-[0.98]"
        >
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold tracking-tight text-slate-900">
            LoanPortal
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-500 transition-all duration-200 ease-out hover:text-slate-900 hover:bg-slate-50"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            className="hidden sm:inline-flex transition-all duration-200 ease-out"
          >
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button
            asChild
            className="transition-all duration-200 ease-out hover:-translate-y-0.5"
          >
            <Link href="/auth/register">Sign up</Link>
          </Button>

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="lg:hidden p-2 rounded-lg text-slate-600 transition-all duration-200 ease-out hover:bg-slate-100 active:scale-[0.98]"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white">
          <nav className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 transition-all duration-200 ease-out hover:bg-slate-50 hover:text-slate-900"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/auth/login"
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 transition-all duration-200 ease-out hover:bg-slate-50 hover:text-slate-900 sm:hidden"
            >
              Sign in
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
