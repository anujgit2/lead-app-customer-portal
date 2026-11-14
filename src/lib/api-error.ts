import type { AxiosError } from "axios";
import type { ApiError } from "@/types";

function readErrorPayload(data: unknown): { message?: string; code?: string; errors?: Record<string, string[]> } {
  if (!data || typeof data !== "object") return {};
  const rec = data as Record<string, unknown>;
  const error = rec.error;

  if (typeof error === "string") {
    return {
      code: error,
      message: typeof rec.message === "string" ? rec.message : undefined,
    };
  }

  if (error && typeof error === "object") {
    const errObj = error as { code?: string; message?: string; details?: string[] };
    const details = Array.isArray(errObj.details) ? errObj.details : undefined;
    return {
      code: errObj.code,
      message:
        errObj.message ||
        (typeof rec.message === "string" ? rec.message : undefined) ||
        (details && details.length > 0 ? details.join("\n") : undefined),
    };
  }

  return {
    code: typeof rec.code === "string" ? rec.code : undefined,
    message: typeof rec.message === "string" ? rec.message : undefined,
    errors:
      rec.errors && typeof rec.errors === "object"
        ? (rec.errors as Record<string, string[]>)
        : undefined,
  };
}

export function parseApiError(error: unknown): ApiError {
  if (error && typeof error === "object" && "isAxiosError" in error) {
    const axiosError = error as AxiosError<unknown>;
    const data = axiosError.response?.data;
    const payload = readErrorPayload(data);
    const fieldErrors =
      data && typeof data === "object" && "errors" in data
        ? (data as { errors?: Record<string, string[]> }).errors
        : payload.errors;
    const message =
      payload.message ||
      axiosError.message ||
      "Something went wrong. Please try again.";

    return {
      message: String(message),
      code: payload.code,
      status: axiosError.response?.status,
      errors: fieldErrors,
    };
  }

  if (error && typeof error === "object" && "message" in error) {
    const apiError = error as ApiError;
    return {
      message: String(apiError.message),
      code: apiError.code,
      status: apiError.status,
      errors: apiError.errors,
    };
  }

  return { message: "Something went wrong. Please try again." };
}
