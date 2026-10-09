"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

const STATIC_SHARE_TOKEN = "link";
const STATIC_DOCUMENT_ID = "view";

const listeners = new Set<() => void>();
let historyPatched = false;

function notifyPathListeners() {
  listeners.forEach((listener) => listener());
}

function ensureHistoryPatch() {
  if (historyPatched || typeof window === "undefined") return;
  historyPatched = true;
  window.addEventListener("popstate", notifyPathListeners);
  const pushState = history.pushState.bind(history);
  const replaceState = history.replaceState.bind(history);
  history.pushState = (...args) => {
    pushState(...args);
    notifyPathListeners();
  };
  history.replaceState = (...args) => {
    replaceState(...args);
    notifyPathListeners();
  };
}

function subscribe(onStoreChange: () => void) {
  ensureHistoryPatch();
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function segmentFromPath(pathname: string, prefix: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.indexOf(prefix);
  if (index < 0) return null;
  const value = parts[index + 1];
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function useBrowserSegment(prefix: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => segmentFromPath(window.location.pathname, prefix),
    () => null,
  );
}

export interface RouteSegment {
  ready: boolean;
  value: string | null;
}

function useResolvedSegment(prefix: string, staticSegment: string): RouteSegment {
  const pathname = usePathname() ?? "";
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const fromBrowser = useBrowserSegment(prefix);
  if (!ready) return { ready: false, value: null };
  if (fromBrowser) return { ready: true, value: fromBrowser };
  const fromRouter = segmentFromPath(pathname, prefix);
  if (!fromRouter || fromRouter === staticSegment) return { ready: true, value: null };
  return { ready: true, value: fromRouter };
}

export function useShareToken(): RouteSegment {
  return useResolvedSegment("s", STATIC_SHARE_TOKEN);
}

export function useSharedBundleToken(): RouteSegment {
  return useResolvedSegment("shared", STATIC_SHARE_TOKEN);
}

export function useDocumentRouteId(): RouteSegment {
  return useResolvedSegment("documents", STATIC_DOCUMENT_ID);
}
