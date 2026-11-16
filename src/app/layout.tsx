import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Loantris",
  description: "Apply for business loans quickly and securely",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runs before first paint: marks the My Profile host so the landing markup is hidden. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(location.hostname.indexOf('myprofile.')===0)document.documentElement.setAttribute('data-host','customer')}catch(e){}",
          }}
        />
      </head>
      <body className={`${dmSans.variable} ${manrope.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
