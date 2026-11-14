import type { Metadata } from "next";
import { LegalDocument } from "@/features/legal/LegalDocument";
import { siteCopy } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The terms for creating an account and applying for a loan on LoanPortal.",
};

export default function TermsPage() {
  return (
    <LegalDocument
      eyebrow="Terms"
      title="Terms of use"
      description={`These terms cover your use of LoanPortal, operated by ${siteCopy.legalEntity}. ${siteCopy.registration}.`}
      sections={[
        {
          heading: "Your account",
          body: (
            <p>
              You need an account to apply. Use your own email and mobile number, keep your password private, and
              complete the email check we send you. You are responsible for activity on your account.
            </p>
          ),
        },
        {
          heading: "Applications and documents",
          body: (
            <p>
              Enter information that is accurate and belongs to you. Upload only documents you are allowed to share.
              Your profile is reused on later applications, and earlier versions stay on record. Your lender decides
              which loan programs are open to you and whether an application is approved.
            </p>
          ),
        },
        {
          heading: "Links you send",
          body: (
            <p>
              A share link gives access only to what you included, for as long as you allow. Do not send a link to
              someone who should not see those documents. You can turn a link off whenever you want.
            </p>
          ),
        },
        {
          heading: "Acceptable use",
          body: (
            <p>
              Do not attempt to access another customer’s account, documents, or share links. Do not interfere with
              the portal or use it for anything other than your own loan application. We can suspend access that
              breaks these terms.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              Write to {siteCopy.supportEmail} or call {siteCopy.supportPhone} during {siteCopy.supportHours}. For a
              complaint, use the same contact and we will reply within {siteCopy.responseTime}.
            </p>
          ),
        },
      ]}
    />
  );
}
