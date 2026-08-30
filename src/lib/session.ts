import { useAuthStore } from "@/store/auth.store";
import { invitationService } from "@/services/invitation.service";
import { queryClient } from "@/lib/query-client";

export type AuthErrorCode =
  | "SESSION_EXPIRED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "NETWORK"
  | "UNKNOWN";

export interface AuthErrorContext {
  code: AuthErrorCode;
  message: string;
  from?: string;
  status?: number;
}

const AUTH_ERROR_KEY = "auth-error";

/**
 * Signing out intentionally invalidates the token, so any 401 that lands while
 * a logout is in flight is expected rather than an expired session. Stored as a
 * deadline instead of a boolean so a failed logout can never strand the app in
 * a state where genuine session expiries are ignored.
 */
let sessionExpiredRedirectSuppressedUntil = 0;

export function suppressSessionExpiredRedirect(durationMs = 8000) {
  sessionExpiredRedirectSuppressedUntil = Date.now() + durationMs;
}

export function isSessionExpiredRedirectSuppressed(): boolean {
  return Date.now() < sessionExpiredRedirectSuppressedUntil;
}

export function hasAuthArtifacts(): boolean {
  if (typeof window === "undefined") return false;
  const { user, isAuthenticated } = useAuthStore.getState();
  return !!(
    user ||
    isAuthenticated ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken") ||
    localStorage.getItem("user")
  );
}

export function clearAuthTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  sessionStorage.removeItem("accessToken");
}

export function clearFullSession() {
  clearAuthTokens();
  useAuthStore.getState().logout();
  invitationService.clearStoredInvitation();
  queryClient.clear();
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(AUTH_ERROR_KEY);
  }
}

export function saveAuthError(context: AuthErrorContext) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(AUTH_ERROR_KEY, JSON.stringify(context));
}

export function getAuthError(): AuthErrorContext | null {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(AUTH_ERROR_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AuthErrorContext;
  } catch {
    return null;
  }
}

export function clearAuthError() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(AUTH_ERROR_KEY);
}

export function handleSessionExpired(from?: string) {
  clearAuthTokens();
  saveAuthError({
    code: "SESSION_EXPIRED",
    message: "Your session has expired. Please sign in again to continue.",
    from,
    status: 401,
  });
}
