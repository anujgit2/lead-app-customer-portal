"use client";

import { useFormContext } from "react-hook-form";
import type { FormField } from "@/types";
import { useWizardStore } from "@/store/wizard.store";
import {
  getDependencyValue,
  resolveRuleWatchPath,
  ruleMatches,
  siblingFieldName,
} from "@/utils/rule-engine";

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

  const visibleSiblingPath = visibleRule
    ? resolveRuleWatchPath(visibleRule.field, namePrefix)
    : undefined;
  const requiredSiblingPath = requiredRule
    ? resolveRuleWatchPath(requiredRule.field, namePrefix)
    : undefined;

  const visibleSiblingValue = visibleSiblingPath ? watch(visibleSiblingPath) : undefined;
  const requiredSiblingValue = requiredSiblingPath ? watch(requiredSiblingPath) : undefined;
  const formValues = hasRules ? watch() : undefined;
  const wizardFormData = useWizardStore((state) => {
    if (!hasRules) return undefined;
    const id = state.currentDraftId;
    return id ? state.drafts[id]?.formData : undefined;
  });

  const resolveValue = (ruleField: string, siblingValue: unknown) =>
    siblingValue !== undefined
      ? siblingValue
      : getDependencyValue(ruleField, [formValues, wizardFormData]);

  const visibleValue = visibleRule
    ? resolveValue(visibleRule.field, visibleSiblingValue)
    : undefined;
  const requiredValue = requiredRule
    ? resolveValue(requiredRule.field, requiredSiblingValue)
    : undefined;

  const visible = visibleRule
    ? ruleMatches(visibleRule, {
        [visibleRule.field]: visibleValue,
        [siblingFieldName(visibleRule.field)]: visibleValue,
      })
    : true;

  const conditionallyRequired = requiredRule
    ? ruleMatches(requiredRule, {
        [requiredRule.field]: requiredValue,
        [siblingFieldName(requiredRule.field)]: requiredValue,
      })
    : false;

  return { visible, conditionallyRequired };
}
