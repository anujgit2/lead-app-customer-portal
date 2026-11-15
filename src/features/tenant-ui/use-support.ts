"use client";

import type { UiSupport } from "@/features/tenant-ui/types";
import { useTenantUi } from "@/features/tenant-ui/TenantUiProvider";

/** Contact and legal details from the tenant UI config. Any value the config does not set is undefined. */
export function useSupport(): UiSupport {
  const { config } = useTenantUi();
  return config.support ?? {};
}
