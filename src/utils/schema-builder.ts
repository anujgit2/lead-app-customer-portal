import { z } from "zod";
import type { FormField, FormSection, FormTemplate, FieldValidation } from "@/types";
import { isFieldRequired, isFieldVisible, isEmptyValue } from "@/utils/rule-engine";

function buildFieldSchema(field: FormField): z.ZodTypeAny {
  const v: FieldValidation = field.validation ?? {};
  // Fields with conditional rules defer their required-ness (and, for visibleWhen,
  // whether they're validated at all) to the superRefine added in buildTemplateSchema,
  // since that's the only place with access to sibling field values. Fields without
  // `rules` are completely unaffected — same schema as before.
  const deferToRules = !!(field.rules?.visibleWhen || field.rules?.requiredWhen);

  if (field.type === "checkbox") {
    const boolSchema = z.boolean();
    if (v.required && !deferToRules) {
      return boolSchema.refine((val) => val === true, {
        message: v.message ?? `${field.label} must be accepted`,
      });
    }
    return boolSchema.optional();
  }

  if (field.type === "file" || field.type === "document") {
    const fileSchema = z.any();
    if (v.required && !deferToRules) {
      return fileSchema.refine(
        (val) => val && (Array.isArray(val) ? val.length > 0 : true),
        { message: v.message ?? `${field.label} is required` }
      );
    }
    return fileSchema.optional();
  }

  if (field.type === "number" || field.type === "currency" || field.type === "percentage") {
    let num = z.coerce.number();
    if (v.min !== undefined) num = num.min(v.min, { message: `Minimum value is ${v.min}` });
    if (v.max !== undefined) num = num.max(v.max, { message: `Maximum value is ${v.max}` });
    if (v.minExclusive !== undefined) num = num.gt(v.minExclusive);
    if (v.maxExclusive !== undefined) num = num.lt(v.maxExclusive);
    if (v.integer) num = num.int({ message: "Must be a whole number" });
    if (!v.required || deferToRules) return num.optional();
    return num;
  }

  // "hidden" fields carry a raw value (often not a display string) — accept anything.
  if (field.type === "hidden") {
    return z.any().optional();
  }

  let s: z.ZodString = z.string({ required_error: v.message ?? `${field.label} is required` });

  if (v.required && !deferToRules) s = s.min(1, { message: v.message ?? `${field.label} is required` });

  if (v.minLength) s = s.min(v.minLength, { message: `Minimum ${v.minLength} characters` });
  if (v.maxLength) s = s.max(v.maxLength, { message: `Maximum ${v.maxLength} characters` });

  if (v.email || field.type === "email") {
    s = s.email({ message: "Enter a valid email address" });
  }

  if (v.phone || field.type === "tel") {
    s = s.regex(/^[+]?[\d\s\-().]{7,15}$/, { message: "Enter a valid phone number" });
  }

  if (v.pattern) {
    s = s.regex(new RegExp(v.pattern), { message: v.message ?? "Invalid format" });
  }

  if (field.type === "json") {
    const jsonSchema = s.refine(
      (val) => {
        if (!val) return true;
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Enter valid JSON" }
    );
    return v.required && !deferToRules ? jsonSchema : jsonSchema.optional().or(z.literal(""));
  }

  if (!v.required || deferToRules) {
    return s.optional().or(z.literal(""));
  }

  return s;
}

export function buildSectionSchema(section: FormSection): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {};
  for (const field of section.fields) {
    shape[field.name] = buildFieldSchema(field);
  }
  return z.object(shape);
}

/** True when any field in the template uses conditional rules (visibleWhen/requiredWhen). */
function templateHasConditionalRules(template: FormTemplate): boolean {
  return template.sections.some((section) => section.fields.some((field) => field.rules));
}

/**
 * Adds a `superRefine` pass that enforces conditional `requiredWhen` rules (and gates
 * `visibleWhen`-hidden fields out of validation entirely), since Zod's per-field schema
 * has no access to sibling values. Only templates that actually declare `rules` on a
 * field pay this cost — everything else short-circuits back to the plain object schema
 * with unchanged behavior.
 */
function withConditionalRuleValidation(
  template: FormTemplate,
  base: z.ZodObject<z.ZodRawShape>
): z.ZodTypeAny {
  if (!templateHasConditionalRules(template)) return base;

  return base.superRefine((data, ctx) => {
    const templateData = data as Record<string, unknown>;
    for (const section of template.sections) {
      const fieldsWithRules = section.fields.filter((f) => f.rules);
      if (fieldsWithRules.length === 0) continue;

      const sectionValue = templateData[section.code];
      const instances: Array<Record<string, unknown>> = section.repeatable
        ? (Array.isArray(sectionValue) ? sectionValue : []).map((v) =>
            v && typeof v === "object" ? (v as Record<string, unknown>) : {}
          )
        : [sectionValue && typeof sectionValue === "object" ? (sectionValue as Record<string, unknown>) : {}];

      instances.forEach((scope, index) => {
        for (const field of fieldsWithRules) {
          if (!isFieldVisible(field, scope)) continue;
          if (!isFieldRequired(field, scope)) continue;
          if (!isEmptyValue(scope[field.name])) continue;

          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: field.validation?.message ?? `${field.label} is required`,
            path: section.repeatable
              ? [section.code, index, field.name]
              : [section.code, field.name],
          });
        }
      });
    }
  });
}

export function buildTemplateSchema(template: FormTemplate): z.ZodTypeAny {
  const shape: z.ZodRawShape = {};
  for (const section of template.sections) {
    if (section.repeatable) {
      const sectionSchema = buildSectionSchema(section);
      const min = section.minInstances ?? 0;
      let arr = z.array(sectionSchema);
      if (min > 0) arr = arr.min(min, { message: `At least ${min} entry required` });
      shape[section.code] = arr;
    } else {
      shape[section.code] = buildSectionSchema(section);
    }
  }
  return withConditionalRuleValidation(template, z.object(shape));
}

export function buildSectionDefaults(section: FormSection): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const f of section.fields) {
    if (f.defaultValue !== undefined) {
      defaults[f.name] = f.defaultValue;
    } else if (f.type === "checkbox") {
      defaults[f.name] = false;
    } else if (f.type === "file" || f.type === "document") {
      defaults[f.name] = [];
    } else {
      defaults[f.name] = "";
    }
  }
  return defaults;
}

/** Initial values for a template; repeatable sections are seeded with `minInstances` entries. */
export function buildTemplateDefaults(template: FormTemplate): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const section of template.sections) {
    if (section.repeatable) {
      const count = Math.max(section.minInstances ?? 1, 1);
      defaults[section.code] = Array.from({ length: count }, () => buildSectionDefaults(section));
    } else {
      defaults[section.code] = buildSectionDefaults(section);
    }
  }
  return defaults;
}

/** Fills in template defaults for any section missing from previously saved data. */
export function mergeTemplateDefaults(
  template: FormTemplate,
  values: unknown
): Record<string, unknown> {
  const defaults = buildTemplateDefaults(template);
  if (!values || typeof values !== "object") return defaults;
  const saved = values as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...defaults };
  for (const [key, value] of Object.entries(saved)) {
    const base = defaults[key];
    if (
      base && !Array.isArray(base) && typeof base === "object" &&
      value && !Array.isArray(value) && typeof value === "object"
    ) {
      merged[key] = { ...base, ...(value as Record<string, unknown>) };
    } else if (Array.isArray(value) && value.length === 0 && Array.isArray(base)) {
      merged[key] = base;
    } else if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

export function buildWizardSchema(template: FormTemplate, isRepeatable: boolean): z.ZodTypeAny {
  const templateSchema = buildTemplateSchema(template);
  if (isRepeatable) {
    const min = template.minInstances ?? 0;
    let arr = z.array(templateSchema);
    if (min > 0) arr = arr.min(min, { message: `At least ${min} ${template.title} required` });
    return arr;
  }
  return templateSchema;
}
