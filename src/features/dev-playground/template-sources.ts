/**
 * FormTemplateSource — ApiTemplateSource + JsonTemplateSource.
 *
 * Both sources only ever produce a raw JSON value; normalization/validation
 * (TemplateValidator) and rendering (the real DynamicField/DynamicSection/
 * WizardStep renderer) live in separate modules and are never duplicated here.
 */
import { apiClient } from "@/lib/axios";
import { parseApiError } from "@/lib/api-error";
import { programService } from "@/services/program.service";
import type { ApiError } from "@/types";
import type { ApiLoadResult, ApiSourceConfig } from "./types";

/** ApiTemplateSource — fetches a raw template payload from the backend. */
export async function fetchTemplateFromApi(config: ApiSourceConfig): Promise<ApiLoadResult> {
  const loadedAt = new Date().toISOString();

  try {
    if (config.useProgramService) {
      const product = await programService.getProgramWithTemplates(config.templateId);
      const firstTemplate = product.templates?.[0];
      return {
        raw: product,
        meta: {
          templateId: config.templateId,
          formCode: firstTemplate?.code,
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
