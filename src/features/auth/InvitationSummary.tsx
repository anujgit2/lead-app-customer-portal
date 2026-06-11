"use client";

import { Building2, IndianRupee, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { InvitationPreFilledData } from "@/types";

function formatLabel(value?: string): string {
  if (!value) return "—";
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

interface InvitationSummaryProps {
  preFilledData?: InvitationPreFilledData;
}

export function InvitationSummary({ preFilledData }: InvitationSummaryProps) {
  if (!preFilledData || Object.keys(preFilledData).length === 0) return null;

  return (
    <Card className="border border-blue-100 bg-blue-50/50 mb-6">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
          <FileText className="h-4 w-4" />
          Your loan application details
        </div>
        <div className="grid gap-2 text-sm">
          {preFilledData.companyName && (
            <div className="flex items-start gap-2">
              <Building2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">{preFilledData.companyName}</p>
                {preFilledData.companyType && (
                  <p className="text-muted-foreground text-xs">
                    {formatLabel(preFilledData.companyType)}
                  </p>
                )}
              </div>
            </div>
          )}
          {preFilledData.loanAmount != null && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <IndianRupee className="h-4 w-4 shrink-0" />
              <span>
                Loan amount:{" "}
                <span className="font-medium text-foreground">
                  {formatCurrency(preFilledData.loanAmount)}
                </span>
              </span>
            </div>
          )}
          {preFilledData.loanPurpose && (
            <p className="text-muted-foreground text-xs pl-6">
              Purpose: {formatLabel(preFilledData.loanPurpose)}
            </p>
          )}
          {preFilledData.primaryOwnerName && (
            <p className="text-muted-foreground text-xs pl-6">
              Primary owner: {preFilledData.primaryOwnerName}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
