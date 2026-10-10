import { Suspense } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { ProfileDetailPage } from "@/features/profiles/pages/ProfileDetailPage";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ id: "view" }];
}

function DetailFallback() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6 sm:p-8" aria-busy="true">
      <p className="sr-only">Loading profile</p>
      <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export default function ProfileDetailRoute() {
  return (
    <AppLayout>
      <Suspense fallback={<DetailFallback />}>
        <ProfileDetailPage />
      </Suspense>
    </AppLayout>
  );
}
