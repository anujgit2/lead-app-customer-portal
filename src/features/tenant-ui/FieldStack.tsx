"use client";

import type { ReactNode } from "react";
import { groupFieldRows } from "@/features/tenant-ui/parse-ui-config";
import type { UiFormField } from "@/features/tenant-ui/types";

export function inputFields(fields: UiFormField[]) {
  return fields.filter((field) => field.type !== "checkbox");
}

export function checkFields(fields: UiFormField[]) {
  return fields.filter((field) => field.type === "checkbox");
}

export function FieldStack({
  fields,
  render,
}: {
  fields: UiFormField[];
  render: (field: UiFormField) => ReactNode;
}) {
  return groupFieldRows(fields).map((row) => (
    <div
      key={row.map((field) => field.key).join("-")}
      className={row.length > 1 ? "grid gap-4 sm:grid-cols-2 sm:gap-3" : "contents"}
    >
      {row.map((field) => (
        <div key={field.key} className={row.length > 1 ? "flex min-w-0 flex-col gap-1.5" : "contents"}>
          {render(field)}
        </div>
      ))}
    </div>
  ));
}
