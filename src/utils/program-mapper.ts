import type {
  FieldOption,
  FieldValidation,
  FormField,
  FormSection,
  FormTemplate,
  LoanProduct,
} from "@/types";

interface BackendFieldSchema {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  defaultValue?: unknown;
  options?: string[] | FieldOption[];
  validation?: FieldValidation;
  span?: number;
  accept?: string;
  maxFiles?: number;
  maxSize?: number;
}

interface BackendSectionSchema {
  code: string;
  title: string;
  description?: string;
  repeatable?: boolean;
  minInstances?: number;
  maxInstances?: number;
  columns?: number;
  fields: BackendFieldSchema[];
}

interface BackendFormSchema {
  formCode: string;
  title?: string;
  description?: string;
  repeatable?: boolean;
  minInstances?: number;
  maxInstances?: number;
  sections: BackendSectionSchema[];
}

export interface BackendFormTemplateMapping {
  id: string;
  displayOrder: number;
  required?: boolean;
  visible?: boolean;
  formTemplate: {
    id: string;
    templateCode: string;
    name: string;
    templateSchema: BackendFormSchema[] | BackendFormSchema;
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

function mapField(field: BackendFieldSchema): FormField {
  const validation: FieldValidation = {
    ...(field.validation ?? {}),
  };

  if (field.required) validation.required = true;
  if (field.maxLength !== undefined) validation.maxLength = field.maxLength;
  if (field.minLength !== undefined) validation.minLength = field.minLength;

  return {
    name: field.name,
    label: field.label,
    type: field.type as FormField["type"],
    placeholder: field.placeholder,
    helpText: field.helpText,
    defaultValue: field.defaultValue,
    options: mapOptions(field.options),
    validation: Object.keys(validation).length > 0 ? validation : undefined,
    span: field.span as FormField["span"],
    accept: field.accept,
    maxFiles: field.maxFiles,
    maxSize: field.maxSize,
  };
}

function mapSection(section: BackendSectionSchema): FormSection {
  return {
    code: section.code,
    title: section.title,
    description: section.description,
    repeatable: section.repeatable,
    minInstances: section.minInstances,
    maxInstances: section.maxInstances,
    columns: section.columns as FormSection["columns"],
    fields: section.fields.map(mapField),
  };
}

function extractFormSchema(
  templateSchema: BackendFormSchema[] | BackendFormSchema
): BackendFormSchema {
  if (Array.isArray(templateSchema)) {
    return templateSchema[0];
  }
  return templateSchema;
}

function mapTemplate(mapping: BackendFormTemplateMapping): FormTemplate {
  const schema = extractFormSchema(mapping.formTemplate.templateSchema);
  return {
    code: schema.formCode ?? mapping.formTemplate.templateCode,
    title: schema.title ?? mapping.formTemplate.name,
    description: schema.description,
    repeatable: schema.repeatable,
    minInstances: schema.minInstances ?? (schema.repeatable ? 1 : undefined),
    maxInstances: schema.maxInstances,
    sections: schema.sections.map(mapSection),
  };
}

export function mapProgramToLoanProduct(program: BackendProgramWithTemplates): LoanProduct {
  const templates = [...program.formTemplates]
    .filter((m) => m.visible !== false)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(mapTemplate);

  return {
    id: program.id,
    code: program.programCode,
    name: program.name,
    description: program.description ?? "",
    templates,
  };
}
