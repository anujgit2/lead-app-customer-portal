/**
 * Generates plausible test data for a template based on field types and
 * validation rules — used by the Test Data panel's "Generate Sample Data"
 * button. Purely a data-authoring convenience; never touches the real
 * rule-engine or renderer (though it does read `isFieldVisible`/`isFieldRequired`
 * from the shared rule-engine so generated data respects conditional fields).
 */
import type { FormField, FormSection, FormTemplate } from "@/types";
import { isFieldVisible } from "@/utils/rule-engine";
import { fillMaskPattern, unmask } from "@/utils/mask";
import { PATTERN_EXAMPLES } from "@/components/forms/DynamicField";

function sampleForPattern(pattern: string | undefined): string | undefined {
  if (!pattern) return undefined;
  return PATTERN_EXAMPLES[pattern];
}

function sampleValueForField(field: FormField): unknown {
  if (field.defaultValue !== undefined) return field.defaultValue;

  const v = field.validation ?? {};

  switch (field.type) {
    case "checkbox":
      return true;
    case "select":
    case "radio":
      return field.options?.[0]?.value ?? "";
    case "multiselect":
      return field.options?.slice(0, 2).map((opt) => opt.value) ?? [];
    case "number":
    case "currency":
    case "percentage": {
      const min = v.min ?? 1;
      const max = v.max ?? min + 100;
      const mid = Math.round((min + max) / 2);
      return v.integer ? Math.round(mid) : mid;
    }
    case "email":
      return "sample.user@example.com";
    case "date":
    case "datetime":
      return new Date().toISOString().slice(0, 10);
    case "file":
    case "document":
      return [];
    case "hidden":
      return "";
    case "address":
      return {
        addressLine1: "42 MG Road",
        addressLine2: "Near City Center",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        country: "India",
      };
    case "tel": {
      if (field.mask) return fillMaskPattern(field.mask.pattern);
      return sampleForPattern(v.pattern) ?? "9876543210";
    }
    default: {
      if (field.mask) {
        for (let attempt = 0; attempt < 20; attempt++) {
          const candidate = fillMaskPattern(field.mask.pattern);
          const transformed =
            field.mask.transform === "uppercase"
              ? candidate.toUpperCase()
              : field.mask.transform === "lowercase"
                ? candidate.toLowerCase()
                : candidate;
          // `pattern` validates the raw unmasked characters (see schema-builder), not the
          // separator-formatted display string — test against the unmasked form here too.
          if (!v.pattern || new RegExp(v.pattern).test(unmask(transformed))) return transformed;
        }
        return fillMaskPattern(field.mask.pattern);
      }
      const patternExample = sampleForPattern(v.pattern);
      if (patternExample) return patternExample;
      const base = `Sample ${field.label}`;
      return v.maxLength ? base.slice(0, v.maxLength) : base;
    }
  }
}

/** Generates one section instance, biasing "driver" fields (referenced by sibling rules)
 *  toward a value that satisfies an `equals` condition so dependents show up as visible/required. */
export function generateSectionSample(section: FormSection): Record<string, unknown> {
  const scope: Record<string, unknown> = {};

  const driverBias = new Map<string, unknown>();
  for (const field of section.fields) {
    for (const rule of [field.rules?.visibleWhen, field.rules?.requiredWhen]) {
      if (rule?.operator === "equals" && !driverBias.has(rule.field)) {
        driverBias.set(rule.field, rule.value);
      }
    }
  }

  for (const field of section.fields) {
    if (driverBias.has(field.name)) {
      scope[field.name] = driverBias.get(field.name);
    }
  }

  for (const field of section.fields) {
    if (field.name in scope) continue;
    if (field.rules?.visibleWhen && !isFieldVisible(field, scope)) continue;
    scope[field.name] = sampleValueForField(field);
  }

  return scope;
}

export function generateTemplateSample(template: FormTemplate): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const section of template.sections) {
    if (section.repeatable) {
      const count = Math.max(section.minInstances ?? 1, 1);
      result[section.code] = Array.from({ length: count }, () => generateSectionSample(section));
    } else {
      result[section.code] = generateSectionSample(section);
    }
  }
  return result;
}

export function generateTemplatesSample(templates: FormTemplate[]): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const template of templates) {
    out[template.code] = generateTemplateSample(template);
  }
  return out;
}
