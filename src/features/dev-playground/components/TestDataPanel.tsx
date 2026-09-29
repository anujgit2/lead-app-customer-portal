"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Trash2, Download } from "lucide-react";
import { usePlayground } from "../playground-context";

/** Test data / state simulator. Rendered inside a header popover — no internal disclosure needed. */
export function TestDataPanel() {
  const { testDataText, setTestDataText, testDataError, clearTestData, generateSampleData, resetPreview, normalized } =
    usePlayground();

  const applyTestData = () => {
    // Test data is only "applied" by remounting the preview so WizardStep re-reads
    // it as defaultValues — this never touches any submission API.
    resetPreview();
  };

  return (
    <div className="space-y-2.5">
      <p className="text-sm font-medium text-slate-700">Test Data</p>
      <p className="text-[11px] text-muted-foreground">
        Provide initial form values as JSON. Never submitted anywhere — used only as the preview&apos;s default
        values.
      </p>
      <Textarea
        value={testDataText}
        onChange={(e) => setTestDataText(e.target.value)}
        rows={7}
        className="font-mono text-xs"
        error={!!testDataError}
      />
      {testDataError && <p className="text-xs text-destructive">{testDataError}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clearTestData} className="gap-1.5">
          <Trash2 className="h-3.5 w-3.5" /> Clear Data
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={applyTestData} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Load Test Data
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={generateSampleData}
          disabled={normalized.templates.length === 0}
          className="gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" /> Generate Sample Data
        </Button>
      </div>
    </div>
  );
}
