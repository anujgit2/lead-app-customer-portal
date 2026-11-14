"use client";

import React from "react";
import { ResizableSplit } from "@/components/ui/resizable";
import { PlaygroundProvider } from "../playground-context";
import { PlaygroundToolbar } from "./PlaygroundToolbar";
import { SchemaPanel } from "./SchemaPanel";
import { RightPanel } from "./RightPanel";

function useIsDesktop() {
  // Default to desktop so SSR and the first client render match; we then
  // subscribe to the real viewport after mount. This also ensures only one
  // SchemaPanel/RightPanel tree is mounted (the previous CSS-hidden duplicate
  // stole the editor ref and collapsed the Monaco pane to 0 height).
  const [isDesktop, setIsDesktop] = React.useState(true);

  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return isDesktop;
}

function PlaygroundShell() {
  const isDesktop = useIsDesktop();

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-zinc-950">
      <PlaygroundToolbar />

      {isDesktop ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <ResizableSplit left={<SchemaPanel />} right={<RightPanel />} />
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <div className="h-[60vh] border-b border-slate-100 dark:border-zinc-800">
            <SchemaPanel />
          </div>
          <div className="h-[70vh]">
            <RightPanel />
          </div>
        </div>
      )}
    </div>
  );
}

export function FormPlaygroundPage() {
  return (
    <PlaygroundProvider>
      <PlaygroundShell />
    </PlaygroundProvider>
  );
}
