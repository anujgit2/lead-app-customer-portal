import { SharedViewerPage } from "@/features/documents/pages/SharedViewerPage";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ token: "link" }];
}

export default function SharedDocumentRoute() {
  return <SharedViewerPage />;
}
