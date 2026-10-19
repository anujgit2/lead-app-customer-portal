import type { ReactNode } from "react";
import { LandingFooter } from "@/features/landing/LandingFooter";
import { LandingHeader } from "@/features/landing/LandingHeader";

export type LegalSection = {
  heading: string;
  body: ReactNode;
};

export function LegalDocument({
  eyebrow,
  title,
  description,
  sections,
}: {
  eyebrow: string;
  title: string;
  description: string;
  sections: LegalSection[];
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <LandingHeader />
      <main className="flex-1">
        <article className="mx-auto flex max-w-[760px] flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
          <header className="flex flex-col gap-3">
            <p className="text-sm font-medium text-slate-500">{eyebrow}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
            <p className="text-sm font-normal leading-6 text-slate-500">{description}</p>
          </header>
          <div className="flex flex-col gap-8">
            {sections.map((section) => (
              <section key={section.heading} className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">{section.heading}</h2>
                <div className="flex flex-col gap-3 text-sm font-normal leading-6 text-slate-500">{section.body}</div>
              </section>
            ))}
          </div>
        </article>
      </main>
      <LandingFooter />
    </div>
  );
}
