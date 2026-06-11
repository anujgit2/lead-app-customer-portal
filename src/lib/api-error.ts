import type { AxiosError } from "axios";
import type { ApiError } from "@/types";

export function parseApiError(error: unknown): ApiError {
  if (error && typeof error === "object" && "isAxiosError" in error) {
    const axiosError = error as AxiosError<{
      message?: string;
      errors?: Record<string, string[]>;
    }>;
    const data = axiosError.response?.data;
    const message =
      (typeof data === "object" && data?.message) ||
      axiosError.message ||
      "Something went wrong. Please try again.";

    return {
      message: String(message),
      status: axiosError.response?.status,
      errors:
        typeof data === "object" && data?.errors ? data.errors : undefined,
    };
  }

  if (error && typeof error === "object" && "message" in error) {
    return { message: String((error as ApiError).message) };
  }

  return { message: "Something went wrong. Please try again." };
}
