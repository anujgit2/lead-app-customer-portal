import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

export type NoticeTone = "info" | "ok" | "warn" | "bad";

const ICON = { info: Info, ok: CheckCircle2, warn: AlertTriangle, bad: XCircle };

/**
 * Inline message box (not a toast): session expired, signed out, a warning above a form.
 * "warn" and "bad" are announced to screen readers immediately; the others politely.
 */
export function Notice({
  tone = "info",
  title,
  children,
  testId,
}: {
  tone?: NoticeTone;
  title?: string;
  children?: ReactNode;
  testId?: string;
}) {
  const Icon = ICON[tone];
  const urgent = tone === "warn" || tone === "bad";
  return (
    <div className={`ap-notice ${tone}`} role={urgent ? "alert" : "status"} data-testid={testId}>
      <Icon aria-hidden="true" />
      <div>
        {title ? <b>{title}</b> : null}
        {children ? <span>{children}</span> : null}
      </div>
    </div>
  );
}
