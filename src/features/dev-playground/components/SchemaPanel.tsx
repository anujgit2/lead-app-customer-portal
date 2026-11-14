"use client";

import React from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { usePlayground } from "../playground-context";

const JsonEditor = dynamic(() => import("./JsonEditor").then((m) => m.JsonEditor), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[240px] items-center justify-center rounded-lg border border-slate-200 text-xs text-muted-foreground dark:border-zinc-800">
      Loading editor…
    </div>
  ),
});

/**
 * The schema panel is now *just* the JSON editor — every other control (source
 * mode, API loader, format/validate/copy/paste/clear, section navigation, test
 * data, render preview, schema status) lives in the sticky `PlaygroundToolbar`
 * header above, so this panel gets the maximum possible height to actually see
 * the JSON. A single-line status strip stays here for at-a-glance feedback
 * while typing; the full issue list is available from the header's status
 * popover.
 */
export function SchemaPanel() {
  const { editorRef, jsonText, setJsonText, jsonParseError, normalized } = usePlayground();

  const warnings = normalized.issues.filter((i) => i.severity === "warning");
  const errors = normalized.issues.filter((i) => i.severity === "error");

  return (
      <div className="flex h-full min-h-0 flex-col gap-2 p-3 sm:p-4">
      {jsonParseError ? (
        <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Invalid JSON: {jsonParseError}</span>
        </div>
      ) : errors.length > 0 ? (
        <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {errors.length} schema error{errors.length === 1 ? "" : "s"} — see Schema status in the toolbar
        </div>
      ) : warnings.length > 0 ? (
        <div className="flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {warnings.length} warning{warnings.length === 1 ? "" : "s"} — see Schema status in the toolbar
        </div>
      ) : normalized.templates.length > 0 ? (
        <div className="flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          Schema is valid — {normalized.templates.length} template(s) parsed
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        <JsonEditor
          ref={editorRef}
          value={jsonText}
          onChange={setJsonText}
          height="100%"
          className="h-full"
          ariaLabel="Form template JSON"
        />
      </div>
    </div>
  );
}
