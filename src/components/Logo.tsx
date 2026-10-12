import Link from "next/link";
import { Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  href = "/",
  className,
  wordmarkClassName,
}: {
  href?: string;
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 text-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]",
        className
      )}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
        <Landmark className="h-5 w-5" aria-hidden />
      </span>
      <span className={cn("text-base font-semibold tracking-[-0.01em]", wordmarkClassName)}>
        LoanPortal
      </span>
    </Link>
  );
}
