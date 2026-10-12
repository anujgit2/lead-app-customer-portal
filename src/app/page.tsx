import type { Metadata } from "next";
import { LandingPage } from "@/features/landing/LandingPage";

export const metadata: Metadata = {
  title: "LoanPortal home",
  description:
    "Apply for your loan online. One guided application, a profile that remembers your details, and secure sharing with your lender.",
};

export default function HomePage() {
  return <LandingPage />;
}
