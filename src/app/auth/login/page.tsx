import { PortalChooser } from "@/features/auth/PortalChooser";

export const metadata = { title: "Sign in to LoanPortal" };

export default function LoginPage() {
  return <PortalChooser mode="signin" />;
}
