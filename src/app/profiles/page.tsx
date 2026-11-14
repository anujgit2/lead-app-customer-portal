import { AppLayout } from "@/layouts/AppLayout";
import { ProfilesPage } from "@/features/profiles/pages/ProfilesPage";

export default function ProfilesRoute() {
  return (
    <AppLayout>
      <ProfilesPage />
    </AppLayout>
  );
}
