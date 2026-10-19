import type { Metadata } from "next";
import { LegalDocument } from "@/features/legal/LegalDocument";
import { siteCopy } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How LoanPortal handles your account, profile, documents, and the links you share.",
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      eyebrow="Privacy"
      title="Privacy policy"
      description={`This page explains what ${siteCopy.legalEntity} collects when you use LoanPortal, and what you control.`}
      sections={[
        {
          heading: "Your account",
          body: (
            <p>
              When you create an account we store the name, email, and mobile number you enter, plus the password you
              choose. We use a one-time code to confirm your email. If you stay signed in, a session is kept on this
              device until you sign out or it expires.
            </p>
          ),
        },
        {
          heading: "Your profile and application",
          body: (
            <p>
              Details you add to your profile, and the answers you give in a loan application, are saved so you can
              stop and continue later. Profile changes are kept as a history, including earlier versions, so you can
              see what changed.
            </p>
          ),
        },
        {
          heading: "Documents",
          body: (
            <>
              <p>
                Files you upload are stored with your account, including earlier versions when you replace a file.
              </p>
              <p>Sensitive details in the portal are masked until you choose to reveal them.</p>
            </>
          ),
        },
        {
          heading: "Sharing",
          body: (
            <p>
              Nothing is shared until you create a link. You choose what the link includes, how long it works, and
              whether the recipient can download. Recipients confirm their email with a one-time code before they can
              open anything. You can stop a link at any time.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              Questions about your information can be sent to {siteCopy.supportEmail}. We aim to reply within{" "}
              {siteCopy.responseTime}. You can also call {siteCopy.supportPhone} during {siteCopy.supportHours}.
            </p>
          ),
        },
      ]}
    />
  );
}
