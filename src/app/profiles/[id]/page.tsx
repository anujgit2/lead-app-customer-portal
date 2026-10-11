import { Suspense } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { ProfileDetailPage } from "@/features/profiles/pages/ProfileDetailPage";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ id: "view" }];
}

function DetailFallback() {
  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-6 px-4 pb-20 pt-6 sm:px-8" aria-busy="true">
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
