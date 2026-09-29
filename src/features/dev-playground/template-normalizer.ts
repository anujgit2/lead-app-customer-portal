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
import type { FieldOption, FieldValidation, FormField, FormSection, FormTemplate } from "@/types";
import { isKnownFieldType } from "@/utils/field-types";
import type { NormalizedTemplateResult, ValidationIssue } from "./types";

type Unknown = Record<string, unknown>;

function isPlainObject(v: unknown): v is Unknown {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

const VALIDATION_SHORTHAND_KEYS = [
  "required",
  "maxLength",
  "minLength",
  "pattern",
  "min",
  "max",
  "minExclusive",
  "maxExclusive",
  "integer",
  "email",
  "phone",
  "message",
] as const;

function normalizeValidation(raw: Unknown): FieldValidation | undefined {
  const nested = isPlainObject(raw.validation) ? (raw.validation as Unknown) : {};
  const merged: Unknown = { ...nested };
  for (const key of VALIDATION_SHORTHAND_KEYS) {
    if (merged[key] === undefined && raw[key] !== undefined) {
      merged[key] = raw[key];
    }
  }
  return Object.keys(merged).length > 0 ? (merged as FieldValidation) : undefined;
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

  const name = raw.name;
  const type = raw.type;
  const label = raw.label;

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

  const rules = isPlainObject(raw.rules)
    ? {
        visibleWhen: isPlainObject(raw.rules.visibleWhen) ? raw.rules.visibleWhen : undefined,
        requiredWhen: isPlainObject(raw.rules.requiredWhen) ? raw.rules.requiredWhen : undefined,
      }
    : undefined;

  const mask = isPlainObject(raw.mask) ? raw.mask : undefined;

  return {
    name,
    type: type as FormField["type"],
    label: typeof label === "string" ? label : name,
    placeholder: typeof raw.placeholder === "string" ? raw.placeholder : undefined,
    helpText: typeof raw.helpText === "string" ? raw.helpText : undefined,
    info: typeof raw.info === "string" ? raw.info : undefined,
    path: typeof raw.path === "string" ? raw.path : undefined,
    prefix: typeof raw.prefix === "string" ? raw.prefix : undefined,
    suffix: typeof raw.suffix === "string" ? raw.suffix : undefined,
    mask: mask as FormField["mask"],
    rules: rules as FormField["rules"],
    defaultValue: raw.defaultValue,
    options: normalizeOptions(raw.options),
    validation: normalizeValidation(raw),
    span: typeof raw.span === "number" ? (raw.span as FormField["span"]) : undefined,
    disabled: typeof raw.disabled === "boolean" ? raw.disabled : undefined,
    readonly: typeof raw.readonly === "boolean" ? raw.readonly : undefined,
    accept: typeof raw.accept === "string" ? raw.accept : undefined,
    maxFiles: typeof raw.maxFiles === "number" ? raw.maxFiles : undefined,
    maxSize: typeof raw.maxSize === "number" ? raw.maxSize : undefined,
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
function extractTemplateCandidates(root: unknown, issues: ValidationIssue[]): unknown[] {
  if (Array.isArray(root)) return root;

  if (isPlainObject(root)) {
    if (Array.isArray(root.templates)) return root.templates;
    if (Array.isArray(root.forms)) return root.forms;
    if (typeof root.formCode === "string" || typeof root.code === "string" || Array.isArray(root.sections)) {
      return [root];
    }
  }

  issues.push({
    path: "$",
    message:
      'Root JSON must be an array of form templates, an object with a "templates" array, or a single template object.',
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
