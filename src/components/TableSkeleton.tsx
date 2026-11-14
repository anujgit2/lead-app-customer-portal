import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface TableSkeletonRowsProps {
  label: string;
  columns: number;
  rows?: number;
}

/** Pulse rows for a `<TableBody>` while its data loads. */
export function TableSkeletonRows({ label, columns, rows = 5 }: TableSkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <TableRow key={index} className="hover:bg-transparent">
          <TableCell colSpan={columns} className="h-12">
            {index === 0 ? <p className="sr-only">{label}</p> : null}
            <div className="h-8 animate-pulse rounded-md bg-muted" aria-hidden />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

/** Pulse blocks for non-table loading states. */
export function BlockSkeleton({
  label,
  rows = 5,
  className = "h-12",
}: {
  label: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className="space-y-3 p-4" aria-busy="true">
      <p className="sr-only">{label}</p>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={cn("animate-pulse rounded-md bg-muted", className)} />
      ))}
    </div>
  );
}
