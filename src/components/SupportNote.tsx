"use client";

import { useSupport } from "@/features/tenant-ui/use-support";

/** Contact paragraph for the privacy and terms pages. Renders nothing when no support email is configured. */
export function SupportContactNote({ kind }: { kind: "privacy" | "terms" }) {
  const { email, responseTime } = useSupport();
  if (!email) return null;
  if (kind === "privacy") {
    return (
      <p>
        Questions about your information can be sent to {email}.
        {responseTime ? ` We aim to reply within ${responseTime}.` : null}
      </p>
    );
  }
  return (
    <p>
      Write to {email}. For a complaint, use the same contact
      {responseTime ? ` and we will reply within ${responseTime}` : null}.
    </p>
  );
}

/** Legal entity and registration line. Renders nothing when neither is configured. */
export function LegalDetails() {
  const { legalEntity, registration } = useSupport();
  const line = [legalEntity, registration].filter(Boolean).join(" · ");
  if (!line) return null;
  return <p>{line}</p>;
}
