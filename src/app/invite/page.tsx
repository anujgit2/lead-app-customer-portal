"use client";

import { AppLayout } from "@/layouts/AppLayout";
import { UserInvitationsPage } from "@/features/user-invitations/UserInvitationsPage";

export default function InvitePage() {
  return (
    <AppLayout>
      <UserInvitationsPage />
    </AppLayout>
  );
}
