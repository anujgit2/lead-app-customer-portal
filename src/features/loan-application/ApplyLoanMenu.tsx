"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, PlusCircle } from "lucide-react";
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
}

export function ApplyLoanMenu({ onNavigate, className }: ApplyLoanMenuProps) {
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
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground outline-none transition-all duration-200 ease-out",
          "hover:text-foreground hover:bg-muted hover:-translate-y-0.5 active:scale-[0.98]",
          "focus:ring-2 focus:ring-blue-500/20 focus:outline-none data-[state=open]:bg-muted data-[state=open]:text-foreground",
          className
        )}
      >
        <PlusCircle className="h-4 w-4" />
        Apply for a Loan
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Select a loan program</DropdownMenuLabel>
        {isLoading ? (
          <div className="px-2.5 py-3 text-xs text-slate-500">Loading programs…</div>
        ) : available.length === 0 ? (
          <div className="px-2.5 py-3 text-xs text-slate-500">
            No loan programs are available right now.
          </div>
        ) : (
          available.map((program) => (
            <DropdownMenuItem
              key={program.id}
              onSelect={() => handleApply(program)}
            >
              <span className="font-semibold tracking-tight text-slate-900">
                {program.displayName || program.name}
              </span>
              {program.description && (
                <span className="text-xs font-normal text-slate-500 line-clamp-2">
                  {program.description}
                </span>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
