import { RecipientSharePage } from "@/features/documents/shared-recipient/RecipientSharePage";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ token: "link" }];
}

export default function SharedRecipientRoute() {
  return <RecipientSharePage />;
}
