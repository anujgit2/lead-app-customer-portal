"use client";

import { useRouter } from "next/navigation";
import { Building2, UserRound } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { parseApiError } from "@/lib/api-error";
import { useProfilePrograms } from "../api/queries";
import { newProfileHref, profileTypeForProgram } from "../constants";

export function NewProfileMenuItems() {
  const router = useRouter();
  const { data: programs = [], isLoading, isError, error } = useProfilePrograms();

  if (isLoading) {
    return <div className="px-2.5 py-3 text-xs text-muted-foreground">Loading profile types…</div>;
  }
  if (isError) {
    return <div className="px-2.5 py-3 text-xs text-destructive">{parseApiError(error).message}</div>;
  }
  if (programs.length === 0) {
    return (
      <div className="px-2.5 py-3 text-xs text-muted-foreground">
        No profile types are available right now.
      </div>
    );
  }

  return (
    <>
      {programs.map((program) => {
        const Icon = profileTypeForProgram(program) === "BUSINESS" ? Building2 : UserRound;
        return (
          <DropdownMenuItem
            key={program.id}
            onSelect={() => router.push(newProfileHref(program))}
            className="items-start"
          >
            <Icon className="h-5 w-5 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block font-semibold">{program.displayName || program.name}</span>
              {program.description && (
                <span className="block text-[12.5px] font-normal leading-[18px] text-muted-foreground line-clamp-2">
                  {program.description}
                </span>
              )}
            </span>
          </DropdownMenuItem>
        );
      })}
    </>
  );
}
