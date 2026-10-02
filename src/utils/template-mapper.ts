/**
 * Smart template mapper: converts the new flat template format (v1.0) to the old nested format.
 *
 * This mapper resolves:
 * - optionSets references → inline options arrays
 * - component references → inline component fields (e.g., ADDRESS subfields)
 * - constraints → merged into validation objects
 * - validation arrays → consolidated into single validation object (or array preserved)
 * - input transforms → converted to inputFormat
 * - documents[] → virtual DOCUMENTS FormTemplate
 *
 * The old interface is what the existing form components (DynamicField, DynamicSection, DynamicForm)
 * expect and work with. This mapper is the bridge between the new config and the old working system.
 */

import type {
  NewLoanProduct,
  NewFormatForm,
  NewFormatSection,
  NewFormatField,
  LoanProduct,
  FormTemplate,
  FormSection,
  FormField,
  FieldValidation,
  InputFormatConfig,
  FieldOption,
  MaskConfig,
  FieldRules,
  ConditionRule,
  ConditionOperator,
  DocumentDefinition,
  DocumentPolicyConfig,
} from "@/types";
import { extensionsToAccept } from "@/utils/upload-config";

/**
 * Convert new field format to old field format.
 * Resolves optionSets, components, and merges constraints + validation.
 */
function mapNewFieldToOld(
  newField: NewFormatField,
  program: NewLoanProduct
): FormField {
  const baseField: FormField = {
    name: newField.key,
    label: newField.ui?.label || newField.key,
    type: newField.type,
    placeholder: newField.ui?.placeholder,
    info: newField.ui?.tooltip,
    helpText: newField.ui?.helperText,
  };
  if (typeof newField.path === "string" && newField.path.trim()) {
    baseField.path = newField.path.trim();
  }

  // Copy primitive properties
  if (newField.defaultValue !== undefined) {
    baseField.defaultValue = newField.defaultValue;
  }
  if (newField.unit) {
    baseField.suffix = newField.unit; // unit → suffix
  }

  // Handle input formatting
  if (newField.input) {
    const inputFormat = convertInputConfig(newField.input);
    if (inputFormat) {
      baseField.inputFormat = inputFormat;
    }
    // Extract prefix from input if present
    if (newField.input.prefix) {
      baseField.prefix = newField.input.prefix;
    }
    if (newField.input.transform === "boolean") {
      baseField.wireTransform = "boolean";
    }
  }

  // Handle masking
  if (newField.mask?.pattern) {
    const transform =
      newField.mask.transform ??
      (newField.input?.transform === "numeric" ||
      newField.input?.transform === "uppercase" ||
      newField.input?.transform === "lowercase"
        ? newField.input.transform
        : undefined);
    baseField.mask = {
      pattern: newField.mask.pattern,
      separator: newField.mask.separator,
      transform,
    };
  }

  // Resolve optionSets reference → inline options
  if (newField.optionsRef) {
    const optionSet = program.optionSets?.[newField.optionsRef];
    if (optionSet) {
      baseField.options = optionSet.map((item) => ({
        label: item.ui.label,
        value: item.value,
      }));
    }
  }

  // Handle validation and constraints
  const validation = buildValidationFromNewField(newField, program);
  if (validation) {
    baseField.validation = validation;
  }

  // Handle rules (conditional visibility/required)
  if (newField.rules) {
    baseField.rules = convertNewRulesToOld(newField.rules);
  }

  // Handle component reference (e.g., ADDRESS)
  if (newField.component) {
    const componentDef = program.components?.[newField.component];
    if (componentDef && newField.component === "ADDRESS") {
      // Special handling for ADDRESS component — expand to nested structure
      // The ADDRESS component gets rendered as a composite field with subfields
      baseField.type = "address";
      // Subfields are handled by DynamicField when it detects type === "address"
    }
  }

  return baseField;
}

/**
 * Convert new InputConfig to old InputFormatConfig.
 */
function convertInputConfig(input: any): InputFormatConfig | undefined {
  const config: InputFormatConfig = {};

  if (input.trim) config.trim = true;
  if (input.uppercase || input.transform === "uppercase") config.uppercase = true;
  if (input.lowercase || input.transform === "lowercase") config.lowercase = true;
  if (input.allowSpaces === false) config.allowSpaces = false;
  if (input.allowSpecialCharacters === false) config.allowSpecialCharacters = false;

  return Object.keys(config).length > 0 ? config : undefined;
}

/**
 * Convert new format rules to old format.
 * New format: { visibleWhen: { op, field, value }, requiredWhen: { op, field, value } }
 * Old format: { visibleWhen: { field, operator, value }, requiredWhen: { field, operator, value } }
 */
function convertNewRulesToOld(newRules: any): FieldRules | undefined {
  if (!newRules || typeof newRules !== "object") {
    return undefined;
  }

  const rules: FieldRules = {};

  // Convert visibleWhen
  if (newRules.visibleWhen) {
    const converted = convertNewRuleToCondition(newRules.visibleWhen);
    if (converted) {
      rules.visibleWhen = converted;
    }
  }

  // Convert requiredWhen
  if (newRules.requiredWhen) {
    const converted = convertNewRuleToCondition(newRules.requiredWhen);
    if (converted) {
      rules.requiredWhen = converted;
    }
  }

  return Object.keys(rules).length > 0 ? rules : undefined;
}

/**
 * Convert a single new format rule to old ConditionRule format.
 * Handles:
 * - op → operator (e.g., "eq" → "equals")
 * - field path normalization (e.g., "company.gstRegistered" → "gstRegistered")
 * - value extraction from simple rules
 */
function convertNewRuleToCondition(rule: any): ConditionRule | undefined {
  if (!rule || typeof rule !== "object") {
    return undefined;
  }

  const op = (rule.op ?? rule.operator) as string | undefined;
  let field = rule.field as string | undefined;
  let value = rule.value;

  // Operator mapping
  const operatorMap: Record<string, ConditionOperator> = {
    eq: "equals",
    notEq: "notEquals",
    in: "in",
    notIn: "notIn",
    contains: "contains",
    gt: "gt",
    gte: "gte",
    lt: "lt",
    lte: "lte",
    notEmpty: "exists",
    empty: "notExists",
  };

  if (!op || !field) {
    return undefined;
  }

  // Strip property prefix from field path
  // e.g., "company.gstRegistered" → "gstRegistered"
  if (field.includes(".")) {
    const parts = field.split(".");
    field = parts[parts.length - 1];
  }

  // Get the operator, defaulting to the op value if not in map
  const operator = (operatorMap[op] || op) as ConditionOperator;

  // For complex rules, try to extract value from right side
  if (value === undefined && rule.right !== undefined) {
    value = rule.right;
  }

  return {
    field,
    operator,
    value,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function interpolateError(
  template: string | undefined,
  vars: Record<string, string | number | undefined>
): string | undefined {
  if (!template) return undefined;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? match : String(value);
  });
}

/** Resolve `program.limits.loanTermMonths.min` style refs against the product JSON. */
function resolveProgramRef(ref: string, program: NewLoanProduct): number | undefined {
  const path = ref.startsWith("program.") ? ref.slice("program.".length) : ref;
  let cursor: unknown = program;
  for (const part of path.split(".")) {
    if (!isPlainObject(cursor)) return undefined;
    cursor = cursor[part];
  }
  return typeof cursor === "number" && Number.isFinite(cursor) ? cursor : undefined;
}

function resolveNumericConstraint(value: unknown, program: NewLoanProduct): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (isPlainObject(value) && typeof value.$ref === "string") {
    return resolveProgramRef(value.$ref, program);
  }
  return undefined;
}

/**
 * Build validation object from new field (combines constraints + validation rules).
 */
function buildValidationFromNewField(
  field: NewFormatField,
  program: NewLoanProduct
): FieldValidation | undefined {
  const validation: FieldValidation = {};
  let hasValidation = false;
  const errorCopy = field.ui?.errors;

  // From required flag
  if (field.required) {
    validation.required = true;
    hasValidation = true;
    if (errorCopy?.required) {
      validation.message = errorCopy.required;
    }
  }

  // From constraints
  if (field.constraints) {
    if (field.constraints.minLength !== undefined) {
      validation.minLength = field.constraints.minLength;
      hasValidation = true;
    }
    if (field.constraints.maxLength !== undefined) {
      validation.maxLength = field.constraints.maxLength;
      hasValidation = true;
    }
    const minVal = resolveNumericConstraint(field.constraints.min, program);
    if (minVal !== undefined) {
      validation.min = minVal;
      validation.minMessage = interpolateError(errorCopy?.min, { min: minVal });
      hasValidation = true;
    }
    const maxVal = resolveNumericConstraint(field.constraints.max, program);
    if (maxVal !== undefined) {
      validation.max = maxVal;
      validation.maxMessage = interpolateError(errorCopy?.max, { max: maxVal });
      hasValidation = true;
    }
    if (field.constraints.integer) {
      validation.integer = true;
      hasValidation = true;
    }
  }

  // From validation rules array (extract pattern, custom messages)
  if (field.validation && Array.isArray(field.validation)) {
    for (const rule of field.validation) {
      if (rule.regex) {
        validation.pattern = rule.regex;
        hasValidation = true;
      }
      // Use the first rule's custom message if available
      if (!validation.message && rule.code) {
        const errorMsg = field.ui.errors?.[rule.code];
        if (errorMsg) {
          validation.message = errorMsg;
        }
      }
    }
  }

  return hasValidation ? validation : undefined;
}

/**
 * Convert new section format to old section format.
 * Handles both regular fields and component-based sections (e.g., ADDRESS).
 */
function mapNewSectionToOld(
  newSection: NewFormatSection,
  program: NewLoanProduct
): FormSection {
  let fields = (newSection.fields || []).map((f) => mapNewFieldToOld(f, program));
  
  // If section has a component reference but no fields, expand it from the component definition
  if (newSection.component && fields.length === 0) {
    const componentDef = program.components?.[newSection.component];
    if (componentDef?.fields) {
      fields = componentDef.fields.map((f) => mapNewFieldToOld(f, program));
    }
  }

  const section: FormSection = {
    code: newSection.code,
    title: newSection.ui?.title || "Section",
    description: newSection.ui?.subtitle,
    repeatable: newSection.repeatable || false,
    columns: 2, // Default to 2-column layout
    fields,
  };

  if (newSection.minItems !== undefined) {
    section.minInstances = newSection.minItems;
  }
  if (newSection.maxItems !== undefined) {
    section.maxInstances = newSection.maxItems;
  }

  return section;
}

/**
 * Convert new form format to old template format.
 */
function mapNewFormToOld(newForm: NewFormatForm, program: NewLoanProduct): FormTemplate {
  const template: FormTemplate = {
    code: newForm.formCode,
    title: newForm.ui?.title || "Form",
    description: newForm.ui?.subtitle,
    propertyType: newForm.formName,
    propertyName: newForm.formCode,
    repeatable: newForm.repeatable || false,
    sections: (newForm.sections || []).map((s) => mapNewSectionToOld(s, program)),
  };

  if (newForm.minItems !== undefined) {
    template.minInstances = newForm.minItems;
  }
  if (newForm.maxItems !== undefined) {
    template.maxInstances = newForm.maxItems;
  }

  return template;
}

const DOCUMENT_SCOPE_TITLES: Record<string, string> = {
  APPLICATION: "Application documents",
  OWNER: "Owner documents",
  BANK_ACCOUNT: "Bank account documents",
};

function interpolateDocumentCopy(
  text: string | undefined,
  doc: DocumentDefinition,
  policy?: DocumentPolicyConfig
): string | undefined {
  if (!text) return undefined;
  const vars: Record<string, string | number | undefined> = {
    maxFileSizeMB: doc.upload?.maxFileSizeMB,
    maxFiles: doc.upload?.maxFiles,
    minFiles: doc.upload?.minFiles,
    coverageMonths: policy?.coverageMonths?.[doc.documentType],
  };
  return text.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? match : String(value);
  });
}

function mapDocumentToField(
  doc: DocumentDefinition,
  program: NewLoanProduct,
  includeVisibilityRules: boolean
): FormField {
  const requiredMin =
    doc.required && (doc.upload?.minFiles === undefined || doc.upload.minFiles < 1)
      ? 1
      : doc.upload?.minFiles;
  const rules = includeVisibilityRules
    ? convertNewRulesToOld(doc.rules)
    : convertNewRulesToOld(
        doc.rules?.requiredWhen ? { requiredWhen: doc.rules.requiredWhen } : undefined
      );

  return {
    name: doc.documentType,
    label: doc.ui?.label || doc.documentType,
    type: "document",
    documentType: doc.documentType,
    placeholder: interpolateDocumentCopy(doc.ui?.uploadHint, doc, program.documentPolicy),
    helpText: interpolateDocumentCopy(doc.ui?.description, doc, program.documentPolicy),
    info: interpolateDocumentCopy(doc.ui?.tooltip, doc, program.documentPolicy),
    validation: {
      required: doc.required,
      message: interpolateDocumentCopy(doc.ui?.errors?.required, doc, program.documentPolicy),
    },
    rules,
    maxFiles: doc.upload?.maxFiles,
    minFiles: requiredMin,
    maxSize: doc.upload?.maxFileSizeMB,
    accept: doc.upload?.allowedExtensions
      ? extensionsToAccept(doc.upload.allowedExtensions)
      : undefined,
  };
}

/**
 * Create a virtual "DOCUMENTS" FormTemplate from the program's documents list.
 * When the program has no forms (file-upload programs), every scope is shown.
 * When forms exist, APPLICATION-scoped documents become a dedicated wizard step.
 */
function mapDocumentsToTemplate(program: NewLoanProduct): FormTemplate | null {
  const hasForms =
    Array.isArray(program.forms) && program.forms.some((form) => form.visible !== false);
  const allDocs = Array.isArray(program.documents) ? program.documents : [];
  const docs = hasForms ? allDocs.filter((d) => d.scope === "APPLICATION") : allDocs;

  if (docs.length === 0) {
    return null;
  }

  const groups = new Map<string, DocumentDefinition[]>();
  for (const doc of docs) {
    const scope = doc.scope || "APPLICATION";
    const list = groups.get(scope) ?? [];
    list.push(doc);
    groups.set(scope, list);
  }

  return {
    code: "DOCUMENTS",
    title: "Business documents",
    description: "Upload what you have now. Only items marked required block submission.",
    propertyType: "DocumentProperty",
    propertyName: "documents",
    repeatable: false,
    sections: [...groups.entries()].map(([scope, scopeDocs]) => ({
      code: `${scope}_DOCUMENTS`,
      title: DOCUMENT_SCOPE_TITLES[scope] ?? "Documents",
      fields: scopeDocs.map((doc) => mapDocumentToField(doc, program, hasForms)),
      columns: 1,
    })),
  };
}

/**
 * Main mapper function: converts new format LoanProduct to old format.
 * This is the entry point used by mock-data and playground.
 */
export function mapNewTemplateToOld(program: NewLoanProduct): LoanProduct {
  const forms = (Array.isArray(program.forms) ? program.forms : []).filter(
    (form) => form.visible !== false
  );
  const templates = forms.map((form) => mapNewFormToOld(form, program));

  const docTemplate = mapDocumentsToTemplate(program);
  if (docTemplate) {
    templates.push(docTemplate);
  }

  const productId = program.id || program.programCode || "mapped";

  return {
    id: productId,
    code: program.programCode || productId,
    name: program.name || program.ui?.title || "Loan Product",
    description: program.ui?.subtitle || program.name || "Loan Product",
    templates,
  };
}

/**
 * Detect which format a template JSON is in.
 * Returns "new" if it has schemaVersion, forms[], or documents[].
 */
export function detectTemplateFormat(json: any): "old" | "new" {
  if (json && typeof json === "object") {
    if (
      (typeof json.schemaVersion === "string" && json.schemaVersion.length > 0) ||
      Array.isArray(json.forms) ||
      Array.isArray(json.documents)
    ) {
      return "new";
    }
    if (Array.isArray(json.formTemplates) || (json.templates && !json.forms)) return "old";
  }
  return "old";
}

/**
 * Parse and normalize template JSON, automatically converting new format to old.
 */
export function normalizeTemplateAuto(json: any): LoanProduct {
  const format = detectTemplateFormat(json);

  if (format === "new") {
    return mapNewTemplateToOld(json as NewLoanProduct);
  }

  // Already old format
  return json as LoanProduct;
}
