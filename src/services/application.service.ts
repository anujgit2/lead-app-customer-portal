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
  FormField,
  FormSection,
  FormTemplate,
} from "@/types";
import { MOCK_APPLICATIONS, MOCK_SUMMARY, LOAN_FORM_TEMPLATES } from "./mock-data";
import { programService } from "./program.service";
import { normalizeAddressValue } from "@/utils/address-field";

interface ApplicationProperty {
  /** Template `type` from the backend, e.g. "CompanyProperty". */
  type: string;
  name: string;
  access?: Record<string, unknown>;
  value: unknown;
}

function toCamelCase(value: string): string {
  return value.toLowerCase().replace(/[_-]+([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeFieldValue(field: FormField, value: unknown): unknown {
  if (value === undefined || value === null || value === "") return undefined;

  switch (field.type) {
    case "number":
    case "currency":
    case "percentage": {
      const num = typeof value === "number" ? value : Number(value);
      return Number.isFinite(num) ? num : undefined;
    }
    case "checkbox":
      return Boolean(value);
    case "json":
      if (typeof value !== "string") return value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    case "file":
    case "document":
      return undefined;
    case "multiselect": {
      if (!Array.isArray(value)) return undefined;
      const items = value.filter((item): item is string => typeof item === "string" && item.length > 0);
      return items.length > 0 ? items : undefined;
    }
    case "address":
      return normalizeAddressValue(value);
    default: {
      if (typeof value === "string") {
        const trimmed = field.inputFormat?.trim ? value.trim() : value;
        return trimmed === "" ? undefined : trimmed;
      }
      return value;
    }
  }
}

/** Picks only the fields declared in the section, keyed by field `name`. */
function buildSectionValue(
  section: FormSection,
  data: unknown
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!isPlainObject(data)) return result;
  for (const field of section.fields) {
    const value = normalizeFieldValue(field, data[field.name]);
    if (value !== undefined) result[field.name] = value;
  }
  return result;
}

/**
 * Non-repeatable section fields are merged flat into the property value.
 * Repeatable sections are nested under `payloadKey` (or the camelCased code):
 * as a single object when `maxInstances` is 1, otherwise as an array.
 */
function buildTemplateValue(
  template: FormTemplate,
  data: unknown
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!isPlainObject(data)) return result;

  for (const section of template.sections) {
    const sectionData = data[section.code];
    if (section.repeatable) {
      const items = (Array.isArray(sectionData) ? sectionData : [])
        .map((item) => buildSectionValue(section, item))
        .filter((item) => Object.keys(item).length > 0);
      if (items.length === 0) continue;
      const key = section.payloadKey ?? toCamelCase(section.code);
      result[key] = section.maxInstances === 1 ? items[0] : items;
    } else {
      Object.assign(result, buildSectionValue(section, sectionData));
    }
  }
  return result;
}

function formDataToApplicationProperties(
  formData: Record<string, unknown>,
  templates: FormTemplate[]
): ApplicationProperty[] {
  const properties: ApplicationProperty[] = [];

  for (const template of templates) {
    const data = formData[template.code];
    if (data === undefined) continue;
    if (!template.propertyType || !template.propertyName) {
      console.warn(`[applicationService] Template "${template.code}" has no backend property type; skipped.`);
      continue;
    }

    let value: unknown;
    if (template.repeatable) {
      const instances = (Array.isArray(data) ? data : [data])
        .map((instance) => buildTemplateValue(template, instance))
        .filter((instance) => Object.keys(instance).length > 0);
      if (instances.length === 0) continue;
      value = instances;
    } else {
      const single = buildTemplateValue(template, data);
      if (Object.keys(single).length === 0) continue;
      value = single;
    }

    properties.push({
      type: template.propertyType,
      name: template.propertyName,
      access: {},
      value,
    });
  }

  return properties;
}

interface BackendApplication {
  id: string;
  programId: string;
  formDefinitionId: string;
  applicationNumber: string;
  formData?: Record<string, unknown>;
  properties?: ApplicationProperty[];
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
        formTemplates: { template: { id: string } }[];
      }>(`/api/programs/${resolvedProgramId}/with-form-templates`);

      if (!programDetails.data.formTemplates?.length) {
        throw { message: "Program has no form templates", status: 400 };
      }

      const formDefinitionId =
        programDetails.data.formTemplates[0].template.id;

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
    draft: Omit<DraftApplication, "applicationId"> & { applicationId?: string },
    templates: FormTemplate[]
  ): Promise<DraftApplication> {
    const applicationId = draft.applicationId;
    if (!applicationId) {
      throw { message: "Application ID is required to save draft", status: 400 };
    }

    try {
      const properties = formDataToApplicationProperties(draft.formData, templates);
      if (properties.length > 0) {
        await apiClient.patch(`/api/applications/${applicationId}`, properties);
      }
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

  /** Each step is PATCHed on Continue, so submit only transitions the application's status. */
  async submitApplication(draft: DraftApplication): Promise<LoanApplication> {
    const applicationId = draft.applicationId;
    if (!applicationId) {
      throw { message: "Application ID is required to submit", status: 400 };
    }

    try {
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
