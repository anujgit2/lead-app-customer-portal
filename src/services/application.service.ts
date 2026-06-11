import { sleep, generateId } from "@/lib/utils";
import type {
  LoanApplication,
  ApplicationSummary,
  LoanProduct,
  DraftApplication,
} from "@/types";
import { MOCK_APPLICATIONS, MOCK_SUMMARY, LOAN_FORM_TEMPLATES } from "./mock-data";

const DRAFT_KEY = "loan_drafts";

function getDrafts(): Record<string, DraftApplication> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(DRAFT_KEY);
  return raw ? (JSON.parse(raw) as Record<string, DraftApplication>) : {};
}

function saveDraftsToStorage(drafts: Record<string, DraftApplication>): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  }
}

export const applicationService = {
  async getApplications(): Promise<LoanApplication[]> {
    await sleep(600);
    return MOCK_APPLICATIONS;
  },

  async getApplication(id: string): Promise<LoanApplication> {
    await sleep(400);
    const app = MOCK_APPLICATIONS.find((a) => a.id === id);
    if (!app) throw { message: "Application not found", status: 404 };
    return app;
  },

  async getSummary(): Promise<ApplicationSummary> {
    await sleep(400);
    return MOCK_SUMMARY;
  },

  async getLoanProducts(): Promise<LoanProduct[]> {
    await sleep(400);
    return [LOAN_FORM_TEMPLATES];
  },

  async getLoanProduct(code: string): Promise<LoanProduct> {
    await sleep(400);
    if (code === LOAN_FORM_TEMPLATES.code) return LOAN_FORM_TEMPLATES;
    throw { message: "Product not found", status: 404 };
  },

  async saveDraft(draft: Omit<DraftApplication, "applicationId"> & { applicationId?: string }): Promise<DraftApplication> {
    await sleep(500);
    const drafts = getDrafts();
    const id = draft.applicationId ?? generateId();
    const updated: DraftApplication = {
      ...draft,
      applicationId: id,
      lastSavedAt: new Date().toISOString(),
    };
    drafts[id] = updated;
    saveDraftsToStorage(drafts);
    return updated;
  },

  async getDraft(applicationId: string): Promise<DraftApplication | null> {
    await sleep(300);
    const drafts = getDrafts();
    return drafts[applicationId] ?? null;
  },

  async submitApplication(
    draft: DraftApplication
  ): Promise<LoanApplication> {
    await sleep(2000);
    const app: LoanApplication = {
      id: "app-" + generateId(),
      applicationNumber: "LA-2024-" + Math.floor(Math.random() * 900 + 100),
      loanType: "Business Loan",
      loanAmount: 5000000,
      status: "submitted",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      userId: "user-001",
      formData: draft.formData as Record<string, unknown>,
    };
    if (draft.applicationId) {
      const drafts = getDrafts();
      delete drafts[draft.applicationId];
      saveDraftsToStorage(drafts);
    }
    return app;
  },
};
