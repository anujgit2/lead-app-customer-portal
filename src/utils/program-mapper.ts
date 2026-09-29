import type {
  FieldOption,
  FieldValidation,
  FormField,
  FormSection,
  FormTemplate,
  LoanProduct,
} from "@/types";
import { normalizeFieldRules } from "@/utils/rule-engine";
import { parseCurrencyFormat } from "@/utils/currency-format";
import { mergeFieldValidation, parseInputFormat } from "@/utils/field-config";
import { parseUploadConfig } from "@/utils/upload-config";
interface BackendFieldSchema {
  name?: string;
  label: string;
  type?: string;
  column?: string;
  placeholder?: string;
  helpText?: string;
  description?: string;
  info?: string;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  precision?: number;
  scale?: number;
  min?: number;
  max?: number;
  decimalScale?: number;
  fixedDecimalScale?: boolean;
  thousandSeparator?: string | boolean;
  decimalSeparator?: string;
  allowNegative?: boolean;
  allowLeadingZeros?: boolean;
  useGrouping?: boolean;
  defaultValue?: unknown;
  options?: string[] | FieldOption[];
  validation?: FieldValidation;
  span?: number;
  accept?: string;
  maxFiles?: number;
  minFiles?: number;
  maxSize?: number;
  documentType?: string;
  upload?: {
    allowedExtensions?: string[];
    maxFileSizeMB?: number;
    minFiles?: number;
    maxFiles?: number;
  };
  visibleWhen?: unknown;
  requiredWhen?: unknown;
  rules?: unknown;
  constraints?: FieldValidation;
  input?: {
    trim?: boolean;
    uppercase?: boolean;
    lowercase?: boolean;
    allowSpaces?: boolean;
    allowSpecialCharacters?: boolean;
  };
}

interface BackendSectionSchema {
  code: string;
  title: string;
  table?: string;
  description?: string;
  repeatable?: boolean;
  minInstances?: number;
  maxInstances?: number;
  columns?: number;
  displayOrder?: number;
  fields: BackendFieldSchema[];
}

interface BackendFormSchema {
  formCode: string;
  table?: string;
  title?: string;
  description?: string;
  repeatable?: boolean;
  minInstances?: number;
  maxInstances?: number;
  sections: BackendSectionSchema[];
}

type BackendSchemaPayload = BackendFormSchema[] | BackendFormSchema;

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
    schema?: BackendSchemaPayload;
    /** Legacy key used by older API versions. */
    templateSchema?: BackendSchemaPayload;
  };
}

export interface BackendProgramWithTemplates {
  id: string;
  programCode: string;
  name: string;
  description?: string;
  formTemplates: BackendFormTemplateMapping[];
}

function mapOptions(options?: string[] | FieldOption[]): FieldOption[] | undefined {
  if (!options?.length) return undefined;
  if (typeof options[0] === "string") {
    return (options as string[]).map((opt) => ({ label: formatOptionLabel(opt), value: opt }));
  }
  return options as FieldOption[];
}

function formatOptionLabel(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

/** Converts camelCase / snake_case identifiers into a readable title. */
function humanize(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

const SPANS = [1, 2, 3, 4, 6, 12] as const;
const COLUMNS = [1, 2, 3, 4] as const;

function mapField(field: BackendFieldSchema): FormField {
  const validation = mergeFieldValidation(field as unknown as Record<string, unknown>);
  if (field.type === "currency" && validation) {
    if (field.min !== undefined && validation.min === undefined) validation.min = field.min;
    if (field.max !== undefined && validation.max === undefined) validation.max = field.max;
  }

  const upload = parseUploadConfig(field.upload);
  const name = field.name ?? field.documentType ?? humanize("field");
  const type = (field.type ?? (field.documentType ? "document" : "text")) as FormField["type"];
  const minFiles =
    field.minFiles ??
    upload.minFiles ??
    (validation?.required ? 1 : undefined);

  return {
    name,
    label: field.label ?? humanize(name),
    type,
    placeholder: field.placeholder,
    helpText: field.helpText ?? field.description,
    info: field.info,
    defaultValue: field.defaultValue,
    options: mapOptions(field.options),
    validation,
    span: SPANS.find((s) => s === field.span),
    accept: field.accept ?? upload.accept,
    maxFiles: field.maxFiles ?? upload.maxFiles,
    minFiles,
    maxSize: field.maxSize ?? upload.maxSize,
    documentType: field.documentType,
    rules: normalizeFieldRules({
      visibleWhen: field.visibleWhen,
      requiredWhen: field.requiredWhen,
      rules: field.rules,
    }),
    inputFormat: parseInputFormat(field.input),
    currencyFormat:
      type === "currency"
        ? parseCurrencyFormat({
            precision: field.precision,
            scale: field.scale,
            decimalScale: field.decimalScale,
            fixedDecimalScale: field.fixedDecimalScale,
            thousandSeparator: field.thousandSeparator,
            decimalSeparator: field.decimalSeparator,
            allowNegative: field.allowNegative,
            allowLeadingZeros: field.allowLeadingZeros,
            useGrouping: field.useGrouping,
          })
        : undefined,
  };
}

function byDisplayOrder<T extends { displayOrder?: number }>(a: T, b: T): number {
  return (a.displayOrder ?? Number.MAX_SAFE_INTEGER) - (b.displayOrder ?? Number.MAX_SAFE_INTEGER);
}

/**
 * Sections whose backend DTO shape differs from the template schema.
 * `maxInstances: 1` means the backend accepts a single object, not an array.
 */
const SECTION_OVERRIDES: Record<string, Pick<FormSection, "payloadKey" | "maxInstances">> = {
  business_address: { payloadKey: "address", maxInstances: 1 },
};

function mapSection(section: BackendSectionSchema): FormSection {
  const override = SECTION_OVERRIDES[section.code];
  return {
    code: section.code,
    title: section.title ?? humanize(section.code),
    description: section.description,
    repeatable: section.repeatable,
    minInstances: section.minInstances ?? (section.repeatable ? 1 : undefined),
    maxInstances: override?.maxInstances ?? section.maxInstances,
    columns: COLUMNS.find((c) => c === section.columns),
    fields: (section.fields ?? []).map(mapField),
    payloadKey: override?.payloadKey,
  };
}

function extractFormSchema(mapping: BackendFormTemplateMapping): BackendFormSchema | undefined {
  const payload = mapping.template.schema ?? mapping.template.templateSchema;
  return Array.isArray(payload) ? payload[0] : payload;
}

function mapTemplate(
  mapping: BackendFormTemplateMapping,
  schema: BackendFormSchema
): FormTemplate {
  return {
    code: schema.formCode ?? mapping.template.name ?? mapping.template.type,
    title: schema.title ?? humanize(mapping.template.name ?? schema.formCode),
    propertyType: mapping.template.type,
    propertyName: mapping.template.name,
    description: schema.description,
    repeatable: schema.repeatable,
    minInstances: schema.minInstances ?? (schema.repeatable ? 1 : undefined),
    maxInstances: schema.maxInstances,
    sections: [...(schema.sections ?? [])].sort(byDisplayOrder).map(mapSection),
  };
}

export function mapProgramToLoanProduct(program: BackendProgramWithTemplates): LoanProduct {
  const templates: FormTemplate[] = [];

  for (const mapping of [...(program.formTemplates ?? [])].sort(byDisplayOrder)) {
    if (mapping.visible === false) continue;

    const schema = extractFormSchema(mapping);
    if (!schema) continue;

    templates.push(mapTemplate(mapping, schema));
  }

  return {
    id: program.id,
    code: program.programCode,
    name: program.name,
    description: program.description ?? "",
    templates,
  };
}
