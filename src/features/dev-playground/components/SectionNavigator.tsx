"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LayoutGrid } from "lucide-react";
import { usePlayground, findSelectedTemplate } from "../playground-context";

export function SectionNavigator() {
  const {
    normalized,
    selectedTemplateCode,
    selectedSectionCode,
    renderEntireForm,
    selectTemplate,
    selectSection,
    setRenderEntireForm,
  } = usePlayground();

  const { templates } = normalized;
  if (templates.length === 0) return null;

  const currentTemplate = findSelectedTemplate(templates, selectedTemplateCode) ?? templates[0];

  return (
    <div className="space-y-2.5 rounded-lg border border-slate-100 p-3.5 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-slate-500">Section navigation</Label>
        <Button
          type="button"
          variant={renderEntireForm ? "secondary" : "outline"}
          size="sm"
          onClick={() => setRenderEntireForm(!renderEntireForm)}
          className="h-7 gap-1.5 px-2 text-[11px]"
        >
          <LayoutGrid className="h-3 w-3" />
          {renderEntireForm ? "Rendering entire form" : "Render Entire Form"}
        </Button>
      </div>

      {templates.length > 1 && (
        <Select value={currentTemplate.code} onValueChange={selectTemplate}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select a template/step" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.code} value={t.code}>
                {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {!renderEntireForm && (
        <Select value={selectedSectionCode ?? "__all__"} onValueChange={(v) => selectSection(v === "__all__" ? null : v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select a section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All sections in this step</SelectItem>
            {currentTemplate.sections.map((s) => (
              <SelectItem key={s.code} value={s.code}>
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
