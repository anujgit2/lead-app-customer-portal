import type { RegistrationPolicy } from "@/types";

export type RegisterEntry =
  /** Old application invitation link (`?token=&tenant=`). Handled by the existing invitation flow. */
  | { kind: "application-invitation" }
  | { kind: "broken-application-invitation" }
  /** User-to-user invitation link (`?userInvitation=`). */
  | { kind: "user-invitation"; token: string }
  /** Partner lead invitation kept from the invite link. Opens the form with the invited email fixed. */
  | { kind: "lead-invitation"; token: string; email: string }
  /** A share link. The email is typed by the customer. */
  | { kind: "template-link"; token: string }
  | { kind: "self-serve" }
  | { kind: "invitation-required" }
  | { kind: "closed" };

interface RegisterEntryInput {
  token: string | null;
  tenant: string | null;
  userInvitation: string | null;
  /** Null while the registration config is loading or unavailable. */
  policy: RegistrationPolicy | null;
  /** A pending lead invite from the invite link, with the email it was sent to. */
  leadInvitation?: { token: string; email: string } | null;
  /** A pending lead template share link. Any customer may register through it. */
  templateLink?: string | null;
}

/**
 * Decides what the register page shows. The server enforces the policy either way;
 * this only keeps the UI in step with it.
 */
export function resolveRegisterEntry(input: RegisterEntryInput): RegisterEntry {
  const { token, tenant, userInvitation, policy, leadInvitation, templateLink } = input;

  if (token || tenant) {
    return token && tenant ? { kind: "application-invitation" } : { kind: "broken-application-invitation" };
  }

  if (userInvitation) {
    return { kind: "user-invitation", token: userInvitation };
  }

  if (policy === "CLOSED") return { kind: "closed" };
  if (leadInvitation) {
    return { kind: "lead-invitation", token: leadInvitation.token, email: leadInvitation.email };
  }
  if (templateLink) {
    return { kind: "template-link", token: templateLink };
  }
  if (policy === "INVITE_ONLY") return { kind: "invitation-required" };
  return { kind: "self-serve" };
}
