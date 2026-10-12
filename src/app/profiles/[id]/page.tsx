import { Suspense } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { ProfileDetailPage, ProfileDetailSkeleton } from "@/features/profiles/pages/ProfileDetailPage";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ id: "view" }];
}

export default function ProfileDetailRoute() {
  return (
    <AppLayout>
      <Suspense fallback={<ProfileDetailSkeleton />}>
        <ProfileDetailPage />
      </Suspense>
    </AppLayout>
  );
}
