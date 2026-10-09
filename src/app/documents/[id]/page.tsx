import { AppLayout } from "@/layouts/AppLayout";
import { DocumentDetailPage } from "@/features/documents/pages/DocumentDetailPage";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ id: "view" }];
}

export default function DocumentDetailRoute() {
  return (
    <AppLayout>
      <DocumentDetailPage />
    </AppLayout>
  );
}
