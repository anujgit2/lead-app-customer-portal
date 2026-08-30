import type { Metadata } from "next";
import { LandingPage } from "@/features/landing/LandingPage";

export const metadata: Metadata = {
  title: "LoanPortal – MSME Business Loans & Government Grants in India",
  description:
    "Compare MUDRA, CGTMSE, Stand-Up India, and PMEGP loans alongside startup grants and subsidies. Build your business profile once and apply to the schemes you qualify for.",
};

export default function HomePage() {
  return <LandingPage />;
}
