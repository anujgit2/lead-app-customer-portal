import { formatBuildLabel } from "@/lib/build-info";

/**
 * Build label shown at the bottom of every page.
 * Text colour matches the page background, so the label is hidden until the
 * user selects text on the page. It stays in the DOM and selectable.
 * Takes no props, hooks or context, so it also renders in global-error.tsx.
 */
export function BuildFooter() {
  // Literal read required: Next inlines NEXT_PUBLIC_* only for direct property access.
  const label = formatBuildLabel(process.env.NEXT_PUBLIC_BUILD_SHA);
  return (
    <footer data-testid="build-footer" className="px-4 py-2 text-center text-xs text-background">
      {label}
    </footer>
  );
}
