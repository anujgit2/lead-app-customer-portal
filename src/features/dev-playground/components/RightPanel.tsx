"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PreviewPanel } from "./PreviewPanel";
import { InspectorPanel } from "./InspectorPanel";

export function RightPanel() {
  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="preview" className="flex h-full flex-col">
        <div className="border-b border-slate-100 px-4 pt-2.5 dark:border-zinc-800">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="inspector">State Inspector</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="preview" className="mt-0 flex-1 overflow-hidden">
          <PreviewPanel />
        </TabsContent>
        <TabsContent value="inspector" className="mt-0 flex-1 overflow-hidden">
          <InspectorPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
