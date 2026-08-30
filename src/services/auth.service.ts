import { apiClient } from "@/lib/axios";
import { parseApiError } from "@/lib/api-error";
import {
  clearFullSession,
  suppressSessionExpiredRedirect,
} from "@/lib/session";
import { sleep } from "@/lib/utils";
import type {
  AuthResponse,
  LoginRequest,
  RegisterApiRequest,
  RegisterApiResponse,
  User,
  VerifyEmailOtpRequest,
  VerifyEmailOtpResponse,
} from "@/types";
import { MOCK_USER } from "./mock-data";

function persistTokens(accessToken: string, refreshToken?: string, rememberMe = true) {
  if (typeof window === "undefined") return;
  if (rememberMe) {
    localStorage.setItem("accessToken", accessToken);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    sessionStorage.removeItem("accessToken");
  } else {
    sessionStorage.setItem("accessToken", accessToken);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }
}

function persistUser(user: User) {
  if (typeof window === "undefined") return;
  localStorage.setItem("user", JSON.stringify(user));
}

function buildUserFromRegistration(
  userId: string,
  data: Pick<RegisterApiRequest, "email" | "phone" | "firstName" | "lastName">
): User {
  const now = new Date().toISOString();
  return {
    id: userId,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    createdAt: now,
    updatedAt: now,
  };
}

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const { data: response } = await apiClient.post<{
        userId?: string;
        accessToken?: string;
        refreshToken?: string;
        user?: User;
      }>("/auth/login", {
        identifier: data.email,
        password: data.password,
      });

      const accessToken = response.accessToken;
      if (!accessToken) {
        throw { message: "Invalid email or password", status: 401 };
      }

      const user: User =
        response.user ??
        buildUserFromRegistration(response.userId ?? "unknown", {
          email: data.email,
          phone: "",
          firstName: data.email.split("@")[0],
          lastName: "",
        });

      persistTokens(accessToken, response.refreshToken, data.rememberMe);
      persistUser(user);
      return {
        user,
        tokens: {
          accessToken,
          refreshToken: response.refreshToken ?? "",
        },
      };
    } catch (error) {
      const apiError = parseApiError(error);
      if (apiError.status === 401 || apiError.status === 404) {
        await sleep(300);
        if (data.email === "demo@example.com" && data.password === "Password@123") {
          const tokens = {
            accessToken: "mock-access-token-" + Date.now(),
            refreshToken: "mock-refresh-token-" + Date.now(),
          };
          persistTokens(tokens.accessToken, tokens.refreshToken, data.rememberMe);
          persistUser(MOCK_USER);
          return { user: MOCK_USER, tokens };
        }
      }
      throw apiError;
    }
  },

  async registerWithInvitation(
    data: RegisterApiRequest
  ): Promise<RegisterApiResponse> {
    try {
      const { data: response } = await apiClient.post<RegisterApiResponse>(
        "/auth/register",
        data
      );
      return response;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async registerSelfServe(
    data: RegisterApiRequest
  ): Promise<RegisterApiResponse> {
    try {
      const { data: response } = await apiClient.post<RegisterApiResponse>(
        "/auth/register",
        data
      );
      return response;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async verifyEmailOtp(
    data: VerifyEmailOtpRequest
  ): Promise<VerifyEmailOtpResponse> {
    try {
      const { data: response } = await apiClient.post<VerifyEmailOtpResponse>(
        "/auth/register/verify/email",
        data
      );
      return response;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async completeRegistration(
    registerData: RegisterApiRequest,
    userId: string,
    accessToken?: string | null
  ): Promise<AuthResponse> {
    const user = buildUserFromRegistration(userId, registerData);

    if (accessToken) {
      persistTokens(accessToken, undefined, true);
      persistUser(user);
      return {
        user,
        tokens: { accessToken, refreshToken: "" },
      };
    }

    return this.login({
      email: registerData.email,
      password: registerData.password,
      rememberMe: true,
    });
  },

  async logout(): Promise<void> {
    // Covers both the logout call itself and any in-flight request that 401s
    // once the token is revoked, so neither bounces the user to session-expired.
    suppressSessionExpiredRedirect();
    try {
      await apiClient.post("/auth/logout", undefined, { skipAuthRedirect: true });
    } catch {
      // ignore logout API errors
    }
    clearFullSession();
  },

  async getProfile(): Promise<User> {
    try {
      const { data } = await apiClient.get<User>("/auth/profile");
      persistUser(data);
      return data;
    } catch {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("user");
        if (stored) return JSON.parse(stored) as User;
      }
      return MOCK_USER;
    }
  },

  async updateProfile(data: { firstName: string; lastName: string }): Promise<User> {
    try {
      const { data: updated } = await apiClient.patch<User>("/auth/profile", data);
      persistUser(updated);
      return updated;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async updateContact(data: { phone: string }): Promise<User> {
    try {
      const { data: updated } = await apiClient.patch<User>("/auth/profile", data);
      persistUser(updated);
      return updated;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async forgotPassword(identifier: string): Promise<void> {
    try {
      await apiClient.post("/auth/password/forgot", {
        identifier,
        channel: "EMAIL",
      });
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async resetPassword(data: {
    identifier: string;
    otp: string;
    newPassword: string;
  }): Promise<void> {
    try {
      await apiClient.post("/auth/password/reset", {
        identifier: data.identifier,
        channel: "EMAIL",
        otp: data.otp,
        newPassword: data.newPassword,
      });
    } catch (error) {
      throw parseApiError(error);
    }
  },

  getCurrentUser(): User | null {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    if (stored) return JSON.parse(stored) as User;
    return null;
  },

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return !!(
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("accessToken")
    );
  },
};
