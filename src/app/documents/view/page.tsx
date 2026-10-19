import { AppLayout } from "@/layouts/AppLayout";
import { DocumentDetailPage } from "@/features/documents/pages/DocumentDetailPage";

export default function DocumentDetailRoute() {
  return (
    <AppLayout>
      <DocumentDetailPage />
    </AppLayout>
  );
}
