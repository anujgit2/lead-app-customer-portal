import { apiClient } from "@/lib/axios";
import { resolveTenantFromWindow } from "@/features/tenant-ui/resolve-tenant";

export const uiConfigService = {
  async getUiConfig(): Promise<unknown> {
    // Send this portal's tenant so the API returns that tenant's row, not the classpath default.
    // NEXT_PUBLIC_TENANT_ID wins; otherwise the tenant comes from the host name.
    const tenant = process.env.NEXT_PUBLIC_TENANT_ID?.trim() || resolveTenantFromWindow();
    const { data } = await apiClient.get<unknown>("/api/tenant/ui", {
      skipAuthRedirect: true,
      skipTenantHeader: true,
      skipAuthHeader: true,
      headers: tenant ? { "X-Tenant-ID": tenant } : undefined,
    });
    return data;
  },
};
