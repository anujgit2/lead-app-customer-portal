"use client";

import { useEffect } from "react";
import { isCustomerPortalHost } from "@/lib/portal-urls";

/** Page title per host: My Profile on the customer host, Loantris on the landing host. */
export function HostTitle() {
  useEffect(() => {
    document.title = isCustomerPortalHost(window.location.hostname) ? "My Profile" : "Loantris";
  }, []);
  return null;
}
