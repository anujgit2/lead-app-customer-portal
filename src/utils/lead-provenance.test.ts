import { test } from "node:test";
import assert from "node:assert/strict";
import { agentEditedForms } from "./lead-provenance";

test("lists only forms whose last change came from the partner, in program order", () => {
  const templates = [
    { code: "applicant", propertyName: "applicant", title: "Applicant" },
    { code: "company", propertyName: "company", title: "Company" },
    { code: "loan", propertyName: "loan", title: "Loan" },
  ];
  const properties = [
    { name: "company", meta: { lastEditedBy: { actorType: "PARTNER" } } },
    { name: "applicant", meta: { lastEditedBy: { actorType: "CUSTOMER" } } },
    { name: "loan" },
  ];
  assert.deepEqual(agentEditedForms(properties, templates), ["Company"]);
});

test("falls back to the template code when there is no property name", () => {
  const templates = [{ code: "loan", title: "Loan" }];
  const properties = [{ name: "loan", meta: { lastEditedBy: { actorType: "PARTNER" } } }];
  assert.deepEqual(agentEditedForms(properties, templates), ["Loan"]);
});

test("is empty when nothing was changed by the partner", () => {
  assert.deepEqual(agentEditedForms([], [{ code: "loan", title: "Loan" }]), []);
});
