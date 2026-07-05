import type { AxiosError } from "axios";
import type { ApiError } from "@/types";

export function parseApiError(error: unknown): ApiError {
  if (error && typeof error === "object" && "isAxiosError" in error) {
    const axiosError = error as AxiosError<{
      success?: boolean;
      message?: string;
      error?: {
        code?: string;
        message?: string;
        details?: string[];
      };
      errors?: Record<string, string[]>;
    }>;
    const data = axiosError.response?.data;
    const envelopeMessage =
      typeof data === "object"
        ? data?.error?.message || data?.message
        : undefined;
    const details = typeof data === "object" ? data?.error?.details : undefined;
    const fieldErrors =
      typeof data === "object" && data?.errors
        ? data.errors
        : undefined;
    const message =
      envelopeMessage ||
      (Array.isArray(details) && details.length > 0 ? details.join("\n") : undefined) ||
      axiosError.message ||
      "Something went wrong. Please try again.";

    return {
      message: String(message),
      code: typeof data === "object" ? data?.error?.code : undefined,
      status: axiosError.response?.status,
      errors: fieldErrors,
    };
  }

  if (error && typeof error === "object" && "message" in error) {
    return { message: String((error as ApiError).message) };
  }

  return { message: "Something went wrong. Please try again." };
}
