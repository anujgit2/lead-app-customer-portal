"use client";

import React from "react";
import type { FormTemplate, FormData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Edit2, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ReviewScreenProps {
  templates: FormTemplate[];
  formData: FormData;
  onEditStep: (stepIndex: number) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

function ReviewValue({ value, type }: { value: unknown; type?: string }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground italic text-xs">Not provided</span>;
  }
  if (typeof value === "boolean") {
    return <span>{value ? "Yes" : "No"}</span>;
  }
  if (type === "currency" && typeof value === "string") {
    const num = parseFloat(value);
    if (!isNaN(num)) return <span>{formatCurrency(num)}</span>;
  }
  if (type === "datetime" && typeof value === "string" && value) {
    let formatted = String(value);
    try { formatted = formatDate(value); } catch { /* keep raw value */ }
    return <span>{formatted}</span>;
  }
  if (Array.isArray(value)) {
    return <span className="text-muted-foreground italic text-xs">{value.length} file(s)</span>;
  }
  return <span>{String(value)}</span>;
}

function ReviewSection({
  sectionData,
  template,
  sectionCode,
}: {
  sectionData: unknown;
  template: FormTemplate;
  sectionCode: string;
}) {
  const section = template.sections.find((s) => s.code === sectionCode);
  if (!section) return null;

  const renderFields = (data: Record<string, unknown>, prefix?: string) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
      {section.fields.map((field) => {
        const value = data[field.name];
        if (value === undefined) return null;
        return (
          <div key={field.name}>
            <p className="text-xs text-muted-foreground mb-0.5">{field.label}</p>
            <p className="text-sm font-medium">
              <ReviewValue value={value} type={field.type} />
            </p>
          </div>
        );
      })}
    </div>
  );

  if (Array.isArray(sectionData)) {
    return (
      <div className="space-y-4">
        {sectionData.map((item, i) => (
          <div key={i} className="p-4 rounded-lg bg-muted/30 border">
            <p className="text-xs font-semibold text-muted-foreground mb-3">
              {section.title} #{i + 1}
            </p>
            {renderFields(item as Record<string, unknown>)}
          </div>
        ))}
      </div>
    );
  }

  if (sectionData && typeof sectionData === "object") {
    return renderFields(sectionData as Record<string, unknown>);
  }

  return null;
}

export function ReviewScreen({
  templates,
  formData,
  onEditStep,
  onSubmit,
  isSubmitting,
}: ReviewScreenProps) {
  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Review Your Application</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Please review all the information before submitting
        </p>
      </div>

      {templates.map((template, stepIndex) => {
        const templateData = formData[template.code] as Record<string, unknown> | undefined;

        return (
          <Card key={template.code}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Step {stepIndex + 1}
                  </Badge>
                  <CardTitle className="text-base">{template.title}</CardTitle>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditStep(stepIndex)}
                  className="gap-1.5 text-primary hover:text-primary"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {template.repeatable && Array.isArray(templateData) ? (
                <div className="space-y-4">
                  {templateData.map((instance, i) => (
                    <div key={i} className="p-4 rounded-lg bg-muted/30 border">
                      <p className="text-xs font-semibold text-muted-foreground mb-3">
                        {template.title} #{i + 1}
                      </p>
                      {template.sections.map((section) => {
                        const sData = (instance as Record<string, unknown>)?.[section.code];
                        return (
                          <div key={section.code}>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 mt-4 first:mt-0">
                              {section.title}
                            </p>
                            <ReviewSection
                              sectionData={sData}
                              template={template}
                              sectionCode={section.code}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-5">
                  {template.sections.map((section, sIdx) => (
                    <div key={section.code}>
                      {sIdx > 0 && <Separator className="mb-5" />}
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        {section.title}
                      </p>
                      <ReviewSection
                        sectionData={templateData?.[section.code]}
                        template={template}
                        sectionCode={section.code}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Ready to Submit?</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                By submitting, you confirm all information is accurate.
              </p>
            </div>
            <Button
              type="button"
              size="lg"
              onClick={onSubmit}
              loading={isSubmitting}
              className="min-w-[160px]"
            >
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
