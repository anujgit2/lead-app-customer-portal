// ─── Auth Types ────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  tenantId?: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email: string;
  phone: string;
  profilePictureUrl?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  consented?: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// ─── Invitation Types ──────────────────────────────────────────────────────────
export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export interface InvitationPreFilledData {
  gstin?: string;
  loanAmount?: number;
  businessPan?: string;
  companyName?: string;
  companyType?: string;
  loanPurpose?: string;
  annualRevenue?: number;
  primaryOwnerName?: string;
}

export interface InvitationDetails {
  invitedEmail: string;
  invitedPhone: string;
  status: InvitationStatus;
  expiresAt: string;
  programId?: string;
  preFilledData?: InvitationPreFilledData;
}

export interface RegisterApiRequest {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  password: string;
  invitationToken: string;
}

export interface RegisterApiResponse {
  userId: string;
  activated: boolean;
  emailVerificationPending: boolean;
  phoneVerificationPending: boolean;
  message: string;
  accessToken: string | null;
  invitationToken: string;
}

export interface VerifyEmailOtpRequest {
  userId: string;
  otp: string;
}

export interface VerifyEmailOtpResponse {
  activated: boolean;
  message: string;
  verified: boolean;
  accessToken?: string | null;
}

// ─── Application Types ─────────────────────────────────────────────────────────
export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "disbursed";

export interface LoanApplication {
  id: string;
  applicationNumber: string;
  loanType: string;
  loanAmount: number;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  userId: string;
  programId?: string;
  formData?: Record<string, unknown>;
}

export interface ApplicationSummary {
  draft: number;
  submitted: number;
  approved: number;
  rejected: number;
  total: number;
}

// ─── Form Engine Types ─────────────────────────────────────────────────────────
export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "percentage"
  | "email"
  | "tel"
  | "checkbox"
  | "select"
  | "datetime"
  | "json"
  | "file";

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldValidation {
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  minExclusive?: number;
  maxExclusive?: number;
  integer?: boolean;
  email?: boolean;
  phone?: boolean;
  message?: string;
}

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  helpText?: string;
  defaultValue?: unknown;
  options?: FieldOption[];
  validation?: FieldValidation;
  dependsOn?: FieldDependency;
  span?: 1 | 2 | 3 | 4 | 6 | 12;
  disabled?: boolean;
  readonly?: boolean;
  accept?: string;
  maxFiles?: number;
  maxSize?: number;
}

export interface FieldDependency {
  field: string;
  value: unknown;
}

export interface FormSection {
  code: string;
  title: string;
  description?: string;
  repeatable?: boolean;
  minInstances?: number;
  maxInstances?: number;
  fields: FormField[];
  columns?: 1 | 2 | 3 | 4;
}

export interface FormTemplate {
  code: string;
  title: string;
  description?: string;
  icon?: string;
  repeatable?: boolean;
  minInstances?: number;
  maxInstances?: number;
  sections: FormSection[];
}

export interface LoanProduct {
  id: string;
  code: string;
  name: string;
  description: string;
  templates: FormTemplate[];
}

// ─── Form State Types ──────────────────────────────────────────────────────────
export type SectionData = Record<string, unknown>;
export type TemplateData = Record<string, SectionData | SectionData[]>;
export type FormData = Record<string, TemplateData | TemplateData[]>;

export interface WizardStepStatus {
  templateCode: string;
  completed: boolean;
  valid: boolean;
  touched: boolean;
}

export interface DraftApplication {
  applicationId?: string;
  productCode: string;
  programId?: string;
  currentStep: number;
  formData: FormData;
  stepStatuses: WizardStepStatus[];
  lastSavedAt?: string;
}

// ─── API Types ─────────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code?: string;
    message?: string;
    details?: string[];
  };
  errors?: Record<string, string[]>;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

// ─── Upload Types ──────────────────────────────────────────────────────────────
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface FileUploadProgress {
  fileId: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}
