import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CustomerProfileListFilters, FormTemplate } from "@/types";
import { buildTemplateSchema } from "@/utils/schema-builder";
import {
  formTemplateQueryKey,
  profileDiffQueryKey,
  profileQueryKey,
  profileVersionQueryKey,
  profileVersionsQueryKey,
  profilesQueryKey,
} from "./query-keys";
import { formValuesToProfileData, profileDataToFormValues } from "./utils/profile-data";
import { readFormTemplate } from "./utils/read-form-template";
import { mapDiffForDisplay } from "./utils/diff-display";
import { fieldValuesFromProfile, prefillWizardFormData } from "./utils/prefill-wizard";
import { safeInternalPath, withProfileReturn } from "./utils/return-path";

const individualTemplate: FormTemplate = {
  code: "customer-individual",
  title: "Individual customer",
  sections: [
    {
      code: "identity",
      title: "Identity",
      fields: [
        {
          name: "fullName",
          label: "Full name",
          type: "text",
          path: "person.fullName",
          validation: { required: true, minLength: 2 },
        },
        {
          name: "pan",
          label: "PAN",
          type: "text",
          validation: { pattern: "^[A-Z]{5}[0-9]{4}[A-Z]$" },
        },
        {
          name: "dependents",
          label: "Dependents",
          type: "number",
          validation: { required: true, min: 0, integer: true },
        },
      ],
    },
    {
      code: "addresses",
      title: "Addresses",
      repeatable: true,
      payloadKey: "addresses",
      fields: [{ name: "city", label: "City", type: "text", path: "addresses[].city" }],
    },
  ],
};

describe("profile query keys", () => {
  const filters: CustomerProfileListFilters = {
    type: "INDIVIDUAL",
    q: "ada",
    status: "ACTIVE",
    page: 0,
    size: 10,
  };

  it("keeps the list key as profiles plus the filter object", () => {
    assert.deepEqual(profilesQueryKey(filters), ["profiles", filters]);
  });

  it("keys a profile, its versions, one version, a diff, and a form template", () => {
    assert.deepEqual(profileQueryKey("profile-1"), ["profile", "profile-1"]);
    assert.deepEqual(profileVersionsQueryKey("profile-1"), ["profile", "profile-1", "versions"]);
    assert.deepEqual(profileVersionQueryKey("profile-1", 3), ["profile", "profile-1", 3]);
    assert.deepEqual(profileDiffQueryKey("profile-1", 1, 3), ["profile", "profile-1", "diff", 1, 3]);
    assert.deepEqual(formTemplateQueryKey("customer-business"), ["form-template", "customer-business"]);
  });
});

describe("schema building from profile templates", () => {
  const schema = buildTemplateSchema(individualTemplate);

  it("accepts a complete individual section", () => {
    const parsed = schema.safeParse({
      identity: { fullName: "Ada Lovelace", pan: "ABCDE1234F", dependents: 1 },
      addresses: [{ city: "Pune" }],
    });
    assert.equal(parsed.success, true);
  });

  it("rejects a missing name and a fractional dependent count", () => {
    const missingName = schema.safeParse({
      identity: { fullName: "", pan: "", dependents: 1 },
      addresses: [],
    });
    const fraction = schema.safeParse({
      identity: { fullName: "Ada", pan: "", dependents: 1.5 },
      addresses: [],
    });
    assert.equal(missingName.success, false);
    assert.equal(fraction.success, false);
  });

  it("allows an empty optional PAN and rejects a bad one", () => {
    const empty = schema.safeParse({
      identity: { fullName: "Ada", pan: "", dependents: 0 },
      addresses: [],
    });
    const bad = schema.safeParse({
      identity: { fullName: "Ada", pan: "not-a-pan", dependents: 0 },
      addresses: [],
    });
    assert.equal(empty.success, true);
    assert.equal(bad.success, false);
  });
});

describe("profile data mapping", () => {
  it("nests field paths and reads them back into the form", () => {
    const formValues = {
      identity: { fullName: "Ada Lovelace", pan: "ABCDE1234F", dependents: 1 },
      addresses: [{ city: "Pune" }, { city: "" }],
    };
    const data = formValuesToProfileData(individualTemplate, formValues);
    assert.deepEqual(data, {
      person: { fullName: "Ada Lovelace" },
      pan: "ABCDE1234F",
      dependents: 1,
      addresses: [{ city: "Pune" }],
    });
    assert.deepEqual(profileDataToFormValues(individualTemplate, data), {
      identity: { fullName: "Ada Lovelace", pan: "ABCDE1234F", dependents: 1 },
      addresses: [{ city: "Pune" }],
    });
  });
});

describe("form template payload", () => {
  it("reads an old template object", () => {
    const template = readFormTemplate(
      {
        code: "customer-business",
        title: "Business customer",
        sections: [
          {
            code: "company",
            title: "Company",
            fields: [{ name: "legalName", label: "Legal name", type: "text" }],
          },
        ],
      },
      "customer-business"
    );
    assert.equal(template.code, "customer-business");
    assert.equal(template.sections[0]?.fields[0]?.name, "legalName");
  });

  it("reads a new-format form wrapped in schema", () => {
    const template = readFormTemplate(
      {
        code: "customer-individual",
        schema: {
          formCode: "customer-individual",
          sections: [
            {
              code: "person",
              ui: { title: "Person" },
              fields: [{ key: "fullName", type: "text", ui: { label: "Full name" } }],
            },
          ],
        },
      },
      "customer-individual"
    );
    assert.equal(template.code, "customer-individual");
    assert.equal(template.sections[0]?.fields[0]?.name, "fullName");
    assert.equal(template.sections[0]?.fields[0]?.label, "Full name");
  });
});

describe("diff display mapping", () => {
  it("renders empty values as an em dash and keeps text", () => {
    const rows = mapDiffForDisplay([
      { path: "person.pan", before: null, after: "ABCDE1234F" },
      { path: "person.note", before: "", after: undefined },
      { path: "person.active", before: false, after: true },
    ]);
    assert.deepEqual(rows, [
      { path: "person.pan", before: "—", after: "ABCDE1234F" },
      { path: "person.note", before: "—", after: "—" },
      { path: "person.active", before: "false", after: "true" },
    ]);
  });

  it("serializes objects without throwing", () => {
    const rows = mapDiffForDisplay([
      { path: "address", before: { city: "Pune" }, after: { city: "Mumbai" } },
    ]);
    assert.equal(rows[0]?.before, JSON.stringify({ city: "Pune" }));
    assert.equal(rows[0]?.after, JSON.stringify({ city: "Mumbai" }));
  });
});

describe("wizard prefill from a profile", () => {
  it("copies the first repeatable row onto matching wizard field names", () => {
    const values = fieldValuesFromProfile(individualTemplate, {
      person: { fullName: "Ada Lovelace" },
      addresses: [{ city: "Pune" }, { city: "Mumbai" }],
    });
    assert.equal(values.fullName, "Ada Lovelace");
    assert.equal(values.city, "Pune");

    const wizard: FormTemplate = {
      code: "loan_request",
      title: "Loan",
      sections: [
        {
          code: "applicant",
          title: "Applicant",
          fields: [
            { name: "fullName", label: "Name", type: "text" },
            { name: "unused", label: "Unused", type: "text" },
          ],
        },
        {
          code: "sites",
          title: "Sites",
          repeatable: true,
          fields: [{ name: "city", label: "City", type: "text" }],
        },
      ],
    };
    assert.deepEqual(prefillWizardFormData([wizard], values), {
      loan_request: {
        applicant: { fullName: "Ada Lovelace" },
        sites: [{ city: "Pune" }],
      },
    });
  });
});

describe("return paths", () => {
  it("keeps same-origin paths and drops external ones", () => {
    assert.equal(safeInternalPath("/loan-application/new?programId=1"), "/loan-application/new?programId=1");
    assert.equal(safeInternalPath("//evil.example"), null);
    assert.equal(safeInternalPath("https://evil.example"), null);
  });

  it("appends the created profile to the return path", () => {
    assert.equal(
      withProfileReturn("/loan-application/new?programId=1", "profile-9", 2),
      "/loan-application/new?programId=1&customerProfileId=profile-9&customerProfileVersionNo=2"
    );
  });
});
