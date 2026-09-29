"use client";

import React, { createContext, useContext } from "react";

/**
 * Opt-in debug context read by `DynamicField`. Defaults to `false` everywhere in the
 * app — the dev Form Playground is the only consumer that ever sets it to `true` (via
 * `FormDebugProvider`), so normal production forms are completely unaffected.
 */
const FormDebugContext = createContext(false);

export function FormDebugProvider({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return <FormDebugContext.Provider value={value}>{children}</FormDebugContext.Provider>;
}

export function useFormDebug(): boolean {
  return useContext(FormDebugContext);
}
