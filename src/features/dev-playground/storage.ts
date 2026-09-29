/**
 * localStorage persistence for the dev Form Playground.
 *
 * Deliberately narrow: only the editor mode, the hand-authored JSON schema text,
 * the API source config, and the debug toggle are persisted. Test data and API
 * response bodies are NEVER persisted, since they could contain data that looks
 * like real customer/application data.
 */
import type { ApiSourceConfig, TemplateSourceMode } from "./types";

const KEYS = {
  mode: "form-playground.mode",
  jsonText: "form-playground.jsonText",
  apiConfig: "form-playground.apiConfig",
  debug: "form-playground.debug",
} as const;

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage full/unavailable (private browsing, etc.) — silently no-op.
  }
}

export function loadPersistedMode(): TemplateSourceMode | null {
  const value = safeGet(KEYS.mode);
  return value === "api" || value === "json" ? value : null;
}
export function savePersistedMode(mode: TemplateSourceMode): void {
  safeSet(KEYS.mode, mode);
}

export function loadPersistedJsonText(): string | null {
  return safeGet(KEYS.jsonText);
}
export function savePersistedJsonText(text: string): void {
  safeSet(KEYS.jsonText, text);
}

export function loadPersistedApiConfig(): Partial<ApiSourceConfig> | null {
  const raw = safeGet(KEYS.apiConfig);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<ApiSourceConfig>;
  } catch {
    return null;
  }
}
export function savePersistedApiConfig(config: ApiSourceConfig): void {
  safeSet(KEYS.apiConfig, JSON.stringify(config));
}

export function loadPersistedDebug(): boolean {
  return safeGet(KEYS.debug) === "true";
}
export function savePersistedDebug(value: boolean): void {
  safeSet(KEYS.debug, String(value));
}
