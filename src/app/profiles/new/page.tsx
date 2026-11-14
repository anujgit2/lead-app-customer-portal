import { Suspense } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { ProfileCreateFallback, ProfileCreatePage } from "@/features/profiles/pages/ProfileCreatePage";

export default function NewProfileRoute() {
  return (
    <AppLayout>
      <Suspense fallback={<ProfileCreateFallback />}>
        <ProfileCreatePage />
      </Suspense>
    </AppLayout>
  );
}
