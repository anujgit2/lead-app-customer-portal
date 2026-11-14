import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared document",
  robots: { index: false, follow: false },
  other: {
    referrer: "no-referrer",
  },
};

export default function SharedViewerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <meta name="referrer" content="no-referrer" />
      {children}
    </>
  );
}
