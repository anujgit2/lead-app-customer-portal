import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { FormField, FormTemplate } from "@/types";
import { isFieldRequired, isFieldVisible, ruleMatches } from "./rule-engine";
import { buildTemplateSchema, buildWizardSchema, mergeTemplateDefaults } from "./schema-builder";

const employer: FormField = {
  name: "employerName",
  label: "Employer",
  type: "text",
  rules: {
    visibleWhen: { field: "employmentType", operator: "equals", value: "SALARIED" },
    requiredWhen: { field: "employmentType", operator: "equals", value: "SALARIED" },
  },
};

const incomeTemplate: FormTemplate = {
  code: "income",
  title: "Income",
  sections: [
    {
      code: "employment",
      title: "Employment",
      fields: [
        {
          name: "employmentType",
          label: "Employment type",
          type: "select",
          validation: { required: true },
          options: [
            { label: "Salaried", value: "SALARIED" },
            { label: "Self employed", value: "SELF_EMPLOYED" },
          ],
        },
        employer,
      ],
    },
  ],
};

describe("rule matching", () => {
  it("compares values loosely across strings and numbers", () => {
    assert.equal(ruleMatches({ field: "age", operator: "equals", value: "30" }, { age: 30 }), true);
    assert.equal(ruleMatches({ field: "age", operator: "gte", value: 18 }, { age: "17" }), false);
    assert.equal(ruleMatches({ field: "tags", operator: "contains", value: "a" }, { tags: ["a", "b"] }), true);
    assert.equal(ruleMatches({ field: "kind", operator: "in", value: ["X", "Y"] }, { kind: "Y" }), true);
  });

  it("treats the strings false and 0 as falsy", () => {
    assert.equal(ruleMatches({ field: "flag", operator: "truthy" }, { flag: "false" }), false);
    assert.equal(ruleMatches({ field: "flag", operator: "falsy" }, { flag: "0" }), true);
  });

  it("returns false for an unknown operator", () => {
    assert.equal(
      ruleMatches({ field: "x", operator: "nope" as never, value: 1 }, { x: 1 }),
      false
    );
  });
});

describe("field visibility and required rules", () => {
  it("shows a field only while its rule matches", () => {
    assert.equal(isFieldVisible(employer, { employmentType: "SALARIED" }), true);
    assert.equal(isFieldVisible(employer, { employmentType: "SELF_EMPLOYED" }), false);
  });

  it("falls back to outer scopes such as the whole form", () => {
    assert.equal(isFieldVisible(employer, {}, { income: { employment: { employmentType: "SALARIED" } } }), true);
  });

  it("is required when the rule matches even without static validation", () => {
    assert.equal(isFieldRequired(employer, { employmentType: "SALARIED" }), true);
    assert.equal(isFieldRequired(employer, { employmentType: "SELF_EMPLOYED" }), false);
  });
});

describe("conditional schema validation", () => {
  const schema = buildTemplateSchema(incomeTemplate);

  it("requires the employer for salaried applicants", () => {
    const result = schema.safeParse({ employment: { employmentType: "SALARIED", employerName: "" } });
    assert.equal(result.success, false);
    const paths = result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
    assert.deepEqual(paths, ["employment.employerName"]);
  });

  it("skips the hidden employer field for self-employed applicants", () => {
    const result = schema.safeParse({ employment: { employmentType: "SELF_EMPLOYED", employerName: "" } });
    assert.equal(result.success, true);
  });

  it("enforces the minimum number of repeatable instances", () => {
    const wizard = buildWizardSchema({ ...incomeTemplate, minInstances: 1 }, true);
    assert.equal(wizard.safeParse([]).success, false);
    assert.equal(
      wizard.safeParse([{ employment: { employmentType: "SELF_EMPLOYED", employerName: "" } }]).success,
      true
    );
  });
});

describe("template defaults", () => {
  it("keeps saved values and fills in missing fields", () => {
    const merged = mergeTemplateDefaults(incomeTemplate, { employment: { employmentType: "SALARIED" } });
    assert.deepEqual(merged, { employment: { employmentType: "SALARIED", employerName: "" } });
  });

  it("returns plain defaults for unusable saved data", () => {
    assert.deepEqual(mergeTemplateDefaults(incomeTemplate, null), {
      employment: { employmentType: "", employerName: "" },
    });
  });
});
