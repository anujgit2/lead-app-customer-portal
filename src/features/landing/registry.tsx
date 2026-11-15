"use client";

import type { ComponentType } from "react";
import { useSyncExternalStore } from "react";
import { LoginForm } from "@/features/auth/LoginForm";
import { LandingPage } from "@/features/landing/LandingPage";
import { isCustomerPortalHost } from "@/lib/portal-urls";
import { resolveLandingPageName } from "@/features/tenant-ui/landing-pages";
import { useTenantUi } from "@/features/tenant-ui/TenantUiProvider";
import type { LandingPageName } from "@/features/tenant-ui/types";

const PAGES: Record<LandingPageName, ComponentType> = {
  default: LandingPage,
};

const noopSubscribe = () => () => {};

export function LandingRoute() {
  const { config } = useTenantUi();
  // Server render and first client render use the landing page; the customer
  // host switches to sign-in right after hydration.
  const onCustomerHost = useSyncExternalStore(
    noopSubscribe,
    () => isCustomerPortalHost(window.location.hostname),
    () => false
  );
  if (onCustomerHost) return <LoginForm />;
  const Page = PAGES[resolveLandingPageName(config.landingPage)];
  return <Page />;
}
