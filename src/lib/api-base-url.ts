const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
const ACCOUNTS_SUFFIX = "/accounts";

/**
 * Backend tenant routes are chosen from the API host.
 * A portal at {name}.einfra.local calls {name}-services.einfra.local.
 * Other hosts keep NEXT_PUBLIC_API_URL.
 * A trailing /accounts on the configured base is the user-service context
 * path and is not part of the loan, document, or file API base.
 */
export function resolveApiBaseUrl(input?: { hostname?: string; origin?: string }): string {
  return resolveServiceBase(input, false);
}

/** User-service context path. Auth and tenant UI calls use this base. */
export function resolveAuthApiBaseUrl(input?: { hostname?: string; origin?: string }): string {
  return resolveServiceBase(input, true);
}

/** Login, registration, profile, password, and public tenant UI live on user-service. */
export function isAccountsApiPath(url: string | undefined): boolean {
  if (!url || /^[a-z][a-z\d+.-]*:/i.test(url)) return false;
  const path = url.split("?")[0];
  return (
    path === "/auth" ||
    path.startsWith("/auth/") ||
    path === "/api/tenant/ui" ||
    path.startsWith("/api/tenant/ui/")
  );
}

function resolveServiceBase(input: { hostname?: string; origin?: string } | undefined, accounts: boolean): string {
  const configured = applicationBase(process.env.NEXT_PUBLIC_API_URL);
  const hostname = (
    input?.hostname ?? (typeof window !== "undefined" ? window.location.hostname : "")
  ).toLowerCase();
  const origin = input?.origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const baseDomain = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN?.trim().toLowerCase().replace(/^\./, "") ?? "";
  const apiHost = servicesHost(hostname, baseDomain);
  if (!apiHost) return accounts ? authBase(configured) : configured;

  try {
    const protocol = new URL(origin).protocol;
    if (protocol !== "http:" && protocol !== "https:") {
      return accounts ? authBase(configured) : configured;
    }
    const hostBase = `${protocol}//${apiHost}`;
    return accounts ? `${hostBase}${ACCOUNTS_SUFFIX}` : hostBase;
  } catch {
    return accounts ? authBase(configured) : configured;
  }
}

function applicationBase(value: string | undefined): string {
  const configured = (value ?? "").replace(/\/$/, "") || "/api";
  return configured.endsWith(ACCOUNTS_SUFFIX)
    ? configured.slice(0, -ACCOUNTS_SUFFIX.length) || "/api"
    : configured;
}

function authBase(applicationRoot: string): string {
  if (applicationRoot.startsWith("/")) return ACCOUNTS_SUFFIX;
  return `${applicationRoot}${ACCOUNTS_SUFFIX}`;
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
