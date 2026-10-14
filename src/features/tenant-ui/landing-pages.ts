import { LANDING_PAGE_NAMES, type LandingPageName } from "@/features/tenant-ui/types";

export function resolveLandingPageName(name: string): LandingPageName {
  return (LANDING_PAGE_NAMES as readonly string[]).includes(name) ? (name as LandingPageName) : "default";
}
