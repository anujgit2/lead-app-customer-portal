import { expect, test } from "@playwright/test";
import { verify } from "./summary";

test("terms page loads", async ({ page }) => {
  await verify("terms-page", "Terms page loads", async (check) => {
    const response = await page.goto("/terms/");
    expect(response?.status(), "terms route status").toBeLessThan(400);
    check(`Opened /terms/ with HTTP ${response?.status() ?? "no response"}.`);

    await expect(page.getByRole("heading", { level: 1, name: "Terms of use" })).toBeVisible();
    check('Heading "Terms of use" is visible.');

    await expect(page.getByRole("heading", { name: "Page not found" })).toHaveCount(0);
    check("The 404 screen is not shown.");

    await expect(page.getByRole("heading", { name: "Your account" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Applications and documents" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Links you send" })).toBeVisible();
    check("Account, application, and sharing sections are on the page.");

    await expect(page.locator("body")).not.toContainText(/digilocker/i);
    check("The page does not mention DigiLocker.");
  });
});
