import { apiClient } from "@/lib/axios";
import { parseApiError } from "@/lib/api-error";
import type { PanVerifyRequest, PanVerifyResponse } from "@/types";

export const kycService = {
  async verifyPan(payload: PanVerifyRequest): Promise<PanVerifyResponse> {
    try {
      const { data } = await apiClient.post<PanVerifyResponse>(
        "/api/integrations/sandbox/kyc/pan/verify",
        payload
      );
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },
};
