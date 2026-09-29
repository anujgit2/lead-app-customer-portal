"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RotateCcw, FileWarning, Braces } from "lucide-react";
import { FormDebugProvider } from "@/components/forms/form-debug-context";
import { usePlayground, findSelectedTemplate } from "../playground-context";
import { TemplatePreview } from "./TemplatePreview";

export function PreviewPanel() {
  const { jsonParseError, normalized, debug, renderEntireForm, selectedTemplateCode, selectedSectionCode, resetPreview } =
    usePlayground();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-zinc-800">
        <p className="text-sm font-semibold tracking-tight text-slate-900">Live Form Preview</p>
        <Button type="button" variant="outline" size="sm" onClick={resetPreview} className="h-7 gap-1.5 px-2 text-[11px]">
          <RotateCcw className="h-3 w-3" /> Reset Preview
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {jsonParseError ? (
          <Alert variant="destructive">
            <Braces className="h-4 w-4" />
            <AlertTitle>Invalid JSON</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap font-mono text-xs">{jsonParseError}</AlertDescription>
          </Alert>
        ) : !normalized.valid ? (
          <Alert variant="warning">
            <FileWarning className="h-4 w-4" />
            <AlertTitle>Schema validation failed — nothing rendered</AlertTitle>
            <AlertDescription>
              <ul className="mt-1 space-y-1 font-mono text-xs">
                {normalized.issues
                  .filter((i) => i.severity === "error")
                  .map((issue, i) => (
                    <li key={i}>
                      <span className="text-amber-500">{issue.path}:</span> {issue.message}
                    </li>
                  ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : normalized.templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No templates to render yet.</p>
        ) : (
          <FormDebugProvider value={debug}>
            <div className="space-y-6">
              {renderEntireForm
                ? normalized.templates.map((template) => (
                    <Card key={template.code}>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base">{template.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <TemplatePreview template={template} sectionCode={null} />
                      </CardContent>
                    </Card>
                  ))
                : (() => {
                    const template = findSelectedTemplate(normalized.templates, selectedTemplateCode);
                    if (!template) return null;
                    return <TemplatePreview template={template} sectionCode={selectedSectionCode} />;
                  })()}
            </div>
          </FormDebugProvider>
        )}
      </div>
    </div>
  );
}
