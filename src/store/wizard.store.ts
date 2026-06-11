import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DraftApplication, FormData, WizardStepStatus } from "@/types";

interface WizardState {
  drafts: Record<string, DraftApplication>;
  currentDraftId: string | null;

  initDraft: (productCode: string, totalSteps: number, existingDraft?: DraftApplication) => string;
  setCurrentStep: (draftId: string, step: number) => void;
  updateFormData: (draftId: string, templateCode: string, data: unknown) => void;
  setStepStatus: (draftId: string, stepIndex: number, status: Partial<WizardStepStatus>) => void;
  getDraft: (draftId: string) => DraftApplication | null;
  clearDraft: (draftId: string) => void;
  setCurrentDraftId: (id: string | null) => void;
}

export const useWizardStore = create<WizardState>()(
  persist(
    (set, get) => ({
      drafts: {},
      currentDraftId: null,

      initDraft: (productCode, totalSteps, existingDraft) => {
        if (existingDraft?.applicationId) {
          set((s) => ({
            drafts: { ...s.drafts, [existingDraft.applicationId!]: existingDraft },
            currentDraftId: existingDraft.applicationId!,
          }));
          return existingDraft.applicationId!;
        }
        const id = `draft-${Date.now()}`;
        const draft: DraftApplication = {
          applicationId: id,
          productCode,
          currentStep: 0,
          formData: {} as FormData,
          stepStatuses: Array.from({ length: totalSteps }, (_, i) => ({
            templateCode: "",
            completed: false,
            valid: false,
            touched: false,
          })),
        };
        set((s) => ({
          drafts: { ...s.drafts, [id]: draft },
          currentDraftId: id,
        }));
        return id;
      },

      setCurrentStep: (draftId, step) => {
        set((s) => {
          const draft = s.drafts[draftId];
          if (!draft) return s;
          return { drafts: { ...s.drafts, [draftId]: { ...draft, currentStep: step } } };
        });
      },

      updateFormData: (draftId, templateCode, data) => {
        set((s) => {
          const draft = s.drafts[draftId];
          if (!draft) return s;
          const updated: DraftApplication = {
            ...draft,
            formData: { ...draft.formData, [templateCode]: data } as FormData,
            lastSavedAt: new Date().toISOString(),
          };
          return { drafts: { ...s.drafts, [draftId]: updated } };
        });
      },

      setStepStatus: (draftId, stepIndex, status) => {
        set((s) => {
          const draft = s.drafts[draftId];
          if (!draft) return s;
          const stepStatuses = [...draft.stepStatuses];
          stepStatuses[stepIndex] = { ...stepStatuses[stepIndex], ...status };
          return {
            drafts: {
              ...s.drafts,
              [draftId]: { ...draft, stepStatuses },
            },
          };
        });
      },

      getDraft: (draftId) => {
        return get().drafts[draftId] ?? null;
      },

      clearDraft: (draftId) => {
        set((s) => {
          const { [draftId]: _, ...rest } = s.drafts;
          return { drafts: rest, currentDraftId: s.currentDraftId === draftId ? null : s.currentDraftId };
        });
      },

      setCurrentDraftId: (id) => set({ currentDraftId: id }),
    }),
    {
      name: "wizard-store",
    }
  )
);
