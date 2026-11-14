import { test } from "node:test";
import assert from "node:assert/strict";
import { leadService, leadWizardBackend, rememberPendingInvite, takePendingInvite } from "./lead.service";
import type { DraftApplication, FormTemplate } from "@/types";

function draft(formData: Record<string, unknown>): DraftApplication {
  return {
    applicationId: "lead-1",
    productCode: "home",
    currentStep: 0,
    formData: formData as DraftApplication["formData"],
    stepStatuses: [],
  } as DraftApplication;
}

const template = {
  code: "applicant",
  title: "Applicant",
  propertyType: "ApplicantProperty",
  propertyName: "applicant",
  repeatable: false,
  sections: [],
} as unknown as FormTemplate;

test("draft save with no entered values sends nothing", async () => {
  const original = leadService.saveProperties;
  const calls: unknown[] = [];
  leadService.saveProperties = async (...args) => {
    calls.push(args);
  };
  try {
    await leadWizardBackend("lead-1", [template]).saveDraft(draft({}), [template]);
    assert.equal(calls.length, 0);
  } finally {
    leadService.saveProperties = original;
  }
});

test("submit saves the full form before submitting", async () => {
  const originalSave = leadService.saveProperties;
  const originalSubmit = leadService.submit;
  const order: string[] = [];
  leadService.saveProperties = async () => {
    order.push("save");
  };
  leadService.submit = async () => {
    order.push("submit");
  };
  try {
    await leadWizardBackend("lead-1", [template]).submitApplication(draft({}));
    assert.deepEqual(order, ["submit"]);
  } finally {
    leadService.saveProperties = originalSave;
    leadService.submit = originalSubmit;
  }
});

test("pending invite survives until taken once", () => {
  const store = new Map<string, string>();
  const fake = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  const globals = globalThis as unknown as { sessionStorage?: unknown };
  const previous = globals.sessionStorage;
  globals.sessionStorage = fake;
  try {
    rememberPendingInvite("tok-abc");
    assert.equal(takePendingInvite(), "tok-abc");
    assert.equal(takePendingInvite(), null);
  } finally {
    globals.sessionStorage = previous;
  }
});

test("pending invite helpers do not throw when storage is unavailable", () => {
  const globals = globalThis as unknown as { sessionStorage?: unknown };
  const previous = globals.sessionStorage;
  delete globals.sessionStorage;
  try {
    assert.doesNotThrow(() => rememberPendingInvite("tok"));
    assert.equal(takePendingInvite(), null);
  } finally {
    globals.sessionStorage = previous;
  }
});
