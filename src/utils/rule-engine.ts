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
function convertNewRuleToOld(rule: Record<string, unknown>): ConditionRule | null {
  const op = rule.op as string | undefined;
  const field = rule.field as string | undefined;
  
  if (!op || !field) return null;

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

  const operator = (operatorMap[op] || op) as ConditionOperator;

  // Extract value from right side if using new format operators
  let value: unknown = rule.value;
  if (rule.right !== undefined) {
    value = rule.right;
  }

  return {
    field: siblingFieldName(field),
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

/** Last segment of a rule path (`company.gstRegistered` → `gstRegistered`). */
export function siblingFieldName(field: string): string {
  const index = field.lastIndexOf(".");
  return index === -1 ? field : field.slice(index + 1);
}

/**
 * RHF path for a rule's sibling field, including the current section prefix.
 * `company.gstRegistered` + `business_details` → `business_details.gstRegistered`.
 */
export function resolveRuleWatchPath(field: string, namePrefix?: string): string {
  const name = siblingFieldName(field);
  return namePrefix ? `${namePrefix}.${name}` : name;
}

function getByPath(source: unknown, path: string): unknown {
  if (!source || typeof source !== "object") return undefined;
  if (!path.includes(".")) {
    return (source as Record<string, unknown>)[path];
  }
  let cursor: unknown = source;
  for (const part of path.split(".")) {
    if (!cursor || typeof cursor !== "object" || Array.isArray(cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

function findKeyDeep(source: unknown, key: string, depth = 0): unknown {
  if (!source || typeof source !== "object" || Array.isArray(source) || depth > 6) {
    return undefined;
  }
  const obj = source as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
  for (const value of Object.values(obj)) {
    const found = findKeyDeep(value, key, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

/**
 * Resolves a rule field from one or more scopes: exact path, last segment,
 * then a nested search (section → field, or another wizard step).
 */
export function getDependencyValue(field: string, sources: Array<unknown>): unknown {
  const sibling = siblingFieldName(field);
  const keys = field === sibling ? [field] : [field, sibling];
  for (const source of sources) {
    if (source == null || typeof source !== "object") continue;
    for (const key of keys) {
      const viaPath = getByPath(source, key);
      if (viaPath !== undefined) return viaPath;
    }
    const nested = findKeyDeep(source, sibling);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

function toComparable(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

/** Evaluates a single condition rule against a scope object. No rule = always non-matching by default of caller. */
export function ruleMatches(rule: ConditionRule | Record<string, unknown>, scope: Scope): boolean {
  // Support both old format (operator, field, value) and new format (op, when, left, right)
  let normalizedRule: ConditionRule;
  
  // If this looks like the new format, convert it first
  const ruleRecord = rule as Record<string, unknown>;
  if (ruleRecord.op && !ruleRecord.operator) {
    const converted = convertNewRuleToOld(ruleRecord);
    if (!converted) return false;
    normalizedRule = converted;
  } else {
    normalizedRule = rule as ConditionRule;
  }
  
  const actual = getDependencyValue(normalizedRule.field, [scope]);

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
export function isFieldVisible(field: FormField, scope: Scope, ...extraScopes: Scope[]): boolean {
  const rule = field.rules?.visibleWhen;
  if (!rule) return true;
  const value = getDependencyValue(rule.field, [scope, ...extraScopes]);
  return ruleMatches(rule, { [rule.field]: value });
}

/** True when the field is statically required, or its `requiredWhen` rule currently matches. */
export function isFieldRequired(field: FormField, scope: Scope, ...extraScopes: Scope[]): boolean {
  const staticRequired = !!field.validation?.required;
  const rule = field.rules?.requiredWhen;
  if (!rule) return staticRequired;
  const value = getDependencyValue(rule.field, [scope, ...extraScopes]);
  return staticRequired || ruleMatches(rule, { [rule.field]: value });
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
const OP_TO_OPERATOR: Record<string, ConditionOperator> = {
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

export function normalizeConditionRule(raw: unknown): ConditionRule | undefined {
  if (!isPlainObject(raw)) return undefined;
  if (typeof raw.field !== "string" || raw.field.length === 0) return undefined;

  const field = siblingFieldName(raw.field);
  const operatorRaw =
    (typeof raw.operator === "string" && raw.operator) ||
    (typeof raw.op === "string" && raw.op) ||
    undefined;
  const mappedOperator = operatorRaw
    ? CONDITION_OPERATORS.has(operatorRaw)
      ? (operatorRaw as ConditionOperator)
      : OP_TO_OPERATOR[operatorRaw]
    : undefined;

  if (mappedOperator) {
    return {
      field,
      operator: mappedOperator,
      value: raw.value !== undefined ? raw.value : raw.right,
    };
  }

  for (const operator of CONDITION_OPERATORS) {
    if (raw[operator] !== undefined) {
      return {
        field,
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
