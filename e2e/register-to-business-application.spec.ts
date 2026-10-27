import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";

/**
 * Registers a new customer, verifies the Yopmail inbox, and walks the
 * Business Application through review. Stops before submit.
 *
 *   npx playwright test e2e/register-to-business-application.spec.ts
 */
const PASSWORD = "PortalTest#2026";

test.setTimeout(300_000);

test("register and complete a business loan application through review", async ({ page }) => {
  const stamp = Date.now();
  const email = `e2e.reg.${stamp}@yopmail.com`;
  const mobile = `9${String(stamp).slice(-9)}`;
  const pdfPath = writeSamplePdf();

  await page.goto("/auth/register/");
  await page.locator("#su-name").fill("Anuj Tester");
  await page.locator("#su-email").fill(email);
  await page.locator("#su-mobile").fill(mobile);
  await page.locator("#su-password").fill(PASSWORD);
  await page.getByRole("checkbox", { name: /I am not a robot/ }).click();
  await page.locator("#acceptTerms").click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();

  const otp = await readYopmailCode(page.context(), email);
  for (let index = 0; index < otp.length; index += 1) {
    await page.getByLabel(`Digit ${index + 1}`).fill(otp[index]);
  }
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your account is ready" })).toBeVisible();

  await page.goto("/dashboard/");
  await page.getByRole("button", { name: "Apply for a loan" }).first().click();
  await page.getByRole("menuitem", { name: /Business Application/ }).click();
  await page.waitForURL(/\/loan-application\//);
  await dismissProfileDialog(page);
  await expect(page).toHaveURL(/\/loan-application\/resume\/\?id=/);
  await expect(page.getByRole("heading", { level: 2, name: "Business Information" })).toBeVisible();

  await fillById(page, "business_details.companyName", "Acme Traders");
  await selectById(page, "business_details.companyType", "Proprietorship");
  await fillById(page, "business_details.doingBusinessAs", "Acme");
  await fillById(page, "business_details.businessPan", "ABCPD1234F");
  await selectById(page, "business_details.gstRegistered", "No");
  await selectById(page, "business_details.stateOfFormation", "Maharashtra");
  await fillById(page, "business_details.yearEstablished", "2018");
  await selectById(page, "business_details.industryType", "Retail");
  await selectById(page, "business_details.natureOfBusiness", "Retail Trading");
  await fillById(page, "business_details.annualRevenue", "2500000");
  await fillById(page, "business_details.netIncome", "400000");
  await fillById(page, "business_address.0.addressLine1", "42 MG Road");
  await fillById(page, "business_address.0.addressLine2", "Near City Center");
  await fillById(page, "business_address.0.city", "Mumbai");
  await selectById(page, "business_address.0.state", "Maharashtra");
  await fillById(page, "business_address.0.pincode", "400001");
  await continueTo(page, "Owners / Partners / Directors");

  await selectById(page, "owner_details.title", "Mr.");
  await fillById(page, "owner_details.firstName", "Rahul");
  await fillById(page, "owner_details.lastName", "Sharma");
  await fillById(page, "owner_details.fatherOrSpouseName", "Mahesh Sharma");
  await fillById(page, "owner_details.pan", "RAHPS1234K");
  await fillById(page, "owner_details.aadhaar", "234123412341");
  await fillById(page, "owner_details.dateOfBirth", "1988-06-15");
  await selectById(page, "owner_details.gender", "Male");
  await selectById(page, "owner_details.maritalStatus", "Married");
  await selectById(page, "owner_details.qualification", "Graduate");
  await fillById(page, "owner_details.email", "rahul.sharma@acmetraders.example");
  await fillById(page, "owner_details.mobileNumber", "9876501234");
  await fillById(page, "owner_details.designation", "Proprietor");
  await fillById(page, "owner_details.workExperienceYears", "12");
  await selectById(page, "owner_details.residenceType", "Self Owned");
  await fillById(page, "owner_details.address.addressLine1", "18 Linking Road");
  await fillById(page, "owner_details.address.addressLine2", "Bandra West");
  await fillById(page, "owner_details.address.city", "Mumbai");
  await selectById(page, "owner_details.address.state", "Maharashtra");
  await fillById(page, "owner_details.address.pincode", "400050");
  await selectById(page, "owner_details.address.country", "India");
  await continueTo(page, "Loan Requirement");

  await fillById(page, "loan_terms.loanAmount", "1500000");
  await fillById(page, "loan_terms.loanTerm", "36");
  await selectById(page, "loan_terms.loanPurpose", "Working Capital");
  await fillById(page, "loan_terms.requestedRate", "14");
  await continueTo(page, "Existing Debt");

  await fillById(page, "debt_details.lenderName", "HDFC Bank");
  await selectById(page, "debt_details.debtType", "Term Loan");
  await fillById(page, "debt_details.outstandingBalance", "320000");
  await fillById(page, "debt_details.monthlyPayment", "18500");
  await fillById(page, "debt_details.remainingTermMonths", "24");
  await continueTo(page, "Bank Account Details");

  await fillById(page, "bank_account_details.bankName", "HDFC Bank");
  await fillById(page, "bank_account_details.accountNumber", "50100123456789");
  await fillById(page, "bank_account_details.ifscCode", "HDFC0001234");
  await selectById(page, "bank_account_details.accountType", "Current Account");
  await continueTo(page, "Business documents");

  await uploadDocument(page, "Business PAN Card", pdfPath);
  await uploadDocument(page, "Business Address Proof", pdfPath);
  await continueTo(page, "Review your application");

  await expect(page.getByText("Acme Traders", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Rahul Sharma").first()).toBeVisible();
  await expect(page.getByText("Working Capital", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("sample-doc.pdf").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit", exact: true })).toBeVisible();
});

async function readYopmailCode(context: BrowserContext, email: string): Promise<string> {
  const localPart = email.split("@")[0];
  const inbox = await context.newPage();
  try {
    await inbox.goto(`https://yopmail.com/en/?login=${encodeURIComponent(localPart)}`);
    const list = inbox.frameLocator("#ifinbox");
    await list.getByText(/verification code/i).click({ timeout: 40_000 });
    const mail = inbox.frameLocator("#ifmail");
    await expect(mail.locator("body")).toContainText(/\d{6}/, { timeout: 20_000 });
    const text = await mail.locator("body").innerText();
    const code = text.match(/\b(\d{6})\b/)?.[1];
    if (!code) throw new Error(`No verification code for ${email}`);
    return code;
  } finally {
    await inbox.close();
  }
}

function field(page: Page, id: string): Locator {
  return page.locator(`[id="${id}"]`);
}

async function closeOpenList(page: Page) {
  const list = page.getByRole("listbox");
  if (await list.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
  }
}

async function fillById(page: Page, id: string, value: string) {
  const input = field(page, id);
  await input.scrollIntoViewIfNeeded();
  await input.fill(value);
  await input.blur();
}

async function selectById(page: Page, id: string, option: string) {
  const box = field(page, id);
  await box.scrollIntoViewIfNeeded();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await closeOpenList(page);
    await box.click();
    const list = page.getByRole("listbox");
    await expect(list).toBeVisible();
    await list.getByRole("option", { name: option, exact: true }).click();
    await closeOpenList(page);
    const selected = ((await box.innerText()) || "").replace(/\s+/g, " ").trim();
    if (selected === option || selected.includes(option)) return;
  }

  throw new Error(`Could not select "${option}" in ${id}`);
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
  } else if (await create.isVisible() && !(await business.isVisible())) {
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
