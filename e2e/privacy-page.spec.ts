import { expect, test } from "@playwright/test";
import { verify } from "./summary";

test("privacy page loads", async ({ page }) => {
  await verify("privacy-page", "Privacy page loads", async (check) => {
    const response = await page.goto("/privacy/");
    expect(response?.status(), "privacy route status").toBeLessThan(400);
    check(`Opened /privacy/ with HTTP ${response?.status() ?? "no response"}.`);

    await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();
    check('Heading "Privacy policy" is visible.');

    await expect(page.getByRole("heading", { name: "Page not found" })).toHaveCount(0);
    check("The 404 screen is not shown.");

    await expect(page.getByRole("heading", { name: "Your account" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sharing" })).toBeVisible();
    check("Account, documents, and sharing sections are on the page.");

    await expect(page.locator("body")).not.toContainText(/digilocker/i);
    check("The page does not mention DigiLocker.");
  });
});
