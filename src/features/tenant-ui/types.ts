export const LANDING_PAGE_NAMES = ["default"] as const;

export type LandingPageName = (typeof LANDING_PAGE_NAMES)[number];

export type UiFormId = "signin" | "signup" | "otp" | "forgotPassword" | "resetPassword";

export type UiFieldKey =
  | "identifier"
  | "fullName"
  | "email"
  | "phone"
  | "password"
  | "newPassword"
  | "confirmPassword"
  | "otp"
  | "rememberMe"
  | "acceptTerms";

export type UiFieldType = "text" | "email" | "tel" | "password" | "otp" | "checkbox";

export type UiFieldWidth = "full" | "half";

export interface UiFormField {
  key: UiFieldKey;
  type: UiFieldType;
  label: string;
  placeholder?: string;
  width: UiFieldWidth;
  required: boolean;
}

export interface UiFormLink {
  key: "signin" | "signup" | "forgotPassword";
  label: string;
  prefix?: string;
}

export interface UiFormConfig {
  title: string;
  subtitle: string;
  submitLabel: string;
  submittingLabel: string;
  resendLabel?: string;
  resendCooldownSeconds?: number;
  successTitle?: string;
  successSubtitle?: string;
  fields: UiFormField[];
  links: UiFormLink[];
}

export interface UiThemeColors {
  primary?: string;
  primaryForeground?: string;
  background?: string;
  foreground?: string;
  card?: string;
  muted?: string;
  border?: string;
  danger?: string;
}

export interface UiTheme {
  logoUrl?: string;
  logoAlt?: string;
  fontFamily?: string;
  fontUrl?: string;
  borderRadius?: "0px" | "4px" | "8px" | "12px";
  colors: UiThemeColors;
}

export interface TenantUiConfig {
  landingPage: string;
  theme: UiTheme;
  forms: Record<UiFormId, UiFormConfig>;
}
