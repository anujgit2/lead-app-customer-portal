"use client";

import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  categories: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}

export function CategoryFilter({ categories, value, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="toolbar" aria-label="Filter by category">
      {categories.map((category) => {
        const active = category.id === value;
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(category.id)}
            className={cn(
              "min-h-11 shrink-0 rounded-full px-4 text-sm font-medium transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/20",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-slate-100 bg-white text-slate-600 shadow-sm hover:text-slate-900"
            )}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}
