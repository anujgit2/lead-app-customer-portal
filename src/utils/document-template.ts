import type { FormTemplate } from "@/types";

export function isDocumentFieldType(type?: string): boolean {
  return type === "file" || type === "document";
}

/** A template whose every field is an upload slot renders as a Documents step. */
export function isDocumentTemplate(template: FormTemplate): boolean {
  if (template.propertyType === "DocumentProperty") return true;
  return template.sections.every((section) =>
    section.fields.every((field) => isDocumentFieldType(field.type))
  );
}
