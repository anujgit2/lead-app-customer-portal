import { LandingRoute } from "@/features/landing/registry";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ tenant: "site" }];
}

export default function TenantLandingPage() {
  return <LandingRoute />;
}
