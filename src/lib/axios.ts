import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import {
  handleSessionExpired,
  isSessionExpiredRedirectSuppressed,
} from "@/lib/session";
import { resolveApiBaseUrl } from "@/lib/api-base-url";
import { getTenantId } from "@/lib/tenant";

declare module "axios" {
  export interface AxiosRequestConfig {
    /** Opt a request out of the automatic session-expired redirect on 401. */
    skipAuthRedirect?: boolean;
    /** Leave tenant resolution to the API host. Do not send X-Tenant-ID. */
    skipTenantHeader?: boolean;
    /** Public request. Do not send Authorization. */
    skipAuthHeader?: boolean;
  }
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken")
  );
}

export function getApiBaseUrl(): string {
  return resolveApiBaseUrl();
}

export function getApiAuthHeaders(options?: {
  skipTenantHeader?: boolean;
  skipAuthHeader?: boolean;
}): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!options?.skipAuthHeader) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (!options?.skipTenantHeader) {
    const tenantId = getTenantId();
    if (tenantId) headers["X-Tenant-ID"] = tenantId;
  }
  return headers;
}

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.baseURL = getApiBaseUrl();
    if (config.headers) {
      Object.entries(
        getApiAuthHeaders({
          skipTenantHeader: config.skipTenantHeader,
          skipAuthHeader: config.skipAuthHeader,
        })
      ).forEach(([name, value]) => {
        config.headers[name] = value;
      });
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (
      body &&
      typeof body === "object" &&
      "success" in body &&
      "data" in body
    ) {
      response.data = body.data ?? body;
    }
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (
        typeof window !== "undefined" &&
        !error.config?.skipAuthRedirect &&
        !isSessionExpiredRedirectSuppressed()
      ) {
        const path = window.location.pathname;
        const isPublicPage =
          path === "/" ||
          path.startsWith("/t/") ||
          path.startsWith("/auth/login") ||
          path.startsWith("/auth/register") ||
          path.startsWith("/auth/session-expired") ||
          path.startsWith("/apply") ||
          path.startsWith("/s/") ||
          path.startsWith("/shared");

        if (!isPublicPage) {
          handleSessionExpired(path);
          window.location.href = "/auth/session-expired";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
