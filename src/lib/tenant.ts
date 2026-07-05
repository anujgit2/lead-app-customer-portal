const TENANT_STORAGE_KEY = "tenant-id";

export function getTenantId(): string {
  if (typeof window === "undefined") return "default";

  const fromSession = sessionStorage.getItem(TENANT_STORAGE_KEY);
  if (fromSession) return fromSession;

  const invitation = sessionStorage.getItem("invitation-details");
  if (invitation) {
    try {
      const parsed = JSON.parse(invitation) as { tenant?: string };
      if (parsed.tenant) return parsed.tenant;
    } catch {
      // ignore
    }
  }

  const userRaw = localStorage.getItem("user");
  if (userRaw) {
    try {
      const user = JSON.parse(userRaw) as { tenantId?: string };
      if (user.tenantId) return user.tenantId;
    } catch {
      // ignore
    }
  }

  return "default";
}

export function setTenantId(tenantId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TENANT_STORAGE_KEY, tenantId);
}

export function clearTenantId(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TENANT_STORAGE_KEY);
}
