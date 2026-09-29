"use client";

import * as React from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResizableSplitProps {
  left: React.ReactNode;
  right: React.ReactNode;
  /** Initial width of the left panel, as a percentage of the container (0-100). */
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  className?: string;
}

/**
 * A minimal, dependency-free draggable two-panel split. Deliberately hand-rolled
 * (rather than a third-party resizable-panels package) since this app statically
 * exports every page (`next.config.ts` → `output: "export"`) — the whole tree must
 * render safely during Node.js SSR at build time, and it's simplest to guarantee
 * that for a plain flex/div + pointer-events implementation than for an external
 * library. Drag state only ever changes in response to a browser pointer event,
 * so there's nothing here that can run (or fail) during server rendering.
 */
export function ResizableSplit({
  left,
  right,
  defaultLeftWidth = 38,
  minLeftWidth = 24,
  maxLeftWidth = 60,
  className,
}: ResizableSplitProps) {
  const [leftWidth, setLeftWidth] = React.useState(defaultLeftWidth);
  const [dragging, setDragging] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.min(maxLeftWidth, Math.max(minLeftWidth, pct)));
    };
    const handleUp = () => setDragging(false);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragging, minLeftWidth, maxLeftWidth]);

  return (
    <div ref={containerRef} className={cn("flex h-full min-h-0 w-full", className)}>
      <div style={{ width: `${leftWidth}%` }} className="h-full min-h-0 min-w-0 overflow-hidden">
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panels"
        tabIndex={0}
        onPointerDown={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setLeftWidth((w) => Math.max(minLeftWidth, w - 2));
          if (e.key === "ArrowRight") setLeftWidth((w) => Math.min(maxLeftWidth, w + 2));
        }}
        className={cn(
          "group relative flex w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-slate-100 transition-colors duration-200 ease-out hover:bg-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:bg-zinc-800",
          dragging && "bg-blue-500/30"
        )}
      >
        <div className="z-10 flex h-8 w-3.5 items-center justify-center rounded-sm border border-slate-100 bg-white shadow-sm transition-colors duration-200 ease-out group-hover:border-blue-200 dark:border-zinc-800 dark:bg-zinc-900">
          <GripVertical className="h-3 w-3 text-slate-400" />
        </div>
      </div>
      <div style={{ width: `${100 - leftWidth}%` }} className="h-full min-h-0 min-w-0 overflow-hidden">
        {right}
      </div>
    </div>
  );
}
