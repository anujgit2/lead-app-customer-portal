import { apiClient } from "@/lib/axios";
import { formDataToApplicationProperties } from "@/services/application.service";
import type { WizardBackend } from "@/features/loan-application/FormWizard";
import type { ApplicationProperty, DraftApplication, FormTemplate } from "@/types";

/** Lead as shown to a customer. Partner-only fields are never returned by this API. */
export interface LeadSummary {
  id: string;
  status: string;
  programId: string;
  currentRound: number;
  updatedAt: string;
}

/** A partner's request for more information, shown to the customer with its reason. */
export interface LeadInfoRequest {
  round: number;
  reason: string;
  forms: string[];
  documents: unknown[];
  createdAt: string;
}

export interface LeadDetail {
  id: string;
  status: string;
  programId: string;
  programVersionId: string;
  currentRound: number;
  submitted: boolean;
  /** Frozen ProgramConfiguration the lead was created from. */
  configuration: Record<string, unknown>;
  properties: ApplicationProperty[];
  requests: LeadInfoRequest[];
}

export interface InvitePreview {
  invitedEmail: string | null;
  invitedPhone: string | null;
  status: string;
  expiresAt: string;
  programId: string;
  type: string;
}

export const leadService = {
  async list(): Promise<LeadSummary[]> {
    const { data } = await apiClient.get<LeadSummary[]>("/api/customer/leads");
    return data;
  },

  async get(leadId: string): Promise<LeadDetail> {
    const { data } = await apiClient.get<LeadDetail>(`/api/customer/leads/${encodeURIComponent(leadId)}`);
    return data;
  },

  async saveProperties(leadId: string, properties: ApplicationProperty[]): Promise<void> {
    await apiClient.put(`/api/customer/leads/${encodeURIComponent(leadId)}/properties`, properties);
  },

  async submit(leadId: string): Promise<void> {
    await apiClient.post(`/api/customer/leads/${encodeURIComponent(leadId)}/submit`);
  },

  /** Public. Returns masked contact details only. */
  async validateInvite(token: string): Promise<InvitePreview> {
    const { data } = await apiClient.get<InvitePreview>(
      `/api/invitations/${encodeURIComponent(token)}/validate`
    );
    return data;
  },

  /** Public, token-gated. Whether the invited contact already has an account. */
  async accountStatus(token: string): Promise<{ exists: boolean }> {
    const { data } = await apiClient.get<{ exists: boolean }>(
      `/api/invitations/${encodeURIComponent(token)}/account`
    );
    return data;
  },

  /** Requires a signed-in customer. Returns the lead id once the lead is claimed. */
  async acceptInvite(token: string): Promise<{ leadId: string }> {
    // A 401 here means "not signed in yet", which the invite page handles. Do not treat it as an
    // expired session.
    const { data } = await apiClient.post<{ leadId: string }>(
      `/api/invitations/${encodeURIComponent(token)}/accept`,
      undefined,
      { skipAuthRedirect: true }
    );
    return data;
  },
};

/**
 * Lets the shared FormWizard save and submit a lead. Drafts merge by (type, name) on the server,
 * so each step's save only replaces that step's values.
 */
export function leadWizardBackend(leadId: string, templates: FormTemplate[]): WizardBackend {
  return {
    // Partners see draft values as they are entered, so the review page asks for consent.
    requiresDataSharingConsent: true,
    async saveDraft(draft: DraftApplication, stepTemplates: FormTemplate[]) {
      const properties = formDataToApplicationProperties(draft.formData, stepTemplates);
      if (properties.length > 0) {
        await leadService.saveProperties(leadId, properties);
      }
      return draft;
    },
    async submitApplication(draft: DraftApplication) {
      const properties = formDataToApplicationProperties(draft.formData, templates);
      if (properties.length > 0) {
        await leadService.saveProperties(leadId, properties);
      }
      await leadService.submit(leadId);
      return draft;
    },
  };
}

const PENDING_INVITE_KEY = "pendingLeadInvite";

/**
 * Keeps an invite token across sign-in or registration. sessionStorage is per tab and cleared
 * when the tab closes. The token is single-use and expires, so keeping it briefly is acceptable.
 */
export function rememberPendingInvite(token: string): void {
  try {
    sessionStorage.setItem(PENDING_INVITE_KEY, token);
  } catch {
    // Storage can be unavailable (private mode). The user can open the link again.
  }
}

/** Reads the stored invite token without clearing it. */
export function peekPendingInvite(): string | null {
  try {
    return sessionStorage.getItem(PENDING_INVITE_KEY);
  } catch {
    return null;
  }
}

export function forgetPendingInvite(): void {
  try {
    sessionStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    // Storage unavailable. Nothing to clear.
  }
}

export function takePendingInvite(): string | null {
  try {
    const token = sessionStorage.getItem(PENDING_INVITE_KEY);
    sessionStorage.removeItem(PENDING_INVITE_KEY);
    return token;
  } catch {
    return null;
  }
}
