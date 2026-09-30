import type { MappingIssue, NormalizedTemplateResult as MappedTemplates } from "@/utils/program-mapper";

export type TemplateSourceMode = "api" | "json";

/** Alias of the shared mapper's issue type — playground and the live form share one mapper. */
export type ValidationIssue = MappingIssue;
export type NormalizedTemplateResult = MappedTemplates;

export interface ApiSourceConfig {
  /** Value substituted into `{id}` in the endpoint template. */
  templateId: string;
  /** e.g. "/api/programs/{id}/with-form-templates" or "/api/form-templates/{id}". */
  endpointTemplate: string;
  /** When true, ignores `endpointTemplate` and calls the app's real `programService` instead. */
  useProgramService: boolean;
  /** Extra query params — e.g. formCode, version, productCode, loanType, applicationType. */
  params: Record<string, string>;
}

export interface ApiLoadMeta {
  templateId: string;
  formCode?: string;
  version?: string;
  loadedAt: string;
  statusCode: number | null;
}

export interface ApiLoadResult {
  raw: unknown;
  meta: ApiLoadMeta;
}
