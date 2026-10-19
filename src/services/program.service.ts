import { apiClient } from "@/lib/axios";
import { parseApiError } from "@/lib/api-error";
import { queryClient } from "@/lib/query-client";
import {
  offeredSelections,
  parentProfileParams,
  parseProfileOptions,
  type ProfileOptions,
  type ProfileSelection,
} from "@/features/loan-application/profile-options";
import type { LoanProduct, NewLoanProduct } from "@/types";
import {
  mapProgramToLoanProduct,
  type BackendProgramWithTemplates,
} from "@/utils/program-mapper";
import { detectTemplateFormat, mapNewTemplateToOld } from "@/utils/template-mapper";

export interface Program {
  id: string;
  programCode: string;
  name: string;
  description?: string;
  status: string;
  displayName?: string;
  formDefinitionId?: string;
}

interface BackendProgram {
  id: string;
  programCode: string;
  name: string;
  description?: string;
  status: string;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function unwrapProgramList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.programs)) return obj.programs;
  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.content)) return obj.content;
  return [];
}

function normalizeProgram(raw: unknown): Program | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const nested =
    obj.program && typeof obj.program === "object"
      ? (obj.program as Record<string, unknown>)
      : obj;
  const id = asNonEmptyString(nested.id) ?? asNonEmptyString(nested.programId);
  const programCode =
    asNonEmptyString(nested.programCode) ??
    asNonEmptyString(nested.code) ??
    asNonEmptyString(nested.program_code);
  if (!id && !programCode) return null;
  return {
    id: id ?? programCode ?? "",
    programCode: programCode ?? id ?? "",
    name: asNonEmptyString(nested.displayName) ?? asNonEmptyString(nested.name) ?? programCode ?? "Loan program",
    description: asNonEmptyString(nested.description),
    status: asNonEmptyString(nested.status) ?? "PUBLISHED",
    displayName: asNonEmptyString(nested.displayName) ?? asNonEmptyString(nested.name),
    formDefinitionId: asNonEmptyString(nested.formDefinitionId),
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function asPlainObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function pickMeta(
  primary: Record<string, unknown> | undefined,
  fallback: Record<string, unknown> | undefined,
  keys: string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const value = asNonEmptyString(primary?.[key]) ?? asNonEmptyString(fallback?.[key]);
    if (value) out[key] = value;
  }
  return out;
}

/**
 * Version API returns `{ program, configuration }`. Prefer configuration for forms
 * and documents, and keep program id/name/code when those config fields are null.
 */
function unwrapPublishedConfig(data: unknown): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  const obj = data as Record<string, unknown>;
  const programMeta = asPlainObject(obj.program);
  const configuration = asPlainObject(obj.configuration);

  if (configuration) {
    const merged: Record<string, unknown> = {
      ...programMeta,
      ...configuration,
      ...pickMeta(configuration, programMeta, [
        "id",
        "programCode",
        "name",
        "description",
        "programType",
        "status",
      ]),
    };
    delete merged.program;
    delete merged.configuration;
    return unwrapPublishedConfig(merged);
  }

  if (
    detectTemplateFormat(obj) === "new" ||
    Array.isArray(obj.formTemplates) ||
    Array.isArray(obj.documents)
  ) {
    return obj;
  }

  if (programMeta) {
    return unwrapPublishedConfig(programMeta);
  }
  if (asPlainObject(obj.schema)) {
    return unwrapPublishedConfig(obj.schema);
  }
  if (asPlainObject(obj.version)) {
    return unwrapPublishedConfig(obj.version);
  }
  if (asPlainObject(obj.formConfig)) {
    return unwrapPublishedConfig(obj.formConfig);
  }
  return obj;
}

function mapPublishedConfig(data: unknown): LoanProduct {
  const payload = unwrapPublishedConfig(data);
  if (
    detectTemplateFormat(payload) === "new" ||
    (payload &&
      typeof payload === "object" &&
      Array.isArray((payload as Record<string, unknown>).documents))
  ) {
    return mapNewTemplateToOld(payload as NewLoanProduct);
  }
  return mapProgramToLoanProduct(payload as BackendProgramWithTemplates);
}

/** Shared by the apply menus and by service lookups that need the same list. */
export const tenantProgramsQueryKey = ["tenant-programs"] as const;

async function requestTenantPrograms(): Promise<Program[]> {
  try {
    const { data } = await apiClient.get<unknown>("/api/tenant/programs");
    return unwrapProgramList(data)
      .map(normalizeProgram)
      .filter((program): program is Program => program !== null);
  } catch (error) {
    throw parseApiError(error);
  }
}

/**
 * Read tenant programs through the React Query cache (5 minute stale time).
 * In-flight requests are deduped with any `useQuery` using `tenantProgramsQueryKey`.
 * Do not call this from that query's `queryFn` — use `programService.getTenantPrograms`.
 */
export function fetchTenantPrograms(): Promise<Program[]> {
  return queryClient.fetchQuery({
    queryKey: tenantProgramsQueryKey,
    queryFn: requestTenantPrograms,
  });
}

export const programService = {
  /**
   * Network fetch for `/api/tenant/programs`.
   * UI queries should use this as `queryFn`. Other callers should use `fetchTenantPrograms`
   * so a list loaded in the last five minutes is reused.
   */
  getTenantPrograms: requestTenantPrograms,

  async resolveProgram(programCodeOrId?: string): Promise<Program> {
    const programs = await fetchTenantPrograms();
    if (programs.length === 0) {
      throw { message: "No loan programs available", status: 404 };
    }

    if (!programCodeOrId) {
      throw { message: "A program is required to start an application", status: 400 };
    }

    const requested = programCodeOrId.trim();
    const match = programs.find(
      (program) =>
        program.programCode.toLowerCase() === requested.toLowerCase() ||
        program.id === requested
    );
    if (!match) {
      throw { message: `Program not found: ${programCodeOrId}`, status: 404 };
    }
    return match;
  },

  async resolveProgramCode(programCodeOrId: string): Promise<string> {
    const requested = programCodeOrId.trim();
    if (!requested) {
      throw { message: "A program code is required", status: 400 };
    }
    if (!isUuid(requested)) return requested;
    const program = await this.resolveProgram(requested);
    if (!program.programCode) {
      throw { message: `Program code missing for ${requested}`, status: 400 };
    }
    return program.programCode;
  },

  async resolveProgramId(programCodeOrId: string): Promise<string> {
    const requested = programCodeOrId.trim();
    if (!requested) {
      throw { message: "A program is required", status: 400 };
    }
    if (isUuid(requested)) return requested;
    const program = await this.resolveProgram(requested);
    if (!program.id) {
      throw { message: `Program id missing for ${requested}`, status: 400 };
    }
    return program.id;
  },

  /**
   * Fetch program / form configuration by program id
   * GET /api/tenant/programs/{programId}/version
   */
  async getProgramConfig(programCodeOrId: string): Promise<LoanProduct> {
    try {
      const programId = await this.resolveProgramId(programCodeOrId);
      const { data } = await apiClient.get<unknown>(
        `/api/tenant/programs/${encodeURIComponent(programId)}/version`
      );
      const product = mapPublishedConfig(data);
      return {
        ...product,
        id: product.id || programId,
        code: product.code || programId,
      };
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async getPrograms(status = "PUBLISHED"): Promise<BackendProgram[]> {
    try {
      const { data } = await apiClient.get<BackendProgram[]>("/api/programs", {
        params: { status },
      });
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async getProgramPayload(programCodeOrId: string): Promise<unknown> {
    try {
      const programId = await this.resolveProgramId(programCodeOrId);
      const { data } = await apiClient.get<unknown>(
        `/api/tenant/programs/${encodeURIComponent(programId)}/version`
      );
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async getProgramWithTemplates(programCodeOrId: string): Promise<LoanProduct> {
    return this.getProgramConfig(programCodeOrId);
  },

  async getDefaultProgramWithTemplates(): Promise<LoanProduct> {
    const programs = await fetchTenantPrograms();
    if (programs.length === 0) {
      throw { message: "No loan programs available", status: 404 };
    }
    return this.getProgramConfig(programs[0].id);
  },

  /**
   * Profiles the caller may attach while creating an application.
   * `parents` is slot name → selected profile id, sent as `{slot}ProfileId`.
   */
  async getProfileOptions(
    programCodeOrId: string,
    parents: Record<string, string> = {}
  ): Promise<ProfileOptions> {
    try {
      const programId = await this.resolveProgramId(programCodeOrId);
      const params: Record<string, string> = {};
      for (const [slot, profileId] of Object.entries(parents)) {
        if (profileId) params[`${slot}ProfileId`] = profileId;
      }
      const { data } = await apiClient.get<unknown>(
        `/api/programs/${encodeURIComponent(programId)}/profile-options`,
        { params }
      );
      return parseProfileOptions(data);
    } catch (error) {
      throw parseApiError(error);
    }
  },

  /** Selections that the profile-options response actually offered, parent slot first. */
  async acceptProfileSelections(
    programCodeOrId: string,
    selections: ProfileSelection[]
  ): Promise<ProfileSelection[]> {
    const base = await this.getProfileOptions(programCodeOrId);
    const parents = parentProfileParams(base.slots, selections);
    const scoped =
      Object.keys(parents).length > 0
        ? await this.getProfileOptions(programCodeOrId, parents)
        : base;
    return offeredSelections(scoped, selections);
  },
};
