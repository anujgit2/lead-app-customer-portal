import { apiClient } from "@/lib/axios";
import { parseApiError } from "@/lib/api-error";
import { sleep } from "@/lib/utils";
import type {
  LoanApplication,
  ApplicationSummary,
  LoanProduct,
  DraftApplication,
  ApplicationStatus,
  FormData,
} from "@/types";
import { MOCK_APPLICATIONS, MOCK_SUMMARY, LOAN_FORM_TEMPLATES } from "./mock-data";
import { programService } from "./program.service";

interface BackendApplication {
  id: string;
  programId: string;
  formDefinitionId: string;
  applicationNumber: string;
  formData?: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  tenantId?: string;
}

function mapStatus(status: string): ApplicationStatus {
  const normalized = status.toLowerCase();
  const valid: ApplicationStatus[] = [
    "draft",
    "submitted",
    "under_review",
    "approved",
    "rejected",
    "disbursed",
  ];
  return valid.includes(normalized as ApplicationStatus)
    ? (normalized as ApplicationStatus)
    : "draft";
}

function mapApplication(app: BackendApplication, loanType = "Business Loan"): LoanApplication {
  const formData = app.formData ?? {};
  const loanAmount =
    typeof formData.loan_request === "object" &&
    formData.loan_request !== null &&
    !Array.isArray(formData.loan_request)
      ? (formData.loan_request as Record<string, unknown>).loan_terms
      : undefined;
  const amount =
    loanAmount &&
    typeof loanAmount === "object" &&
    loanAmount !== null &&
    "loanAmount" in loanAmount
      ? Number((loanAmount as Record<string, unknown>).loanAmount) || 0
      : 0;

  return {
    id: app.id,
    applicationNumber: app.applicationNumber,
    loanType,
    loanAmount: amount,
    status: mapStatus(app.status),
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    submittedAt: app.submittedAt,
    userId: "",
    formData,
    programId: app.programId,
  };
}

function shouldUseMockFallback(error: unknown): boolean {
  const apiError = parseApiError(error);
  return !apiError.status || apiError.status >= 500 || apiError.status === 0;
}

export const applicationService = {
  async getApplications(): Promise<LoanApplication[]> {
    try {
      const { data } = await apiClient.get<BackendApplication[]>("/api/applications");
      return data.map((app) => mapApplication(app));
    } catch (error) {
      if (shouldUseMockFallback(error)) {
        await sleep(300);
        return MOCK_APPLICATIONS;
      }
      throw parseApiError(error);
    }
  },

  async getApplication(id: string): Promise<LoanApplication> {
    try {
      const { data } = await apiClient.get<BackendApplication>(`/api/applications/${id}`);
      return mapApplication(data);
    } catch (error) {
      if (shouldUseMockFallback(error)) {
        await sleep(300);
        const app = MOCK_APPLICATIONS.find((a) => a.id === id);
        if (!app) throw { message: "Application not found", status: 404 };
        return app;
      }
      throw parseApiError(error);
    }
  },

  async getSummary(): Promise<ApplicationSummary> {
    try {
      const apps = await this.getApplications();
      return {
        draft: apps.filter((a) => a.status === "draft").length,
        submitted: apps.filter((a) => a.status === "submitted").length,
        approved: apps.filter((a) => a.status === "approved").length,
        rejected: apps.filter((a) => a.status === "rejected").length,
        total: apps.length,
      };
    } catch {
      await sleep(300);
      return MOCK_SUMMARY;
    }
  },

  async getLoanProducts(): Promise<LoanProduct[]> {
    try {
      const product = await programService.getDefaultProgramWithTemplates();
      return [product];
    } catch {
      await sleep(300);
      return [LOAN_FORM_TEMPLATES];
    }
  },

  async getLoanProductByProgramId(programId: string): Promise<LoanProduct> {
    try {
      return await programService.getProgramWithTemplates(programId);
    } catch {
      await sleep(300);
      return LOAN_FORM_TEMPLATES;
    }
  },

  async getLoanProduct(code: string): Promise<LoanProduct> {
    try {
      const products = await this.getLoanProducts();
      const product = products.find((p) => p.code === code);
      if (!product) throw { message: "Product not found", status: 404 };
      return product;
    } catch (error) {
      if (shouldUseMockFallback(error)) {
        if (code === LOAN_FORM_TEMPLATES.code) return LOAN_FORM_TEMPLATES;
        throw { message: "Product not found", status: 404 };
      }
      throw parseApiError(error);
    }
  },

  async createApplication(programId?: string): Promise<LoanApplication> {
    try {
      let resolvedProgramId = programId;

      if (!resolvedProgramId) {
        const programs = await programService.getPrograms();
        if (programs.length === 0) {
          throw { message: "No loan programs available", status: 404 };
        }
        resolvedProgramId = programs[0].id;
      }

      const programDetails = await apiClient.get<{
        name: string;
        formTemplates: { formTemplate: { id: string } }[];
      }>(`/api/programs/${resolvedProgramId}/with-form-templates`);

      if (!programDetails.data.formTemplates?.length) {
        throw { message: "Program has no form templates", status: 400 };
      }

      const formDefinitionId =
        programDetails.data.formTemplates[0].formTemplate.id;

      const { data } = await apiClient.post<BackendApplication>(
        "/api/applications",
        {},
        {
          params: {
            programId: resolvedProgramId,
            formDefinitionId,
          },
        }
      );
      return mapApplication(data, programDetails.data.name);
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async saveDraft(
    draft: Omit<DraftApplication, "applicationId"> & { applicationId?: string }
  ): Promise<DraftApplication> {
    const applicationId = draft.applicationId;
    if (!applicationId) {
      throw { message: "Application ID is required to save draft", status: 400 };
    }

    try {
      await apiClient.put(`/api/applications/${applicationId}/data`, draft.formData);
      return {
        ...draft,
        applicationId,
        lastSavedAt: new Date().toISOString(),
      };
    } catch (error) {
      const apiError = parseApiError(error);
      if (apiError.errors) {
        throw apiError;
      }
      if (shouldUseMockFallback(error)) {
        await sleep(300);
        return {
          ...draft,
          applicationId,
          lastSavedAt: new Date().toISOString(),
        };
      }
      throw apiError;
    }
  },

  async getDraft(applicationId: string): Promise<DraftApplication | null> {
    try {
      const app = await this.getApplication(applicationId);
      if (app.status !== "draft") return null;

      const product = app.programId
        ? await this.getLoanProductByProgramId(app.programId)
        : (await this.getLoanProducts())[0];

      return {
        applicationId: app.id,
        productCode: product.code,
        currentStep: 0,
        formData: (app.formData ?? {}) as FormData,
        stepStatuses: product.templates.map((t) => ({
          templateCode: t.code,
          completed: false,
          valid: false,
          touched: false,
        })),
        lastSavedAt: app.updatedAt,
        programId: app.programId,
      };
    } catch {
      return null;
    }
  },

  async submitApplication(draft: DraftApplication): Promise<LoanApplication> {
    const applicationId = draft.applicationId;
    if (!applicationId) {
      throw { message: "Application ID is required to submit", status: 400 };
    }

    try {
      await apiClient.put(`/api/applications/${applicationId}/data`, draft.formData);
      const { data } = await apiClient.post<BackendApplication>(
        `/api/applications/${applicationId}/submit`
      );
      const product = draft.programId
        ? await this.getLoanProductByProgramId(draft.programId)
        : (await this.getLoanProducts())[0];
      return mapApplication(data, product.name);
    } catch (error) {
      throw parseApiError(error);
    }
  },
};
