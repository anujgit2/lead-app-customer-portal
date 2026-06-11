import { z } from "zod";
import type { FormField, FormSection, FormTemplate, FieldValidation } from "@/types";

function buildFieldSchema(field: FormField): z.ZodTypeAny {
  const v: FieldValidation = field.validation ?? {};

  if (field.type === "checkbox") {
    const boolSchema = z.boolean();
    if (v.required) {
      return boolSchema.refine((val) => val === true, {
        message: v.message ?? `${field.label} must be accepted`,
      });
    }
    return boolSchema.optional();
  }

  if (field.type === "file") {
    const fileSchema = z.any();
    if (v.required) {
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
    if (!v.required) return num.optional();
    return num;
  }

  let s: z.ZodString = z.string({ required_error: v.message ?? `${field.label} is required` });

  if (v.required) s = s.min(1, { message: v.message ?? `${field.label} is required` });

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

  if (!v.required) {
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

export function buildTemplateSchema(template: FormTemplate): z.ZodObject<z.ZodRawShape> {
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
  return z.object(shape);
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
