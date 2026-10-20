"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef } from "react";

const ApplicationIdContext = createContext<string | null>(null);
const WizardAnswersContext = createContext<Record<string, unknown> | undefined>(undefined);
const SyncFormToWizardContext = createContext<(() => void) | null>(null);
const PersistDocumentStepContext = createContext<(() => void) | null>(null);
const WizardContinueContext = createContext<(() => void) | null>(null);

export function ApplicationIdProvider({
  applicationId,
  children,
}: {
  applicationId: string;
  children: React.ReactNode;
}) {
  return (
    <ApplicationIdContext.Provider value={applicationId}>
      {children}
    </ApplicationIdContext.Provider>
  );
}

export function useApplicationId(): string | null {
  return useContext(ApplicationIdContext);
}

/** Earlier wizard answers, so a document slot can follow company type and similar rules. */
export function WizardAnswersProvider({
  value,
  children,
}: {
  value: Record<string, unknown>;
  children: React.ReactNode;
}) {
  return <WizardAnswersContext.Provider value={value}>{children}</WizardAnswersContext.Provider>;
}

export function useWizardAnswers(): Record<string, unknown> | undefined {
  return useContext(WizardAnswersContext);
}

export function SyncFormToWizardProvider({
  onSync,
  children,
}: {
  onSync: () => void;
  children: React.ReactNode;
}) {
  const onSyncRef = useRef(onSync);

  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  const sync = useCallback(() => {
    onSyncRef.current();
  }, []);

  return (
    <SyncFormToWizardContext.Provider value={sync}>
      {children}
    </SyncFormToWizardContext.Provider>
  );
}

export function useSyncFormToWizard(): (() => void) | null {
  return useContext(SyncFormToWizardContext);
}

export function PersistDocumentStepProvider({
  onPersist,
  children,
}: {
  onPersist: () => void;
  children: React.ReactNode;
}) {
  const onPersistRef = useRef(onPersist);

  useEffect(() => {
    onPersistRef.current = onPersist;
  }, [onPersist]);

  const persist = useCallback(() => {
    onPersistRef.current();
  }, []);

  return (
    <PersistDocumentStepContext.Provider value={persist}>
      {children}
    </PersistDocumentStepContext.Provider>
  );
}

export function usePersistDocumentStep(): (() => void) | null {
  return useContext(PersistDocumentStepContext);
}

/** Lets a consent section's Continue button run the wizard's own Continue. */
export function WizardContinueProvider({
  onContinue,
  children,
}: {
  onContinue: () => void;
  children: React.ReactNode;
}) {
  const onContinueRef = useRef(onContinue);

  useEffect(() => {
    onContinueRef.current = onContinue;
  }, [onContinue]);

  const continueStep = useCallback(() => {
    onContinueRef.current();
  }, []);

  return (
    <WizardContinueContext.Provider value={continueStep}>{children}</WizardContinueContext.Provider>
  );
}

export function useWizardContinue(): (() => void) | null {
  return useContext(WizardContinueContext);
}
