"use client";

import React, { useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import type { FieldOption } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MultiSelectFieldProps {
  id: string;
  options: FieldOption[];
  value: unknown;
  onChange: (value: string[]) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  error?: boolean;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function MultiSelectField({
  id,
  options,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  readOnly,
  error,
}: MultiSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const selected = asStringArray(value);
  const selectedSet = new Set(selected);
  const locked = disabled || readOnly;

  const toggle = (optionValue: string) => {
    if (locked) return;
    if (selectedSet.has(optionValue)) {
      onChange(selected.filter((item) => item !== optionValue));
    } else {
      onChange([...selected, optionValue]);
    }
  };

  const remove = (optionValue: string) => {
    if (locked) return;
    onChange(selected.filter((item) => item !== optionValue));
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!locked) setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <div
          ref={triggerRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : 0}
          onBlur={onBlur}
          onKeyDown={(event) => {
            if (locked) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen((current) => !current);
            }
          }}
          className={cn(
            "flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-sm border bg-background px-3 py-1.5 text-sm shadow-sm transition-all duration-200 ease-out",
            "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
            error ? "border-destructive" : "border-input",
            disabled && "cursor-not-allowed opacity-50",
            readOnly && "cursor-default"
          )}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">
                {placeholder ?? "Select options"}
              </span>
            ) : (
              selected.map((item) => {
                const label = options.find((opt) => opt.value === item)?.label ?? item;
                return (
                  <span
                    key={item}
                    className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                  >
                    <span className="truncate">{label}</span>
                    {!locked && (
                      <button
                        type="button"
                        aria-label={`Remove ${label}`}
                        className="shrink-0 rounded-full text-slate-400 transition-all duration-200 ease-out hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98]"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          remove(item);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                );
              })
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-72 overflow-hidden p-1"
        style={{ width: triggerRef.current?.offsetWidth }}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div role="listbox" aria-multiselectable="true" className="max-h-64 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">No options</p>
          ) : (
            options.map((opt) => {
              const isSelected = selectedSet.has(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition-all duration-200 ease-out hover:bg-slate-50 active:scale-[0.98]",
                    isSelected && "bg-slate-50"
                  )}
                  onClick={() => toggle(opt.value)}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-slate-300 transition-colors",
                      isSelected && "border-primary bg-primary text-primary-foreground"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                  {opt.label}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
