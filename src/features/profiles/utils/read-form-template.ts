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

function isSectionSchemaItem(value: Record<string, unknown>): boolean {
  return Array.isArray(value.fields) && !Array.isArray(value.sections) && typeof value.formCode !== "string";
}

function sectionUsesNewFields(section: Record<string, unknown>): boolean {
  if (!Array.isArray(section.fields)) return false;
  const field = section.fields.find(isRecord);
  if (!field) return false;
  return typeof field.key === "string" && typeof field.name !== "string";
}

/**
 * Profile template versions return `{ type, name, schema }`.
 * `schema` is either the form's sections or a list of forms.
 */
function rootFromProfileSchema(payload: unknown, code: string): unknown | null {
  if (!isRecord(payload) || !Array.isArray(payload.schema) || payload.schema.length === 0) return null;
  if (!payload.schema.every(isRecord)) return null;
  const items = payload.schema;
  const templateCode = typeof payload.type === "string" && payload.type.trim() ? payload.type.trim() : code;
  const title = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : templateCode;

  if (items.every(isSectionSchemaItem)) {
    if (items.some(sectionUsesNewFields)) {
      return { formCode: templateCode, ui: { title }, sections: items };
    }
    return { code: templateCode, title, sections: items };
  }

  if (items.length > 1 && items.every((item) => Array.isArray(item.sections))) {
    return { programCode: templateCode, name: title, forms: items };
  }

  return null;
}

/** Visible program forms only. The wizard's extra documents step stays out of profile tabs. */
function formTemplatesFromProgram(program: NewLoanProduct): FormTemplate[] {
  const formCodes = new Set(
    (Array.isArray(program.forms) ? program.forms : [])
      .filter((form) => form.visible !== false)
      .map((form) => form.formCode)
  );
  return mapNewTemplateToOld(program).templates.filter((template) => formCodes.has(template.code));
}

/**
 * Reads a profile template version into one template per form.
 * Latest: GET /api/profile-form-templates/code/{code}/latest
 * One version: GET /api/profile-form-templates/code/{code}/versions/{versionNumber}
 * A single form payload still returns a one-item list.
 */
export function readFormTemplates(payload: unknown, code: string): FormTemplate[] {
  const root = rootFromProfileSchema(payload, code) ?? unwrapTemplatePayload(payload);

  if (detectTemplateFormat(root) === "new" || isNewFormatForm(root)) {
    const program = isNewFormatForm(root)
      ? ({ programCode: code, name: code, forms: [root] } as NewLoanProduct)
      : (root as NewLoanProduct);
    const templates = formTemplatesFromProgram(program);
    if (templates.length === 0) failure("Form template could not be read.");
    return templates;
  }

  const normalized = normalizeTemplateJson(root);
  if (!normalized.valid) {
    failure(normalized.issues.find((issue) => issue.severity === "error")?.message ?? "Form template could not be read.");
  }
  if (normalized.templates.length === 0) failure("Form template could not be read.");
  return normalized.templates;
}

/** Reads a payload that contains one form template. */
export function readFormTemplate(payload: unknown, code: string): FormTemplate {
  const match = pickTemplate(readFormTemplates(payload, code), code);
  if (!match) failure("Form template could not be read.");
  return match;
}
