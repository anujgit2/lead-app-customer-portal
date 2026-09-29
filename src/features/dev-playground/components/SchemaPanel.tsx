"use client";

import React, { useRef } from "react";
import dynamic from "next/dynamic";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlignLeft,
  CheckCircle2,
  Clipboard,
  ClipboardPaste,
  Eraser,
  PlayCircle,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { usePlayground } from "../playground-context";
import { ApiSourceForm } from "./ApiSourceForm";
import { TestDataPanel } from "./TestDataPanel";
import { SectionNavigator } from "./SectionNavigator";
import type { JsonEditorHandle } from "./JsonEditor";

const JsonEditor = dynamic(() => import("./JsonEditor").then((m) => m.JsonEditor), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-lg border border-slate-200 text-xs text-muted-foreground dark:border-zinc-800">
      Loading editor…
    </div>
  ),
});

export function SchemaPanel() {
  const { mode, setMode, jsonText, setJsonText, commitNow, jsonParseError, normalized } = usePlayground();
  const editorRef = useRef<JsonEditorHandle>(null);

  const warnings = normalized.issues.filter((i) => i.severity === "warning");
  const errors = normalized.issues.filter((i) => i.severity === "error");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      toast.success("Copied JSON to clipboard");
    } catch {
      toast.error("Clipboard access denied");
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJsonText(text);
      toast.success("Pasted from clipboard");
    } catch {
      toast.error("Clipboard access denied");
    }
  };

  const handleClear = () => setJsonText("[]");

  const handleValidate = () => {
    commitNow();
    if (jsonParseError) toast.error("Invalid JSON");
    else if (errors.length > 0) toast.error(`${errors.length} schema error(s) found`);
    else toast.success("Schema is valid");
  };

  return (
    <div className="h-full space-y-4 overflow-y-auto p-4 sm:p-5">
      <div className="space-y-2">
        <Label className="text-xs text-slate-500">Source</Label>
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as "api" | "json")} className="flex gap-5">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <RadioGroupItem value="api" id="pg-source-api" />
            API
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <RadioGroupItem value="json" id="pg-source-json" />
            JSON
          </label>
        </RadioGroup>
      </div>

      {mode === "api" && <ApiSourceForm />}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-slate-500">JSON Editor</Label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => editorRef.current?.format()}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <AlignLeft className="h-3 w-3" /> Format
            </button>
            <button
              type="button"
              onClick={handleValidate}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <ShieldCheck className="h-3 w-3" /> Validate
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <Clipboard className="h-3 w-3" /> Copy
            </button>
            <button
              type="button"
              onClick={handlePaste}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <ClipboardPaste className="h-3 w-3" /> Paste
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <Eraser className="h-3 w-3" /> Clear
            </button>
          </div>
        </div>

        <JsonEditor ref={editorRef} value={jsonText} onChange={setJsonText} height={340} ariaLabel="Form template JSON" />

        <Button type="button" onClick={commitNow} className="w-full gap-2">
          <PlayCircle className="h-4 w-4" /> Render Preview
        </Button>
      </div>

      {jsonParseError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Invalid JSON</AlertTitle>
          <AlertDescription className="font-mono text-xs">{jsonParseError}</AlertDescription>
        </Alert>
      )}

      {!jsonParseError && errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Schema errors ({errors.length})</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 space-y-1 font-mono text-[11px]">
              {errors.map((issue, i) => (
                <li key={i}>
                  <span className="text-destructive/70">{issue.path}:</span> {issue.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {!jsonParseError && errors.length === 0 && warnings.length > 0 && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warnings ({warnings.length})</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 space-y-1 font-mono text-[11px]">
              {warnings.map((issue, i) => (
                <li key={i}>
                  <span className="text-amber-600">{issue.path}:</span> {issue.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {!jsonParseError && errors.length === 0 && warnings.length === 0 && normalized.templates.length > 0 && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="text-xs">Schema is valid — {normalized.templates.length} template(s) parsed.</AlertDescription>
        </Alert>
      )}

      <SectionNavigator />
      <TestDataPanel />
    </div>
  );
}
