"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { DocumentType } from "../types";
import { categoryFiltersFor, categoryKey, categoryLabel } from "../utils/format";

interface DocumentTypeFieldsProps {
  types: DocumentType[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  category: string;
  typeId: string;
  label: string;
  onCategoryChange: (category: string) => void;
  onTypeChange: (typeId: string) => void;
  onLabelChange: (label: string) => void;
  locked?: boolean;
  lockedTypeName?: string;
  lockedCategory?: string;
  disabled?: boolean;
}

export function DocumentTypeFields({
  types,
  isLoading,
  isError,
  onRetry,
  category,
  typeId,
  label,
  onCategoryChange,
  onTypeChange,
  onLabelChange,
  locked,
  lockedTypeName,
  lockedCategory,
  disabled,
}: DocumentTypeFieldsProps) {
  const categories = categoryFiltersFor(types.map((type) => type.category)).filter(
    (item) => item.id !== "ALL"
  );
  const visibleTypes = types.filter((type) => !category || categoryKey(type.category) === category);
  const selected = types.find((type) => type.id === typeId);

  if (locked) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-muted/50 p-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Category</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {categoryLabel(categoryKey(lockedCategory ?? ""), lockedCategory)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Type</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{lockedTypeName || "Document"}</p>
        </div>
        {label ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Label</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{label}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {isLoading ? <p className="text-sm text-muted-foreground">Loading document types…</p> : null}
      {isError ? (
        <div className="space-y-3">
          <p className="text-sm text-destructive" role="alert">
            We couldn&apos;t load document types.
          </p>
          {onRetry ? (
            <Button type="button" variant="outline" onClick={onRetry} size="sm">
              Try again
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="document-category">Category</Label>
        <Select
          value={category || undefined}
          onValueChange={onCategoryChange}
          disabled={disabled || isLoading || categories.length === 0}
        >
          <SelectTrigger id="document-category" className="h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
            <SelectValue placeholder="Choose a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="document-type">Type</Label>
        <Select
          value={typeId || undefined}
          onValueChange={onTypeChange}
          disabled={disabled || !category || visibleTypes.length === 0}
        >
          <SelectTrigger id="document-type" className="h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
            <SelectValue placeholder={category ? "Choose a type" : "Choose a category first"} />
          </SelectTrigger>
          <SelectContent>
            {visibleTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {category && visibleTypes.length === 0 && !isLoading ? (
          <p className="text-sm text-muted-foreground">No document types in this category.</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="document-label">
          Label{selected?.requiresLabel ? <span className="text-destructive"> *</span> : null}
        </Label>
        <Input
          id="document-label"
          value={label}
          disabled={disabled || !typeId}
          placeholder={selected?.labelHint || "e.g. FY 2025-26"}
          onChange={(event) => onLabelChange(event.target.value)}
          className="h-11 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <p className="text-sm font-normal text-muted-foreground">
          {selected?.requiresLabel ? "Required for this document type." : "Optional. Add one when it helps you find the file."}
        </p>
      </div>
    </div>
  );
}
