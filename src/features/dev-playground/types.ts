import type { FormTemplate } from "@/types";

export type TemplateSourceMode = "api" | "json";

export interface ValidationIssue {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface NormalizedTemplateResult {
  templates: FormTemplate[];
  issues: ValidationIssue[];
  /** False when any `error`-severity issue was found — the caller must not render. */
  valid: boolean;
}

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
