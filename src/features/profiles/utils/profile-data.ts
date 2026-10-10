import type { FormField, FormSection, FormTemplate } from "@/types";
import { normalizeAddressValue } from "@/utils/address-field";
import {
  assignDeep,
  fieldPayloadSegments,
  getByPath,
  setByPath,
} from "@/utils/field-path";
import {
  applyWireTransformInbound,
  applyWireTransformOutbound,
} from "@/utils/field-transform";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toCamelCase(value: string): string {
  return value.toLowerCase().replace(/[_-]+([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

function sectionPayloadKey(section: FormSection): string {
  return section.payloadKey ?? toCamelCase(section.code);
}

function sectionPathContext(template: FormTemplate, section: FormSection) {
  return {
    propertyName: template.propertyName,
    payloadKey: sectionPayloadKey(section),
    insideRepeatableSection: !!section.repeatable,
  };
}

function normalizeFieldValue(field: FormField, value: unknown): unknown {
  if (value === undefined || value === null || value === "") return undefined;

  switch (field.type) {
    case "number":
    case "currency":
    case "percentage": {
      const num = typeof value === "number" ? value : Number(value);
      return Number.isFinite(num) ? num : undefined;
    }
    case "checkbox":
      return Boolean(value);
    case "json":
      if (typeof value !== "string") return value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    case "file":
    case "document":
    case "multiselect":
      return Array.isArray(value) && value.length > 0 ? value : undefined;
    case "address":
      return normalizeAddressValue(value);
    default: {
      if (typeof value === "string") {
        const trimmed = field.inputFormat?.trim ? value.trim() : value;
        return trimmed === "" ? undefined : trimmed;
      }
      return value;
    }
  }
}

function buildSectionValue(
  template: FormTemplate,
  section: FormSection,
  data: unknown
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!isPlainObject(data)) return result;
  const context = sectionPathContext(template, section);
  for (const field of section.fields) {
    const value = applyWireTransformOutbound(field, normalizeFieldValue(field, data[field.name]));
    if (value === undefined) continue;
    setByPath(result, fieldPayloadSegments(field, context), value);
  }
  return result;
}

function parseSectionValue(
  template: FormTemplate,
  section: FormSection,
  data: unknown
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!isPlainObject(data)) return result;
  const context = sectionPathContext(template, section);
  for (const field of section.fields) {
    const fromPath = getByPath(data, fieldPayloadSegments(field, context));
    const raw = fromPath !== undefined ? fromPath : data[field.name];
    const value = normalizeFieldValue(field, applyWireTransformInbound(field, raw));
    if (value !== undefined) result[field.name] = value;
  }
  return result;
}

/** Form-engine values (keyed by section code) → the profile `data` object. */
export function formValuesToProfileData(
  template: FormTemplate,
  values: unknown
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!isPlainObject(values)) return result;

  for (const section of template.sections) {
    const sectionData = values[section.code];
    if (section.repeatable) {
      const items = (Array.isArray(sectionData) ? sectionData : [])
        .map((item) => buildSectionValue(template, section, item))
        .filter((item) => Object.keys(item).length > 0);
      if (items.length === 0) continue;
      const key = sectionPayloadKey(section);
      result[key] = section.maxInstances === 1 ? items[0] : items;
    } else {
      assignDeep(result, buildSectionValue(template, section, sectionData));
    }
  }

  return result;
}

/** Profile `data` → form-engine values the JSON form can render. */
export function profileDataToFormValues(
  template: FormTemplate,
  data: unknown
): Record<string, unknown> {
  if (!isPlainObject(data)) return {};
  const result: Record<string, unknown> = {};

  for (const section of template.sections) {
    if (section.repeatable) {
      const raw = data[sectionPayloadKey(section)];
      const items = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
      const mapped = items
        .map((item) => parseSectionValue(template, section, item))
        .filter((item) => Object.keys(item).length > 0);
      if (mapped.length > 0) result[section.code] = mapped;
    } else {
      const fields = parseSectionValue(template, section, data);
      if (Object.keys(fields).length > 0) result[section.code] = fields;
    }
  }

  return result;
}
