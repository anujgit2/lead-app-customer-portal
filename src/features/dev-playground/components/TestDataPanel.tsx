"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Sparkles, Trash2, Download } from "lucide-react";
import { usePlayground } from "../playground-context";

export function TestDataPanel() {
  const { testDataText, setTestDataText, testDataError, clearTestData, generateSampleData, resetPreview, normalized } =
    usePlayground();
  const [open, setOpen] = useState(false);

  const applyTestData = () => {
    // Test data is only "applied" by remounting the preview so WizardStep re-reads
    // it as defaultValues — this never touches any submission API.
    resetPreview();
  };

  return (
    <div className="rounded-lg border border-slate-100 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left"
      >
        <span className="text-sm font-medium text-slate-700">Test Data</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="space-y-2.5 border-t border-slate-100 p-3.5 dark:border-zinc-800">
          <p className="text-[11px] text-muted-foreground">
            Provide initial form values as JSON. Never submitted anywhere — used only as the preview&apos;s
            default values.
          </p>
          <Textarea
            value={testDataText}
            onChange={(e) => setTestDataText(e.target.value)}
            rows={6}
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
      )}
    </div>
  );
}
