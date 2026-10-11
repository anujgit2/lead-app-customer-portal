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
