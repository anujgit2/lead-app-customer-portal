"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { useTenantUi } from "@/features/tenant-ui/TenantUiProvider";
import { cn } from "@/lib/utils";

function DefaultMark() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
      <Landmark className="h-5 w-5" aria-hidden />
    </span>
  );
}

export function Logo({
  href = "/",
  className,
  wordmarkClassName,
}: {
  href?: string;
  className?: string;
  wordmarkClassName?: string;
}) {
  const { config } = useTenantUi();
  const logoUrl = config.theme.logoUrl;
  const logoAlt = config.theme.logoAlt;
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [logoUrl]);

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 text-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]",
        className
      )}
    >
      {logoUrl && !imageFailed ? (
        <img
          src={logoUrl}
          alt=""
          className="h-8 w-auto max-w-[140px] object-contain"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <DefaultMark />
      )}
      <span className={cn("text-base font-semibold tracking-[-0.01em]", wordmarkClassName)}>
        {logoAlt || "LoanPortal"}
      </span>
    </Link>
  );
}
