import type { FormTemplate } from "@/types";
import { isFieldRequired, isFieldVisible } from "@/utils/rule-engine";

export interface FieldStateRow {
  templateCode: string;
  sectionCode: string;
  fieldName: string;
  path: string;
  visible: boolean;
  required: boolean;
}

/**
 * Walks every field across the given templates against the live form data
 * (as reported by `WizardStep.onDataChange`) and computes visibility/required
 * state via the shared rule-engine — used by the playground's State Inspector.
 * Not a second rule engine: same `isFieldVisible`/`isFieldRequired` the
 * renderer itself uses.
 */
export function computeFieldStates(
  templates: FormTemplate[],
  liveData: Record<string, unknown>
): FieldStateRow[] {
  const rows: FieldStateRow[] = [];

  for (const template of templates) {
    const templateData = (liveData[template.code] as Record<string, unknown> | undefined) ?? {};

    for (const section of template.sections) {
      const sectionValue = templateData[section.code];
      const instances: Record<string, unknown>[] = section.repeatable
        ? (Array.isArray(sectionValue) ? sectionValue : []).map((v) =>
            v && typeof v === "object" ? (v as Record<string, unknown>) : {}
          )
        : [sectionValue && typeof sectionValue === "object" ? (sectionValue as Record<string, unknown>) : {}];

      instances.forEach((scope, index) => {
        for (const field of section.fields) {
          const suffix = section.repeatable ? `[${index}]` : "";
          rows.push({
            templateCode: template.code,
            sectionCode: section.code,
            fieldName: field.name,
            path: `${template.code}.${section.code}${suffix}.${field.name}`,
            visible: isFieldVisible(field, scope),
            required: isFieldRequired(field, scope),
          });
        }
      });
    }
  }

  return rows;
}
