const TENANT_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export function normalizeTenantId(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return TENANT_ID.test(trimmed) ? trimmed : null;
}

export function tenantFromHost(hostname: string, baseDomain?: string): string | null {
  const host = hostname.split(":")[0]?.toLowerCase() ?? "";
  if (!host || host === "localhost" || host === "127.0.0.1") return null;

  const base = baseDomain?.trim().toLowerCase().replace(/^\./, "");
  if (base) {
    if (host === base || !host.endsWith(`.${base}`)) return null;
    const labels = host.slice(0, -(base.length + 1)).split(".").filter(Boolean);
    const candidate = labels[0] === "www" ? labels[1] : labels[0];
    return normalizeTenantId(candidate);
  }

  const labels = host.split(".").filter(Boolean);
  if (labels.length < 4) return null;
  const candidate = labels[0] === "www" ? labels[1] : labels[0];
  return normalizeTenantId(candidate);
}

export function tenantFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "t") return null;
  return normalizeTenantId(parts[1]);
}

export function tenantFromSearch(search: string): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return normalizeTenantId(params.get("tenant"));
}

export function resolveTenantId(input: {
  hostname: string;
  pathname: string;
  search: string;
  baseDomain?: string;
}): string | null {
  return (
    tenantFromHost(input.hostname, input.baseDomain) ??
    tenantFromPath(input.pathname) ??
    tenantFromSearch(input.search)
  );
}

export function resolveTenantFromWindow(): string | null {
  if (typeof window === "undefined") return null;
  return resolveTenantId({
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    search: window.location.search,
    baseDomain: process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN,
  });
}
