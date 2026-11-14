import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { FormField, FormTemplate } from "@/types";
import { buildSectionDefaults, buildTemplateSchema } from "@/utils/schema-builder";
import { normalizeTemplateJson } from "@/utils/program-mapper";
import {
  CONSENT_CONTINUE_ERROR,
  allRequiredConsentsAccepted,
  consentRowsFromSection,
  consentSummaryShouldClear,
  consentValuesAfterAction,
  consentWording,
  consentsForClient,
  evaluateConsentContinue,
  hashConsentText,
  isConsentAccepted,
  isConsentRecorded,
  resolveLocalizedCopy,
  shouldPersistConsent,
  toClientConsentValue,
  type ConsentCheckRow,
} from "@/utils/consent";

const wording = {
  en: "I consent to the collection and processing of my data.",
  hi: "मैं अपने डेटा के प्रसंस्करण के लिए सहमति देता हूँ।",
};

function row(overrides: Partial<ConsentCheckRow> = {}): ConsentCheckRow {
  return {
    key: "dpdpConsent",
    version: "1.0",
    visible: true,
    required: true,
    value: undefined,
    requiredMessage: "This consent is required to proceed",
    ...overrides,
  };
}

const share: FormField = {
  name: "shareWithBureau",
  label: "Share with bureau",
  type: "select",
  options: [
    { label: "Yes", value: "YES" },
    { label: "No", value: "NO" },
  ],
};

function consentField(overrides: Partial<FormField> = {}): FormField {
  return {
    name: "dpdpConsent",
    label: "Data processing consent",
    type: "consent",
    validation: { required: true, message: "This consent is required to proceed" },
    consent: {
      version: "1.0",
      capture: ["timestamp", "ipAddress", "userAgent"],
      withdrawable: true,
      text: wording.en,
    },
    ...overrides,
  };
}

describe("localised consent copy", () => {
  it("uses the requested locale and falls back to English", () => {
    assert.equal(resolveLocalizedCopy(wording, "hi"), wording.hi);
    assert.equal(resolveLocalizedCopy(wording, "hi-IN"), wording.hi);
    assert.equal(resolveLocalizedCopy(wording, "ta"), wording.en);
    assert.equal(resolveLocalizedCopy("Plain wording", "hi"), "Plain wording");
  });
});

describe("consent acceptance", () => {
  it("does not treat an older version as accepted", () => {
    const saved = { accepted: true, version: "0.9", timestamp: "2020-01-01T00:00:00.000Z" };
    assert.equal(isConsentAccepted(saved, "1.0"), false);
    assert.equal(isConsentAccepted({ accepted: true, version: "1.0" }, "1.0"), true);
    assert.equal(isConsentAccepted(true, "1.0"), false);
  });

  it("drops client timestamp and ip before submit", () => {
    const submitted = toClientConsentValue(
      {
        accepted: true,
        version: "1.0",
        timestamp: "1999-01-01T00:00:00.000Z",
        ipAddress: "203.0.113.10",
        userAgent: "Forged",
      },
      "1.0"
    );
    assert.deepEqual(submitted, { accepted: true, version: "1.0" });
    assert.equal(submitted && "timestamp" in submitted, false);
    assert.equal(submitted && "ipAddress" in submitted, false);
    assert.equal(toClientConsentValue({ accepted: true, version: "0.9" }, "1.0"), undefined);
  });

  it("keeps the locale and wording hash as evidence on submit", () => {
    const submitted = toClientConsentValue(
      { accepted: true, version: "1.0", locale: "hi", textHash: "abc123", timestamp: "1999-01-01T00:00:00.000Z" },
      "1.0"
    );
    assert.deepEqual(submitted, { accepted: true, version: "1.0", locale: "hi", textHash: "abc123" });
    assert.equal(consentWording(consentField({ consent: { version: "1.0", text: wording } }), "hi"), wording.hi);
  });

  it("hashes the exact wording that was shown", async () => {
    const hash = await hashConsentText("abc");
    assert.equal(hash, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    assert.notEqual(await hashConsentText(`${wording.en} `), await hashConsentText(wording.en));
  });
});

describe("consent continue validation", () => {
  const optional = row({ key: "terms", required: false, requiredMessage: undefined });
  const required = row();
  const second = row({
    key: "bureauConsent",
    requiredMessage: "Bureau consent is required",
  });

  it("blocks continue, names the first required field, and leaves optional consents alone", () => {
    const result = evaluateConsentContinue([optional, required, second]);
    assert.equal(result.ok, false);
    assert.equal(result.summary, CONSENT_CONTINUE_ERROR);
    assert.equal(result.focusKey, "dpdpConsent");
    assert.deepEqual(
      result.fieldErrors.map((issue) => issue.key),
      ["dpdpConsent", "bureauConsent"]
    );
    assert.equal(result.accepted, 0);
    assert.equal(result.total, 3);
  });

  it("clears the list error once any consent is ticked", () => {
    const before = [required, second];
    const after = [row({ value: { accepted: true, version: "1.0" } }), second];
    assert.equal(consentSummaryShouldClear(before, after), true);
    assert.equal(consentSummaryShouldClear(before, before), false);
  });

  it("bulk accept ticks required consents only, and clear removes only those entries", () => {
    const hidden = row({ key: "hiddenConsent", visible: false, value: { accepted: true, version: "1.0" } });
    const current = { hiddenConsent: { accepted: true, version: "1.0" } };
    const accepted = consentValuesAfterAction([required, optional, hidden], current, "accept", "hi");
    assert.deepEqual(accepted.dpdpConsent, { accepted: true, version: "1.0", locale: "hi" });
    assert.equal("terms" in accepted, false);
    assert.deepEqual(accepted.hiddenConsent, current.hiddenConsent);
    assert.equal(
      allRequiredConsentsAccepted([row({ value: accepted.dpdpConsent }), optional, hidden]),
      true
    );

    const cleared = consentValuesAfterAction([required, hidden], accepted, "clear");
    assert.equal("dpdpConsent" in cleared, false);
    assert.deepEqual(cleared.hiddenConsent, current.hiddenConsent);
  });

  it("never bulk-changes a consent the server already recorded", () => {
    const recordedValue = { accepted: true, version: "1.0", timestamp: "2026-10-20T09:00:00.000Z" };
    const [recorded] = consentRowsFromSection([consentField()], { dpdpConsent: recordedValue });
    assert.equal(recorded?.locked, true);
    assert.equal(isConsentRecorded(recordedValue, "1.0"), true);
    assert.equal(isConsentRecorded({ accepted: true, version: "1.0" }, "1.0"), false);
    const cleared = consentValuesAfterAction([recorded!], { dpdpConsent: recordedValue }, "clear");
    assert.deepEqual(cleared.dpdpConsent, recordedValue);
  });

  it("disables a consent whose schema has no version", () => {
    const [unversioned] = consentRowsFromSection(
      [consentField({ consent: { version: "", text: wording.en } })],
      {}
    );
    assert.equal(unversioned?.disabled, true);
    assert.equal(allRequiredConsentsAccepted([unversioned!]), false);
    assert.equal(evaluateConsentContinue([unversioned!]).ok, false);
  });

  it("does not validate or save a hidden consent", () => {
    const hidden = row({
      key: "kycConsent",
      visible: false,
      value: {
        accepted: true,
        version: "1.0",
        timestamp: "1999-01-01T00:00:00.000Z",
        ipAddress: "203.0.113.10",
      },
    });
    const visible = row({ value: { accepted: true, version: "1.0", ipAddress: "198.51.100.4" } });
    const result = evaluateConsentContinue([hidden, visible]);
    assert.equal(result.ok, true);
    assert.equal(result.total, 1);
    assert.deepEqual(consentsForClient([hidden, visible]), {
      dpdpConsent: { accepted: true, version: "1.0" },
    });
  });

  it("persists a consent whose visibleIf points at another wizard step", () => {
    const field = consentField({
      rules: { visibleWhen: { field: "shareWithBureau", operator: "equals", value: "YES" } },
    });
    const section = { dpdpConsent: { accepted: true, version: "1.0" } };
    const otherStep = { BUREAU: { preferences: { shareWithBureau: "YES" } } };
    assert.equal(shouldPersistConsent(field, section, {}), false);
    assert.equal(shouldPersistConsent(field, section, {}, otherStep), true);
  });

  it("follows visibleIf and requiredIf, including anyOf", () => {
    const mapped = normalizeTemplateJson({
      code: "CONSENTS",
      title: "Consents",
      sections: [
        {
          code: "consents",
          title: "Consents",
          fields: [
            {
              key: "shareWithBureau",
              type: "select",
              label: "Share with bureau",
              options: ["YES", "NO"],
            },
            {
              key: "dpdpConsent",
              type: "consent",
              required: true,
              ui: {
                label: { en: "Data processing consent", hi: "डेटा सहमति" },
                text: wording,
                fullTextUrl: "https://example.com/consent/dpdp",
                errors: { required: "This consent is required to proceed" },
              },
              consent: {
                version: "1.0",
                capture: ["timestamp", "ipAddress", "userAgent"],
                withdrawable: true,
              },
              sensitivity: "INTERNAL",
              visibleIf: {
                anyOf: [
                  { field: "shareWithBureau", op: "eq", value: "YES" },
                  { field: "shareWithBureau", op: "eq", value: "MAYBE" },
                ],
              },
              requiredIf: { field: "shareWithBureau", op: "eq", value: "YES" },
            },
          ],
        },
      ],
    });

    assert.equal(mapped.valid, true);
    const field = mapped.templates[0].sections[0].fields[1];
    assert.equal(field.type, "consent");
    assert.equal(field.label, "Data processing consent");
    assert.equal(field.consent?.version, "1.0");
    assert.equal(field.sensitivity, "INTERNAL");
    assert.equal(field.validation?.message, "This consent is required to proceed");

    const hidden = consentRowsFromSection([share, field], { shareWithBureau: "NO" });
    assert.equal(hidden[0]?.visible, false);
    assert.equal(evaluateConsentContinue(hidden).ok, true);

    const shown = consentRowsFromSection([share, field], { shareWithBureau: "YES" });
    assert.equal(shown[0]?.visible, true);
    assert.equal(shown[0]?.required, true);
    assert.equal(evaluateConsentContinue(shown).ok, false);
  });
});

describe("consent schema validation", () => {
  const template: FormTemplate = {
    code: "consents",
    title: "Consents",
    sections: [
      {
        code: "consents",
        title: "Consents",
        fields: [
          share,
          consentField({
            rules: {
              visibleWhen: { field: "shareWithBureau", operator: "equals", value: "YES" },
              requiredWhen: { field: "shareWithBureau", operator: "equals", value: "YES" },
            },
          }),
        ],
      },
    ],
  };
  const schema = buildTemplateSchema(template);

  it("starts unticked", () => {
    const defaults = buildSectionDefaults(template.sections[0]);
    assert.equal("dpdpConsent" in defaults, false);
  });

  it("skips a hidden consent and rejects an older version of a visible one", () => {
    assert.equal(
      schema.safeParse({ consents: { shareWithBureau: "NO" } }).success,
      true
    );
    const stale = schema.safeParse({
      consents: {
        shareWithBureau: "YES",
        dpdpConsent: { accepted: true, version: "0.9", timestamp: "1999-01-01T00:00:00.000Z" },
      },
    });
    assert.equal(stale.success, false);
    const current = schema.safeParse({
      consents: {
        shareWithBureau: "YES",
        dpdpConsent: {
          accepted: true,
          version: "1.0",
          timestamp: "1999-01-01T00:00:00.000Z",
          ipAddress: "203.0.113.10",
        },
      },
    });
    assert.equal(current.success, true);
  });
});
