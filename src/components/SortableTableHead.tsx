import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

interface SortableTableHeadProps<K extends string> {
  label: string;
  column: K;
  sort: K;
  dir: SortDirection;
  onSort: (column: K) => void;
  align?: "right";
  className?: string;
}

export function SortableTableHead<K extends string>({
  label,
  column,
  sort,
  dir,
  onSort,
  align,
  className,
}: SortableTableHeadProps<K>) {
  const active = sort === column;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn(active && "text-foreground", align === "right" && "text-right", className)}
    >
      <button
        type="button"
        className={cn(
          "inline-flex h-full cursor-pointer items-center gap-1 rounded-sm font-semibold text-inherit transition-colors duration-150 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          align === "right" && "ml-auto"
        )}
        onClick={() => onSort(column)}
      >
        {label}
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </button>
    </TableHead>
  );
}
