"use client";

import { useState } from "react";
import Link from "next/link";
import { useTenantUi } from "@/features/tenant-ui/TenantUiProvider";
import { cn } from "@/lib/utils";

/**
 * The Loantris wordmark, from loantris_variation_05: lowercase Manrope Bold, "loan" in deep navy
 * and "tris." in accent blue. Same as public/brand/loantris-wordmark.svg.
 */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display whitespace-nowrap text-[24px] font-bold leading-[1.05] tracking-[-0.035em] text-[#183b5b] dark:text-white",
        className
      )}
    >
      loan<span className="text-[#2c83c7] dark:text-[#71c8e4]">tris.</span>
    </span>
  );
}

/** Tagline shown under the wordmark in the lockup. Change it here only. */
export const BRAND_TAGLINE = "Profiles, documents and loans, in one place.";

/** Wordmark with the tagline under it. Used where the brand needs its tagline, such as the footer. */
export function BrandLockup({
  className,
  wordmarkClassName = "text-[30px]",
}: {
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("inline-flex flex-col items-start gap-2", className)}>
      <BrandWordmark className={wordmarkClassName} />
      <span className="text-[13px] font-medium leading-5 opacity-70">{BRAND_TAGLINE}</span>
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
  const [trackedLogoUrl, setTrackedLogoUrl] = useState(logoUrl);

  // Reset the failure flag when the logo URL changes, during render rather than in an effect.
  if (trackedLogoUrl !== logoUrl) {
    setTrackedLogoUrl(logoUrl);
    setImageFailed(false);
  }

  return (
    <Link
      href={href}
      aria-label={logoAlt || "Loantris home"}
      className={cn(
        "inline-flex items-center text-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]",
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
        <BrandWordmark className={wordmarkClassName} />
      )}
    </Link>
  );
}
