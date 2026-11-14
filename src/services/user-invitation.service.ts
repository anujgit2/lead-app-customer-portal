import { apiClient } from "@/lib/axios";
import { parseApiError } from "@/lib/api-error";
import type {
  RegistrationConfig,
  UserInvitation,
  UserInvitationPreview,
} from "@/types";

/**
 * Registration policy and user-to-user invitations. All routes live on user-service
 * under `/auth`, so requests go to the accounts base URL.
 */
export const userInvitationService = {
  async getRegistrationConfig(): Promise<RegistrationConfig> {
    try {
      const { data } = await apiClient.get<RegistrationConfig>("/auth/register/config");
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  /** Public. Returns the invited email so the register form can be pre-filled. */
  async previewUserInvitation(token: string): Promise<UserInvitationPreview> {
    try {
      const { data } = await apiClient.get<UserInvitationPreview>(
        `/auth/register/user-invitations/${encodeURIComponent(token)}`
      );
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async sendInvitation(email: string): Promise<UserInvitation> {
    try {
      const { data } = await apiClient.post<UserInvitation>("/auth/user-invitations", { email });
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async listInvitations(): Promise<UserInvitation[]> {
    try {
      const { data } = await apiClient.get<UserInvitation[]>("/auth/user-invitations");
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async revokeInvitation(id: string): Promise<UserInvitation> {
    try {
      const { data } = await apiClient.delete<UserInvitation>(
        `/auth/user-invitations/${encodeURIComponent(id)}`
      );
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },
};
