"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Plus, PlusCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { programService, type Program } from "@/services/program.service";
import { cn } from "@/lib/utils";

interface ApplyLoanMenuProps {
  onNavigate?: () => void;
  className?: string;
  label?: string;
  /** Collapse to an icon on narrow screens. The top bar uses this; page headers keep the label. */
  compact?: boolean;
  /** `inverse` sits on the peacock hero. `row` is a full-width shortcut. */
  appearance?: "solid" | "inverse" | "row";
}

export function ApplyLoanMenu({
  onNavigate,
  className,
  label = "Apply for a loan",
  compact = true,
  appearance = "solid",
}: ApplyLoanMenuProps) {
  const router = useRouter();
  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["tenant-programs"],
    queryFn: () => programService.getTenantPrograms(),
    retry: 1,
  });

  const available = programs.filter((program) => program.id);

  const beginApplication = (program: Program) => {
    const params = new URLSearchParams({ programId: program.id });
    if (program.programCode) params.set("programCode", program.programCode);
    onNavigate?.();
    router.push(`/loan-application/new?${params.toString()}`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            appearance === "row"
              ? "group flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              : "inline-flex h-8 items-center justify-center gap-2 rounded-md px-3 text-[13px] font-medium outline-none transition-[background] duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
            appearance === "solid" &&
              "bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring",
            appearance === "inverse" &&
              "border border-transparent bg-primary-foreground text-primary hover:bg-primary-foreground/90 focus-visible:outline-primary-foreground",
            appearance === "solid" && compact && "max-[900px]:w-8 max-[900px]:px-0",
            className
          )}
          aria-label={label}
        >
          {appearance === "row" ? (
            <>
              <span className="tone-brand grid h-[34px] w-[34px] shrink-0 place-items-center rounded-md">
                <Plus className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold leading-[18px]">{label}</span>
                <span className="block text-[12.5px] leading-[17px] text-muted-foreground">
                  Start a new application
                </span>
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-muted-foreground transition-colors duration-150 group-hover:text-primary"
                aria-hidden
              />
            </>
          ) : (
            <>
              {appearance === "inverse" ? (
                <Plus className="h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <PlusCircle className="h-4 w-4 shrink-0" aria-hidden />
              )}
              <span className={cn(appearance === "solid" && compact && "max-[900px]:hidden")}>{label}</span>
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={appearance === "row" ? "start" : "end"} className="w-[300px]">
          <DropdownMenuLabel>Select a loan program</DropdownMenuLabel>
          {isLoading ? (
            <div className="px-2.5 py-3 text-xs text-muted-foreground">Loading programs…</div>
          ) : available.length === 0 ? (
            <div className="px-2.5 py-3 text-xs text-muted-foreground">
              No loan programs are available right now.
            </div>
          ) : (
            available.map((program) => (
              <DropdownMenuItem
                key={program.id}
                onSelect={() => beginApplication(program)}
                className="items-start"
              >
                <span className="min-w-0">
                  <span className="block font-semibold">{program.displayName || program.name}</span>
                  {program.description && (
                    <span className="mt-0.5 block text-[13px] font-normal leading-[18px] text-muted-foreground line-clamp-2">
                      {program.description}
                    </span>
                  )}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
