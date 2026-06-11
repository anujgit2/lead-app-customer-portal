"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FormWizard } from "@/features/loan-application/FormWizard";
import { applicationService } from "@/services/application.service";
import { Building2 } from "lucide-react";

export default function NewLoanApplicationPage() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["loan-products"],
    queryFn: () => applicationService.getLoanProducts(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm">Loading application form...</p>
        </div>
      </div>
    );
  }

  const product = products?.[0];

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No loan products available</p>
      </div>
    );
  }

  return <FormWizard product={product} />;
}
