import { z } from "zod";
import type { FormField, FormSection, FormTemplate, FieldValidation } from "@/types";
import { isFieldRequired, isFieldVisible, isEmptyValue } from "@/utils/rule-engine";
import { unmask } from "@/utils/mask";
import {
  emptyAddressValue,
  getAddressSubfields,
  isPlainObject,
} from "@/utils/address-field";

/**
 * Mock async validators for the new template format.
 * These simulate backend validation providers. In a real system, these would make actual API calls.
 * Currently, we mock them to always pass validation.
 *
 * Supported providers:
 * - PAN_VERIFY: Verify PAN number format (mocked as pass)
 * - GSTIN_VERIFY: Verify GSTIN format (mocked as pass)
 * - IFSC_LOOKUP: Lookup IFSC code and autofill bank name (mocked as pass)
 * - PINCODE_LOOKUP: Lookup pincode and autofill city/state (mocked as pass)
 */
function createAsyncValidator(provider: string) {
  return z.string().refine(
    async () => {
      // Mock: Always pass. In production, these would call backend services.
      // Example: if (provider === 'PAN_VERIFY') { return await verifyPAN(value); }
      return true;
    },
    { message: `Verification via ${provider} failed` }
  );
}

function isRawAlphanumericPattern(pattern?: string): boolean {
  if (!pattern) return false;
  const withoutClasses = pattern.replace(/\[[^\]]*\]/g, "A");
  return !/[- ()/+.]/.test(withoutClasses.replace(/\\\./g, ""));
}

function contentForValidation(value: unknown, unmasked: boolean): string {
  const str = String(value ?? "");
  return unmasked ? unmask(str) : str;
}

/** Empty number inputs stay empty — they must not coerce to 0. */
function normalizeEmptyNumber(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
}

/** API drafts often store empty text/select values as `null`. Zod rejects that. */
function normalizeEmptyString(value: unknown): unknown {
  if (value === null || value === undefined) return "";
  return value;
}

function buildFieldSchema(field: FormField): z.ZodTypeAny {
  const v: FieldValidation = field.validation ?? {};
  // Fields with conditional rules defer their required-ness (and, for visibleWhen,
  // whether they're validated at all) to the superRefine added in buildTemplateSchema,
  // since that's the only place with access to sibling field values. Fields without
  // `rules` are completely unaffected — same schema as before.
  const deferToRules = !!(field.rules?.visibleWhen || field.rules?.requiredWhen);

  // Support new validation format: validation arrays from v1.0 templates.
  // Extract pattern from validation rules if present (old format uses single validation object).
  let patternFromNewFormat: string | undefined;
  if (Array.isArray((field as any).validation)) {
    const validationArray = (field as any).validation as any[];
    for (const rule of validationArray) {
      if (rule.regex) {
        patternFromNewFormat = rule.regex;
        break; // Use first regex rule found
      }
    }
  }

  if (field.type === "checkbox") {
    const boolSchema = z.boolean();
    const core =
      v.required && !deferToRules
        ? boolSchema.refine((val) => val === true, {
            message: v.message ?? `${field.label} must be accepted`,
          })
        : boolSchema.optional();
    return z.preprocess((val) => (val == null ? false : val), core);
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
    const core = min > 0 ? files : files.optional();
    return z.preprocess((val) => {
      if (val == null || val === "") return [];
      if (Array.isArray(val)) return val.filter((item) => item != null && item !== "");
      if (typeof val === "object") return [val];
      return [];
    }, core);
  }

  if (field.type === "multiselect") {
    let arr = z.array(z.string());
    if (v.required && !deferToRules) {
      arr = arr.min(1, { message: v.message ?? `${field.label} is required` });
    }
    return z.preprocess((val) => (val == null ? [] : val), arr);
  }

  if (field.type === "number" || field.type === "percentage") {
    // Do not use z.coerce.number() here: Number("") === 0, so an empty required
    // field (default "") would silently pass as a valid zero.
    let num = z.number({
      required_error: v.message ?? `${field.label} is required`,
      invalid_type_error: "Enter a valid number",
    });
    if (typeof v.min === "number") {
      num = num.min(v.min, { message: v.minMessage ?? `Minimum value is ${v.min}` });
    }
    if (typeof v.max === "number") {
      num = num.max(v.max, { message: v.maxMessage ?? `Maximum value is ${v.max}` });
    }
    if (typeof v.minExclusive === "number") num = num.gt(v.minExclusive);
    if (typeof v.maxExclusive === "number") num = num.lt(v.maxExclusive);
    if (v.integer) num = num.int({ message: "Must be a whole number" });
    const core = !v.required || deferToRules ? num.optional() : num;
    return z.preprocess(normalizeEmptyNumber, core);
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
    const required = !!(v.required && !deferToRules);
    const shape: z.ZodRawShape = {};
    for (const sub of getAddressSubfields({ required })) {
      shape[sub.name] = buildFieldSchema(sub);
    }
    const obj = z.object(shape);
    const core = required ? obj : obj.optional();
    return z.preprocess((val) => (val == null ? emptyAddressValue() : val), core);
  }

  const patternToUse = patternFromNewFormat || v.pattern;
  const validateUnmasked =
    Boolean(field.mask?.pattern) || isRawAlphanumericPattern(patternToUse);

  let patternRegex: RegExp | null = null;
  if (patternToUse) {
    try {
      patternRegex = new RegExp(patternToUse);
    } catch {
      patternRegex = null;
    }
  }

  let s: z.ZodString = z.string({
    required_error: v.message ?? `${field.label} is required`,
    invalid_type_error: v.message ?? `${field.label} is required`,
  });

  if (v.required && !deferToRules) {
    s = s.min(1, { message: `${field.label} is required` });
  }

  // Display values include mask literals (1234-5678-9012). Apply min/maxLength
  // on the Zod string only when we are NOT going to count unmasked content.
  if (!validateUnmasked) {
    if (v.minLength) {
      s = s.min(v.minLength, { message: `Minimum ${v.minLength} characters` });
    }
    if (v.maxLength) {
      s = s.max(v.maxLength, { message: `Maximum ${v.maxLength} characters` });
    }
  }

  if (v.email || field.type === "email") {
    s = s.email({ message: "Enter a valid email address" });
  }

  // Custom pattern (e.g. 10-digit Indian mobile) replaces the generic tel regex.
  if ((v.phone || field.type === "tel") && !patternToUse) {
    s = s.regex(/^[+]?[\d\s\-().]{7,15}$/, { message: "Enter a valid phone number" });
  }

  let result: z.ZodTypeAny = s;

  // When a pattern is present it already encodes length (e.g. 11-char IFSC).
  // Skip extra min/maxLength refines so the same ui.errors.pattern message
  // is not shown twice.
  if (validateUnmasked && !patternToUse) {
    if (v.minLength) {
      result = result.refine(
        (val) => !val || contentForValidation(val, true).length >= v.minLength!,
        { message: `Minimum ${v.minLength} characters` }
      );
    }
    if (v.maxLength) {
      result = result.refine(
        (val) => !val || contentForValidation(val, true).length <= v.maxLength!,
        { message: `Maximum ${v.maxLength} characters` }
      );
    }
  }

  if (patternToUse) {
    if (!patternRegex) {
      result = result.refine(() => false, {
        message: v.message ?? "Invalid format",
      });
    } else {
      result = result.refine(
        (val) =>
          !val ||
          patternRegex.test(contentForValidation(val, validateUnmasked)),
        { message: v.message ?? "Invalid format" }
      );
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
    const core =
      v.required && !deferToRules ? jsonSchema : jsonSchema.optional().or(z.literal(""));
    return z.preprocess(normalizeEmptyString, core);
  }

  const core = !v.required || deferToRules ? result.optional().or(z.literal("")) : result;
  return z.preprocess(normalizeEmptyString, core);
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
          if (!isFieldVisible(field, scope, templateData)) continue;
          if (!isFieldRequired(field, scope, templateData)) continue;

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
  const merged: Record<string, unknown> = { ...base };
  for (const [key, savedValue] of Object.entries(saved)) {
    if (savedValue === null || savedValue === undefined) continue;
    const defaultValue = base[key];
    if (isPlainObject(defaultValue) && isPlainObject(savedValue)) {
      merged[key] = mergePlainObjects(defaultValue, savedValue);
    } else {
      merged[key] = savedValue;
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
    } else if (value != null) {
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
