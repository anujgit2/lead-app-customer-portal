/**
 * Shared conditional-field rule engine.
 *
 * Used by `DynamicField` (visibility + conditional-required rendering),
 * `schema-builder` (conditional-required Zod validation), and the dev Form
 * Playground's field inspector. There is exactly one implementation of this
 * logic in the app — nothing here is duplicated for the playground.
 *
 * Rules are always evaluated against a "scope" object: the sibling field
 * values of the section/section-instance the field belongs to (not the
 * whole form), since `rules.*.field` refers to a sibling field name.
 */
import type { ConditionRule, FormField } from "@/types";

type Scope = Record<string, unknown> | null | undefined;

function isEmptyValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function toComparable(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

/** Evaluates a single condition rule against a scope object. No rule = always non-matching by default of caller. */
export function ruleMatches(rule: ConditionRule, scope: Scope): boolean {
  const actual = scope ? scope[rule.field] : undefined;

  switch (rule.operator) {
    case "equals":
      return actual === rule.value || toComparable(actual) === toComparable(rule.value);
    case "notEquals":
      return !(actual === rule.value) && toComparable(actual) !== toComparable(rule.value);
    case "in":
      return Array.isArray(rule.value) && rule.value.some((v) => toComparable(v) === toComparable(actual));
    case "notIn":
      return !(Array.isArray(rule.value) && rule.value.some((v) => toComparable(v) === toComparable(actual)));
    case "exists":
      return !isEmptyValue(actual);
    case "notExists":
      return isEmptyValue(actual);
    case "truthy":
      return !!actual && actual !== "false" && actual !== "0";
    case "falsy":
      return !actual || actual === "false" || actual === "0";
    case "contains":
      return Array.isArray(actual)
        ? actual.some((v) => toComparable(v) === toComparable(rule.value))
        : toComparable(actual).includes(toComparable(rule.value));
    case "gt":
      return Number(actual) > Number(rule.value);
    case "gte":
      return Number(actual) >= Number(rule.value);
    case "lt":
      return Number(actual) < Number(rule.value);
    case "lte":
      return Number(actual) <= Number(rule.value);
    default:
      return false;
  }
}

/** True when the field has no `visibleWhen` rule, or its rule currently matches. */
export function isFieldVisible(field: FormField, scope: Scope): boolean {
  const rule = field.rules?.visibleWhen;
  if (!rule) return true;
  return ruleMatches(rule, scope);
}

/** True when the field is statically required, or its `requiredWhen` rule currently matches. */
export function isFieldRequired(field: FormField, scope: Scope): boolean {
  const staticRequired = !!field.validation?.required;
  const rule = field.rules?.requiredWhen;
  if (!rule) return staticRequired;
  return staticRequired || ruleMatches(rule, scope);
}

export { isEmptyValue };
