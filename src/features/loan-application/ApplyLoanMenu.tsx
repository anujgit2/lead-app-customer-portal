"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { programService } from "@/services/program.service";
import { cn } from "@/lib/utils";

interface ApplyLoanMenuProps {
  onNavigate?: () => void;
  className?: string;
  label?: string;
  /** Collapse to an icon on narrow screens. The top bar uses this; page headers keep the label. */
  compact?: boolean;
}

export function ApplyLoanMenu({
  onNavigate,
  className,
  label = "Apply for a loan",
  compact = true,
}: ApplyLoanMenuProps) {
  const router = useRouter();
  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["tenant-programs"],
    queryFn: () => programService.getTenantPrograms(),
    retry: 1,
  });

  const available = programs.filter((program) => program.id);

  const handleApply = (program: { id: string; programCode: string }) => {
    if (!program.id) return;
    const params = new URLSearchParams({ programId: program.id });
    if (program.programCode) params.set("programCode", program.programCode);
    onNavigate?.();
    router.push(`/loan-application/new?${params.toString()}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-8 items-center justify-center gap-2 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground outline-none transition-[background] duration-150 hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          compact && "max-[900px]:w-8 max-[900px]:px-0",
          className
        )}
        aria-label={label}
      >
        <PlusCircle className="h-4 w-4 shrink-0" />
        <span className={cn(compact && "max-[900px]:hidden")}>{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[300px]">
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
              onSelect={() => handleApply(program)}
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
  );
}
