/**
 * Single mapper from authored/API JSON → `FormTemplate` / `LoanProduct`.
 * The live loan wizard and the dev Form Playground both call this module so a
 * field authored once (mask, prefix, rules, …) cannot render differently in
 * one place than the other.
 */
import type { FieldOption, FormField, FormSection, FormTemplate, LoanProduct } from "@/types";
import { parseCurrencyFormat } from "@/utils/currency-format";
import { mergeFieldValidation, parseInputFormat } from "@/utils/field-config";
import { isKnownFieldType } from "@/utils/field-types";
import { parseMaskConfig } from "@/utils/mask";
import { normalizeFieldRules } from "@/utils/rule-engine";
import { isDocumentSlot, parseUploadConfig } from "@/utils/upload-config";

type Raw = Record<string, unknown>;

export interface MappingIssue {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface NormalizedTemplateResult {
  templates: FormTemplate[];
  issues: MappingIssue[];
  /** False when any `error`-severity issue was found — the playground must not render. */
  valid: boolean;
}

export interface BackendFormTemplateMapping {
  id: string;
  displayOrder: number;
  required?: boolean;
  visible?: boolean;
  template: {
    id: string;
    type: string;
    name: string;
    version?: number;
    status?: string;
    schema?: unknown;
    /** Legacy key used by older API versions. */
    templateSchema?: unknown;
  };
}

export interface BackendProgramWithTemplates {
  id: string;
  programCode: string;
  name: string;
  description?: string;
  formTemplates: BackendFormTemplateMapping[];
}

const SPANS = [1, 2, 3, 4, 6, 12] as const;
const COLUMNS = [1, 2, 3, 4] as const;

/**
 * Sections whose backend DTO shape differs from the template schema.
 * `maxInstances: 1` means the backend accepts a single object, not an array.
 */
const SECTION_OVERRIDES: Record<string, Pick<FormSection, "payloadKey" | "maxInstances">> = {
  business_address: { payloadKey: "address", maxInstances: 1 },
};

function isPlainObject(v: unknown): v is Raw {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function humanize(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function formatOptionLabel(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function byDisplayOrder<T extends { displayOrder?: number }>(a: T, b: T): number {
  return (a.displayOrder ?? Number.MAX_SAFE_INTEGER) - (b.displayOrder ?? Number.MAX_SAFE_INTEGER);
}

function mapOptions(raw: unknown): FieldOption[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  return raw.map((opt) => {
    if (isPlainObject(opt)) {
      return {
        label: String(opt.label ?? opt.value ?? ""),
        value: String(opt.value ?? opt.label ?? ""),
      };
    }
    const value = String(opt);
    return { label: formatOptionLabel(value), value };
  });
}

function mapField(raw: unknown, path: string, issues: MappingIssue[]): FormField | null {
  if (!isPlainObject(raw)) {
    issues.push({ path, message: "Field must be an object.", severity: "error" });
    return null;
  }

  const coerced: Raw = isDocumentSlot(raw)
    ? {
        ...raw,
        name: asString(raw.name) ?? raw.documentType,
        type: asString(raw.type) ?? "document",
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

  const rules = normalizeFieldRules(coerced);
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
  const validation = mergeFieldValidation(coerced);
  const minFiles = asNumber(raw.minFiles) ?? upload.minFiles;
  const requiredMinFiles =
    validation?.required && (minFiles === undefined || minFiles < 1) ? 1 : minFiles;

  const currencySource = isPlainObject(raw.currencyFormat) ? { ...raw, ...raw.currencyFormat } : raw;

  return {
    name,
    type: type as FormField["type"],
    label: typeof label === "string" && label.length > 0 ? label : humanize(name),
    placeholder: asString(raw.placeholder),
    helpText: asString(coerced.helpText),
    info: asString(raw.info),
    path: asString(raw.path),
    prefix: asString(raw.prefix),
    suffix: asString(raw.suffix),
    mask: parseMaskConfig(raw.mask),
    inputFormat: parseInputFormat(raw.input) ?? parseInputFormat(raw.inputFormat),
    rules,
    defaultValue: raw.defaultValue,
    options: mapOptions(raw.options),
    validation,
    span: SPANS.find((s) => s === raw.span),
    disabled: asBoolean(raw.disabled),
    readonly: asBoolean(raw.readonly),
    accept: asString(raw.accept) ?? upload.accept,
    maxFiles: asNumber(raw.maxFiles) ?? upload.maxFiles,
    minFiles: requiredMinFiles,
    maxSize: asNumber(raw.maxSize) ?? upload.maxSize,
    documentType: asString(raw.documentType),
    currencyFormat: type === "currency" ? parseCurrencyFormat(currencySource) : undefined,
  };
}

function mapSection(raw: unknown, path: string, issues: MappingIssue[]): FormSection | null {
  if (!isPlainObject(raw)) {
    issues.push({ path, message: "Section must be an object.", severity: "error" });
    return null;
  }

  const code = raw.code;
  if (typeof code !== "string" || code.length === 0) {
    issues.push({ path: `${path}.code`, message: "section.code is required.", severity: "error" });
  }
  if (!Array.isArray(raw.fields)) {
    issues.push({
      path: `${path}.fields`,
      message: "section.fields is required and must be an array.",
      severity: "error",
    });
  }
  if (typeof code !== "string" || !Array.isArray(raw.fields)) return null;

  const override = SECTION_OVERRIDES[code];
  const repeatable = asBoolean(raw.repeatable);

  return {
    code,
    title: asString(raw.title) ?? humanize(code),
    description: asString(raw.description),
    repeatable,
    minInstances: asNumber(raw.minInstances) ?? (repeatable ? 1 : undefined),
    maxInstances: override?.maxInstances ?? asNumber(raw.maxInstances),
    columns: COLUMNS.find((c) => c === raw.columns),
    payloadKey: override?.payloadKey ?? asString(raw.payloadKey),
    fields: raw.fields
      .map((f, i) => mapField(f, `${path}.fields[${i}]`, issues))
      .filter((f): f is FormField => f !== null),
  };
}

function mapTemplate(
  raw: unknown,
  path: string,
  issues: MappingIssue[],
  extras?: { propertyType?: string; propertyName?: string }
): FormTemplate | null {
  if (!isPlainObject(raw)) {
    issues.push({ path, message: "Template must be an object.", severity: "error" });
    return null;
  }

  const code = raw.formCode ?? raw.code;
  if (typeof code !== "string" || code.length === 0) {
    issues.push({ path: `${path}.formCode`, message: "formCode (or code) is required.", severity: "error" });
  }
  if (!Array.isArray(raw.sections)) {
    issues.push({
      path: `${path}.sections`,
      message: "sections is required and must be an array.",
      severity: "error",
    });
  }
  if (typeof code !== "string" || !Array.isArray(raw.sections)) return null;

  const mapped = raw.sections
    .map((s, i) => ({
      section: mapSection(s, `${path}.sections[${i}]`, issues),
      order: isPlainObject(s) ? asNumber(s.displayOrder) : undefined,
    }))
    .filter((entry): entry is { section: FormSection; order: number | undefined } => entry.section !== null)
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
    .map((entry) => entry.section);

  const repeatable = asBoolean(raw.repeatable);

  return {
    code,
    title: asString(raw.title) ?? humanize(code),
    propertyType: extras?.propertyType ?? asString(raw.propertyType),
    propertyName: extras?.propertyName ?? asString(raw.propertyName),
    description: asString(raw.description),
    icon: asString(raw.icon),
    repeatable,
    minInstances: asNumber(raw.minInstances) ?? (repeatable ? 1 : undefined),
    maxInstances: asNumber(raw.maxInstances),
    sections: mapped,
  };
}

function extractFormSchema(mapping: Raw): unknown {
  const template = isPlainObject(mapping.template) ? mapping.template : undefined;
  if (!template) return undefined;
  const payload = template.schema ?? template.templateSchema;
  return Array.isArray(payload) ? payload[0] : payload;
}

function isProgramPayload(root: unknown): root is Raw {
  return isPlainObject(root) && Array.isArray(root.formTemplates);
}

function mapProgram(program: Raw, issues: MappingIssue[]): LoanProduct {
  const templates: FormTemplate[] = [];
  const mappings = Array.isArray(program.formTemplates)
    ? program.formTemplates.filter(isPlainObject)
    : [];
  const sorted = [...mappings].sort((a, b) =>
    byDisplayOrder(
      { displayOrder: asNumber(a.displayOrder) },
      { displayOrder: asNumber(b.displayOrder) }
    )
  );

  sorted.forEach((mapping, i) => {
    if (mapping.visible === false) return;
    const schema = extractFormSchema(mapping);
    if (!schema) return;
    const nested = isPlainObject(mapping.template) ? mapping.template : undefined;
    const template = mapTemplate(schema, `formTemplates[${i}]`, issues, {
      propertyType: asString(nested?.type),
      propertyName: asString(nested?.name),
    });
    if (template) templates.push(template);
  });

  return {
    id: asString(program.id) ?? "",
    code: asString(program.programCode) ?? "",
    name: asString(program.name) ?? "",
    description: asString(program.description) ?? "",
    templates,
  };
}

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

function extractTemplateCandidates(root: unknown, issues: MappingIssue[]): unknown[] {
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
      'Root JSON must be a program (`formTemplates`), an array of form templates, an array of document slots, an object with a "templates" array, or a single template object.',
    severity: "error",
  });
  return [];
}

/** Maps a backend program payload to the `LoanProduct` the wizard renders. */
export function mapProgramToLoanProduct(program: BackendProgramWithTemplates): LoanProduct {
  return mapProgram(program as unknown as Raw, []);
}

/**
 * Maps any playground/API JSON root to templates. Program payloads (`formTemplates`)
 * take the same path as `mapProgramToLoanProduct`.
 */
export function normalizeTemplateJson(root: unknown): NormalizedTemplateResult {
  const issues: MappingIssue[] = [];

  if (isProgramPayload(root)) {
    const product = mapProgram(root, issues);
    return {
      templates: product.templates,
      issues,
      valid: !issues.some((i) => i.severity === "error"),
    };
  }

  const candidates = extractTemplateCandidates(root, issues);
  const templates = candidates
    .map((c, i) => mapTemplate(c, `templates[${i}]`, issues))
    .filter((t): t is FormTemplate => t !== null);

  return {
    templates,
    issues,
    valid: !issues.some((i) => i.severity === "error"),
  };
}
