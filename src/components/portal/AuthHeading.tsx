import type { ReactNode } from "react";

/** Title and one-line description at the top of a sign-in or sign-up form. */
export function AuthHeading({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-xl font-semibold leading-7 tracking-[-0.015em] text-foreground">{title}</h1>
      {description ? <p className="muted text-sm leading-6">{description}</p> : null}
    </div>
  );
}
