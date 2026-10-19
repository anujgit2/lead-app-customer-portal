"use client";

import { useFormContext } from "react-hook-form";
import type { ConditionRule, FormField } from "@/types";
import { useWizardStore } from "@/store/wizard.store";
import { useWizardAnswers } from "@/components/forms/application-context";
import {
  resolveRuleWatchPath,
  ruleMatches,
  siblingFieldName,
} from "@/utils/rule-engine";

function isGroupRule(rule: ConditionRule): boolean {
  return rule.operator === "and" || rule.operator === "or";
}

function siblingWatchPath(rule: ConditionRule | undefined, namePrefix?: string): string | undefined {
  if (!rule || isGroupRule(rule) || !rule.field) return undefined;
  return resolveRuleWatchPath(rule.field, namePrefix);
}

function matchesRule(
  rule: ConditionRule,
  siblingValue: unknown,
  ...scopes: Array<Record<string, unknown> | undefined>
): boolean {
  if (isGroupRule(rule) || siblingValue === undefined) {
    return ruleMatches(rule, undefined, ...scopes);
  }
  return ruleMatches(
    rule,
    {
      [rule.field]: siblingValue,
      [siblingFieldName(rule.field)]: siblingValue,
    },
    ...scopes
  );
}

/**
 * Evaluates `visibleWhen` / `requiredWhen` against the current section first,
 * then the rest of this form, then other wizard steps (documents depend on
 * earlier answers like `company.gstRegistered`).
 */
export function useFieldRules(field: FormField, namePrefix?: string) {
  const { watch } = useFormContext();
  const visibleRule = field.rules?.visibleWhen;
  const requiredRule = field.rules?.requiredWhen;
  const hasRules = !!(visibleRule || requiredRule);
  const wizardAnswers = useWizardAnswers();

  const visibleSiblingPath = siblingWatchPath(visibleRule, namePrefix);
  const requiredSiblingPath = siblingWatchPath(requiredRule, namePrefix);

  const visibleSiblingValue = visibleSiblingPath ? watch(visibleSiblingPath) : undefined;
  const requiredSiblingValue = requiredSiblingPath ? watch(requiredSiblingPath) : undefined;
  const formValues = hasRules ? watch() : undefined;
  const wizardFormData = useWizardStore((state) => {
    if (!hasRules) return undefined;
    const id = state.currentDraftId;
    return id ? state.drafts[id]?.formData : undefined;
  });

  const visible = visibleRule
    ? matchesRule(visibleRule, visibleSiblingValue, formValues, wizardAnswers, wizardFormData)
    : true;

  const conditionallyRequired = requiredRule
    ? matchesRule(requiredRule, requiredSiblingValue, formValues, wizardAnswers, wizardFormData)
    : false;

  return { visible, conditionallyRequired };
}
