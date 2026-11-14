"use client";

import type { ComponentType } from "react";
import { LandingPage } from "@/features/landing/LandingPage";
import { resolveLandingPageName } from "@/features/tenant-ui/landing-pages";
import { useTenantUi } from "@/features/tenant-ui/TenantUiProvider";
import type { LandingPageName } from "@/features/tenant-ui/types";

const PAGES: Record<LandingPageName, ComponentType> = {
  default: LandingPage,
};

export function LandingRoute() {
  const { config } = useTenantUi();
  const Page = PAGES[resolveLandingPageName(config.landingPage)];
  return <Page />;
}
