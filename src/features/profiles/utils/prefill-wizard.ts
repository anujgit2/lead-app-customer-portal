import type { FormData, FormTemplate } from "@/types";
import { profileDataToFormValues } from "./profile-data";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function valuesFromTemplate(
  template: FormTemplate,
  data: Record<string, unknown>,
  values: Record<string, unknown>
) {
  const sections = profileDataToFormValues(template, data);
  for (const section of Object.values(sections)) {
    const row = Array.isArray(section) ? section[0] : section;
    if (!isPlainObject(row)) continue;
    for (const [name, value] of Object.entries(row)) {
      if (value !== undefined && !(name in values)) values[name] = value;
    }
  }
}

/** Field name → value from a profile payload, using each profile form's paths. */
export function fieldValuesFromProfile(
  template: FormTemplate | FormTemplate[],
  data: Record<string, unknown>
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const templates = Array.isArray(template) ? template : [template];
  for (const item of templates) valuesFromTemplate(item, data, values);
  return values;
}

/**
 * Copies profile field values onto wizard templates where the field name matches.
 * Repeatable wizard sections receive a single prefilled row.
 */
export function prefillWizardFormData(
  templates: FormTemplate[],
  profileFieldValues: Record<string, unknown>
): FormData {
  const formData: Record<string, unknown> = {};

  for (const template of templates) {
    const instance: Record<string, unknown> = {};
    for (const section of template.sections) {
      const fields: Record<string, unknown> = {};
      for (const field of section.fields) {
        if (!(field.name in profileFieldValues)) continue;
        const value = profileFieldValues[field.name];
        if (value === undefined) continue;
        fields[field.name] = value;
      }
      if (Object.keys(fields).length === 0) continue;
      instance[section.code] = section.repeatable ? [fields] : fields;
    }
    if (Object.keys(instance).length === 0) continue;
    formData[template.code] = template.repeatable ? [instance] : instance;
  }

  return formData as FormData;
}
