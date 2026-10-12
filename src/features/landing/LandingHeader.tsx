import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { label: "How it works", href: "#how" },
  { label: "Features", href: "#features" },
  { label: "Questions", href: "#faq" },
];

const interactive =
  "transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/85 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1160px] items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <Logo wordmarkClassName="hidden min-[420px]:inline" />

        <nav aria-label="Page sections" className="hidden items-center gap-1 min-[881px]:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="inline-flex h-9 items-center rounded-full px-4 text-sm font-medium text-foreground/70 transition-all duration-200 ease-out hover:bg-primary-soft hover:text-primary-soft-foreground active:scale-[0.98]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className={`font-semibold ${interactive}`}>
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button asChild className={`lp-glow gap-1.5 font-semibold ${interactive}`}>
            <Link href="/auth/register">
              Create account
              <ArrowRight className="hidden h-4 w-4 sm:block" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
