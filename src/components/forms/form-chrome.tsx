"use client";

import { createContext, useContext, type ReactNode } from "react";

export type FormChrome = "default" | "profile";

const FormChromeContext = createContext<FormChrome>("default");

export function FormChromeProvider({
  value,
  children,
}: {
  value: FormChrome;
  children: ReactNode;
}) {
  return <FormChromeContext.Provider value={value}>{children}</FormChromeContext.Provider>;
}

export function useFormChrome(): FormChrome {
  return useContext(FormChromeContext);
}

const PanSearchVisibilityContext = createContext(true);

/** Profile forms turn off the "Search PAN" control; loan application forms keep it. */
export function PanSearchVisibilityProvider({
  visible,
  children,
}: {
  visible: boolean;
  children: ReactNode;
}) {
  return (
    <PanSearchVisibilityContext.Provider value={visible}>{children}</PanSearchVisibilityContext.Provider>
  );
}

export function usePanSearchVisible(): boolean {
  return useContext(PanSearchVisibilityContext);
}
