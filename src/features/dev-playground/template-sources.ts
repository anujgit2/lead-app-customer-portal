/**
 * FormTemplateSource — ApiTemplateSource + JsonTemplateSource.
 *
 * Both sources only ever produce a raw JSON value; mapping
 * (`normalizeTemplateJson` / `mapProgramToLoanProduct` in program-mapper)
 * and rendering (DynamicField / WizardStep) live in shared modules and are
 * never duplicated here.
 */
import { apiClient } from "@/lib/axios";
import { parseApiError } from "@/lib/api-error";
import { programService } from "@/services/program.service";
import type { ApiError } from "@/types";
import type { ApiLoadResult, ApiSourceConfig } from "./types";

function firstFormCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const mappings = (payload as Record<string, unknown>).formTemplates;
  if (!Array.isArray(mappings) || mappings.length === 0) return undefined;
  const mapping = mappings[0];
  if (!mapping || typeof mapping !== "object") return undefined;
  const template = (mapping as Record<string, unknown>).template;
  if (!template || typeof template !== "object") return undefined;
  const nested = template as Record<string, unknown>;
  const schemaPayload = nested.schema ?? nested.templateSchema;
  const schema = Array.isArray(schemaPayload) ? schemaPayload[0] : schemaPayload;
  if (!schema || typeof schema !== "object") return undefined;
  const form = schema as Record<string, unknown>;
  return typeof form.formCode === "string"
    ? form.formCode
    : typeof form.code === "string"
      ? form.code
      : undefined;
}

/** ApiTemplateSource — fetches a raw template payload from the backend. */
export async function fetchTemplateFromApi(config: ApiSourceConfig): Promise<ApiLoadResult> {
  const loadedAt = new Date().toISOString();

  try {
    if (config.useProgramService) {
      const payload = await programService.getProgramPayload(config.templateId);
      return {
        raw: payload,
        meta: {
          templateId: config.templateId,
          formCode: firstFormCode(payload),
          version: undefined,
          loadedAt,
          statusCode: 200,
        },
      };
    }

    const path = config.endpointTemplate.replace("{id}", encodeURIComponent(config.templateId));
    const response = await apiClient.get(path, {
      params: Object.fromEntries(Object.entries(config.params).filter(([, v]) => v !== "")),
    });

    const body = response.data as unknown;
    const asObj = Array.isArray(body) ? (body[0] as Record<string, unknown> | undefined) : (body as Record<string, unknown> | undefined);

    return {
      raw: body,
      meta: {
        templateId: config.templateId,
        formCode: typeof asObj?.formCode === "string" ? asObj.formCode : typeof asObj?.code === "string" ? asObj.code : undefined,
        version: typeof asObj?.version === "string" ? asObj.version : undefined,
        loadedAt,
        statusCode: response.status,
      },
    };
  } catch (error) {
    const apiError: ApiError = parseApiError(error);
    throw { ...apiError, loadedAt };
  }
}

/** JsonTemplateSource — parses hand-authored JSON text. Throws a plain Error with `.jsonError` on parse failure. */
export function parseJsonTemplateText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON";
    const error = new Error(message) as Error & { isJsonParseError: true };
    error.isJsonParseError = true;
    throw error;
  }
}
