import { apiClient } from "@/lib/axios";
import { parseApiError } from "@/lib/api-error";
import { setTenantId } from "@/lib/tenant";
import type { InvitationDetails } from "@/types";

const INVITATION_STORAGE_KEY = "invitation-details";

interface StoredInvitation {
  details: InvitationDetails;
  token: string;
  tenant: string;
}

interface InvitationAcceptResult {
  applicationId: string;
  applicationNumber: string;
}

export const invitationService = {
  async validateInvitation(
    token: string,
    tenant: string
  ): Promise<InvitationDetails> {
    try {
      setTenantId(tenant);
      const { data } = await apiClient.get<InvitationDetails>(
        `/api/invitations/${encodeURIComponent(token)}/validate`
      );
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async acceptInvitation(
    token: string,
    tenant: string
  ): Promise<InvitationAcceptResult> {
    try {
      setTenantId(tenant);
      const { data } = await apiClient.post<InvitationAcceptResult>(
        `/api/invitations/${encodeURIComponent(token)}/accept`
      );
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  saveInvitation(details: InvitationDetails, token: string, tenant: string) {
    if (typeof window === "undefined") return;
    setTenantId(tenant);
    sessionStorage.setItem(
      INVITATION_STORAGE_KEY,
      JSON.stringify({ details, token, tenant })
    );
  },

  getStoredInvitation(): StoredInvitation | null {
    if (typeof window === "undefined") return null;
    const stored = sessionStorage.getItem(INVITATION_STORAGE_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as StoredInvitation;
    } catch {
      return null;
    }
  },

  clearStoredInvitation() {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(INVITATION_STORAGE_KEY);
  },
};
