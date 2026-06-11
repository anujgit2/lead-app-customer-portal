import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { handleSessionExpired } from "@/lib/session";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

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
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
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
