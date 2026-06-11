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
