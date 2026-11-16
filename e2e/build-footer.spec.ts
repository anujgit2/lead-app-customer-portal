import { expect, test, type Page } from "@playwright/test";

/**
 * CHG-0001: build label in the footer of every customer-portal page.
 *
 * The label is baked in at `next build` time from NEXT_PUBLIC_BUILD_SHA. Run this
 * spec with the same value in the environment, so the expected text can be checked:
 *
 *   NEXT_PUBLIC_BUILD_SHA=$(git rev-parse HEAD) PLAYWRIGHT_BASE_URL=http://localhost:3100 \
 *     npx playwright test e2e/build-footer.spec.ts
 *
 * Without the variable the expected label is "Build unknown", which only matches a
 * build that was also made without NEXT_PUBLIC_BUILD_SHA.
 *
 * The footer is hidden by design: its text colour equals the page background, and it
 * shows only when the user selects text. The text stays in the DOM and selectable.
 */

const SHA = process.env.NEXT_PUBLIC_BUILD_SHA?.trim() ?? "";
const EXPECTED_LABEL = SHA ? `Build ${SHA.slice(0, 7)}` : "Build unknown";
const LABEL_PATTERN = /^Build (unknown|[0-9a-f]{7})$/;

// The 26 page.tsx routes. Dynamic routes use their static rewrite targets (see out/serve.json).
const ROUTES = [
  "/",
  "/applications/",
  "/apply/",
  "/auth/forgot-password/",
  "/auth/login/",
  "/auth/register/",
  "/auth/session-expired/",
  "/dashboard/",
  "/dev/form-playground/",
  "/documents/",
  "/documents/view/",
  "/invite/",
  "/lead-invite/",
  "/leads/",
  "/leads/view/",
  "/loan-application/new/",
  "/loan-application/resume/",
  "/privacy/",
  "/profile/",
  "/profiles/",
  "/profiles/new/",
  "/profiles/view/",
  "/s/link/",
  "/shared/link/",
  "/t/site/",
  "/terms/",
];

const NOT_FOUND_PATH = "/build-footer-missing-page-check/";

async function openAndGetFooter(page: Page, path: string) {
  await page.goto(path, { waitUntil: "load" });
  return page.getByTestId("build-footer");
}

for (const route of ROUTES) {
  test(`build footer is present once with the expected label on ${route}`, async ({ page }) => {
    const footer = await openAndGetFooter(page, route);
    await expect(page.getByTestId("build-footer")).toHaveCount(1);
    await expect(footer).toHaveText(EXPECTED_LABEL);
    await expect(footer).toHaveText(LABEL_PATTERN);
  });
}

test("build footer is shown once with the expected label on the 404 page", async ({ page }) => {
  const response = await page.goto(NOT_FOUND_PATH, { waitUntil: "load" });
  expect(response?.status()).toBe(404);
  await expect(page.getByTestId("build-footer")).toHaveCount(1);
  await expect(page.getByTestId("build-footer")).toHaveText(EXPECTED_LABEL);
});

test("build footer has no link, control, URL, environment or tenant data", async ({ page }) => {
  const footer = await openAndGetFooter(page, "/");
  await expect(footer.locator("a, button, input, select, textarea, [href], [role='link']")).toHaveCount(0);

  const text = ((await footer.textContent()) ?? "").trim();
  expect(text).toMatch(LABEL_PATTERN);
  expect(text).not.toMatch(/https?:|:\/\/|www\.|\.com|localhost|uat|prod|dev|tenant|api/i);

  const html = await footer.evaluate((el) => el.outerHTML);
  expect(html).not.toMatch(/href=|src=|https?:/i);
});

test("build footer sits after the landing footer on the landing page", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });

  const placement = await page.evaluate(() => {
    const footers = Array.from(document.querySelectorAll("footer"));
    const build = footers.filter((f) => f.dataset.testid === "build-footer");
    const landing = footers.filter((f) => f.dataset.testid !== "build-footer");
    const buildEl = build[0];
    const landingEl = landing[0];
    return {
      buildCount: build.length,
      landingCount: landing.length,
      landingHasSignIn: (landingEl?.textContent ?? "").includes("Customer sign in"),
      buildIsLastFooter: footers[footers.length - 1] === buildEl,
      buildIsBodyChild: buildEl?.parentElement === document.body,
      followsLanding: landingEl
        ? (landingEl.compareDocumentPosition(buildEl) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
        : false,
      buildTop: buildEl?.getBoundingClientRect().top ?? -1,
      landingBottom: landingEl?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY,
    };
  });

  expect(placement.buildCount).toBe(1);
  expect(placement.landingCount).toBe(1);
  expect(placement.landingHasSignIn).toBe(true);
  expect(placement.followsLanding).toBe(true);
  expect(placement.buildIsLastFooter).toBe(true);
  expect(placement.buildIsBodyChild).toBe(true);
  expect(placement.buildTop).toBeGreaterThanOrEqual(placement.landingBottom);
});

for (const theme of ["light", "dark"] as const) {
  test(`build footer text matches the page background and stays selectable (${theme} theme)`, async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    if (theme === "dark") {
      // The .dark token block in globals.css sets --background for the dark theme.
      await page.evaluate(() => document.documentElement.classList.add("dark"));
    }

    const footer = page.getByTestId("build-footer");
    await expect(footer).toHaveCount(1);

    const colours = await footer.evaluate((el) => {
      const bodyStyle = getComputedStyle(document.body);
      const footerStyle = getComputedStyle(el);
      return {
        background: bodyStyle.backgroundColor,
        text: footerStyle.color,
        userSelect: footerStyle.userSelect,
        display: footerStyle.display,
        visibility: footerStyle.visibility,
      };
    });

    // A transparent body would make the colour check pass for the wrong reason.
    expect(colours.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(colours.text).toBe(colours.background);
    expect(colours.display).not.toBe("none");
    expect(colours.visibility).not.toBe("hidden");
    expect(colours.userSelect).not.toBe("none");

    // Selecting the footer text reveals it, and the selected text is the label.
    const selected = await footer.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      return selection?.toString() ?? "";
    });
    expect(selected.trim()).toBe(EXPECTED_LABEL);
  });
}
