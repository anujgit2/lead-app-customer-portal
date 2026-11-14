"use client";

import React, { forwardRef, useImperativeHandle, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { cn } from "@/lib/utils";

export interface JsonEditorHandle {
  format: () => void;
}

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string | number;
  readOnly?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * Thin wrapper around Monaco (the only JSON-aware code editor in this project)
 * for the dev Form Playground's JSON template / test-data editors. Gives us
 * syntax highlighting, line numbers, folding, and inline error squiggles for
 * free via Monaco's built-in JSON language service.
 */
export const JsonEditor = forwardRef<JsonEditorHandle, JsonEditorProps>(function JsonEditor(
  { value, onChange, height = 420, readOnly, className, ariaLabel },
  ref
) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  useImperativeHandle(ref, () => ({
    format: () => {
      editorRef.current?.getAction("editor.action.formatDocument")?.run();
    },
  }));

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  return (
    <div
      aria-label={ariaLabel}
      className={cn("overflow-hidden rounded-lg border border-slate-200 dark:border-zinc-800", className)}
    >
      <Editor
        height={height}
        defaultLanguage="json"
        theme="light"
        value={value}
        onChange={(v) => onChange(v ?? "")}
        onMount={handleMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 12.5,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          tabSize: 2,
          wordWrap: "on",
          folding: true,
          renderLineHighlight: "line",
          automaticLayout: true,
        }}
        loading={<div className="p-4 text-xs text-muted-foreground">Loading editor…</div>}
      />
    </div>
  );
});
