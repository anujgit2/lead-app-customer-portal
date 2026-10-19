import { expect, test } from "@playwright/test";
import { verify } from "./summary";

const pages = [
  { path: "/", ready: "Apply for your loan online" },
  { path: "/auth/register/", ready: "Create your account" },
  { path: "/auth/login/", ready: "Sign in" },
  { path: "/privacy/", ready: "Privacy policy" },
  { path: "/terms/", ready: "Terms of use" },
];

test("public pages do not mention DigiLocker", async ({ page }) => {
  await verify("no-digilocker-copy", "Public pages do not mention DigiLocker", async (check) => {
    for (const entry of pages) {
      await page.goto(entry.path);
      await expect(page.getByText(entry.ready).first()).toBeVisible();
      await expect(page.locator("body")).not.toContainText(/digilocker/i);
      check(`${entry.path} rendered "${entry.ready}" and does not mention DigiLocker.`);
    }

    await page.goto("/");
    await expect(page.getByText("Earlier versions kept")).toBeVisible();
    await expect(page.getByText("Import from DigiLocker")).toHaveCount(0);
    await expect(page.getByText("Verified DigiLocker imports")).toHaveCount(0);
    check("Home page shows “Earlier versions kept” and no DigiLocker feature.");

    await page.goto("/auth/register/");
    await expect(page.getByText("Upload files and keep every earlier version.")).toBeVisible();
    check("Create-account panel describes file versions instead of DigiLocker.");
  });
});
