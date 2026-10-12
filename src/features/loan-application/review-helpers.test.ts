import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { FormTemplate, StoredFileReference } from "@/types";
import {
  countTemplateFields,
  countUploadedFiles,
  documentGroupsForTemplate,
  isDocumentTemplate,
  isEmptyReviewValue,
} from "./review-helpers";

function storedFile(id: string): StoredFileReference {
  return {
    id,
    type: "PAN",
    status: "AVAILABLE",
    fileName: `${id}.pdf`,
    contentType: "application/pdf",
    uploadedAt: "2026-01-01T00:00:00.000Z",
    meta: { folderId: null, sizeBytes: 10, checksum: "x", ownerId: "u1" },
  } as StoredFileReference;
}

const applicantTemplate: FormTemplate = {
  code: "applicant",
  title: "Applicant",
  sections: [
    {
      code: "work",
      title: "Work",
      fields: [
        { name: "employmentType", label: "Employment type", type: "text" },
        {
          name: "employerName",
          label: "Employer",
          type: "text",
          rules: { visibleWhen: { field: "employmentType", operator: "equals", value: "SALARIED" } },
        },
      ],
    },
  ],
};

const directorsTemplate: FormTemplate = {
  code: "directors",
  title: "Director",
  propertyType: "DocumentProperty",
  repeatable: true,
  sections: [
    {
      code: "kyc",
      title: "KYC",
      fields: [
        { name: "pan", label: "PAN card", type: "file" },
        { name: "photo", label: "Photo", type: "file" },
      ],
    },
  ],
};

describe("review value emptiness", () => {
  it("treats false as an answer and blank nested objects as empty", () => {
    assert.equal(isEmptyReviewValue(false), false);
    assert.equal(isEmptyReviewValue([]), true);
    assert.equal(isEmptyReviewValue({ line1: "", city: null }), true);
    assert.equal(isEmptyReviewValue({ line1: "", city: "Pune" }), false);
  });
});

describe("review field counts", () => {
  it("leaves hidden fields out of the total", () => {
    const data = { work: { employmentType: "SELF_EMPLOYED", employerName: "" } };
    assert.deepEqual(countTemplateFields(applicantTemplate, data, { applicant: data }), {
      filled: 1,
      total: 1,
    });
  });

  it("counts a field once its rule makes it visible", () => {
    const data = { work: { employmentType: "SALARIED", employerName: "" } };
    assert.deepEqual(countTemplateFields(applicantTemplate, data, { applicant: data }), {
      filled: 1,
      total: 2,
    });
  });
});

describe("document groups", () => {
  it("detects a documents template", () => {
    assert.equal(isDocumentTemplate(directorsTemplate), true);
    assert.equal(isDocumentTemplate(applicantTemplate), false);
  });

  it("gives every repeatable instance its own group and unique keys", () => {
    const data = [{ kyc: { pan: [storedFile("f1")], photo: [] } }, { kyc: { pan: [storedFile("f2")] } }];
    const groups = documentGroupsForTemplate(directorsTemplate, data, { directors: data });

    assert.deepEqual(
      groups.map((group) => [group.id, group.title, group.filledSlots, group.slotCount]),
      [
        ["0-kyc", "Director #1 · KYC", 1, 2],
        ["1-kyc", "Director #2 · KYC", 1, 2],
      ]
    );
    const keys = groups.flatMap((group) => [...group.provided, ...group.missing].map((item) => item.key));
    assert.equal(new Set(keys).size, keys.length);
  });

  it("counts uploaded files across instances and ignores non-document templates", () => {
    const data = [{ kyc: { pan: [storedFile("f1"), storedFile("f3")] } }, { kyc: { photo: [storedFile("f2")] } }];
    assert.equal(
      countUploadedFiles([applicantTemplate, directorsTemplate], { directors: data, applicant: {} }),
      3
    );
  });
});
