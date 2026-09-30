import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import {
  handleSessionExpired,
  isSessionExpiredRedirectSuppressed,
} from "@/lib/session";
import { getTenantId } from "@/lib/tenant";

declare module "axios" {
  export interface AxiosRequestConfig {
    /** Opt a request out of the automatic session-expired redirect on 401. */
    skipAuthRedirect?: boolean;
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";
console.log("NEXT_PUBLIC_API_URL =", process.env.NEXT_PUBLIC_API_URL);
console.log("BASE_URL =", BASE_URL);

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken")
  );
}

export function getApiBaseUrl(): string {
  return BASE_URL;
}

export function getApiAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const tenantId = getTenantId();
  if (tenantId) headers["X-Tenant-ID"] = tenantId;
  return headers;
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (config.headers) {
      Object.entries(getApiAuthHeaders()).forEach(([name, value]) => {
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
        const isAuthPage =
          path.startsWith("/auth/login") ||
          path.startsWith("/auth/register") ||
          path.startsWith("/auth/session-expired") ||
          path.startsWith("/apply");

        if (!isAuthPage) {
          handleSessionExpired(path);
          window.location.href = "/auth/session-expired";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
