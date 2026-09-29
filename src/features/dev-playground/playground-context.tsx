"use client";

/**
 * Central state orchestration for the dev Form Playground.
 *
 * Architecture (see ARCHITECTURE in the task spec):
 *   FormTemplateSource (Api/Json) → TemplateValidator → FormRenderer → FormState/RuleEngine → Preview/Inspector
 *
 * This context owns everything to the left of "FormRenderer" (source + validation
 * + editor/test-data/debug state) and the live values reported back by the
 * renderer (liveData/liveErrors) for the inspector. It never renders form fields
 * itself — that's exclusively `DynamicField`/`DynamicSection`/`WizardStep`.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { FieldErrors } from "react-hook-form";
import type { FormTemplate } from "@/types";
import { normalizeTemplateJson } from "./template-normalizer";
import { fetchTemplateFromApi, parseJsonTemplateText } from "./template-sources";
import { generateTemplatesSample } from "./sample-data-generator";
import {
  loadPersistedApiConfig,
  loadPersistedDebug,
  loadPersistedJsonText,
  loadPersistedMode,
  savePersistedApiConfig,
  savePersistedDebug,
  savePersistedJsonText,
  savePersistedMode,
} from "./storage";
import { SAMPLE_TEMPLATE_JSON } from "./sample-template";
import type { ApiLoadMeta, ApiSourceConfig, NormalizedTemplateResult, TemplateSourceMode } from "./types";
import type { JsonEditorHandle } from "./components/JsonEditor";

const DEFAULT_API_CONFIG: ApiSourceConfig = {
  templateId: "business_profile",
  endpointTemplate: "/api/form-templates/{id}",
  useProgramService: false,
  params: {},
};

const EMPTY_RESULT: NormalizedTemplateResult = { templates: [], issues: [], valid: false };

type ApiStatus = "idle" | "loading" | "success" | "error";

interface PlaygroundState {
  // Shared so the toolbar (header) can trigger actions (format/copy/paste/clear)
  // on the JSON editor instance that actually lives inside `SchemaPanel`.
  editorRef: React.RefObject<JsonEditorHandle | null>;

  mode: TemplateSourceMode;
  setMode: (mode: TemplateSourceMode) => void;

  jsonText: string;
  setJsonText: (text: string) => void;
  commitNow: () => void;

  jsonParseError: string | null;
  normalized: NormalizedTemplateResult;

  apiConfig: ApiSourceConfig;
  setApiConfig: (config: ApiSourceConfig) => void;
  apiStatus: ApiStatus;
  apiMeta: ApiLoadMeta | null;
  apiErrorMessage: string | null;
  loadFromApi: () => Promise<void>;

  debug: boolean;
  setDebug: (value: boolean) => void;

  testDataText: string;
  setTestDataText: (text: string) => void;
  testDataError: string | null;
  testData: Record<string, unknown>;
  clearTestData: () => void;
  generateSampleData: () => void;

  selectedTemplateCode: string | null;
  selectedSectionCode: string | null;
  renderEntireForm: boolean;
  selectTemplate: (code: string) => void;
  selectSection: (code: string | null) => void;
  setRenderEntireForm: (value: boolean) => void;

  previewKey: number;
  resetPreview: () => void;

  liveData: Record<string, unknown>;
  liveErrors: Record<string, FieldErrors | FieldErrors[]>;
  setLiveDataForTemplate: (code: string, data: unknown) => void;
  setLiveErrorsForTemplate: (code: string, errors: FieldErrors | FieldErrors[]) => void;
}

const PlaygroundContext = createContext<PlaygroundState | null>(null);

export function usePlayground(): PlaygroundState {
  const ctx = useContext(PlaygroundContext);
  if (!ctx) throw new Error("usePlayground must be used within a PlaygroundProvider");
  return ctx;
}

const COMMIT_DEBOUNCE_MS = 500;
const DEFAULT_JSON_TEXT = JSON.stringify(SAMPLE_TEMPLATE_JSON, null, 2);

export function PlaygroundProvider({ children }: { children: React.ReactNode }) {
  const editorRef = useRef<JsonEditorHandle>(null);

  // Initial state must be identical on the server and on the client's first
  // (hydration) render — reading localStorage here would make them diverge
  // (server has no `window`, but the client's very first render already does),
  // which produces a React hydration mismatch and can leave the page with
  // stale/unresponsive markup. So we always start from these fixed fallbacks,
  // then swap in any persisted values from a one-time effect after mount (see
  // below) — the standard "hydrate from browser storage" pattern.
  const [mode, setMode] = useState<TemplateSourceMode>("json");
  const [jsonText, setJsonTextState] = useState<string>(DEFAULT_JSON_TEXT);
  const [committedJson, setCommittedJson] = useState<string>(DEFAULT_JSON_TEXT);
  const [apiConfig, setApiConfig] = useState<ApiSourceConfig>(DEFAULT_API_CONFIG);
  const [debug, setDebug] = useState(false);

  // One-time hydration from localStorage, intentionally deferred to a mount
  // effect (not a lazy useState initializer) so the client's first render
  // matches the server-rendered HTML exactly — see comment above. Reading an
  // external (non-React) data source like localStorage and syncing it into
  // state is exactly what effects are for, so the setState-in-effect rule is
  // deliberately disabled for this one-time, run-once-on-mount block.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const persistedMode = loadPersistedMode();
    if (persistedMode) setMode(persistedMode);

    const persistedJsonText = loadPersistedJsonText();
    if (persistedJsonText) {
      setJsonTextState(persistedJsonText);
      setCommittedJson(persistedJsonText);
    }

    const persistedApiConfig = loadPersistedApiConfig();
    if (persistedApiConfig) {
      setApiConfig((prev) => ({ ...prev, ...persistedApiConfig }));
    }

    setDebug(loadPersistedDebug());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const [apiStatus, setApiStatus] = useState<ApiStatus>("idle");
  const [apiMeta, setApiMeta] = useState<ApiLoadMeta | null>(null);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);

  const [testDataText, setTestDataText] = useState("{}");

  const [selectedTemplateCodeRaw, setSelectedTemplateCodeRaw] = useState<string | null>(null);
  const [selectedSectionCodeRaw, setSelectedSectionCodeRaw] = useState<string | null>(null);
  const [renderEntireForm, setRenderEntireForm] = useState(true);

  const [previewKey, setPreviewKey] = useState(0);
  const [liveData, setLiveData] = useState<Record<string, unknown>>({});
  const [liveErrors, setLiveErrors] = useState<Record<string, FieldErrors | FieldErrors[]>>({});

  // Persist on every change — cheap localStorage writes, no mount-hydration effect needed
  // since initial state is already read synchronously above.
  useEffect(() => {
    savePersistedMode(mode);
  }, [mode]);
  useEffect(() => {
    savePersistedJsonText(jsonText);
  }, [jsonText]);
  useEffect(() => {
    savePersistedApiConfig(apiConfig);
  }, [apiConfig]);
  useEffect(() => {
    savePersistedDebug(debug);
  }, [debug]);

  // Debounced auto-render: commit jsonText → committedJson after a short pause.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setJsonText = useCallback((text: string) => {
    setJsonTextState(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setCommittedJson(text), COMMIT_DEBOUNCE_MS);
  }, []);
  const commitNow = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCommittedJson(jsonText);
  }, [jsonText]);

  const { jsonParseError, normalized } = useMemo(() => {
    try {
      const root = parseJsonTemplateText(committedJson);
      return { jsonParseError: null, normalized: normalizeTemplateJson(root) };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid JSON";
      return { jsonParseError: message, normalized: EMPTY_RESULT };
    }
  }, [committedJson]);

  // Derived (not stored) so an out-of-date selection self-corrects on render
  // instead of needing an effect + setState round-trip.
  const selectedTemplateCode = useMemo(() => {
    if (normalized.templates.length === 0) return null;
    return normalized.templates.some((t) => t.code === selectedTemplateCodeRaw)
      ? selectedTemplateCodeRaw
      : normalized.templates[0].code;
  }, [normalized.templates, selectedTemplateCodeRaw]);

  const selectedSectionCode = useMemo(() => {
    const template = normalized.templates.find((t) => t.code === selectedTemplateCode);
    if (!template) return null;
    return template.sections.some((s) => s.code === selectedSectionCodeRaw) ? selectedSectionCodeRaw : null;
  }, [normalized.templates, selectedTemplateCode, selectedSectionCodeRaw]);

  const { testDataError, testData } = useMemo(() => {
    try {
      const parsed = testDataText.trim() ? JSON.parse(testDataText) : {};
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { testDataError: null, testData: parsed as Record<string, unknown> };
      }
      return { testDataError: "Test data must be a JSON object.", testData: {} };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid JSON";
      return { testDataError: message, testData: {} };
    }
  }, [testDataText]);

  const loadFromApi = useCallback(async () => {
    setApiStatus("loading");
    setApiErrorMessage(null);
    try {
      const result = await fetchTemplateFromApi(apiConfig);
      const text = JSON.stringify(result.raw, null, 2);
      setJsonTextState(text);
      setCommittedJson(text);
      setApiMeta(result.meta);
      setApiStatus("success");
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : "Failed to load template from API.";
      setApiErrorMessage(message);
      setApiStatus("error");
    }
  }, [apiConfig]);

  const resetPreview = useCallback(() => {
    setPreviewKey((k) => k + 1);
    setLiveData({});
    setLiveErrors({});
  }, []);

  const setLiveDataForTemplate = useCallback((code: string, data: unknown) => {
    setLiveData((prev) => ({ ...prev, [code]: data }));
  }, []);
  const setLiveErrorsForTemplate = useCallback((code: string, errors: FieldErrors | FieldErrors[]) => {
    setLiveErrors((prev) => ({ ...prev, [code]: errors }));
  }, []);

  const generateSampleData = useCallback(() => {
    const sample = generateTemplatesSample(normalized.templates);
    setTestDataText(JSON.stringify(sample, null, 2));
  }, [normalized.templates]);

  const value: PlaygroundState = {
    editorRef,
    mode,
    setMode,
    jsonText,
    setJsonText,
    commitNow,
    jsonParseError,
    normalized,
    apiConfig,
    setApiConfig,
    apiStatus,
    apiMeta,
    apiErrorMessage,
    loadFromApi,
    debug,
    setDebug,
    testDataText,
    setTestDataText,
    testDataError,
    testData,
    clearTestData: () => setTestDataText("{}"),
    generateSampleData,
    selectedTemplateCode,
    selectedSectionCode,
    renderEntireForm,
    selectTemplate: (code) => {
      setSelectedTemplateCodeRaw(code);
      setSelectedSectionCodeRaw(null);
    },
    selectSection: setSelectedSectionCodeRaw,
    setRenderEntireForm,
    previewKey,
    resetPreview,
    liveData,
    liveErrors,
    setLiveDataForTemplate,
    setLiveErrorsForTemplate,
  };

  return <PlaygroundContext.Provider value={value}>{children}</PlaygroundContext.Provider>;
}

export function findSelectedTemplate(templates: FormTemplate[], code: string | null): FormTemplate | undefined {
  return templates.find((t) => t.code === code);
}
