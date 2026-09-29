"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bug, FlaskConical } from "lucide-react";
import { usePlayground } from "../playground-context";

export function PlaygroundToolbar() {
  const { debug, setDebug } = usePlayground();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur-sm sm:px-6 dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
          <FlaskConical className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-slate-900">Dynamic Form Playground</h1>
          <p className="text-[11px] text-slate-400">Same renderer as production — dev tool only</p>
        </div>
        <Badge variant="warning" className="ml-1">
          Dev only
        </Badge>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Bug className="h-3.5 w-3.5 text-violet-500" />
          <Label htmlFor="pg-debug-toggle" className="cursor-pointer text-xs font-medium text-slate-600">
            Debug mode
          </Label>
          <Switch id="pg-debug-toggle" checked={debug} onCheckedChange={setDebug} />
        </div>
        <Link href="/dashboard" className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-600">
          Exit
        </Link>
      </div>
    </header>
  );
}
