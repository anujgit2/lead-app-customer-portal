"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface OverflowTabItem {
  value: string;
  label: string;
  count?: number;
}

interface OverflowTabListProps {
  tabs: OverflowTabItem[];
  activeValue: string;
  ariaLabel: string;
}

function TabCount({ value }: { value: number }) {
  return (
    <Badge variant="outline" dot={false} className="ml-1.5 h-5 shrink-0 px-[7px] text-xs">
      {value}
    </Badge>
  );
}

const arrowClass =
  "inline-flex h-[42px] w-8 shrink-0 items-center justify-center text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45";

export function OverflowTabList({ tabs, activeValue, ariaLabel }: OverflowTabListProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const signature = tabs.map((tab) => `${tab.value}:${tab.label}:${tab.count ?? ""}`).join("|");

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(max - el.scrollLeft > 1);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    el.addEventListener("scroll", updateEdges, { passive: true });

    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 1) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (delta === 0) return;
      const atStart = el.scrollLeft <= 0 && delta < 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && delta > 0;
      if (atStart || atEnd) return;
      event.preventDefault();
      el.scrollLeft += delta;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", updateEdges);
      el.removeEventListener("wheel", onWheel);
    };
  }, [signature, updateEdges]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[data-state="active"]');
    if (!active) return;
    const elRect = el.getBoundingClientRect();
    const tabRect = active.getBoundingClientRect();
    if (tabRect.left < elRect.left) {
      el.scrollBy({ left: tabRect.left - elRect.left - 8, behavior: "smooth" });
    } else if (tabRect.right > elRect.right) {
      el.scrollBy({ left: tabRect.right - elRect.right + 8, behavior: "smooth" });
    }
  }, [activeValue, signature]);

  const scrollByDirection = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(160, Math.round(el.clientWidth * 0.7)), behavior: "smooth" });
  };

  const overflows = canLeft || canRight;

  return (
    <div className="flex w-full min-w-0 items-end border-b border-border">
      {overflows ? (
        <button
          type="button"
          aria-label="Scroll tabs left"
          disabled={!canLeft}
          onClick={() => scrollByDirection(-1)}
          className={arrowClass}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      ) : null}
      <TabsList
        ref={scrollerRef}
        aria-label={ariaLabel}
        className="no-scrollbar w-auto min-w-0 flex-1 overflow-x-auto border-b-0"
      >
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="shrink-0 after:bottom-0">
            {tab.label}
            {typeof tab.count === "number" ? <TabCount value={tab.count} /> : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {overflows ? (
        <button
          type="button"
          aria-label="Scroll tabs right"
          disabled={!canRight}
          onClick={() => scrollByDirection(1)}
          className={arrowClass}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
