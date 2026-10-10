import { Suspense } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { ProfileCreatePage } from "@/features/profiles/pages/ProfileCreatePage";

function CreateFallback() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6 sm:p-8" aria-busy="true">
      <p className="sr-only">Loading form</p>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export default function NewProfileRoute() {
  return (
    <AppLayout>
      <Suspense fallback={<CreateFallback />}>
        <ProfileCreatePage />
      </Suspense>
    </AppLayout>
  );
}
