"use client";

import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { TenantUiProvider } from "@/features/tenant-ui/TenantUiProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantUiProvider>
        <TooltipProvider delayDuration={250}>
          {children}
          <Toaster
            position="top-right"
            expand={false}
            offset={16}
            toastOptions={{
              duration: 5000,
            }}
          />
        </TooltipProvider>
      </TenantUiProvider>
    </QueryClientProvider>
  );
}
