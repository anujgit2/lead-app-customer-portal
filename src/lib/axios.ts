import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { handleSessionExpired } from "@/lib/session";
import { getTenantId } from "@/lib/tenant";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";
console.log("NEXT_PUBLIC_API_URL =", process.env.NEXT_PUBLIC_API_URL);
console.log("BASE_URL =", BASE_URL);

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken")
  );
}

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (config.headers) {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const tenantId = getTenantId();
      if (tenantId) {
        config.headers["X-Tenant-ID"] = tenantId;
      }
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
      if (typeof window !== "undefined") {
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
