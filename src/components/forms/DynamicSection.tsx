"use client";

import React, { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import type { FormSection } from "@/types";
import { DynamicField } from "./DynamicField";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildSectionDefaults } from "@/utils/schema-builder";

interface DynamicSectionProps {
  section: FormSection;
  namePrefix?: string;
}

function FieldGrid({ section, namePrefix }: { section: FormSection; namePrefix?: string }) {
  const cols = section.columns ?? 2;
  const gridClass =
    cols === 1 ? "grid-cols-1" :
    cols === 2 ? "grid-cols-1 sm:grid-cols-2" :
    cols === 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" :
    "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={cn("grid items-start gap-x-6 gap-y-5", gridClass)}>
      {section.fields.map((field) => (
        <div
          key={field.name}
          className={cn(
            field.span === 2 && "sm:col-span-2",
            field.span === 3 && "sm:col-span-2 lg:col-span-3",
            (field.span === 4 || field.type === "json" || field.type === "textarea" || field.type === "address" || field.type === "file" || field.type === "document") && "col-span-full"
          )}
        >
          <DynamicField field={field} namePrefix={namePrefix} />
        </div>
      ))}
    </div>
  );
}

function RepeatableSectionInstances({
  section,
  namePrefix,
}: DynamicSectionProps) {
  const baseName = namePrefix ? `${namePrefix}.${section.code}` : section.code;
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: baseName });
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const toggleCollapse = (index: number) => {
    setCollapsed((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="space-y-3">
      {fields.map((item, index) => (
        <div
          key={item.id}
          className="rounded-lg border bg-muted/20 overflow-hidden"
        >
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => toggleCollapse(index)}
          >
            <span className="text-sm font-medium text-foreground">
              {section.title} #{index + 1}
            </span>
            <div className="flex items-center gap-2">
              {fields.length > (section.minInstances ?? 0) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(index);
                  }}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              {collapsed[index] ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
          {!collapsed[index] && (
            <div className="px-4 pb-4">
              <Separator className="mb-4" />
              <FieldGrid
                section={section}
                namePrefix={`${baseName}.${index}`}
              />
            </div>
          )}
        </div>
      ))}

      {(!section.maxInstances || fields.length < section.maxInstances) && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(buildSectionDefaults(section))}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Add {section.title}
        </Button>
      )}
    </div>
  );
}

export function DynamicSection({ section, namePrefix }: DynamicSectionProps) {
  const sectionPrefix = namePrefix
    ? `${namePrefix}.${section.code}`
    : section.code;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{section.title}</CardTitle>
        {section.description && (
          <CardDescription>{section.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {section.repeatable ? (
          <RepeatableSectionInstances section={section} namePrefix={namePrefix} />
        ) : (
          <FieldGrid section={section} namePrefix={sectionPrefix} />
        )}
      </CardContent>
    </Card>
  );
}
