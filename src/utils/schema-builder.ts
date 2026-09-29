import { z } from "zod";
import type { FormField, FormSection, FormTemplate, FieldValidation } from "@/types";
import { isFieldRequired, isFieldVisible, isEmptyValue } from "@/utils/rule-engine";
import { unmask } from "@/utils/mask";
import {
  emptyAddressValue,
  getAddressSubfields,
  isPlainObject,
} from "@/utils/address-field";

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
    const min = field.minFiles ?? (v.required && !deferToRules ? 1 : 0);
    const max = field.maxFiles;
    let files = z.array(z.any());
    if (min > 0) {
      files = files.min(min, {
        message: v.message ?? `Upload at least ${min} file${min === 1 ? "" : "s"} for ${field.label}`,
      });
    }
    if (max !== undefined) {
      files = files.max(max, {
        message: `You can upload up to ${max} file${max === 1 ? "" : "s"}`,
      });
    }
    return min > 0 ? files : files.optional();
  }

  if (field.type === "multiselect") {
    let arr = z.array(z.string());
    if (v.required && !deferToRules) {
      arr = arr.min(1, { message: v.message ?? `${field.label} is required` });
    }
    return arr;
  }

  if (field.type === "number" || field.type === "percentage") {
    let num = z.coerce.number();
    if (v.min !== undefined) num = num.min(v.min, { message: `Minimum value is ${v.min}` });
    if (v.max !== undefined) num = num.max(v.max, { message: `Maximum value is ${v.max}` });
    if (v.minExclusive !== undefined) num = num.gt(v.minExclusive);
    if (v.maxExclusive !== undefined) num = num.lt(v.maxExclusive);
    if (v.integer) num = num.int({ message: "Must be a whole number" });
    if (!v.required || deferToRules) return num.optional();
    return num;
  }

  if (field.type === "currency") {
    let num = z.number({
      required_error: v.message ?? `${field.label} is required`,
      invalid_type_error: `Enter a valid amount`,
    });
    if (v.min !== undefined) num = num.min(v.min, { message: `Minimum value is ${v.min}` });
    if (v.max !== undefined) num = num.max(v.max, { message: `Maximum value is ${v.max}` });
    if (v.minExclusive !== undefined) num = num.gt(v.minExclusive);
    if (v.maxExclusive !== undefined) num = num.lt(v.maxExclusive);
    const core = !v.required || deferToRules ? num.optional() : num;
    return z.preprocess((val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      return val;
    }, core);
  }

  // "hidden" fields carry a raw value (often not a display string) — accept anything.
  if (field.type === "hidden") {
    return z.any().optional();
  }

  if (field.type === "address") {
    const required = !deferToRules;
    const shape: z.ZodRawShape = {};
    for (const sub of getAddressSubfields({ required })) {
      shape[sub.name] = buildFieldSchema(sub);
    }
    const obj = z.object(shape);
    return required ? obj : obj.optional();
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

  // Masked fields store the separator-formatted display value (e.g. "1234-5678-9012-3456"),
  // but `pattern` is authored against the raw, unformatted characters (e.g. digits only) —
  // strip the mask literals before testing so a correctly-typed value actually passes.
  // `.refine()` moves the schema out of `ZodString` into `ZodEffects`, so from here on we
  // track the result in a separately-typed variable rather than reassigning `s`.
  let result: z.ZodTypeAny = s;
  if (v.pattern) {
    let patternRegex: RegExp | null = null;
    try {
      patternRegex = new RegExp(v.pattern);
    } catch {
      patternRegex = null;
    }

    if (!patternRegex) {
      result = s.refine(() => false, {
        message: v.message ?? "Invalid format",
      });
    } else if (field.mask) {
      result = s.refine((val) => patternRegex.test(unmask(val)), {
        message: v.message ?? "Invalid format",
      });
    } else {
      result = s.regex(patternRegex, { message: v.message ?? "Invalid format" });
    }
  }

  if (field.type === "json") {
    const jsonSchema = result.refine(
      (val) => {
        if (!val) return true;
        try {
          JSON.parse(val as string);
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
    return result.optional().or(z.literal(""));
  }

  return result;
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

          if (field.type === "address") {
            const rawAddr = scope[field.name];
            const addr: Record<string, unknown> = isPlainObject(rawAddr) ? rawAddr : {};
            for (const sub of getAddressSubfields({ required: true })) {
              if (!sub.validation?.required) continue;
              if (!isEmptyValue(addr[sub.name])) continue;
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: sub.validation?.message ?? `${sub.label} is required`,
                path: section.repeatable
                  ? [section.code, index, field.name, sub.name]
                  : [section.code, field.name, sub.name],
              });
            }
            continue;
          }

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
    } else if (f.type === "file" || f.type === "document" || f.type === "multiselect") {
      defaults[f.name] = [];
    } else if (f.type === "address") {
      defaults[f.name] = emptyAddressValue();
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
function mergePlainObjects(
  base: Record<string, unknown>,
  saved: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base, ...saved };
  for (const key of Object.keys(base)) {
    const defaultValue = base[key];
    const savedValue = saved[key];
    if (isPlainObject(defaultValue) && isPlainObject(savedValue)) {
      merged[key] = { ...defaultValue, ...savedValue };
    }
  }
  return merged;
}

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
    if (isPlainObject(base) && isPlainObject(value)) {
      merged[key] = mergePlainObjects(base, value);
    } else if (Array.isArray(value) && Array.isArray(base)) {
      if (value.length === 0) {
        merged[key] = base;
      } else {
        const itemDefault = isPlainObject(base[0]) ? base[0] : {};
        merged[key] = value.map((item) =>
          isPlainObject(item) ? mergePlainObjects(itemDefault, item) : item
        );
      }
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
