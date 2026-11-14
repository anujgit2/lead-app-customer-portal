import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeDocumentDetail, normalizeDocumentList, normalizeShares } from "../api/normalize";
import {
  activityEventLabel,
  deriveShareStatus,
  filterDocuments,
  maskEmail,
  maskPhone,
  previewKind,
  safeFileName,
  shareCacheKey,
  shareBatchMessage,
  shareSuccessMessage,
  sortShares,
  unavailableCopy,
} from "./format";
import { toE164 } from "./phone";
import { messageForUploadStatus, sameSubmission, validateUploadFile } from "./upload";
import { shareFormSchema, toSharePayload } from "./validation";

describe("contact masking", () => {
  it("masks an email with the first and last character", () => {
    assert.equal(maskEmail("rohan@auditfirm.in"), "r****n@auditfirm.in");
  });

  it("masks an Indian mobile number", () => {
    assert.equal(maskPhone("+919876543210"), "+91 98***43210");
    assert.equal(maskPhone("9876543210"), "+91 98***43210");
  });

  it("leaves an already masked value unchanged", () => {
    assert.equal(maskEmail("r****n@auditfirm.in"), "r****n@auditfirm.in");
    assert.equal(maskPhone("+91 98***43210"), "+91 98***43210");
  });
});

describe("phone numbers", () => {
  it("normalizes local and international numbers to E.164", () => {
    assert.equal(toE164("9876543210"), "+919876543210");
    assert.equal(toE164("09876543210"), "+919876543210");
    assert.equal(toE164("+91 98765 43210"), "+919876543210");
    assert.equal(toE164("+1 415 555 2671"), "+14155552671");
  });

  it("rejects numbers that are too short", () => {
    assert.equal(toE164("123"), null);
    assert.equal(toE164("not-a-phone"), null);
  });
});

describe("share form", () => {
  const base = {
    recipientName: "Rohan",
    email: "",
    phone: "",
    expiresInDays: "7" as const,
    allowDownload: true,
    password: "",
  };

  it("requires an email address", () => {
    const result = shareFormSchema.safeParse(base);
    assert.equal(result.success, false);
  });

  it("accepts an email without a phone number", () => {
    const result = shareFormSchema.safeParse({ ...base, email: "rohan@auditfirm.in" });
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.deepEqual(toSharePayload(result.data), {
      recipientName: "Rohan",
      email: "rohan@auditfirm.in",
      phone: undefined,
      expiresInDays: 7,
      allowDownload: true,
      password: undefined,
    });
  });

  it("accepts a phone number and converts it to E.164", () => {
    const result = shareFormSchema.safeParse({
      ...base,
      email: "rohan@auditfirm.in",
      phone: "9876543210",
    });
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(toSharePayload(result.data).phone, "+919876543210");
  });

  it("rejects a short password and an unknown expiry", () => {
    assert.equal(shareFormSchema.safeParse({ ...base, email: "a@b.co", password: "short" }).success, false);
    assert.equal(
      shareFormSchema.safeParse({ ...base, email: "a@b.co", expiresInDays: "14" as never }).success,
      false
    );
  });
});

describe("sharing status and activity", () => {
  const now = Date.parse("2026-10-08T12:00:00.000Z");

  it("derives expired from the expiry time", () => {
    assert.equal(
      deriveShareStatus({ status: "ACTIVE", expiresAt: "2026-10-01T00:00:00.000Z" }, now),
      "EXPIRED"
    );
    assert.equal(
      deriveShareStatus({ status: "ACTIVE", expiresAt: "2026-10-20T00:00:00.000Z" }, now),
      "ACTIVE"
    );
    assert.equal(deriveShareStatus({ status: "REVOKED", expiresAt: "2026-10-20T00:00:00.000Z" }, now), "REVOKED");
  });

  it("sorts active shares ahead of the rest", () => {
    const sorted = sortShares([
      { status: "EXPIRED" as const, createdAt: "2026-10-08T00:00:00.000Z", id: "old" },
      { status: "ACTIVE" as const, createdAt: "2026-10-01T00:00:00.000Z", id: "earlier" },
      { status: "ACTIVE" as const, createdAt: "2026-10-07T00:00:00.000Z", id: "later" },
    ]);
    assert.deepEqual(
      sorted.map((share) => share.id),
      ["later", "earlier", "old"]
    );
  });

  it("maps activity events to plain labels", () => {
    assert.equal(activityEventLabel({ eventType: "SHARED" }), "Link created");
    assert.equal(activityEventLabel({ eventType: "LINK_SENT", channel: "EMAIL" }), "Link sent by email");
    assert.equal(activityEventLabel({ eventType: "LINK_SENT", channel: "SMS" }), "Link sent by text message");
    assert.equal(activityEventLabel({ eventType: "VIEWED" }), "Viewed");
    assert.equal(activityEventLabel({ eventType: "DOWNLOADED" }), "Downloaded");
    assert.equal(activityEventLabel({ eventType: "REVOKED" }), "Access revoked");
    assert.equal(
      activityEventLabel({ eventType: "ACCESS_DENIED", reason: "WRONG_PASSWORD" }),
      "Blocked access attempt (incorrect password)"
    );
  });

  it("uses plain wording for unavailable links", () => {
    for (const reason of ["expired", "revoked", "invalid"] as const) {
      const copy = unavailableCopy(reason);
      assert.equal(copy.title.toLowerCase().includes("token"), false);
      assert.equal(copy.message.toLowerCase().includes("token"), false);
    }
  });
});

describe("uploads", () => {
  it("rejects oversized and unsupported files with the same wording as the server", () => {
    assert.equal(validateUploadFile({ name: "notes.html", size: 10 }), "This file type isn't supported");
    assert.equal(
      validateUploadFile({ name: "big.pdf", size: 26 * 1024 * 1024 }),
      "File is too large (max 25 MB)"
    );
    assert.equal(validateUploadFile({ name: "statement.pdf", size: 1024 }), null);
    assert.equal(messageForUploadStatus(413), "File is too large (max 25 MB)");
    assert.equal(messageForUploadStatus(415), "This file type isn't supported");
    assert.equal(messageForUploadStatus(500), "Upload failed. Please try again.");
  });

  it("treats a changed file as a new submission", () => {
    const first = {
      name: "a.pdf",
      size: 10,
      lastModified: 1,
      typeId: "bank",
      label: "FY 2025-26",
      asNewDocument: false,
      documentId: "",
    };
    assert.equal(sameSubmission(first, { ...first }), true);
    assert.equal(sameSubmission(first, { ...first, name: "b.pdf" }), false);
  });
});

describe("preview safety", () => {
  it("previews pdf and images and refuses html", () => {
    assert.equal(previewKind("application/pdf", "a.pdf"), "pdf");
    assert.equal(previewKind("image/png", "a.png"), "image");
    assert.equal(previewKind("text/html", "page.html"), null);
    assert.equal(previewKind("application/octet-stream", "page.html"), null);
    assert.equal(previewKind("image/svg+xml", "icon.svg"), null);
  });

  it("strips paths from download names", () => {
    assert.equal(safeFileName("../../secret.pdf"), "secret.pdf");
    assert.equal(safeFileName(".."), "document");
  });
});

describe("documents api shapes", () => {
  it("reads a document list and keeps the share secret out of the cache key", () => {
    const documents = normalizeDocumentList({
      items: [
        {
          id: "doc-1",
          typeName: "Bank statement",
          label: "FY 2025-26",
          category: "Financials",
          latestVersion: 3,
          source: "UPLOAD",
          updatedAt: "2026-10-01",
        },
      ],
    });
    assert.equal(documents[0]?.typeName, "Bank statement");
    assert.equal(documents[0]?.source, "UPLOADED");
    assert.equal(documents[0]?.latestVersion, 3);
    assert.equal(filterDocuments(documents, { q: "bank" }).length, 1);
    assert.equal(filterDocuments(documents, { category: "TAXATION" }).length, 0);
    const key = shareCacheKey("super-secret-token");
    assert.equal(key.includes("super-secret-token"), false);
  });

  it("reads file name and linked profiles from the documents list", () => {
    const documents = normalizeDocumentList([
      {
        id: "uuid",
        typeId: 1,
        category: "OTHER",
        typeName: "SUPPORTING_DOCUMENT",
        label: "PAN",
        fileName: "pan.pdf",
        latestVersion: 1,
        createdAt: "2026-10-11T00:00:00Z",
        profiles: [
          { profileId: "uuid", displayName: "Acme Pvt Ltd", type: "BUSINESS", relation: "RELATED_TO" },
        ],
      },
    ]);
    assert.equal(documents[0]?.fileName, "pan.pdf");
    assert.equal(documents[0]?.typeId, "1");
    assert.equal(documents[0]?.latestVersion, 1);
    assert.equal(documents[0]?.updatedAt, "2026-10-11T00:00:00Z");
    assert.equal(documents[0]?.linked?.[0]?.displayName, "Acme Pvt Ltd");
    assert.equal(documents[0]?.linked?.[0]?.relation, "RELATED_TO");
    assert.equal(filterDocuments(documents, { profileId: "uuid" }).length, 1);
    assert.equal(filterDocuments(documents, { q: "pan.pdf" }).length, 1);
  });

  it("keeps documents linked to the selected profile", () => {
    const documents = normalizeDocumentList({
      items: [
        {
          id: "a",
          typeName: "PAN",
          category: "Identity",
          linked: [
            { profileId: "p1", displayName: "Ada", type: "INDIVIDUAL", relation: "FOR" },
          ],
        },
        {
          id: "b",
          typeName: "GST",
          category: "Identity",
          linked: [
            { profileId: "p2", displayName: "Bee", type: "BUSINESS", relation: "RELATED_TO" },
          ],
        },
      ],
    });
    assert.equal(filterDocuments(documents, { profileId: "p1" }).length, 1);
    assert.equal(filterDocuments(documents, { profileId: "p1" })[0]?.id, "a");
    assert.equal(filterDocuments(documents, { q: "bee" }).length, 1);
  });

  it("keeps every uploaded version and marks the highest as latest", () => {
    const detail = normalizeDocumentDetail({
      id: "54aa26c7-c2b0-4196-a517-e27728b04c6c",
      typeId: 4,
      category: "Financials",
      typeName: "Bank statement",
      label: "FY 2025-26",
      createdAt: "2026-10-01T00:00:00.000Z",
      versions: [
        {
          id: "ver-2",
          documentId: "54aa26c7-c2b0-4196-a517-e27728b04c6c",
          versionNo: 2,
          fileName: "statement-v2.pdf",
          mime: "application/pdf",
          sizeBytes: 2048,
          source: "UPLOAD",
          uploadedAt: "2026-10-08T00:00:00.000Z",
          uploadedBy: "11111111-1111-4111-8111-111111111111",
        },
        {
          id: "ver-1",
          documentId: "54aa26c7-c2b0-4196-a517-e27728b04c6c",
          versionNo: 1,
          fileName: "statement-v1.pdf",
          mime: "application/pdf",
          sizeBytes: 1024,
          source: "UPLOAD",
          uploadedAt: "2026-10-01T00:00:00.000Z",
        },
      ],
    });
    assert.equal(detail?.latestVersion, 2);
    assert.equal(detail?.versions.length, 2);
    assert.equal(detail?.versions[0]?.version, 2);
    assert.equal(detail?.versions[0]?.latest, true);
    assert.equal(detail?.versions[0]?.contentType, "application/pdf");
    assert.equal(detail?.versions[0]?.createdBy, undefined);
    assert.equal(detail?.versions[1]?.version, 1);
    assert.equal(detail?.versions[1]?.latest, false);
  });

  it("masks contacts returned by the shares endpoint", () => {
    const shares = normalizeShares(
      [
        {
          id: "share-1",
          recipientName: "Rohan",
          email: "rohan@auditfirm.in",
          status: "ACTIVE",
          expiresAt: "2026-12-01T00:00:00.000Z",
          createdAt: "2026-10-01T00:00:00.000Z",
          viewCount: 3,
          downloadCount: 1,
        },
      ],
      Date.parse("2026-10-08T00:00:00.000Z")
    );
    assert.equal(shares[0]?.email, "r****n@auditfirm.in");
    assert.equal(shares[0]?.status, "ACTIVE");
  });
});

describe("share success copy", () => {
  it("names the recipient without calling the link a token", () => {
    const message = shareSuccessMessage({ sentTo: "rohan@auditfirm.in" }, { email: "rohan@auditfirm.in" });
    assert.equal(message, "Sent to rohan@auditfirm.in");
    assert.equal(shareSuccessMessage({ linkOnly: true }, {}), "Link ready to copy");
    assert.equal(
      shareBatchMessage(3, [], { sentTo: "rohan@auditfirm.in" }, { email: "rohan@auditfirm.in" }),
      "Sent 3 documents to rohan@auditfirm.in"
    );
    assert.equal(
      shareBatchMessage(2, ["PAN card"], { linkOnly: true }, {}),
      "2 links ready to copy. Couldn't share PAN card."
    );
  });
});
