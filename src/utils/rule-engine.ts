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
 *
 * Supports both old format (operator, field, value) and new format (op, when, left, right).
 * New format is automatically converted to old format for compatibility.
 */
import type { ConditionOperator, ConditionRule, FieldRules, FormField } from "@/types";

type Scope = Record<string, unknown> | null | undefined;

/**
 * Convert new format rule (op, when, left, right) to old format (operator, field, value).
 * This enables the new v1.0 template format to work with existing rule evaluation logic.
 */
function convertNewRuleToOld(rule: any): ConditionRule | null {
  if (!rule.op || !rule.field) return null;

  // Map new operators to old operators
  const operatorMap: Record<string, ConditionOperator> = {
    eq: "equals",
    notEq: "notEquals",
    in: "in",
    notIn: "notIn",
    contains: "contains",
    gt: "gt",
    gte: "gte",
    lt: "lt",
    lte: "lte",
    notEmpty: "exists",
    empty: "notExists",
  };

  const operator = (operatorMap[rule.op] || rule.op) as ConditionOperator;

  // Extract value from right side if using new format operators
  let value: unknown = rule.value;
  if (rule.right !== undefined) {
    value = rule.right;
  }

  return {
    field: rule.field,
    operator,
    value,
  };
}

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
export function ruleMatches(rule: ConditionRule | any, scope: Scope): boolean {
  // Support both old format (operator, field, value) and new format (op, when, left, right)
  let normalizedRule = rule;
  
  // If this looks like the new format, convert it first
  if (rule.op && !rule.operator) {
    const converted = convertNewRuleToOld(rule);
    if (!converted) return false;
    normalizedRule = converted;
  }
  
  const actual = scope ? scope[normalizedRule.field] : undefined;

  switch (normalizedRule.operator) {
    case "equals":
      if (Array.isArray(actual)) {
        return actual.some((item) => item === normalizedRule.value || toComparable(item) === toComparable(normalizedRule.value));
      }
      return actual === normalizedRule.value || toComparable(actual) === toComparable(normalizedRule.value);
    case "notEquals":
      if (Array.isArray(actual)) {
        return !actual.some((item) => item === normalizedRule.value || toComparable(item) === toComparable(normalizedRule.value));
      }
      return !(actual === normalizedRule.value) && toComparable(actual) !== toComparable(normalizedRule.value);
    case "in":
      return Array.isArray(normalizedRule.value) && normalizedRule.value.some((v) => toComparable(v) === toComparable(actual));
    case "notIn":
      return !(Array.isArray(normalizedRule.value) && normalizedRule.value.some((v) => toComparable(v) === toComparable(actual)));
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
        ? actual.some((v) => toComparable(v) === toComparable(normalizedRule.value))
        : toComparable(actual).includes(toComparable(normalizedRule.value));
    case "gt":
      return Number(actual) > Number(normalizedRule.value);
    case "gte":
      return Number(actual) >= Number(normalizedRule.value);
    case "lt":
      return Number(actual) < Number(normalizedRule.value);
    case "lte":
      return Number(actual) <= Number(normalizedRule.value);
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

const CONDITION_OPERATORS: ReadonlySet<string> = new Set<ConditionOperator>([
  "equals",
  "notEquals",
  "in",
  "notIn",
  "exists",
  "notExists",
  "truthy",
  "falsy",
  "contains",
  "gt",
  "gte",
  "lt",
  "lte",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Accepts both the canonical rule `{ field, operator, value }` and the backend
 * shorthand `{ field, equals: "OTHER" }` (operator name used as the key).
 */
export function normalizeConditionRule(raw: unknown): ConditionRule | undefined {
  if (!isPlainObject(raw)) return undefined;
  if (typeof raw.field !== "string" || raw.field.length === 0) return undefined;

  if (typeof raw.operator === "string" && CONDITION_OPERATORS.has(raw.operator)) {
    return {
      field: raw.field,
      operator: raw.operator as ConditionOperator,
      value: raw.value,
    };
  }

  for (const operator of CONDITION_OPERATORS) {
    if (raw[operator] !== undefined) {
      return {
        field: raw.field,
        operator: operator as ConditionOperator,
        value: raw[operator],
      };
    }
  }

  return undefined;
}

/** Reads `rules.visibleWhen` / top-level `visibleWhen` (and the requiredWhen equivalents). */
export function normalizeFieldRules(raw: Record<string, unknown>): FieldRules | undefined {
  const nested = isPlainObject(raw.rules) ? raw.rules : {};
  const visibleWhen =
    normalizeConditionRule(nested.visibleWhen) ?? normalizeConditionRule(raw.visibleWhen);
  const requiredWhen =
    normalizeConditionRule(nested.requiredWhen) ?? normalizeConditionRule(raw.requiredWhen);
  if (!visibleWhen && !requiredWhen) return undefined;
  return { visibleWhen, requiredWhen };
}
