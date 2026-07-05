import { invitationService } from "@/services/invitation.service";
import { setTenantId } from "@/lib/tenant";

export async function acceptStoredInvitation(): Promise<{
  applicationId: string;
  applicationNumber: string;
} | null> {
  const stored = invitationService.getStoredInvitation();
  if (!stored) return null;

  setTenantId(stored.tenant);
  const result = await invitationService.acceptInvitation(
    stored.token,
    stored.tenant
  );
  return result;
}
