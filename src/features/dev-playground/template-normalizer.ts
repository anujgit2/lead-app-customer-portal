/**
 * TemplateValidator — the single place that turns arbitrary/untyped JSON (from
 * the API or hand-authored in the JSON editor) into the app's real `FormTemplate[]`
 * shape, or a list of developer-friendly errors if it doesn't structurally qualify.
 *
 * This never mutates or "fixes" invalid input — if there's a structural error the
 * caller must not render, per the playground spec. It also accepts two authoring
 * conventions for validation (top-level shorthand like `required`/`maxLength`, or
 * a nested `validation: {...}` object) since both appear in real-world examples.
 */
import type { FieldOption, FormField, FormSection, FormTemplate, MaskConfig } from "@/types";
import { isKnownFieldType } from "@/utils/field-types";
import { normalizeFieldRules } from "@/utils/rule-engine";
import { parseCurrencyFormat } from "@/utils/currency-format";
import { mergeFieldValidation, parseInputFormat } from "@/utils/field-config";
import { isDocumentSlot, parseUploadConfig } from "@/utils/upload-config";
import type { NormalizedTemplateResult, ValidationIssue } from "./types";

type Unknown = Record<string, unknown>;

function isPlainObject(v: unknown): v is Unknown {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function normalizeOptions(raw: unknown): FieldOption[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((opt) => {
    if (isPlainObject(opt)) {
      return { label: String(opt.label ?? opt.value ?? ""), value: String(opt.value ?? opt.label ?? "") };
    }
    return { label: String(opt), value: String(opt) };
  });
}

function normalizeField(raw: unknown, path: string, issues: ValidationIssue[]): FormField | null {
  if (!isPlainObject(raw)) {
    issues.push({ path, message: "Field must be an object.", severity: "error" });
    return null;
  }

  const coerced: Unknown = isDocumentSlot(raw)
    ? {
        ...raw,
        name: typeof raw.name === "string" && raw.name.length > 0 ? raw.name : raw.documentType,
        type: typeof raw.type === "string" && raw.type.length > 0 ? raw.type : "document",
        helpText: raw.helpText ?? raw.description,
      }
    : raw;

  const name = coerced.name;
  const type = coerced.type;
  const label = coerced.label;

  if (typeof name !== "string" || name.length === 0) {
    issues.push({ path: `${path}.name`, message: "field.name is required.", severity: "error" });
  }
  if (typeof type !== "string" || type.length === 0) {
    issues.push({ path: `${path}.type`, message: "field.type is required.", severity: "error" });
  }
  if (type !== "hidden" && (typeof label !== "string" || label.length === 0)) {
    issues.push({ path: `${path}.label`, message: "field.label is required.", severity: "error" });
  }
  if (typeof type === "string" && type.length > 0 && !isKnownFieldType(type)) {
    issues.push({
      path: `${path}.type`,
      message: `Unsupported field type "${type}" — it will render as a warning box instead of a control.`,
      severity: "warning",
    });
  }

  if (typeof name !== "string" || typeof type !== "string") return null;

  const rules = normalizeFieldRules(raw);
  if (
    (raw.visibleWhen !== undefined || (isPlainObject(raw.rules) && raw.rules.visibleWhen !== undefined)) &&
    !rules?.visibleWhen
  ) {
    issues.push({
      path: `${path}.visibleWhen`,
      message: 'visibleWhen must be { field, operator, value } or shorthand { field, equals: "OTHER" }.',
      severity: "warning",
    });
  }

  const upload = parseUploadConfig(raw.upload);
  const validation = mergeFieldValidation(raw);
  const minFiles =
    typeof raw.minFiles === "number"
      ? raw.minFiles
      : upload.minFiles;
  const requiredMinFiles =
    validation?.required && (minFiles === undefined || minFiles < 1) ? 1 : minFiles;

  const rawMask = isPlainObject(raw.mask) ? raw.mask : undefined;
  const transform =
    rawMask?.transform === "uppercase" ||
    rawMask?.transform === "lowercase" ||
    rawMask?.transform === "numeric"
      ? rawMask.transform
      : undefined;
  const mask: MaskConfig | undefined =
    rawMask && typeof rawMask.pattern === "string" && rawMask.pattern.length > 0
      ? {
          pattern: rawMask.pattern,
          separator: typeof rawMask.separator === "string" ? rawMask.separator : undefined,
          transform,
        }
      : undefined;

  return {
    name,
    type: type as FormField["type"],
    label: typeof label === "string" ? label : String(name),
    placeholder: typeof raw.placeholder === "string" ? raw.placeholder : undefined,
    helpText: typeof coerced.helpText === "string" ? coerced.helpText : undefined,
    info: typeof raw.info === "string" ? raw.info : undefined,
    path: typeof raw.path === "string" ? raw.path : undefined,
    prefix: typeof raw.prefix === "string" ? raw.prefix : undefined,
    suffix: typeof raw.suffix === "string" ? raw.suffix : undefined,
    mask,
    inputFormat: parseInputFormat(raw.input),
    rules,
    defaultValue: raw.defaultValue,
    options: normalizeOptions(raw.options),
    validation,
    span: typeof raw.span === "number" ? (raw.span as FormField["span"]) : undefined,
    disabled: typeof raw.disabled === "boolean" ? raw.disabled : undefined,
    readonly: typeof raw.readonly === "boolean" ? raw.readonly : undefined,
    accept:
      typeof raw.accept === "string"
        ? raw.accept
        : upload.accept,
    maxFiles:
      typeof raw.maxFiles === "number"
        ? raw.maxFiles
        : upload.maxFiles,
    minFiles: requiredMinFiles,
    maxSize:
      typeof raw.maxSize === "number"
        ? raw.maxSize
        : upload.maxSize,
    documentType: typeof raw.documentType === "string" ? raw.documentType : undefined,
    currencyFormat: type === "currency" ? parseCurrencyFormat(raw) : undefined,
  };
}

function normalizeSection(raw: unknown, path: string, issues: ValidationIssue[]): FormSection | null {
  if (!isPlainObject(raw)) {
    issues.push({ path, message: "Section must be an object.", severity: "error" });
    return null;
  }

  const code = raw.code;
  if (typeof code !== "string" || code.length === 0) {
    issues.push({ path: `${path}.code`, message: "section.code is required.", severity: "error" });
  }

  if (!Array.isArray(raw.fields)) {
    issues.push({ path: `${path}.fields`, message: "section.fields is required and must be an array.", severity: "error" });
  }

  if (typeof code !== "string" || !Array.isArray(raw.fields)) return null;

  const fields = raw.fields
    .map((f, i) => normalizeField(f, `${path}.fields[${i}]`, issues))
    .filter((f): f is FormField => f !== null);

  return {
    code,
    title: typeof raw.title === "string" ? raw.title : code,
    description: typeof raw.description === "string" ? raw.description : undefined,
    repeatable: typeof raw.repeatable === "boolean" ? raw.repeatable : undefined,
    minInstances: typeof raw.minInstances === "number" ? raw.minInstances : undefined,
    maxInstances: typeof raw.maxInstances === "number" ? raw.maxInstances : undefined,
    columns: typeof raw.columns === "number" ? (raw.columns as FormSection["columns"]) : undefined,
    payloadKey: typeof raw.payloadKey === "string" ? raw.payloadKey : undefined,
    fields,
  };
}

function normalizeTemplate(raw: unknown, path: string, issues: ValidationIssue[]): FormTemplate | null {
  if (!isPlainObject(raw)) {
    issues.push({ path, message: "Template must be an object.", severity: "error" });
    return null;
  }

  // Accept both `formCode` (backend convention, per spec examples) and `code`.
  const code = raw.formCode ?? raw.code;
  if (typeof code !== "string" || code.length === 0) {
    issues.push({ path: `${path}.formCode`, message: "formCode (or code) is required.", severity: "error" });
  }

  if (!Array.isArray(raw.sections)) {
    issues.push({ path: `${path}.sections`, message: "sections is required and must be an array.", severity: "error" });
  }

  if (typeof code !== "string" || !Array.isArray(raw.sections)) return null;

  const sections = raw.sections
    .map((s, i) => normalizeSection(s, `${path}.sections[${i}]`, issues))
    .filter((s): s is FormSection => s !== null);

  return {
    code,
    title: typeof raw.title === "string" ? raw.title : code,
    propertyType: typeof raw.propertyType === "string" ? raw.propertyType : undefined,
    propertyName: typeof raw.propertyName === "string" ? raw.propertyName : undefined,
    description: typeof raw.description === "string" ? raw.description : undefined,
    icon: typeof raw.icon === "string" ? raw.icon : undefined,
    repeatable: typeof raw.repeatable === "boolean" ? raw.repeatable : undefined,
    minInstances: typeof raw.minInstances === "number" ? raw.minInstances : undefined,
    maxInstances: typeof raw.maxInstances === "number" ? raw.maxInstances : undefined,
    sections,
  };
}

/**
 * Accepts the raw parsed JSON root and figures out where the template(s) live:
 * an array root, a `{ templates: [...] }` / `{ forms: [...] }` wrapper (e.g. a
 * `LoanProduct`-shaped API response), or a single template object.
 */
function wrapDocumentSlots(slots: unknown[]): unknown {
  return {
    formCode: "documents",
    title: "Documents",
    sections: [
      {
        code: "uploads",
        title: "Document Uploads",
        columns: 1,
        fields: slots,
      },
    ],
  };
}

function extractTemplateCandidates(root: unknown, issues: ValidationIssue[]): unknown[] {
  if (Array.isArray(root)) {
    if (root.length > 0 && root.every(isDocumentSlot)) {
      return [wrapDocumentSlots(root)];
    }
    return root;
  }

  if (isPlainObject(root)) {
    if (Array.isArray(root.documents) && root.documents.every(isDocumentSlot)) {
      return [wrapDocumentSlots(root.documents)];
    }
    if (Array.isArray(root.templates)) return root.templates;
    if (Array.isArray(root.forms)) return root.forms;
    if (typeof root.formCode === "string" || typeof root.code === "string" || Array.isArray(root.sections)) {
      return [root];
    }
    if (isDocumentSlot(root)) {
      return [wrapDocumentSlots([root])];
    }
  }

  issues.push({
    path: "$",
    message:
      'Root JSON must be an array of form templates, an array of document slots, an object with a "templates" array, or a single template object.',
    severity: "error",
  });
  return [];
}

export function normalizeTemplateJson(root: unknown): NormalizedTemplateResult {
  const issues: ValidationIssue[] = [];
  const candidates = extractTemplateCandidates(root, issues);

  const templates = candidates
    .map((c, i) => normalizeTemplate(c, `templates[${i}]`, issues))
    .filter((t): t is FormTemplate => t !== null);

  const valid = !issues.some((i) => i.severity === "error");
  return { templates, issues, valid };
}
