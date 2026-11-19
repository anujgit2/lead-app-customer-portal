import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTemplateAuto } from "@/utils/template-mapper";

/**
 * A snapshot shaped the way leads-service writes it for a lead template (LeadTemplateSnapshot.build).
 * The lead view renders it through normalizeTemplateAuto. These checks guard the shape the customer
 * renderer relies on, including documents that the mapper would otherwise drop (gap G3).
 */
const snapshot = {
  schemaVersion: "lead-template-v1",
  programCode: "TPL-1234ABCD",
  name: "SME loan",
  programType: "BUSINESS_LOAN",
  status: "PUBLISHED",
  version: 1,
  currency: "INR",
  ui: { title: "SME loan", subtitle: "SME loan" },
  optionSets: {
    "business_details.tier": [
      { value: "Micro", ui: { label: "Micro" } },
      { value: "Small", ui: { label: "Small" } },
    ],
  },
  forms: [
    {
      formCode: "business_details",
      formName: "business_details",
      templateVersion: 1,
      displayOrder: 1,
      required: true,
      visible: true,
      repeatable: false,
      ui: { title: "Business details", subtitle: "" },
      sections: [
        {
          code: "business_details_main",
          displayOrder: 1,
          ui: { title: "Business details" },
          fields: [
            { key: "gst_number", type: "text", required: true, ui: { label: "GST number", errors: { required: "GST number is required" } } },
            { key: "tier", type: "select", required: false, optionsRef: "business_details.tier", ui: { label: "Tier", errors: { required: "Tier is required" } } },
          ],
        },
      ],
    },
    {
      formCode: "individual_details",
      formName: "individual_details",
      templateVersion: 1,
      displayOrder: 2,
      required: true,
      visible: true,
      repeatable: false,
      ui: { title: "Individual details", subtitle: "" },
      sections: [
        {
          code: "individual_details_main",
          displayOrder: 1,
          ui: { title: "Individual details" },
          fields: [{ key: "full_name", type: "text", required: true, ui: { label: "Full name", errors: { required: "Full name is required" } } }],
        },
      ],
    },
  ],
  documents: [
    {
      documentType: "gst_certificate",
      scope: "APPLICATION",
      required: true,
      upload: { minFiles: 1, maxFiles: 1, maxFileSizeMB: 5, allowedExtensions: ["pdf", "jpg", "jpeg", "png"] },
      ui: { label: "GST certificate", description: "Upload from the business.", uploadHint: "PDF, JPG, PNG, up to {maxFileSizeMB} MB per file", errors: { required: "GST certificate is required" } },
      templateScope: "BUSINESS",
    },
    {
      documentType: "pan_card",
      scope: "APPLICATION",
      required: true,
      upload: { minFiles: 1, maxFiles: 1, maxFileSizeMB: 5, allowedExtensions: ["pdf", "jpg", "jpeg", "png"] },
      ui: { label: "PAN card", description: "Upload from the applicant.", uploadHint: "PDF, JPG, PNG, up to {maxFileSizeMB} MB per file", errors: { required: "PAN card is required" } },
      templateScope: "APPLICANT",
    },
  ],
  components: {},
};

test("template snapshot renders every form and both document groups", () => {
  const product = normalizeTemplateAuto(snapshot);
  const codes = product.templates.map((t) => t.code);
  assert.deepEqual(codes, ["business_details", "individual_details", "DOCUMENTS"]);

  const docs = product.templates.find((t) => t.code === "DOCUMENTS");
  assert.ok(docs, "documents step exists");
  const documentFields = docs.sections.flatMap((s) => s.fields);
  assert.deepEqual(
    documentFields.map((f) => f.documentType ?? f.name),
    ["gst_certificate", "pan_card"],
    "both business and applicant documents survive the mapper (G3)"
  );
});

test("form fields keep their labels and required flags", () => {
  const product = normalizeTemplateAuto(snapshot);
  const business = product.templates.find((t) => t.code === "business_details");
  assert.ok(business);
  const fields = business.sections.flatMap((s) => s.fields);
  const gst = fields.find((f) => f.name === "gst_number");
  assert.equal(gst?.label, "GST number");
  assert.equal(gst?.validation?.required, true);
});

test("select options resolve from the option set", () => {
  const product = normalizeTemplateAuto(snapshot);
  const business = product.templates.find((t) => t.code === "business_details");
  assert.ok(business);
  const tier = business.sections.flatMap((s) => s.fields).find((f) => f.name === "tier");
  assert.deepEqual(
    (tier?.options ?? []).map((o) => o.value),
    ["Micro", "Small"]
  );
});
