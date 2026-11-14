export type SharedAccessState =
  | { step: "loading" }
  | { step: "expired"; senderName?: string; confirmation?: string }
  | {
      step: "verify";
      email: string;
      mismatch: boolean;
      notice?: string;
      lockMinutes?: number;
    }
  | {
      step: "otp";
      email: string;
      maskedEmail: string;
      error?: string;
      lockMinutes?: number;
      resendAvailableAt: number;
    }
  | { step: "ready"; accessToken: string; email: string };

export type SharedAccessEvent =
  | { type: "meta-valid" }
  | { type: "meta-unavailable"; senderName?: string }
  | { type: "edit-email"; email: string }
  | { type: "otp-sent"; maskedEmail: string; now: number }
  | { type: "mismatch" }
  | { type: "rate-limited"; minutes: number }
  | { type: "try-again" }
  | { type: "otp-rejected" }
  | { type: "otp-accepted"; accessToken: string }
  | { type: "session-expired" }
  | { type: "resend"; now: number }
  | { type: "request-sent" };

export const RESEND_COOLDOWN_MS = 30_000;

export function initialSharedAccessState(): SharedAccessState {
  return { step: "loading" };
}

export function lockoutCopy(minutes: number): string {
  return `Too many attempts. Try again in ${minutes} minutes.`;
}

export function reduceSharedAccess(state: SharedAccessState, event: SharedAccessEvent): SharedAccessState {
  switch (event.type) {
    case "meta-valid":
      return state.step === "loading" ? { step: "verify", email: "", mismatch: false } : state;
    case "meta-unavailable":
      return { step: "expired", senderName: event.senderName };
    case "edit-email":
      if (state.step !== "verify") return state;
      return { ...state, email: event.email, mismatch: false };
    case "otp-sent":
      if (state.step !== "verify" && state.step !== "otp") return state;
      return {
        step: "otp",
        email: state.email,
        maskedEmail: event.maskedEmail,
        resendAvailableAt: event.now + RESEND_COOLDOWN_MS,
      };
    case "mismatch":
      if (state.step !== "verify") return state;
      return { ...state, mismatch: true, lockMinutes: undefined };
    case "rate-limited":
      if (state.step === "verify" || state.step === "otp") {
        return { ...state, lockMinutes: event.minutes };
      }
      return state;
    case "try-again":
      if (state.step !== "verify") return state;
      return { ...state, mismatch: false };
    case "otp-rejected":
      if (state.step !== "otp") return state;
      return { ...state, error: "That code is incorrect or expired.", lockMinutes: undefined };
    case "otp-accepted":
      if (state.step !== "otp") return state;
      return { step: "ready", accessToken: event.accessToken, email: state.email };
    case "session-expired": {
      const email = state.step === "otp" || state.step === "ready" ? state.email : "";
      return {
        step: "verify",
        email,
        mismatch: false,
        notice: "Session expired. Please verify again.",
      };
    }
    case "resend":
      if (state.step !== "otp") return state;
      return { ...state, error: undefined, resendAvailableAt: event.now + RESEND_COOLDOWN_MS };
    case "request-sent":
      if (state.step !== "expired") return state;
      return { ...state, confirmation: "We've asked the sender for a new link." };
    default:
      return state;
  }
}

export function resendSecondsLeft(now: number, availableAt: number): number {
  return Math.max(0, Math.ceil((availableAt - now) / 1000));
}
