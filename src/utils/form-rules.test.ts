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

const documentsTemplate: FormTemplate = {
  code: "DOCUMENTS",
  title: "Business documents",
  propertyType: "DocumentProperty",
  sections: [
    {
      code: "APPLICATION_DOCUMENTS",
      title: "Application documents",
      fields: [
        {
          name: "BUSINESS_PAN",
          label: "Business PAN Card",
          type: "document",
          minFiles: 1,
          validation: { required: true, message: "Business PAN Card is required" },
        },
        {
          name: "GST_CERTIFICATE",
          label: "GST Certificate",
          type: "document",
          minFiles: 1,
          validation: { required: true, message: "GST Certificate is required" },
          rules: {
            visibleWhen: { field: "gstRegistered", operator: "equals", value: "YES" },
            requiredWhen: { field: "gstRegistered", operator: "equals", value: "YES" },
          },
        },
        {
          name: "INCORPORATION_CERTIFICATE",
          label: "Certificate of Incorporation",
          type: "document",
          minFiles: 1,
          validation: { required: true, message: "Certificate of Incorporation is required" },
          rules: {
            visibleWhen: {
              field: "companyType",
              operator: "in",
              value: ["LLP", "PRIVATE_LIMITED", "PUBLIC_LIMITED"],
            },
            requiredWhen: {
              field: "companyType",
              operator: "in",
              value: ["LLP", "PRIVATE_LIMITED", "PUBLIC_LIMITED"],
            },
          },
        },
      ],
    },
  ],
};

describe("grouped document rules", () => {
  const existence: FormField = {
    name: "PROPRIETOR_BUSINESS_PROOF",
    label: "Business Existence Proof",
    type: "document",
    rules: {
      visibleWhen: {
        field: "",
        operator: "and",
        conditions: [
          { field: "companyType", operator: "equals", value: "PROPRIETORSHIP" },
          { field: "gstRegistered", operator: "equals", value: "NO" },
          { field: "udyam", operator: "notExists" },
        ],
      },
    },
  };

  it("shows the proprietorship proof only when every condition matches", () => {
    const proprietorship = {
      company: { business_details: { companyType: "PROPRIETORSHIP" }, business_registrations: { gstRegistered: "NO" } },
    };
    const privateLimited = {
      company: { business_details: { companyType: "PRIVATE_LIMITED" }, business_registrations: { gstRegistered: "NO" } },
    };
    assert.equal(isFieldVisible(existence, {}, proprietorship), true);
    assert.equal(isFieldVisible(existence, {}, privateLimited), false);
  });
});

describe("document slots follow the same rules as the page", () => {
  const earlierAnswers = {
    company: { details: { gstRegistered: "NO", companyType: "PROPRIETORSHIP" } },
  };

  it("does not require slots hidden by an earlier answer", () => {
    const schema = buildTemplateSchema(documentsTemplate, earlierAnswers);
    const result = schema.safeParse({
      APPLICATION_DOCUMENTS: {
        BUSINESS_PAN: [{ id: "pan" }],
        GST_CERTIFICATE: [],
        INCORPORATION_CERTIFICATE: [],
      },
    });
    assert.equal(result.success, true);
  });

  it("still requires a slot once that earlier answer makes it apply", () => {
    const schema = buildTemplateSchema(documentsTemplate, {
      company: { details: { gstRegistered: "YES", companyType: "PROPRIETORSHIP" } },
    });
    const result = schema.safeParse({
      APPLICATION_DOCUMENTS: {
        BUSINESS_PAN: [{ id: "pan" }],
        GST_CERTIFICATE: [],
        INCORPORATION_CERTIFICATE: [],
      },
    });
    assert.equal(result.success, false);
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message);
    assert.deepEqual(messages, ["GST Certificate is required"]);
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
