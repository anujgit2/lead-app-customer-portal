import type { FormTemplate, NewLoanProduct } from "@/types";
import { normalizeTemplateJson } from "@/utils/program-mapper";
import { detectTemplateFormat, mapNewTemplateToOld } from "@/utils/template-mapper";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function unwrapTemplatePayload(payload: unknown): unknown {
  if (!isRecord(payload)) return payload;
  if (isRecord(payload.schema) || Array.isArray(payload.schema)) {
    return unwrapTemplatePayload(Array.isArray(payload.schema) ? payload.schema[0] : payload.schema);
  }
  if (isRecord(payload.template)) return unwrapTemplatePayload(payload.template);
  if (isRecord(payload.form)) return unwrapTemplatePayload(payload.form);
  if (isRecord(payload.definition)) return unwrapTemplatePayload(payload.definition);
  return payload;
}

function isNewFormatForm(value: unknown): boolean {
  if (!isRecord(value) || typeof value.formCode !== "string" || !Array.isArray(value.sections)) {
    return false;
  }
  const section = value.sections.find(isRecord);
  if (!section || !Array.isArray(section.fields)) return value.sections.length === 0;
  const field = section.fields.find(isRecord);
  if (!field) return true;
  return typeof field.key === "string" && typeof field.name !== "string";
}

function pickTemplate(templates: FormTemplate[], code: string): FormTemplate | null {
  return (
    templates.find((template) => template.code === code) ??
    (templates.length === 1 ? templates[0] : null)
  );
}

function failure(message: string): never {
  throw { message, status: 502 };
}

/** Reads GET /api/form-templates/code/{code}/latest into the form engine's template. */
export function readFormTemplate(payload: unknown, code: string): FormTemplate {
  const root = unwrapTemplatePayload(payload);

  if (detectTemplateFormat(root) === "new" || isNewFormatForm(root)) {
    const program = isNewFormatForm(root)
      ? ({ programCode: code, name: code, forms: [root] } as NewLoanProduct)
      : (root as NewLoanProduct);
    const match = pickTemplate(mapNewTemplateToOld(program).templates, code);
    if (!match) failure("Form template could not be read.");
    return match;
  }

  const normalized = normalizeTemplateJson(root);
  if (!normalized.valid) {
    failure(normalized.issues.find((issue) => issue.severity === "error")?.message ?? "Form template could not be read.");
  }
  const match = pickTemplate(normalized.templates, code);
  if (!match) failure("Form template could not be read.");
  return match;
}
