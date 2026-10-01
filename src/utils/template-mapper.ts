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
} from "@/types";

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
    label: newField.ui.label,
    type: newField.type,
    placeholder: newField.ui.placeholder,
    info: newField.ui.tooltip,
    helpText: newField.ui.helperText,
  };

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
  }

  // Handle masking
  if (newField.mask) {
    baseField.mask = {
      pattern: newField.mask.pattern,
      separator: newField.mask.separator,
      transform: newField.mask.transform,
    };
  }

  // Resolve optionSets reference → inline options
  if (newField.optionsRef) {
    const optionSet = program.optionSets[newField.optionsRef];
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
    baseField.rules = newField.rules;
  }

  // Handle component reference (e.g., ADDRESS)
  if (newField.component) {
    const componentDef = program.components[newField.component];
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
function convertInputConfig(input: any): InputFormatConfig {
  const config: InputFormatConfig = {};

  if (input.trim) config.trim = true;
  if (input.uppercase || input.transform === "uppercase") config.uppercase = true;
  if (input.lowercase || input.transform === "lowercase") config.lowercase = true;
  if (input.allowSpaces === false) config.allowSpaces = false;
  if (input.allowSpecialCharacters === false) config.allowSpecialCharacters = false;

  return Object.keys(config).length > 0 ? config : undefined;
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

  // From required flag
  if (field.required) {
    validation.required = true;
    hasValidation = true;
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
    if (field.constraints.min !== undefined) {
      const minVal = typeof field.constraints.min === "number" ? field.constraints.min : 0;
      validation.min = minVal;
      hasValidation = true;
    }
    if (field.constraints.max !== undefined) {
      const maxVal = typeof field.constraints.max === "number" ? field.constraints.max : 999999999;
      validation.max = maxVal;
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
 */
function mapNewSectionToOld(
  newSection: NewFormatSection,
  program: NewLoanProduct
): FormSection {
  return {
    code: newSection.code,
    title: newSection.ui.title,
    description: newSection.ui.subtitle,
    repeatable: newSection.repeatable || false,
    minInstances: newSection.minItems,
    maxInstances: newSection.maxItems,
    columns: 2, // Default to 2-column layout
    fields: newSection.fields.map((f) => mapNewFieldToOld(f, program)),
  };
}

/**
 * Convert new form format to old template format.
 */
function mapNewFormToOld(newForm: NewFormatForm, program: NewLoanProduct): FormTemplate {
  return {
    code: newForm.formCode,
    title: newForm.ui.title,
    description: newForm.ui.subtitle,
    repeatable: newForm.repeatable || false,
    minInstances: newForm.minItems,
    maxInstances: newForm.maxItems,
    sections: newForm.sections.map((s) => mapNewSectionToOld(s, program)),
  };
}

/**
 * Create a virtual "DOCUMENTS" FormTemplate from APPLICATION-scoped documents.
 * This allows documents to be rendered as a regular wizard step using existing form logic.
 */
function mapDocumentsToTemplate(program: NewLoanProduct): FormTemplate | null {
  const appDocs = program.documents.filter((d) => d.scope === "APPLICATION");

  if (appDocs.length === 0) {
    return null;
  }

  const fields: FormField[] = appDocs.map((doc) => ({
    name: doc.documentType,
    label: doc.ui.label,
    type: "document",
    documentType: doc.documentType,
    placeholder: doc.ui.uploadHint,
    helpText: doc.ui.description,
    info: doc.ui.tooltip,
    validation: {
      required: doc.required,
    },
    maxFiles: doc.upload.maxFiles,
    minFiles: doc.upload.minFiles,
    maxSize: doc.upload.maxFileSizeMB,
    accept: doc.upload.allowedExtensions?.join(","),
  }));

  return {
    code: "DOCUMENTS",
    title: "Documents",
    repeatable: false,
    sections: [
      {
        code: "DOCUMENT_UPLOAD",
        title: "Upload Documents",
        fields,
        columns: 1,
      },
    ],
  };
}

/**
 * Main mapper function: converts new format LoanProduct to old format.
 * This is the entry point used by mock-data and playground.
 */
export function mapNewTemplateToOld(program: NewLoanProduct): LoanProduct {
  // Map all forms to old format templates
  const templates = program.forms.map((form) => mapNewFormToOld(form, program));

  // Add virtual DOCUMENTS template if APPLICATION docs exist
  const docTemplate = mapDocumentsToTemplate(program);
  if (docTemplate) {
    templates.push(docTemplate);
  }

  return {
    id: program.programCode || "mapped",
    code: program.programCode,
    name: program.name,
    description: program.name,
    templates,
  };
}

/**
 * Detect which format a template JSON is in.
 * Returns "new" if it has schemaVersion, "old" otherwise.
 */
export function detectTemplateFormat(json: any): "old" | "new" {
  if (json && typeof json === "object") {
    if (json.schemaVersion) return "new";
    if (json.templates && !json.forms) return "old";
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
