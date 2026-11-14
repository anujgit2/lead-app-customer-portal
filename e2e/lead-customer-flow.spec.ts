import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

/**
 * Customer lead flow in a real browser, against the local Docker stack.
 * Requires the stack (see docs/runbooks/lead-customer-browser-flow.md) and the portal dev server
 * started with NEXT_PUBLIC_API_URL=http://demo-services.bizloandev.local.
 *
 *   npx playwright test e2e/lead-customer-flow.spec.ts
 *
 * Seeds a lead through the internal API, reads the invite link from the leads-service log (the
 * no-op notification port logs it), registers the customer with the fake OTP, then completes the
 * lead form and submits it.
 */

const PASSWORD = "PortalTest#2026";
const LEAD_PROGRAM_VERSION = "e2e00000-0000-4000-8000-000000000002";
const MONOLITH = path.resolve(__dirname, "..", "..", "monilith-multimdule-loan");
const LEADS_URL = "http://localhost:8082";

test.setTimeout(240_000);

function dockerEnv(key: string): string {
  const env = fs.readFileSync(path.join(MONOLITH, "deployment/docker/.env"), "utf8");
  const line = env.split("\n").find((l) => l.startsWith(`${key}=`));
  if (!line) throw new Error(`${key} is not set in deployment/docker/.env`);
  return line.slice(key.length + 1).trim();
}

function psql(sql: string): string {
  return execFileSync(
    "psql",
    ["-h", "localhost", "-p", "54322", "-U", dockerEnv("DB_ADMIN_USERNAME"), "-d", "platform_db", "-At", "-c", sql],
    { env: { ...process.env, PGPASSWORD: dockerEnv("DB_ADMIN_PASSWORD") }, encoding: "utf8" }
  ).trim();
}

async function seedLead(email: string): Promise<{ leadId: string; inviteUrl: string }> {
  const key = dockerEnv("LEADS_INTERNAL_KEY");
  const headers = { "X-Internal-Key": key, "X-Tenant-Id": "demo", "Content-Type": "application/json" };
  const partnerId = crypto.randomUUID();
  const orgId = crypto.randomUUID();

  const created = await fetch(`${LEADS_URL}/internal/v1/leads`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      programVersionId: LEAD_PROGRAM_VERSION,
      partnerId,
      orgId,
      ownerPath: "root",
      creationData: { customerName: "Lead Tester", customerPhone: "9000000002" },
    }),
  });
  expect(created.status).toBe(201);
  const { leadId } = (await created.json()) as { leadId: string };

  const invited = await fetch(`${LEADS_URL}/internal/v1/leads/${leadId}/invite`, {
    method: "POST",
    headers,
    body: JSON.stringify({ partnerId, email, expiryDays: 7 }),
  });
  expect(invited.status).toBe(201);

  const log = execFileSync("docker", ["logs", "--since", "5m", "leads-service"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = log.match(new RegExp(`NOOP\\] Invitation email → to='${escaped}', url='([^']+)'`));
  if (!match) throw new Error("Invite link not found in leads-service log");
  return { leadId, inviteUrl: match[1] };
}

test("customer registers, accepts the partner invite, completes and submits the lead", async ({ page }) => {
  const stamp = Date.now();
  const email = `lead.e2e.${stamp}@example.com`;
  const mobile = `9${String(stamp).slice(-9)}`;
  const otp = dockerEnv("NOTIFICATIONS_EMAIL_FAKE_OTP");

  const { leadId, inviteUrl } = await seedLead(email);

  // 1. Invite page: not signed in, so the sign-in / create-account choice is shown.
  await page.goto(inviteUrl);
  await expect(page.getByRole("heading", { name: "Your application" })).toBeVisible();
  await page.getByRole("button", { name: "Open application" }).click();
  await expect(page.getByRole("link", { name: "Create account" })).toBeVisible();

  // 2. Register with the invited email and verify it with the fake OTP.
  await page.getByRole("link", { name: "Create account" }).click();
  await page.locator("#su-name").fill("Lead Tester");
  await page.locator("#su-email").fill(email);
  await page.locator("#su-mobile").fill(mobile);
  await page.locator("#su-password").fill(PASSWORD);
  await page.getByRole("checkbox", { name: /I am not a robot/ }).click();
  await page.locator("#acceptTerms").click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
  for (let index = 0; index < otp.length; index += 1) {
    await page.getByLabel(`Digit ${index + 1}`).fill(otp[index]);
  }
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your account is ready" })).toBeVisible();

  // 3. Back to the invite. Sign in if the registration did not leave the customer signed in.
  await page.goto(inviteUrl);
  await page.getByRole("button", { name: "Open application" }).click();
  if (await page.getByRole("button", { name: /signed in/ }).isVisible().catch(() => false)) {
    await page.goto("/auth/login/");
    await page.locator("#identifier").fill(email);
    await page.locator("#password").fill(PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).first().click();
    await page.waitForURL(/\/dashboard/);
    await page.goto(inviteUrl);
    await page.getByRole("button", { name: "Open application" }).click();
  }

  // 4. The lead form opens in the shared wizard. Fill the single step and continue to review.
  await page.waitForURL(/\/leads\/view\/\?id=/);
  await expect(page).toHaveURL(new RegExp(`id=${leadId}`));
  await page.getByLabel("Full name").fill("Lead Tester");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  // 5. Review and submit.
  await page.getByRole("checkbox", { name: "I confirm the information is accurate." }).click();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page).toHaveURL(/\/leads\/?$/);

  // 6. The backend agrees: lead submitted, customer attached, round frozen.
  expect(psql(`select status from demo.lead where id='${leadId}';`)).toBe("SUBMITTED");
  expect(psql(`select customer_account_id is not null from demo.lead where id='${leadId}';`)).toBe("t");
  expect(psql(`select submitted_at is not null from demo.lead_round where lead_id='${leadId}' and round_no=1;`)).toBe("t");
});
