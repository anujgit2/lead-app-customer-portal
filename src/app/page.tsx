import type { Metadata } from "next";
import { LandingRoute } from "@/features/landing/registry";

export const metadata: Metadata = {
  title: "LoanPortal home",
  description:
    "Apply for your loan online. One guided application, a profile that remembers your details, and secure sharing with your lender.",
};

export default function HomePage() {
  return <LandingRoute />;
}
