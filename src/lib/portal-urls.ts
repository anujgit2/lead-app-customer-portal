// Each portal lives on its own subdomain. Override per environment with
// NEXT_PUBLIC_CUSTOMER_PORTAL_URL / NEXT_PUBLIC_PARTNER_PORTAL_URL.
export const CUSTOMER_PORTAL_URL =
  process.env.NEXT_PUBLIC_CUSTOMER_PORTAL_URL ?? "https://myprofile.loantris.com";
// The customer portal host serves the sign-in page at "/" instead of the landing page.
export function isCustomerPortalHost(hostname: string): boolean {
  return hostname.startsWith("myprofile.");
}

// Landing-section links ("#platform" etc.) only exist on the landing host. On a
// customer host, point them at the same site without the "myprofile." prefix.
export function landingSectionHref(location: Pick<Location, "protocol" | "hostname" | "port">, hash: string): string {
  if (!isCustomerPortalHost(location.hostname)) return `/#${hash}`;
  const host = location.hostname.replace(/^myprofile\./, "");
  const port = location.port ? `:${location.port}` : "";
  return `${location.protocol}//${host}${port}/#${hash}`;
}

export const PARTNER_PORTAL_URL =
  process.env.NEXT_PUBLIC_PARTNER_PORTAL_URL ?? "https://partners.loantris.com";
