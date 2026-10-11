"use client";

import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  categories: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}

export function CategoryFilter({ categories, value, onChange }: CategoryFilterProps) {
  return (
    <div className="flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-md bg-muted p-1" role="toolbar" aria-label="Filter by category">
      {categories.map((category) => {
        const active = category.id === value;
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(category.id)}
            className={cn(
              "h-8 shrink-0 rounded-md px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
            )}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}
