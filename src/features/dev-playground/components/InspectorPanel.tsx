"use client";

import React, { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePlayground } from "../playground-context";
import { computeFieldStates } from "../field-state";

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-[420px] overflow-auto rounded-lg border border-slate-100 bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-700 dark:border-zinc-800 dark:bg-zinc-900">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function InspectorPanel() {
  const { liveData, liveErrors, normalized } = usePlayground();

  const fieldStates = useMemo(() => computeFieldStates(normalized.templates, liveData), [normalized.templates, liveData]);

  const visibleFields = fieldStates.filter((f) => f.visible).map((f) => f.path);
  const requiredFields = fieldStates.filter((f) => f.visible && f.required).map((f) => f.path);

  const hasErrors = Object.values(liveErrors).some(
    (e) => (Array.isArray(e) ? e.some((x) => Object.keys(x ?? {}).length > 0) : Object.keys(e ?? {}).length > 0)
  );

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <Tabs defaultValue="data">
        <TabsList>
          <TabsTrigger value="data">Form Data</TabsTrigger>
          <TabsTrigger value="errors" className="gap-1.5">
            Validation Errors
            {hasErrors && <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">!</Badge>}
          </TabsTrigger>
          <TabsTrigger value="visible">Visible Fields</TabsTrigger>
          <TabsTrigger value="required">Required Fields</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="mt-3">
          <JsonBlock value={liveData} />
        </TabsContent>
        <TabsContent value="errors" className="mt-3">
          <JsonBlock value={liveErrors} />
        </TabsContent>
        <TabsContent value="visible" className="mt-3">
          <JsonBlock value={visibleFields} />
        </TabsContent>
        <TabsContent value="required" className="mt-3">
          <JsonBlock value={requiredFields} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
