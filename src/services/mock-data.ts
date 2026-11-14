import type { User, LoanApplication, ApplicationSummary, LoanProduct, NewLoanProduct } from "@/types";
import { mapNewTemplateToOld } from "@/utils/template-mapper";
import newTemplateJson from "../../application-template-new.json";

export const MOCK_USER: User = {
  id: "user-001",
  firstName: "Priya",
  lastName: "Sharma",
  email: "priya.sharma@example.com",
  phone: "+91 98765 43210",
  emailVerified: true,
  phoneVerified: true,
  status: "ACTIVE",
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-06-01T14:30:00Z",
};

export const MOCK_APPLICATIONS: LoanApplication[] = [
  {
    id: "app-001",
    applicationNumber: "LA-2024-001",
    loanType: "Business Loan",
    programName: "Business Loan",
    loanAmount: 5000000,
    status: "approved",
    createdAt: "2024-05-10T09:00:00Z",
    updatedAt: "2024-05-20T15:00:00Z",
    submittedAt: "2024-05-12T11:00:00Z",
    userId: "user-001",
  },
  {
    id: "app-002",
    applicationNumber: "LA-2024-002",
    loanType: "Working Capital",
    programName: "Working Capital",
    loanAmount: 2500000,
    status: "under_review",
    createdAt: "2024-06-01T10:00:00Z",
    updatedAt: "2024-06-05T12:00:00Z",
    submittedAt: "2024-06-02T09:00:00Z",
    userId: "user-001",
  },
  {
    id: "app-003",
    applicationNumber: "LA-2024-003",
    loanType: "Business Loan",
    programName: "Business Loan",
    loanAmount: 10000000,
    status: "draft",
    createdAt: "2024-06-08T14:00:00Z",
    updatedAt: "2024-06-08T16:00:00Z",
    userId: "user-001",
  },
  {
    id: "app-004",
    applicationNumber: "LA-2024-004",
    loanType: "Equipment Finance",
    programName: "Equipment Finance",
    loanAmount: 1500000,
    status: "rejected",
    createdAt: "2024-04-01T10:00:00Z",
    updatedAt: "2024-04-15T11:00:00Z",
    submittedAt: "2024-04-03T09:00:00Z",
    userId: "user-001",
  },
  {
    id: "app-005",
    applicationNumber: "LA-2024-005",
    loanType: "Working Capital",
    programName: "Working Capital",
    loanAmount: 3000000,
    status: "submitted",
    createdAt: "2024-06-07T09:00:00Z",
    updatedAt: "2024-06-07T11:00:00Z",
    submittedAt: "2024-06-07T10:30:00Z",
    userId: "user-001",
  },
];

export const MOCK_SUMMARY: ApplicationSummary = {
  draft: 1,
  submitted: 2,
  approved: 1,
  rejected: 1,
  total: 5,
};

/**
 * LOAN_FORM_TEMPLATES: Now uses the new template format (application-template-new.json)
 * and automatically maps it to the old interface for backward compatibility.
 *
 * The new format supports:
 * - optionSets: reusable dropdown options
 * - components: reusable field components (ADDRESS, etc.)
 * - lookups: validation reference tables
 * - documentPolicy: centralized document upload config
 * - documents array with scopes (APPLICATION, BANK_ACCOUNT, OWNER)
 * - validation arrays with async support
 * - constraint-based field validation
 *
 * The mapper (mapNewTemplateToOld) converts this to the old nested format
 * that existing form components understand.
 */
export const LOAN_FORM_TEMPLATES: LoanProduct = mapNewTemplateToOld(
  newTemplateJson as NewLoanProduct
);
