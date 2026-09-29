"use client";

import React from "react";
import { ResizableSplit } from "@/components/ui/resizable";
import { PlaygroundProvider } from "../playground-context";
import { PlaygroundToolbar } from "./PlaygroundToolbar";
import { SchemaPanel } from "./SchemaPanel";
import { RightPanel } from "./RightPanel";

export function FormPlaygroundPage() {
  return (
    <PlaygroundProvider>
      <div className="flex h-screen flex-col bg-white dark:bg-zinc-950">
        <PlaygroundToolbar />

        {/* Desktop / tablet: draggable split panels */}
        <div className="hidden flex-1 overflow-hidden md:flex">
          <ResizableSplit left={<SchemaPanel />} right={<RightPanel />} />
        </div>

        {/* Mobile: stacked, non-resizable */}
        <div className="flex-1 space-y-4 overflow-y-auto md:hidden">
          <div className="border-b border-slate-100 dark:border-zinc-800">
            <SchemaPanel />
          </div>
          <div className="h-[70vh]">
            <RightPanel />
          </div>
        </div>
      </div>
    </PlaygroundProvider>
  );
}
