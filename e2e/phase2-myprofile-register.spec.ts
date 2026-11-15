import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * Phase 2: myprofile customer flow for a brand-new user.
 *
 *   PLAYWRIGHT_BASE_URL=http://myprofile.loantris-dev-linux.com:3001 \
 *     npx playwright test e2e/phase2-myprofile-register.spec.ts
 *
 * Registers a new customer with a Yopmail address, verifies the email OTP,
 * reaches the dashboard and profile, then signs in again from a fresh session.
 */
const PASSWORD = "PortalTest#2026";

test.setTimeout(1_800_000);

test("new customer registers, verifies email, reaches profile and signs in again", async ({ browser, baseURL }) => {
  const stamp = Date.now();
  const email = `e2e.phase2.${stamp}@yopmail.com`;
  const mobile = `9${String(stamp).slice(-9)}`;

  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  // 1. Register.
  await page.goto("/auth/register/");
  await page.locator("#su-name").fill("Phase Two Tester");
  await page.locator("#su-email").fill(email);
  await page.locator("#su-mobile").fill(mobile);
  await page.locator("#su-password").fill(PASSWORD);
  await page.getByRole("checkbox", { name: /I am not a robot/ }).click();
  await page.locator("#acceptTerms").click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible({ timeout: 30_000 });

  // 2. Verify the email OTP from the Yopmail inbox.
  const otp = process.env.OTP_SOURCE === "yopmail"
    ? await readYopmailCode(context, email)
    : await waitForManualCode(page, email);
  for (let index = 0; index < otp.length; index += 1) {
    await page.getByLabel(`Digit ${index + 1}`).fill(otp[index]);
  }
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your account is ready" })).toBeVisible({ timeout: 30_000 });

  // 3. Dashboard and profile load for the new account.
  await page.goto("/dashboard/");
  await expect(page).toHaveURL(/\/dashboard\/?$/);
  await page.goto("/profile/");
  await expect(page).toHaveURL(/\/profile\/?$/);
  await expect(page.getByText(/page not found|something went wrong/i)).toHaveCount(0);

  // 4. Sign in again from a fresh session with the same credentials.
  const fresh = await browser.newContext({ baseURL });
  const freshPage = await fresh.newPage();
  // On the myprofile host "/" is the customer sign-in form; /auth/login/ is the role chooser,
  // whose "Continue as customer" link leaves the dev host for production.
  await freshPage.goto("/");
  await freshPage.locator("#identifier").fill(email);
  await freshPage.locator("#password").fill(PASSWORD);
  await freshPage.getByRole("button", { name: /sign in/i }).click();
  await expect(freshPage).toHaveURL(/\/dashboard\/?$/, { timeout: 30_000 });

  await fresh.close();
  await context.close();
});

/**
 * Manual OTP: the tester reads the code from the Yopmail inbox and writes it to
 * OTP_FILE (default: ./e2e/results/otp.txt). Codes expire after 5 minutes, so
 * every 4 minutes without a code the test clicks "Resend" for a fresh one; the
 * newest email in the inbox is the valid code. Gives up after 20 minutes.
 */
async function waitForManualCode(page: Page, email: string): Promise<string> {
  const file = process.env.OTP_FILE ?? path.join(process.cwd(), "e2e", "results", "otp.txt");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) fs.rmSync(file);
  console.log(`\nWaiting for the verification code sent to ${email}.`);
  console.log(`Write the 6-digit code into: ${file}`);
  const deadline = Date.now() + 20 * 60_000;
  let nextResend = Date.now() + 4 * 60_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) {
      const code = fs.readFileSync(file, "utf8").trim();
      if (/^\d{6}$/.test(code)) return code;
    }
    if (Date.now() >= nextResend) {
      const resend = page.getByRole("button", { name: /resend/i });
      if (await resend.isEnabled().catch(() => false)) {
        await resend.click();
        console.log(`\nCode expired. Resent to ${email}; use the newest email in the inbox.`);
      }
      nextResend = Date.now() + 4 * 60_000;
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`No 6-digit code written to ${file} within 20 minutes`);
}

async function readYopmailCode(context: BrowserContext, email: string): Promise<string> {
  const localPart = email.split("@")[0];
  const inbox: Page = await context.newPage();
  try {
    await inbox.goto(`https://yopmail.com/en/?login=${encodeURIComponent(localPart)}`);
    const list = inbox.frameLocator("#ifinbox");
    await list.getByText(/verification code/i).click({ timeout: 60_000 });
    const mail = inbox.frameLocator("#ifmail");
    await expect(mail.locator("body")).toContainText(/\d{6}/, { timeout: 30_000 });
    const text = await mail.locator("body").innerText();
    const code = text.match(/\b(\d{6})\b/)?.[1];
    if (!code) throw new Error(`No verification code for ${email}`);
    return code;
  } finally {
    await inbox.close();
  }
}
