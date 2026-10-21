import type { FieldOption, FormData, FormField, FormTemplate, StoredFileReference } from "@/types";
import { getAddressSubfields, isPlainObject } from "@/utils/address-field";
import { isFieldVisible } from "@/utils/rule-engine";
import { isConsentAccepted } from "@/utils/consent";
import { isStoredFileReference } from "@/services/file-storage.service";
import { isDocumentFieldType, isDocumentTemplate } from "@/utils/document-template";

export { isDocumentTemplate };

type Scope = Record<string, unknown>;

export interface ReviewItem {
  key: string;
  label: string;
  value: unknown;
  type?: string;
  options?: FieldOption[];
}

export interface ProvidedDoc {
  key: string;
  label: string;
  file: StoredFileReference;
}

export interface MissingDoc {
  key: string;
  label: string;
}

export interface DocGroup {
  id: string;
  title: string;
  provided: ProvidedDoc[];
  missing: MissingDoc[];
  slotCount: number;
  filledSlots: number;
}

export const isDocumentReviewField = isDocumentFieldType;

export function isEmptyReviewValue(value: unknown): boolean {
  if (value == null || value === "") return true;
  if (typeof value === "boolean") return false;
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.values(value).every(isEmptyReviewValue);
  return false;
}

export function humanizeValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Template data as a list of instances: repeatable templates store an array, others one object. */
export function templateInstances(template: FormTemplate, templateData: unknown): Scope[] {
  if (template.repeatable) {
    return Array.isArray(templateData) ? templateData.filter(isPlainObject) : [];
  }
  return [isPlainObject(templateData) ? templateData : {}];
}

/** Section data as a list of rows: repeatable sections store an array, others one object. */
export function sectionRows(sectionData: unknown): Scope[] {
  if (Array.isArray(sectionData)) return sectionData.filter(isPlainObject);
  return [isPlainObject(sectionData) ? sectionData : {}];
}

/** Fields hidden by `visibleWhen` are left out, matching what the wizard showed. */
export function collectReviewItems(fields: FormField[], data: Scope, ...scopes: Scope[]) {
  const items: ReviewItem[] = [];
  const documents: ReviewItem[] = [];

  for (const field of fields) {
    if (field.type === "hidden") continue;
    if (!isFieldVisible(field, data, ...scopes)) continue;
    const value = data[field.name];

    if (isDocumentReviewField(field.type)) {
      if (value === undefined) continue;
      documents.push({
        key: field.name,
        label: field.label,
        value,
        type: field.type,
        options: field.options,
      });
      continue;
    }

    if (field.type === "address") {
      const addr = isPlainObject(value) ? value : {};
      for (const sub of getAddressSubfields()) {
        items.push({
          key: `${field.name}.${sub.name}`,
          label: sub.label,
          value: addr[sub.name],
          type: sub.type,
          options: sub.options,
        });
      }
      continue;
    }

    items.push({
      key: field.name,
      label: field.label,
      value:
        field.type === "consent" && !isConsentAccepted(value, field.consent?.version) ? undefined : value,
      type: field.type,
      options: field.options,
    });
  }

  return { items, documents };
}

export function countTemplateFields(
  template: FormTemplate,
  templateData: unknown,
  formData: FormData
): { filled: number; total: number } {
  let filled = 0;
  let total = 0;

  const tally = (fields: FormField[], row: Scope, instance: Scope) => {
    const { items } = collectReviewItems(fields, row, instance, formData);
    total += items.length;
    filled += items.filter((item) => !isEmptyReviewValue(item.value)).length;
  };

  const instances = templateInstances(template, templateData);
  if (instances.length === 0) {
    for (const section of template.sections) tally(section.fields, {}, {});
    return { filled, total };
  }

  for (const instance of instances) {
    for (const section of template.sections) {
      for (const row of sectionRows(instance[section.code])) tally(section.fields, row, instance);
    }
  }

  return { filled, total };
}

export function instanceProfile(template: FormTemplate, instance: Scope) {
  const merged: Scope = {};
  for (const section of template.sections) {
    const data = instance[section.code];
    if (isPlainObject(data)) Object.assign(merged, data);
  }
  const firstName = typeof merged.firstName === "string" ? merged.firstName.trim() : "";
  const lastName = typeof merged.lastName === "string" ? merged.lastName.trim() : "";
  const designation = typeof merged.designation === "string" ? merged.designation : "";
  const name = [firstName, lastName].filter(Boolean).join(" ");
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  return {
    name: name || template.title,
    initials: initials || template.title.charAt(0).toUpperCase(),
    designation: designation ? humanizeValue(designation) : "",
  };
}

function filesForField(value: unknown): StoredFileReference[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isStoredFileReference);
}

export function documentGroupsForTemplate(
  template: FormTemplate,
  templateData: unknown,
  formData: FormData
): DocGroup[] {
  const instances = templateInstances(template, templateData);
  const groups: DocGroup[] = [];

  instances.forEach((instance, instanceIndex) => {
    const instancePrefix = instances.length > 1 ? `${template.title} #${instanceIndex + 1} · ` : "";
    const idPrefix = template.repeatable ? `${instanceIndex}-` : "";

    for (const section of template.sections) {
      const rows = sectionRows(instance[section.code]);

      rows.forEach((row, rowIndex) => {
        const provided: ProvidedDoc[] = [];
        const missing: MissingDoc[] = [];
        let slotCount = 0;
        let filledSlots = 0;
        const keyBase = `${idPrefix}${section.code}-${rowIndex}`;

        for (const field of section.fields) {
          if (!isDocumentReviewField(field.type)) continue;
          if (!isFieldVisible(field, row, instance, formData)) continue;
          slotCount += 1;
          const files = filesForField(row[field.name]);
          if (files.length === 0) {
            missing.push({ key: `${keyBase}-${field.name}-missing`, label: field.label });
            continue;
          }
          filledSlots += 1;
          files.forEach((file, fileIndex) => {
            provided.push({
              key: `${keyBase}-${field.name}-${file.id}-${fileIndex}`,
              label: field.label,
              file,
            });
          });
        }

        if (slotCount === 0) return;
        const rowSuffix = rows.length > 1 ? ` #${rowIndex + 1}` : "";
        groups.push({
          id: rows.length > 1 ? keyBase : `${idPrefix}${section.code}`,
          title: `${instancePrefix}${section.title}${rowSuffix}`,
          provided,
          missing,
          slotCount,
          filledSlots,
        });
      });
    }
  });

  return groups;
}

export function countUploadedFiles(templates: FormTemplate[], formData: FormData): number {
  return templates
    .filter(isDocumentTemplate)
    .reduce((total, template) => {
      const groups = documentGroupsForTemplate(template, formData[template.code], formData);
      return total + groups.reduce((count, group) => count + group.provided.length, 0);
    }, 0);
}
