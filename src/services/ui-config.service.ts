import { apiClient } from "@/lib/axios";

export const uiConfigService = {
  async getUiConfig(): Promise<unknown> {
    const { data } = await apiClient.get<unknown>("/api/tenant/ui", {
      skipAuthRedirect: true,
      skipTenantHeader: true,
      skipAuthHeader: true,
    });
    return data;
  },
};
