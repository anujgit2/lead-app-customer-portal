"use client";

import { AppLayout } from "@/layouts/AppLayout";
import { ProfilePage } from "@/features/profile/ProfilePage";

export default function Profile() {
  return (
    <AppLayout>
      <ProfilePage />
    </AppLayout>
  );
}
