import { expect, test } from "@playwright/test";
import { verify } from "./summary";

test("legal links open privacy and terms", async ({ page }) => {
  await verify("legal-links", "Legal links open privacy and terms", async (check) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("contentinfo").getByRole("link", { name: "Privacy policy" }).click();
    await expect(page).toHaveURL(/\/privacy\/?$/);
    await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();
    check("Home footer Privacy policy opens /privacy/.");

    await page.getByRole("contentinfo").getByRole("link", { name: "Terms of use" }).click();
    await expect(page).toHaveURL(/\/terms\/?$/);
    await expect(page.getByRole("heading", { level: 1, name: "Terms of use" })).toBeVisible();
    check("Privacy footer Terms of use opens /terms/.");

    await page.getByRole("link", { name: "How it works" }).first().click();
    await expect(page).toHaveURL(/\/#how$/);
    await expect(page.getByRole("heading", { name: "From sign-up to your lender in four steps" })).toBeVisible();
    check("How it works on a legal page returns to the home section.");

    await page.goto("/auth/login/");
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
    await page.getByRole("link", { name: "Privacy policy" }).click();
    await expect(page).toHaveURL(/\/privacy\/?$/);
    await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();
    check("Sign-in footer Privacy policy opens /privacy/.");

    await page.goto("/auth/login/");
    await page.getByRole("link", { name: "Terms of use" }).click();
    await expect(page).toHaveURL(/\/terms\/?$/);
    await expect(page.getByRole("heading", { level: 1, name: "Terms of use" })).toBeVisible();
    check("Sign-in footer Terms of use opens /terms/.");
  });
});
