import { apiClient } from "@/lib/axios";
import { parseApiError } from "@/lib/api-error";
import type { InvitationDetails } from "@/types";

const INVITATION_STORAGE_KEY = "invitation-details";

export const invitationService = {
  async validateInvitation(
    token: string,
    tenant: string
  ): Promise<InvitationDetails> {
    try {
      const { data } = await apiClient.get<InvitationDetails>(
        `/api/invitations/${encodeURIComponent(token)}/validate`,
        { params: { tenant } }
      );
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  saveInvitation(details: InvitationDetails, token: string, tenant: string) {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(
      INVITATION_STORAGE_KEY,
      JSON.stringify({ details, token, tenant })
    );
  },

  getStoredInvitation(): {
    details: InvitationDetails;
    token: string;
    tenant: string;
  } | null {
    if (typeof window === "undefined") return null;
    const stored = sessionStorage.getItem(INVITATION_STORAGE_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as {
        details: InvitationDetails;
        token: string;
        tenant: string;
      };
    } catch {
      return null;
    }
  },

  clearStoredInvitation() {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(INVITATION_STORAGE_KEY);
  },
};
