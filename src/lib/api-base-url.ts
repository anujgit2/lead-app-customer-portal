const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/**
 * Backend tenant routes are chosen from the API host.
 * A portal at {name}.einfra.local calls {name}-services.einfra.local.
 * Other hosts keep NEXT_PUBLIC_API_URL.
 */
export function resolveApiBaseUrl(input?: { hostname?: string; origin?: string }): string {
  const configured = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "") || "/api";
  const hostname = (
    input?.hostname ?? (typeof window !== "undefined" ? window.location.hostname : "")
  ).toLowerCase();
  const origin = input?.origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const baseDomain = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN?.trim().toLowerCase().replace(/^\./, "") ?? "";
  const apiHost = servicesHost(hostname, baseDomain);
  if (!apiHost) return configured;

  try {
    const protocol = new URL(origin).protocol;
    if (protocol !== "http:" && protocol !== "https:") return configured;
    return `${protocol}//${apiHost}`;
  } catch {
    return configured;
  }
}

function servicesHost(hostname: string, baseDomain: string): string | null {
  if (!hostname || !baseDomain || LOCAL_HOSTS.has(hostname)) return null;
  const suffix = `.${baseDomain}`;
  if (hostname === baseDomain || !hostname.endsWith(suffix)) return null;
  const label = hostname.slice(0, -suffix.length);
  if (!label || label.includes(".") || label.endsWith("-services")) return null;
  if (!/^[a-z0-9](?:[a-z0-9-]{0,40}[a-z0-9])?$/.test(label)) return null;
  return `${label}-services.${baseDomain}`;
}
