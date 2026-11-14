import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Signs in and submits one business loan application.
 *
 *   E2E_CUSTOMER_EMAIL=... E2E_CUSTOMER_PASSWORD=... \
 *     npx playwright test e2e/business-application.spec.ts
 */
const PROGRAM_ID = "5c864551-6a59-4f22-9a32-325f08c13272";

test.setTimeout(300_000);

test("submit a business loan application", async ({ page }) => {
  const email = process.env.E2E_CUSTOMER_EMAIL;
  const password = process.env.E2E_CUSTOMER_PASSWORD;
  test.skip(!email || !password, "Set E2E_CUSTOMER_EMAIL and E2E_CUSTOMER_PASSWORD.");

  const pdfPath = writeSamplePdf();

  await page.goto("/auth/login/");
  await page.locator("#identifier").fill(email!);
  await page.locator("#password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/auth\/login/);

  await page.goto(`/loan-application/new/?programId=${PROGRAM_ID}`);
  await dismissProfileDialog(page);
  await expect(page.getByRole("heading", { level: 2, name: "Business Information" })).toBeVisible();

  await fillById(page, "business_details.companyName", "Acme Traders");
  await selectById(page, "business_details.companyType", "Proprietorship");
  await fillById(page, "business_details.doingBusinessAs", "Acme");
  await selectById(page, "business_details.industryType", "Retail");
  await selectById(page, "business_details.natureOfBusiness", "Retail Trading");
  await selectById(page, "business_details.stateOfFormation", "Maharashtra");
  await fillById(page, "business_details.incorporationDate", "2018-04-12");
  await fillById(page, "business_details.yearEstablished", "2018");
  await fillById(page, "business_details.businessVintage", "8");
  await fillById(page, "business_details.annualRevenue", "2500000");
  await fillById(page, "business_details.netIncome", "400000");
  await fillById(page, "business_registrations.businessPan", "ABCPD1234F");
  await selectById(page, "business_registrations.gstRegistered", "No");
  await fillById(page, "business_contact.businessEmail", "accounts@acmetraders.example");
  await fillById(page, "business_contact.businessMobile", "9876543210");
  await fillById(page, "business_contact.website", "https://acmetraders.example");
  await fillById(page, "business_contact.employeeCount", "12");
  await fillById(page, "business_contact.nicCode", "47111");
  await selectById(page, "business_contact.premisesOwnership", "Rented");
  await selectById(page, "business_address.0.addressType", "Registered Office");
  await fillById(page, "business_address.0.addressLine1", "42 MG Road");
  await fillById(page, "business_address.0.addressLine2", "Near City Center");
  await fillById(page, "business_address.0.city", "Mumbai");
  await selectById(page, "business_address.0.state", "Maharashtra");
  await fillById(page, "business_address.0.pincode", "400001");
  await continueTo(page, "Owners / Partners / Directors");

  await selectById(page, "owner_details.title", "Mr.");
  await fillById(page, "owner_details.firstName", "Rahul");
  await fillById(page, "owner_details.lastName", "Sharma");
  await selectById(page, "owner_details.gender", "Male");
  await fillById(page, "owner_details.dob", "1988-06-15");
  await selectById(page, "owner_details.designation", "Proprietor");
  await fillById(page, "owner_details.pan", "RAHPS1234K");
  await fillById(page, "owner_details.ownershipPct", "100");
  await fillById(page, "owner_details.mobile", "9876501234");
  await fillById(page, "owner_details.email", "rahul.sharma@acmetraders.example");
  await selectById(page, "owner_details.qualification", "Graduate");
  await selectById(page, "owner_details.maritalStatus", "Married");
  await selectById(page, "owner_details.residenceType", "Self Owned");
  await fillById(page, "owner_details.address.addressLine1", "18 Linking Road");
  await fillById(page, "owner_details.address.addressLine2", "Bandra West");
  await fillById(page, "owner_details.address.city", "Mumbai");
  await selectById(page, "owner_details.address.state", "Maharashtra");
  await fillById(page, "owner_details.address.pincode", "400050");
  await selectCountryIfNeeded(page, "owner_details.address.country");
  await fillById(page, "owner_details.aadhaarLast4", "4321");
  await checkById(page, "owner_details.isSignatory");
  await checkById(page, "owner_details.isGuarantor");
  await selectById(page, "owner_details.isPep", "No");
  await continueTo(page, "Loan Requirement");

  await selectById(page, "loan_terms.loanProduct", "Term Loan");
  await fillById(page, "loan_terms.loanAmount", "1500000");
  await fillById(page, "loan_terms.loanTerm", "36");
  await selectById(page, "loan_terms.loanPurpose", "Working Capital");
  await selectById(page, "loan_terms.repaymentMode", "EMI");
  await selectById(page, "loan_terms.collateralOffered", "No");
  await selectById(page, "loan_terms.hasExistingDebt", "Yes");
  await continueTo(page, "Existing Loans");

  await fillById(page, "debt_details.lenderName", "HDFC Bank");
  await selectById(page, "debt_details.debtType", "Term Loan");
  await fillById(page, "debt_details.sanctionedAmount", "500000");
  await fillById(page, "debt_details.outstandingAmount", "320000");
  await fillById(page, "debt_details.emiAmount", "18500");
  await fillById(page, "debt_details.remainingTenure", "24");
  await selectById(page, "debt_details.isOverdue", "No");
  await continueTo(page, "Bank Account Details");

  await fillById(page, "bank_account_details.holderName", "Acme Traders");
  await fillById(page, "bank_account_details.accountNumber", "50100123456789");
  await fillById(page, "bank_account_details.accountNumberConfirm", "50100123456789");
  await fillById(page, "bank_account_details.ifscCode", "HDFC0001234");
  const bankName = page.locator(fieldId("bank_account_details.bankName"));
  await expect(bankName).toBeVisible();
  if (!(await bankName.inputValue()).trim()) {
    await fillById(page, "bank_account_details.bankName", "HDFC Bank");
  }
  await selectById(page, "bank_account_details.accountType", "Current Account");
  await checkById(page, "bank_account_details.isPrimary");
  await continueTo(page, "Financials");

  await fillFinancialYear(page, 0, {
    year: "FY 2024-25",
    revenue: "2500000",
    netIncome: "400000",
    depreciation: "50000",
    totalDebt: "320000",
    netWorth: "1800000",
  });
  await page.getByRole("button", { name: /Add Another/i }).click();
  await fillFinancialYear(page, 1, {
    year: "FY 2023-24",
    revenue: "2100000",
    netIncome: "280000",
    depreciation: "40000",
    totalDebt: "450000",
    netWorth: "1500000",
  });
  await continueTo(page, "Consents & Declarations");

  for (const id of [
    "consents.dataConsent",
    "consents.bureauConsent",
    "consents.kfsAck",
    "consents.termsAccepted",
    "consents.truthDeclaration",
  ]) {
    await checkById(page, id);
  }
  await continueTo(page, "Business documents");

  for (const label of ["Business PAN Card", "Business Address Proof", "Business Existence Proof"]) {
    await uploadDocument(page, label, pdfPath);
  }
  await continueTo(page, "Review your application");

  await page.getByRole("checkbox", { name: "I confirm the information is accurate." }).click();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  const confirmSubmit = page.getByRole("dialog", { name: "Submit application?" });
  await expect(confirmSubmit).toBeVisible();
  await confirmSubmit.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/?$/);
});

function fieldId(id: string): string {
  return `[id="${id}"]`;
}

function field(page: Page, id: string, index = 0): Locator {
  return page.locator(fieldId(id)).nth(index);
}

async function closeOpenList(page: Page) {
  const list = page.getByRole("listbox");
  if (await list.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
  }
}

async function fillById(page: Page, id: string, value: string, index = 0) {
  const input = field(page, id, index);
  await input.scrollIntoViewIfNeeded();
  await input.fill(value);
  await input.blur();
}

async function selectById(page: Page, id: string, option: string, index = 0) {
  const box = field(page, id, index);
  await box.scrollIntoViewIfNeeded();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await closeOpenList(page);
    await box.click();
    const list = page.getByRole("listbox");
    await expect(list).toBeVisible();
    await list.getByRole("option", { name: option, exact: true }).click();
    await closeOpenList(page);
    const selected = ((await box.innerText()) || "").replace(/\s+/g, " ").trim();
    if (selected === option) return;
  }

  throw new Error(`Could not select "${option}" in ${id}`);
}

async function checkById(page: Page, id: string) {
  const box = field(page, id);
  await box.scrollIntoViewIfNeeded();
  if ((await box.getAttribute("aria-checked")) !== "true") {
    await box.click();
  }
}

async function selectCountryIfNeeded(page: Page, id: string) {
  const country = field(page, id);
  if ((await country.count()) === 0) return;
  const text = (await country.innerText()).trim();
  if (!/india/i.test(text)) await selectById(page, id, "India");
}

async function fillFinancialYear(
  page: Page,
  index: number,
  values: {
    year: string;
    revenue: string;
    netIncome: string;
    depreciation: string;
    totalDebt: string;
    netWorth: string;
  }
) {
  await selectById(page, "financial_details.financialYear", values.year, index);
  await fillById(page, "financial_details.revenue", values.revenue, index);
  await fillById(page, "financial_details.netIncome", values.netIncome, index);
  await fillById(page, "financial_details.depreciation", values.depreciation, index);
  await fillById(page, "financial_details.totalDebt", values.totalDebt, index);
  await fillById(page, "financial_details.netWorth", values.netWorth, index);
  await selectById(page, "financial_details.auditStatus", "No", index);
}

async function uploadDocument(page: Page, label: string, pdfPath: string) {
  const title = page.getByText(label, { exact: true });
  const card = title.locator("xpath=ancestor::*[.//input[@type='file']][1]");
  await card.locator("input[type=file]").setInputFiles(pdfPath);
  await expect(card).toContainText(/uploaded/);
}

async function continueTo(page: Page, heading: string) {
  await closeOpenList(page);
  const button = page.getByRole("button", { name: "Continue", exact: true });
  await button.scrollIntoViewIfNeeded();
  await expect(button).toBeEnabled();
  await button.click();
  const next = page.getByRole("heading", { level: 2, name: heading });
  const problem = page.getByRole("alert").filter({ hasText: /.+/ });
  await expect(next.or(problem.first())).toBeVisible();
  if (!(await next.isVisible())) {
    throw new Error((await problem.allInnerTexts()).join(" ").trim() || `Did not reach ${heading}`);
  }
}

async function dismissProfileDialog(page: Page) {
  const business = page.getByRole("heading", { level: 2, name: "Business Information" });
  const withoutProfiles = page.getByRole("button", { name: "Create without profiles" });
  const create = page.getByRole("button", { name: "Create application" });
  await expect(business.or(withoutProfiles).or(create)).toBeVisible();

  if (await withoutProfiles.isVisible()) {
    await withoutProfiles.click();
  } else if (await create.isVisible()) {
    await create.click();
  }
  await expect(business).toBeVisible();
}

function writeSamplePdf(): string {
  const pdf = `%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>endobj
4 0 obj<< /Length 44 >>stream
BT /F1 12 Tf 20 100 Td (sample) Tj ET
endstream
endobj
trailer<< /Root 1 0 R >>
%%EOF
`;
  const filePath = path.join(os.tmpdir(), "sample-doc.pdf");
  fs.writeFileSync(filePath, pdf);
  return filePath;
}
