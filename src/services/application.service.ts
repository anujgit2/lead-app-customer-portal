import { apiClient } from "@/lib/axios";
import { parseApiError } from "@/lib/api-error";
import { sleep } from "@/lib/utils";
import type {
  LoanApplication,
  ApplicationSummary,
  ApplicationProperty,
  LoanProduct,
  DraftApplication,
  ApplicationStatus,
  FormData,
  FormField,
  FormSection,
  FormTemplate,
  StoredFileReference,
} from "@/types";
import { MOCK_APPLICATIONS, MOCK_SUMMARY, LOAN_FORM_TEMPLATES } from "./mock-data";
import { programService } from "./program.service";
import { isStoredFileReference } from "./file-storage.service";
import { normalizeAddressValue } from "@/utils/address-field";
import { normalizeApplicationFormData } from "@/utils/prefill-mapper";

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
    case "document": {
      if (!Array.isArray(value)) return undefined;
      const documentType = field.documentType ?? field.name;
      const files = value
        .map((item) => (isPlainObject(item) ? { ...item, type: documentType } : item))
        .filter(isStoredFileReference);
      return files.length > 0 ? files : undefined;
    }
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

function isDocumentTemplate(template: FormTemplate): boolean {
  return template.propertyType === "DocumentProperty";
}

function forEachDocumentField(
  template: FormTemplate,
  data: unknown,
  visit: (field: FormField, value: unknown) => void
) {
  const instances = template.repeatable
    ? Array.isArray(data)
      ? data
      : data == null
        ? []
        : [data]
    : [data];

  for (const instance of instances) {
    if (!isPlainObject(instance)) continue;
    for (const section of template.sections) {
      const sectionData = instance[section.code];
      const rows = section.repeatable
        ? Array.isArray(sectionData)
          ? sectionData
          : []
        : [sectionData];
      for (const row of rows) {
        if (!isPlainObject(row)) continue;
        for (const field of section.fields) {
          if (field.type !== "file" && field.type !== "document") continue;
          visit(field, row[field.name]);
        }
      }
    }
  }
}

function toDocumentFile(file: StoredFileReference): StoredFileReference {
  return {
    id: file.id,
    fileName: file.fileName,
    contentType: file.contentType,
    status: "AVAILABLE",
    // `DocumentValue.uploadedAt` is a backend `LocalDate`; storage returns an
    // ISO timestamp in `createdAt`, so pass only the calendar-date portion.
    uploadedAt: file.uploadedAt.slice(0, 10),
    meta: {
      folderId: file.meta.folderId,
      sizeBytes: file.meta.sizeBytes,
      checksum: file.meta.checksum,
      ownerId: file.meta.ownerId,
    },
    type: file.type,
  };
}

/** Flattens every uploaded slot into the DocumentProperty `value` array. */
function collectDocumentFiles(template: FormTemplate, data: unknown): StoredFileReference[] {
  const files: StoredFileReference[] = [];
  forEachDocumentField(template, data, (field, value) => {
    if (!Array.isArray(value)) return;
    const documentType = field.documentType ?? field.name;
    for (const item of value) {
      const stamped = isPlainObject(item) ? { ...item, type: documentType } : item;
      if (isStoredFileReference(stamped)) files.push(toDocumentFile(stamped));
    }
  });
  return files;
}

function documentFilesToFormData(template: FormTemplate, files: StoredFileReference[]): unknown {
  const byType = new Map<string, StoredFileReference[]>();
  for (const file of files) {
    const list = byType.get(file.type) ?? [];
    list.push(file);
    byType.set(file.type, list);
  }

  const instance: Record<string, unknown> = {};
  for (const section of template.sections) {
    const fields: Record<string, StoredFileReference[]> = {};
    for (const field of section.fields) {
      if (field.type !== "file" && field.type !== "document") continue;
      const matched = byType.get(field.documentType ?? field.name);
      if (matched && matched.length > 0) fields[field.name] = matched;
    }
    if (Object.keys(fields).length === 0) continue;
    instance[section.code] = section.repeatable ? [fields] : fields;
  }

  if (Object.keys(instance).length === 0) return undefined;
  return template.repeatable ? [instance] : instance;
}

function sectionPayloadKey(section: FormSection): string {
  return section.payloadKey ?? toCamelCase(section.code);
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
      const key = sectionPayloadKey(section);
      result[key] = section.maxInstances === 1 ? items[0] : items;
    } else {
      Object.assign(result, buildSectionValue(section, sectionData));
    }
  }
  return result;
}

function findTemplateProperty(
  properties: ApplicationProperty[],
  template: FormTemplate,
  used: Set<number>
): number {
  return properties.findIndex((property, index) => {
    if (used.has(index)) return false;
    if (template.propertyType && template.propertyName) {
      return property.type === template.propertyType && property.name === template.propertyName;
    }
    if (template.propertyType) return property.type === template.propertyType;
    if (template.propertyName) return property.name === template.propertyName;
    return false;
  });
}

/** Inverse of `buildTemplateValue`: splits a property value back into section-keyed form state. */
function propertyValueToTemplateData(
  template: FormTemplate,
  value: unknown
): Record<string, unknown> {
  if (!isPlainObject(value)) return {};
  const result: Record<string, unknown> = {};

  for (const section of template.sections) {
    if (section.repeatable) {
      const raw = value[sectionPayloadKey(section)];
      const items = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
      const mapped = items
        .map((item) => buildSectionValue(section, item))
        .filter((item) => Object.keys(item).length > 0);
      if (mapped.length > 0) result[section.code] = mapped;
    } else {
      const fields = buildSectionValue(section, value);
      if (Object.keys(fields).length > 0) result[section.code] = fields;
    }
  }

  return result;
}

/**
 * Rebuilds wizard form state from the `properties` array returned by GET /api/applications/:id.
 * This is the inverse of `formDataToApplicationProperties`.
 */
export function propertiesToFormData(
  properties: ApplicationProperty[] | undefined,
  templates: FormTemplate[]
): FormData {
  const formData: Record<string, unknown> = {};
  if (!properties?.length) return formData as FormData;

  const used = new Set<number>();
  for (const template of templates) {
    const index = findTemplateProperty(properties, template, used);
    if (index < 0) continue;
    used.add(index);

    const value = properties[index].value;
    if (value == null) continue;

    if (isDocumentTemplate(template)) {
      const files = (Array.isArray(value) ? value : [value]).filter(isStoredFileReference);
      const mapped = documentFilesToFormData(template, files);
      if (mapped !== undefined) formData[template.code] = mapped;
      continue;
    }

    if (template.repeatable) {
      const instances = (Array.isArray(value) ? value : [value])
        .map((instance) => propertyValueToTemplateData(template, instance))
        .filter((instance) => Object.keys(instance).length > 0);
      if (instances.length > 0) formData[template.code] = instances;
    } else {
      const source = Array.isArray(value) ? value[0] : value;
      const mapped = propertyValueToTemplateData(template, source);
      if (Object.keys(mapped).length > 0) formData[template.code] = mapped;
    }
  }

  return formData as FormData;
}

/** Prefers API `properties` (the saved draft) and falls back to any nested `formData`. */
export function resolveApplicationFormData(
  application: Pick<LoanApplication, "formData" | "properties">,
  product?: Pick<LoanProduct, "templates">
): FormData {
  const fromProperties = propertiesToFormData(
    application.properties,
    product?.templates ?? []
  );
  const saved = application.formData;
  const hasSaved = !!saved && Object.keys(saved).length > 0;
  const savedIsTemplateShaped =
    hasSaved && !!product?.templates.some((template) => template.code in saved);

  if (savedIsTemplateShaped) {
    return { ...fromProperties, ...saved } as FormData;
  }
  if (Object.keys(fromProperties).length > 0) {
    return fromProperties;
  }
  return normalizeApplicationFormData(saved, product);
}

function readLoanAmount(
  formData: Record<string, unknown>,
  properties?: ApplicationProperty[]
): number {
  const loanRequest = formData.loan_request;
  const loanTerms =
    isPlainObject(loanRequest) && isPlainObject(loanRequest.loan_terms)
      ? loanRequest.loan_terms
      : undefined;
  if (loanTerms && "loanAmount" in loanTerms) {
    const amount = Number(loanTerms.loanAmount);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }

  for (const property of properties ?? []) {
    const values = Array.isArray(property.value) ? property.value : [property.value];
    for (const value of values) {
      if (!isPlainObject(value) || !("loanAmount" in value)) continue;
      const amount = Number(value.loanAmount);
      if (Number.isFinite(amount) && amount > 0) return amount;
    }
  }
  return 0;
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

    if (isDocumentTemplate(template)) {
      properties.push({
        type: template.propertyType,
        name: template.propertyName,
        access: {},
        value: collectDocumentFiles(template, data),
      });
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

  return {
    id: app.id,
    applicationNumber: app.applicationNumber,
    loanType,
    loanAmount: readLoanAmount(formData, app.properties),
    status: mapStatus(app.status),
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    submittedAt: app.submittedAt,
    userId: "",
    formData,
    properties: app.properties,
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

  async createApplication(programCodeOrId?: string): Promise<LoanApplication> {
    try {
      let resolvedProgramId = programCodeOrId;
      let programName = "";

      if (!resolvedProgramId) {
        const programs = await programService.getPrograms();
        if (programs.length === 0) {
          throw { message: "No loan programs available", status: 404 };
        }
        resolvedProgramId = programs[0].id;
      }

      // Use the new endpoint for program configuration
      const programConfig = await apiClient.get<BackendProgramWithTemplates>(
        `/api/programs/by-code/${resolvedProgramId}/latest-published`
      );

      programName = programConfig.data.name || "";
      
      if (!programConfig.data.formTemplates?.length) {
        throw { message: "Program has no form templates", status: 400 };
      }

      const formDefinitionId =
        programConfig.data.formTemplates[0].template.id;

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
      return mapApplication(data, programName);
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
        formData: resolveApplicationFormData(app, product),
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
