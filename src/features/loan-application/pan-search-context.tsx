"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { PanVerificationRecord } from "@/types";

interface PanVerificationContextValue {
  getRecord: (scopeId: string) => PanVerificationRecord | undefined;
  setRecord: (scopeId: string, record: PanVerificationRecord) => void;
  clearRecord: (scopeId: string) => void;
}

const PanVerificationContext = createContext<PanVerificationContextValue | null>(null);
const PanSearchScopeContext = createContext<string>("default");

function PanVerificationStore({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<Record<string, PanVerificationRecord>>({});

  const getRecord = useCallback(
    (scopeId: string) => records[scopeId],
    [records]
  );

  const setRecord = useCallback((scopeId: string, record: PanVerificationRecord) => {
    setRecords((prev) => ({ ...prev, [scopeId]: record }));
  }, []);

  const clearRecord = useCallback((scopeId: string) => {
    setRecords((prev) => {
      if (!(scopeId in prev)) return prev;
      const next = { ...prev };
      delete next[scopeId];
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ getRecord, setRecord, clearRecord }),
    [getRecord, setRecord, clearRecord]
  );

  return (
    <PanVerificationContext.Provider value={value}>
      {children}
    </PanVerificationContext.Provider>
  );
}

/** Reuses a parent store when present so wizard step remounts keep results. */
export function PanVerificationProvider({ children }: { children: React.ReactNode }) {
  const existing = useContext(PanVerificationContext);
  if (existing) return <>{children}</>;
  return <PanVerificationStore>{children}</PanVerificationStore>;
}

export function PanSearchScopeProvider({
  scopeId,
  children,
}: {
  scopeId: string;
  children: React.ReactNode;
}) {
  return (
    <PanSearchScopeContext.Provider value={scopeId}>
      {children}
    </PanSearchScopeContext.Provider>
  );
}

export function usePanSearchScopeId(): string {
  return useContext(PanSearchScopeContext);
}

export function usePanVerification(): PanVerificationContextValue {
  const ctx = useContext(PanVerificationContext);
  if (!ctx) {
    return {
      getRecord: () => undefined,
      setRecord: () => undefined,
      clearRecord: () => undefined,
    };
  }
  return ctx;
}
