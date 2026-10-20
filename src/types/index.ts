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
  /** Present only for invitation-based signups. */
  invitationToken?: string;
  /** reCAPTCHA v2 token for self-serve signups; must be verified server side. */
  recaptchaToken?: string;
}

export interface RegisterApiResponse {
  userId: string;
  activated: boolean;
  emailVerificationPending: boolean;
  phoneVerificationPending: boolean;
  message: string;
  accessToken: string | null;
  invitationToken?: string;
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

/** One saved block on an application, keyed by the form template's backend type and name. */
export interface ApplicationProperty {
  type: string;
  name: string;
  access?: Record<string, unknown>;
  value: unknown;
}

export interface LoanApplication {
  id: string;
  applicationNumber: string;
  loanType: string;
  programName?: string;
  loanAmount: number;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  userId: string;
  programId?: string;
  programCode?: string;
  formData?: Record<string, unknown>;
  /** Raw property values returned by the applications API. */
  properties?: ApplicationProperty[];
  customerProfileId?: string;
  customerProfileVersionNo?: number;
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
  | "url"
  | "tel"
  | "phone"
  | "checkbox"
  | "select"
  | "multiselect"
  | "radio"
  | "datetime"
  | "date"
  | "json"
  | "file"
  | "document"
  | "hidden"
  | "address"
  | "consent";

/** A schema string, or a map of locale (for example `en`, `hi`) to string. */
export type LocalizedCopy = string | Record<string, string>;

export type ConsentCapture = "timestamp" | "ipAddress" | "userAgent";

/** Authored `consent` block plus the wording the renderer shows. */
export interface ConsentFieldConfig {
  version: string;
  capture?: ConsentCapture[];
  withdrawable?: boolean;
  /** Wording under the label. A string, or locale → string. */
  text?: LocalizedCopy;
  /** Label when the schema sends a locale map. `FormField.label` stays the English fallback. */
  label?: LocalizedCopy;
  fullTextUrl?: string;
}

/**
 * Value stored in the form when a consent is ticked.
 * `timestamp` is only present after the server returns it. The client never sends it.
 */
export interface ConsentFormValue {
  accepted: true;
  version: string;
  timestamp?: string;
}

/** The only consent shape the client is allowed to submit. */
export interface ConsentClientValue {
  accepted: true;
  version: string;
}

/** Authored JSON for `type: "consent"`. Wording and keys come from this object. */
export interface ConsentFieldSchema {
  key: string;
  type: "consent";
  required?: boolean;
  ui?: {
    label?: LocalizedCopy;
    text?: LocalizedCopy;
    fullTextUrl?: string;
    errors?: { required?: string };
  };
  consent?: {
    version: string;
    capture?: ConsentCapture[];
    withdrawable?: boolean;
  };
  sensitivity?: string;
  visibleIf?: unknown;
  requiredIf?: unknown;
}

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldValidation {
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  /** Shown when `pattern` fails. Kept separate from `message`, which is the required error. */
  patternMessage?: string;
  min?: number;
  max?: number;
  minExclusive?: number;
  maxExclusive?: number;
  integer?: boolean;
  email?: boolean;
  phone?: boolean;
  minSelected?: number;
  maxSelected?: number;
  message?: string;
  minMessage?: string;
  maxMessage?: string;
  minSelectedMessage?: string;
  maxSelectedMessage?: string;
}

/** Comparison operators supported by conditional field rules. */
export type ConditionOperator =
  | "equals"
  | "notEquals"
  | "in"
  | "notIn"
  | "exists"
  | "notExists"
  | "truthy"
  | "falsy"
  | "contains"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "and"
  | "or";

/** A single condition, or an `and` / `or` group of conditions. */
export interface ConditionRule {
  /** Empty for an `and` / `or` group. Otherwise the field the comparison reads. */
  field: string;
  operator: ConditionOperator;
  value?: unknown;
  /** Child conditions when `operator` is `and` or `or`. */
  conditions?: ConditionRule[];
}

/** Conditional visibility/required rules for a field. Evaluated by `src/utils/rule-engine.ts`. */
export interface FieldRules {
  visibleWhen?: ConditionRule;
  requiredWhen?: ConditionRule;
}

/** Input mask config. `pattern` uses `A` for a letter slot, `0` for a digit slot,
 *  and `*` for an alphanumeric slot; any other character is a literal that is
 *  auto-inserted (e.g. `AAAAA-0000-A`, `AAAA0******`, `000-0000-000`).
 *  `separator` is informational only — the literal characters actually inserted always come
 *  from `pattern` itself; it's kept here so authored JSON that documents its separator
 *  (e.g. `{ pattern: "0000-0000-0000-0000", separator: "-" }`) round-trips without being stripped. */
export interface MaskConfig {
  pattern: string;
  separator?: string;
  transform?: "uppercase" | "lowercase" | "numeric";
}

/** Live input sanitizing, authored as a nested `input: { … }` object on the field JSON. */
export interface InputFormatConfig {
  trim?: boolean;
  uppercase?: boolean;
  lowercase?: boolean;
  /** Keep digits only. Set from `input.transform: "numeric"`. */
  numeric?: boolean;
  allowSpaces?: boolean;
  allowSpecialCharacters?: boolean;
}

/** Formatting for `type: "currency"` fields. Authored as flat JSON keys on the field. */
export interface CurrencyFormatConfig {
  precision?: number;
  scale?: number;
  decimalScale?: number;
  fixedDecimalScale?: boolean;
  thousandSeparator?: string | boolean;
  decimalSeparator?: string;
  allowNegative?: boolean;
  allowLeadingZeros?: boolean;
  useGrouping?: boolean;
}

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  helpText?: string;
  /** Short line shown under the label, from `ui.description` (or `ui.subtitle`). */
  description?: string;
  info?: string;
  /**
   * Backend location inside the template's property value (e.g. `businessFinancial.annualRevenue`).
   * The form still stores the value under `name`; save/load use `path` to nest or rename in the payload.
   * Dots are object path segments; `addresses[]` marks an array already owned by a repeatable section.
   */
  path?: string;
  /** Static text shown immediately before the input (e.g. "+91"). */
  prefix?: string;
  /** Static text shown immediately after the input (e.g. "%", "Kg"). */
  suffix?: string;
  mask?: MaskConfig;
  /** Live input sanitizing from authored `input: { trim, uppercase, allowSpaces, … }`. */
  inputFormat?: InputFormatConfig;
  /** Payload-only transform from `input.transform`. `boolean` maps YES/NO to `true`/`false` on save. */
  wireTransform?: "boolean";
  /** Conditional visibility/required rules. Absent = always visible, required only if `validation.required`. */
  rules?: FieldRules;
  defaultValue?: unknown;
  options?: FieldOption[];
  validation?: FieldValidation;
  dependsOn?: FieldDependency;
  span?: 1 | 2 | 3 | 4 | 6 | 12;
  disabled?: boolean;
  readonly?: boolean;
  accept?: string;
  maxFiles?: number;
  minFiles?: number;
  maxSize?: number;
  /** Backend document slot key (e.g. "OTHER"). Used as `name` when `name` is omitted. */
  documentType?: string;
  /** Display/input formatting. Only consumed when `type === "currency"`. */
  currencyFormat?: CurrencyFormatConfig;
  /** Present when `type` is `consent`. Version and wording come from the schema. */
  consent?: ConsentFieldConfig;
  /** Data classification from the schema, for example `INTERNAL`. */
  sensitivity?: string;
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
  /** Key used for this section in the backend property value; defaults to the camelCased code. */
  payloadKey?: string;
}

export interface FormTemplate {
  code: string;
  title: string;
  /** Backend application property this template's data is saved under (e.g. "CompanyProperty"). */
  propertyType?: string;
  /** Backend property name (e.g. "company"). */
  propertyName?: string;
  description?: string;
  icon?: string;
  repeatable?: boolean;
  minInstances?: number;
  maxInstances?: number;
  sections: FormSection[];
}

/**
 * Wizard progress style from program form config `ui.stepper`.
 * `minimal` is the default when the field is missing or unrecognized.
 */
export type StepperVariant = "minimal" | "pills" | "icons" | "cards";

export interface LoanProduct {
  id: string;
  code: string;
  name: string;
  description: string;
  /** Resolved from `ui.stepper`. Defaults to `minimal` (Minimal line). */
  stepper?: StepperVariant;
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

// ─── KYC / Integration Types ───────────────────────────────────────────────────
export interface PanVerifyRequest {
  pan: string;
  nameAsPerPan: string;
  dateOfBirth: string;
  consent?: string;
  reason?: string;
}

export interface PanVerifyResponse {
  valid: boolean;
  pan: string | null;
  status: string | null;
  nameMatch: boolean | null;
  dobMatch: boolean | null;
  category: string | null;
  aadhaarSeedingStatus: string | null;
  code: number | null;
  message: string | null;
}

export interface PanSearchQuery {
  pan: string;
  nameAsPerPan: string;
  dateOfBirth: string;
}

export interface PanVerificationRecord {
  queried: PanSearchQuery;
  result: PanVerifyResponse;
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

export interface StoredFileMeta {
  folderId: string | null;
  sizeBytes: number;
  checksum: string;
  ownerId: string;
}

export interface StoredFileReference {
  id: string;
  /** Document slot key, e.g. BUSINESS_PAN. */
  type: string;
  fileName: string;
  contentType: string;
  status: "AVAILABLE";
  uploadedAt: string;
  meta: StoredFileMeta;
}

export interface FileUploadProgress {
  fileId: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

// ─── New Template Format Types (v1.0) ───────────────────────────────────────
export type SensitivityLevel = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";

export type DocumentScope = "APPLICATION" | "BANK_ACCOUNT" | "OWNER";

/** Option definition in optionSets. */
export interface OptionSetItem {
  value: string;
  ui: {
    label: string;
  };
}

/** UI configuration for new format fields. */
export interface FieldUIConfig {
  label: string;
  placeholder?: string;
  tooltip?: string;
  helperText?: string;
  /** Shown directly under the label. `subtitle` is accepted as an alias. */
  description?: string;
  subtitle?: string;
  errors?: Record<string, string>;
  sameAsOption?: {
    source: string;
    label: string;
  };
}

/** Input transformation and constraint configuration. */
export interface InputConfig {
  trim?: boolean;
  uppercase?: boolean;
  lowercase?: boolean;
  transform?: "numeric" | "uppercase" | "lowercase" | "boolean";
  allowSpaces?: boolean;
  allowSpecialCharacters?: boolean;
  displayFormat?: string;
  wireFormat?: string;
  thousandSeparator?: string;
  decimalSeparator?: string;
  fixedDecimalScale?: boolean;
  useGrouping?: boolean;
  prefix?: string;
  pattern?: string;
  separator?: string;
  storeUnmasked?: boolean;
}

/** Constraints on field values. */
export interface ConstraintsConfig {
  minLength?: number;
  maxLength?: number;
  min?: number | { $ref: string };
  max?: number | { $ref: string };
  integer?: boolean;
  precision?: number;
  scale?: number;
  minSelected?: number;
  maxSelected?: number;
  allowNegative?: boolean;
}

/** Single validation rule with async support and complex operators. */
export interface ValidationRuleItem {
  code: string;
  regex?: string;
  severity?: "error" | "warning";
  op?: string;
  when?: {
    op: string;
    field: string;
  };
  left?: {
    fn?: string;
    field?: string;
    index?: number;
  };
  right?: unknown;
  async?: {
    provider: string;
    trigger: string;
    autofill?: Record<string, string>;
    mustMatch?: string[];
  };
  skipIfRightNull?: boolean;
}

/** Mask/display configuration. */
export interface MaskConfigNew {
  pattern: string;
  storeUnmasked?: boolean;
  separator?: string;
  transform?: "uppercase" | "lowercase" | "numeric";
}

/** Display masking after entry. */
export interface DisplayMaskConfig {
  maskAfterEntry?: {
    showLast: number;
    char: string;
  };
}

/** New format field structure. */
export interface NewFormatField {
  key: string;
  type: FieldType;
  required: boolean;
  /** Backend location inside the form property, e.g. `businessFinancial.annualRevenue`. */
  path?: string;
  ui: FieldUIConfig;
  optionsRef?: string;
  component?: string;
  componentRef?: string;
  input?: InputConfig;
  mask?: MaskConfigNew;
  display?: DisplayMaskConfig;
  constraints?: ConstraintsConfig;
  validation?: ValidationRuleItem[];
  rules?: FieldRules;
  sensitivity?: SensitivityLevel;
  defaultValue?: unknown;
  unit?: string;
  currency?: string;
}

/** New format section structure. */
export interface NewFormatSection {
  code: string;
  displayOrder: number;
  ui: {
    title: string;
    subtitle?: string;
    itemLabel?: string;
  };
  fields: NewFormatField[];
  repeatable?: boolean;
  minItems?: number;
  maxItems?: number;
  component?: string;
}

/** New format form structure. */
export interface NewFormatForm {
  formCode: string;
  formName: string;
  templateVersion: number;
  displayOrder: number;
  required: boolean;
  visible: boolean;
  repeatable: boolean;
  minItems?: number;
  maxItems?: number;
  ui: {
    title: string;
    subtitle: string;
    itemLabel?: string;
    addButtonLabel?: string;
    emptyState?: string;
  };
  sections: NewFormatSection[];
}

/** Document upload configuration. */
export interface DocumentUploadConfig {
  minFiles?: number;
  maxFiles?: number;
  maxFileSizeMB?: number;
  allowedExtensions?: string[];
}

/** Document definition in new format. */
export interface DocumentDefinition {
  documentType: string;
  scope: DocumentScope;
  required: boolean;
  upload: DocumentUploadConfig;
  ui?: {
    label: string;
    description?: string;
    uploadHint?: string;
    errors?: Record<string, string>;
    tooltip?: string;
  };
  sensitivity?: SensitivityLevel;
  rules?: FieldRules;
}

/** Document policy configuration. */
export interface DocumentPolicyConfig {
  coverageMonths?: Record<string, number>;
  contentSniffing?: boolean;
  malwareScan?: boolean;
  passwordProtectedPdf?: string;
  upload?: string;
  encryption?: string;
}

/** Component definition (e.g., ADDRESS). */
export interface ComponentDefinition {
  fields: NewFormatField[];
}

/** New format LoanProduct (v1.0). */
export interface NewLoanProduct {
  id?: string;
  schemaVersion?: string | null;
  programCode: string;
  name: string;
  programType?: string;
  status?: string;
  version?: number;
  currency?: string;
  ui?: {
    title: string;
    subtitle: string;
    /**
     * Wizard stepper. `minimal` (Minimal line, default) | `pills` (Filled pill)
     * | `icons` (Icon connector) | `cards` (Card).
     */
    stepper?: string;
  };
  limits?: {
    loanAmount?: { min: number; max: number };
    loanTermMonths?: { min: number; max: number };
    interestRate?: { max: number };
  };
  documentPolicy?: DocumentPolicyConfig;
  sensitivityLevels?: SensitivityLevel[];
  optionSets?: Record<string, OptionSetItem[]> | null;
  lookups?: Record<string, Record<string, unknown>>;
  components?: Record<string, ComponentDefinition> | null;
  forms?: NewFormatForm[] | null;
  documents?: DocumentDefinition[] | null;
}

// ─── Customer profiles ─────────────────────────────────────────────────────────
export type CustomerProfileType = "INDIVIDUAL" | "BUSINESS";

export type CustomerProfileStatus = "ACTIVE" | "ARCHIVED";

export type CustomerProfileLinkRole =
  | "PROMOTER"
  | "DIRECTOR"
  | "PARTNER"
  | "GUARANTOR"
  | "AUTHORISED_SIGNATORY";

export interface CustomerProfileIdentifiers {
  pan: string | null;
  gstin: string | null;
  mobile: string | null;
}

export interface CustomerProfileSummary {
  id: string;
  type: CustomerProfileType;
  displayName: string;
  status: CustomerProfileStatus;
  currentVersionNo: number;
  identifiers: CustomerProfileIdentifiers;
  updatedAt: string;
  updatedBy: string;
}

export interface CustomerProfileLink {
  id: string;
  role: CustomerProfileLinkRole;
  ownershipPct: number | null;
  profile: CustomerProfileSummary;
}

export interface CustomerProfileDetail extends CustomerProfileSummary {
  templateCode: string;
  templateVersion: number;
  data: Record<string, unknown>;
  links: CustomerProfileLink[];
}

export interface CustomerProfileVersionItem {
  versionNo: number;
  createdAt: string;
  createdBy: string;
  changeNote: string | null;
}

export interface CustomerProfileVersion extends CustomerProfileVersionItem {
  templateCode: string;
  templateVersion: number;
  data: Record<string, unknown>;
}

export interface CustomerProfileDiffChange {
  path: string;
  before: unknown;
  after: unknown;
}

export interface CustomerProfileDiff {
  from: number;
  to: number;
  changes: CustomerProfileDiffChange[];
}

export interface CustomerProfilePage {
  content: CustomerProfileSummary[];
  page: number;
  size: number;
  totalElements: number;
}

export interface CustomerProfileListFilters {
  type?: CustomerProfileType;
  q?: string;
  status?: CustomerProfileStatus;
  page: number;
  size: number;
}

export interface CreateCustomerProfileRequest {
  type: CustomerProfileType;
  data: Record<string, unknown>;
  changeNote?: string;
}

export interface UpdateCustomerProfileRequest {
  data: Record<string, unknown>;
  changeNote?: string;
  expectedVersionNo: number;
}

export interface CreateProfileLinkRequest {
  childProfileId: string;
  role: CustomerProfileLinkRole;
  ownershipPct?: number;
}

export interface RestoreProfileVersionRequest {
  changeNote?: string;
}

export interface ProfileMemoSelection {
  versionNo?: number;
  sections?: string[];
}

export interface SavedProfileMemo {
  id: string;
}

export type DocumentProfileRelation = "RELATED_TO" | "FOR";

export interface LinkedDocumentProfile {
  profileId: string;
  displayName: string;
  type: CustomerProfileType;
  relation: DocumentProfileRelation;
}
